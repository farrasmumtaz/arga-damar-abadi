import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type Promotion } from '../../generated/prisma/client';
import { ProductStatus } from '../../generated/prisma/enums';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import {
  CreatePromotionDto,
  PreviewPromotionDto,
  QueryPromotionDto,
  UpdatePromotionDto,
} from './dto/promotion.dto';

export interface AppliedPromotion {
  id: string;
  code: string;
  discountAmount: Prisma.Decimal;
}

@Injectable()
export class PromotionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryPromotionDto) {
    const where: Prisma.PromotionWhereInput = query.search
      ? {
          OR: [
            { code: { contains: query.search, mode: 'insensitive' } },
            { name: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : {};
    const [data, total] = await this.prisma.$transaction([
      this.prisma.promotion.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.promotion.count({ where }),
    ]);
    return {
      data,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async findOne(id: string) {
    const promotion = await this.prisma.promotion.findUnique({ where: { id } });
    if (!promotion) throw new NotFoundException('Voucher tidak ditemukan');
    return promotion;
  }

  async create(dto: CreatePromotionDto, actorId: string) {
    const data = this.toData(dto);
    this.validateDefinition(data);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const promotion = await tx.promotion.create({ data });
        await tx.auditLog.create({
          data: {
            actorId,
            action: 'promotion.create',
            entityType: 'Promotion',
            entityId: promotion.id,
            metadata: { code: promotion.code },
          },
        });
        return promotion;
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new ConflictException('Kode voucher sudah digunakan');
      throw error;
    }
  }

  async update(id: string, dto: UpdatePromotionDto, actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "promotions" WHERE "id" = ${id}::uuid FOR UPDATE`;
      const existing = await tx.promotion.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException('Voucher tidak ditemukan');
      if (dto.code !== undefined && dto.code !== existing.code)
        throw new ConflictException('Kode voucher tidak dapat diubah');
      const data = this.toData({
        code: existing.code,
        name: dto.name ?? existing.name,
        kind: dto.kind ?? existing.kind,
        amount: dto.amount ?? existing.amount.toString(),
        minSubtotal: dto.minSubtotal ?? existing.minSubtotal.toString(),
        maxDiscount:
          dto.maxDiscount === undefined
            ? (existing.maxDiscount?.toString() ?? null)
            : dto.maxDiscount,
        startsAt: dto.startsAt ?? existing.startsAt.toISOString(),
        endsAt: dto.endsAt ?? existing.endsAt.toISOString(),
        isActive: dto.isActive ?? existing.isActive,
        usageLimit: dto.usageLimit ?? existing.usageLimit,
        perUserLimit: dto.perUserLimit ?? existing.perUserLimit,
      });
      this.validateDefinition(data);
      if (data.usageLimit < existing.usedCount)
        throw new ConflictException(
          'Kuota tidak boleh lebih kecil dari pemakaian tercatat',
        );
      const promotion = await tx.promotion.update({ where: { id }, data });
      await tx.auditLog.create({
        data: {
          actorId,
          action: 'promotion.update',
          entityType: 'Promotion',
          entityId: id,
          metadata: { isActive: promotion.isActive, code: promotion.code },
        },
      });
      return promotion;
    });
  }

  async remove(id: string, actorId: string) {
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "promotions" WHERE "id" = ${id}::uuid FOR UPDATE`;
      const promotion = await tx.promotion.findUnique({ where: { id } });
      if (!promotion) throw new NotFoundException('Voucher tidak ditemukan');
      if (promotion.usedCount > 0)
        throw new ConflictException(
          'Voucher yang pernah dipakai hanya dapat dinonaktifkan',
        );
      await tx.promotion.delete({ where: { id } });
      await tx.auditLog.create({
        data: {
          actorId,
          action: 'promotion.delete',
          entityType: 'Promotion',
          entityId: id,
          metadata: { code: promotion.code },
        },
      });
    });
  }

  async preview(userId: string, dto: PreviewPromotionDto) {
    return this.prisma.$transaction(async (tx) => {
      const cart = await tx.cart.findUnique({
        where: { userId },
        include: { items: { include: { product: true } } },
      });
      let subtotal = new Prisma.Decimal(0);
      for (const item of cart?.items ?? []) {
        if (item.product.status !== ProductStatus.ACTIVE)
          throw new ConflictException(
            'Keranjang berisi produk yang sudah tidak aktif',
          );
        subtotal = subtotal.plus(item.product.price.mul(item.quantity));
      }
      if (dto.productId) {
        const product = await tx.product.findFirst({
          where: { id: dto.productId, status: ProductStatus.ACTIVE },
        });
        if (!product) throw new NotFoundException('Produk tidak tersedia');
        subtotal = subtotal.plus(product.price);
      }
      if (!subtotal.isPositive())
        throw new ConflictException('Keranjang kosong');
      const promotion = await this.evaluate(
        tx,
        dto.code,
        userId,
        subtotal,
        false,
      );
      return {
        code: promotion.code,
        subtotal: subtotal.toFixed(2),
        discountAmount: promotion.discountAmount.toFixed(2),
        discountedSubtotal: subtotal.minus(promotion.discountAmount).toFixed(2),
        note: 'Estimasi belum termasuk ongkir. Kuota dikonfirmasi ulang saat checkout dan terpakai setelah order dibuat, termasuk order batal.',
      };
    });
  }

  /** Caller must keep this lock until recordRedemption and order creation commit. */
  async evaluate(
    tx: Prisma.TransactionClient,
    code: string,
    userId: string,
    subtotal: Prisma.Decimal,
    lock = true,
  ): Promise<AppliedPromotion> {
    const normalizedCode = code.trim().toUpperCase();
    if (lock)
      await tx.$queryRaw`SELECT "id" FROM "promotions" WHERE "code" = ${normalizedCode} FOR UPDATE`;
    const promotion = await tx.promotion.findUnique({
      where: { code: normalizedCode },
    });
    const now = new Date();
    if (
      !promotion ||
      !promotion.isActive ||
      promotion.startsAt > now ||
      promotion.endsAt <= now
    )
      throw new ConflictException('Voucher tidak aktif atau sudah kedaluwarsa');
    if (promotion.usedCount >= promotion.usageLimit)
      throw new ConflictException('Kuota voucher sudah habis');
    if (subtotal.lessThan(promotion.minSubtotal))
      throw new ConflictException(
        `Minimum belanja voucher Rp${promotion.minSubtotal.toFixed(0)}`,
      );
    const userCount = await tx.promotionRedemption.count({
      where: { promotionId: promotion.id, userId },
    });
    if (userCount >= promotion.perUserLimit)
      throw new ConflictException(
        'Batas penggunaan voucher akun ini sudah tercapai',
      );
    const discountAmount = this.calculateDiscount(promotion, subtotal);
    if (!discountAmount.isPositive())
      throw new ConflictException(
        'Subtotal belum cukup untuk menggunakan voucher',
      );
    return { id: promotion.id, code: promotion.code, discountAmount };
  }

  async recordRedemption(
    tx: Prisma.TransactionClient,
    promotion: AppliedPromotion,
    orderId: string,
    userId: string,
  ): Promise<void> {
    // Unique order_id protects duplicated persistence; all writes roll back together.
    await tx.promotionRedemption.create({
      data: {
        promotionId: promotion.id,
        orderId,
        userId,
        discountAmount: promotion.discountAmount,
      },
    });
    const updated = await tx.promotion.updateMany({
      where: {
        id: promotion.id,
        usedCount: {
          lt: (
            await tx.promotion.findUniqueOrThrow({
              where: { id: promotion.id },
              select: { usageLimit: true },
            })
          ).usageLimit,
        },
      },
      data: { usedCount: { increment: 1 } },
    });
    if (updated.count !== 1)
      throw new ConflictException('Kuota voucher sudah habis');
  }

  calculateDiscount(
    promotion: Pick<Promotion, 'kind' | 'amount' | 'maxDiscount'>,
    subtotal: Prisma.Decimal,
  ): Prisma.Decimal {
    let discount =
      promotion.kind === 'PERCENTAGE'
        ? subtotal.mul(promotion.amount).div(100)
        : promotion.amount;
    if (promotion.maxDiscount)
      discount = Prisma.Decimal.min(discount, promotion.maxDiscount);
    // Whole rupiah only, never change catalog prices or discount shipping. Leave at least Rp1.
    return Prisma.Decimal.max(
      0,
      Prisma.Decimal.min(discount, subtotal.minus(1)),
    ).toDecimalPlaces(0, Prisma.Decimal.ROUND_DOWN);
  }

  private toData(dto: CreatePromotionDto) {
    return {
      code: dto.code.trim().toUpperCase(),
      name: dto.name.trim(),
      kind: dto.kind,
      amount: new Prisma.Decimal(dto.amount),
      minSubtotal: new Prisma.Decimal(dto.minSubtotal),
      maxDiscount: dto.maxDiscount ? new Prisma.Decimal(dto.maxDiscount) : null,
      startsAt: new Date(dto.startsAt),
      endsAt: new Date(dto.endsAt),
      isActive: dto.isActive,
      usageLimit: dto.usageLimit,
      perUserLimit: dto.perUserLimit,
    };
  }

  private validateDefinition(
    data: ReturnType<PromotionsService['toData']>,
  ): void {
    if (
      !data.amount.isPositive() ||
      (data.kind === 'PERCENTAGE' && data.amount.greaterThan(100))
    )
      throw new BadRequestException(
        'Nominal harus positif dan persentase maksimal 100',
      );
    if (
      data.minSubtotal.isNegative() ||
      (data.maxDiscount !== null && !data.maxDiscount.isPositive())
    )
      throw new BadRequestException('Batas nominal voucher tidak valid');
    if (data.endsAt <= data.startsAt)
      throw new BadRequestException('Waktu selesai harus setelah waktu mulai');
    if (data.perUserLimit > data.usageLimit)
      throw new BadRequestException(
        'Batas per akun tidak boleh melampaui kuota total',
      );
  }
}
