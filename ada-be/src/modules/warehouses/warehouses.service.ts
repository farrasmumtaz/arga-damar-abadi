import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import {
  TransferStockDto,
  WarehouseDto,
  WarehouseQueryDto,
} from './dto/warehouses.dto';
import { assertWarehouseBalance } from './warehouse-stock';

interface TransferStock {
  id: string;
  warehouseId: string;
  quantity: number;
  reserved: number;
}
@Injectable()
export class WarehousesService {
  constructor(private readonly prisma: PrismaService) {}
  list(query: WarehouseQueryDto) {
    return this.prisma.warehouse.findMany({
      where: query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { code: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {},
      orderBy: { code: 'asc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });
  }
  async save(actorId: string, dto: WarehouseDto, id?: string) {
    if (dto.code === 'DEFAULT' && !id)
      throw new BadRequestException(
        'Kode DEFAULT disediakan untuk gudang utama.',
      );
    try {
      return await this.prisma.$transaction(async (tx) => {
        if (id) {
          const warehouse = await tx.warehouse.findUnique({ where: { id } });
          if (!warehouse)
            throw new NotFoundException('Gudang tidak ditemukan.');
          if (warehouse.code !== dto.code)
            throw new ConflictException(
              'Kode gudang tidak dapat diubah untuk menjaga referensi operasional.',
            );
        }
        const result = id
          ? await tx.warehouse.update({
              where: { id },
              data: { name: dto.name },
            })
          : await tx.warehouse.create({ data: dto });
        await tx.auditLog.create({
          data: {
            actorId,
            action: id ? 'WAREHOUSE_UPDATED' : 'WAREHOUSE_CREATED',
            entityType: 'Warehouse',
            entityId: result.id,
          },
        });
        return result;
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new ConflictException('Kode gudang sudah digunakan.');
      throw error;
    }
  }
  async stocks(query: WarehouseQueryDto) {
    const where: Prisma.WarehouseStockWhereInput = {
      ...(query.warehouseId ? { warehouseId: query.warehouseId } : {}),
      ...(query.search
        ? {
            product: {
              OR: [
                { sku: { contains: query.search, mode: 'insensitive' } },
                { name: { contains: query.search, mode: 'insensitive' } },
              ],
            },
          }
        : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.warehouseStock.findMany({
        where,
        include: {
          warehouse: { select: { code: true, name: true } },
          product: { select: { sku: true, name: true } },
        },
        orderBy: [{ productId: 'asc' }, { warehouseId: 'asc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.warehouseStock.count({ where }),
    ]);
    return {
      data: data.map((row) => ({
        ...row,
        available: row.quantity - row.reserved,
      })),
      meta: {
        page: query.page,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }
  async transfers(query: WarehouseQueryDto) {
    const where: Prisma.WarehouseTransferWhereInput = query.warehouseId
      ? {
          OR: [
            { fromWarehouseId: query.warehouseId },
            { toWarehouseId: query.warehouseId },
          ],
        }
      : {};
    const [data, total] = await this.prisma.$transaction([
      this.prisma.warehouseTransfer.findMany({
        where,
        include: {
          fromWarehouse: { select: { code: true } },
          toWarehouse: { select: { code: true } },
          product: { select: { sku: true, name: true } },
          actor: { select: { fullName: true } },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.warehouseTransfer.count({ where }),
    ]);
    return {
      data,
      meta: {
        page: query.page,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }
  async transfer(actorId: string, dto: TransferStockDto) {
    if (dto.fromWarehouseId === dto.toWarehouseId)
      throw new BadRequestException('Gudang asal dan tujuan harus berbeda.');
    return this.prisma.$transaction(async (tx) => {
      // Serialize the same request key even when retries supply another product.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${dto.idempotencyKey}, 0))`;
      const existing = await tx.warehouseTransfer.findUnique({
        where: { id: dto.idempotencyKey },
      });
      if (existing) {
        if (
          existing.actorId !== actorId ||
          existing.productId !== dto.productId ||
          existing.fromWarehouseId !== dto.fromWarehouseId ||
          existing.toWarehouseId !== dto.toWarehouseId ||
          existing.quantity !== dto.quantity ||
          existing.reason !== dto.reason
        )
          throw new ConflictException(
            'Idempotency key digunakan untuk transfer berbeda.',
          );
        return existing;
      }
      const aggregate = await tx.$queryRaw<
        Array<{ id: string }>
      >`SELECT id FROM inventories WHERE product_id = ${dto.productId}::uuid FOR UPDATE`;
      if (!aggregate.length)
        throw new NotFoundException('Inventory produk tidak ditemukan.');
      const warehouses = await tx.warehouse.count({
        where: {
          id: { in: [dto.fromWarehouseId, dto.toWarehouseId] },
          isActive: true,
        },
      });
      if (warehouses !== 2)
        throw new NotFoundException('Gudang aktif tidak ditemukan.');
      await tx.warehouseStock.upsert({
        where: {
          warehouseId_productId: {
            warehouseId: dto.toWarehouseId,
            productId: dto.productId,
          },
        },
        create: { warehouseId: dto.toWarehouseId, productId: dto.productId },
        update: {},
      });
      const stocks = await tx.$queryRaw<
        TransferStock[]
      >`SELECT id, warehouse_id AS "warehouseId", quantity, reserved FROM warehouse_stocks WHERE product_id = ${dto.productId}::uuid AND warehouse_id IN (${dto.fromWarehouseId}::uuid, ${dto.toWarehouseId}::uuid) ORDER BY warehouse_id FOR UPDATE`;
      const source = stocks.find(
        (row) => row.warehouseId === dto.fromWarehouseId,
      );
      const target = stocks.find(
        (row) => row.warehouseId === dto.toWarehouseId,
      );
      if (
        !source ||
        !target ||
        source.quantity - source.reserved < dto.quantity
      )
        throw new ConflictException(
          'Stok tersedia gudang asal tidak mencukupi. Stok terreservasi tidak boleh dipindahkan.',
        );
      if (target.quantity + dto.quantity > 2147483647)
        throw new ConflictException(
          'Saldo gudang tujuan melampaui batas penyimpanan.',
        );
      await tx.warehouseStock.update({
        where: { id: source.id },
        data: { quantity: { decrement: dto.quantity } },
      });
      await tx.warehouseStock.update({
        where: { id: target.id },
        data: { quantity: { increment: dto.quantity } },
      });
      await assertWarehouseBalance(tx, [dto.productId]);
      const transfer = await tx.warehouseTransfer.create({
        data: {
          id: dto.idempotencyKey,
          actorId,
          productId: dto.productId,
          fromWarehouseId: dto.fromWarehouseId,
          toWarehouseId: dto.toWarehouseId,
          quantity: dto.quantity,
          reason: dto.reason,
        },
      });
      await tx.stockMovement.createMany({
        data: [
          {
            productId: dto.productId,
            warehouseId: dto.fromWarehouseId,
            actorId,
            type: 'WAREHOUSE_TRANSFER',
            quantityBefore: source.quantity,
            quantityDelta: -dto.quantity,
            quantityAfter: source.quantity - dto.quantity,
            reason: dto.reason,
          },
          {
            productId: dto.productId,
            warehouseId: dto.toWarehouseId,
            actorId,
            type: 'WAREHOUSE_TRANSFER',
            quantityBefore: target.quantity,
            quantityDelta: dto.quantity,
            quantityAfter: target.quantity + dto.quantity,
            reason: dto.reason,
          },
        ],
      });
      await tx.auditLog.create({
        data: {
          actorId,
          action: 'WAREHOUSE_TRANSFER',
          entityType: 'WarehouseTransfer',
          entityId: transfer.id,
          metadata: {
            productId: dto.productId,
            fromWarehouseId: dto.fromWarehouseId,
            toWarehouseId: dto.toWarehouseId,
            quantity: dto.quantity,
          },
        },
      });
      return transfer;
    });
  }
}
