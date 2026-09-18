import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '../../generated/prisma/client';
import { QuotationStatus } from '../../generated/prisma/enums';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CreateQuotationDto } from './dto/create-quotation.dto';
import { UpdateQuotationDto } from './dto/update-quotation.dto';
import { queueNotification } from '../notifications/queue-notification';

@Injectable()
export class QuotationsService {
  constructor(private readonly prisma: PrismaService) {}
  async create(userId: string, dto: CreateQuotationDto) {
    const ids = dto.items.flatMap((item) =>
      item.productId ? [item.productId] : [],
    );
    const products = await this.prisma.product.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    if (new Set(products.map((item) => item.id)).size !== new Set(ids).size)
      throw new NotFoundException('One or more products not found');
    return this.createRecord(userId, dto);
  }
  private createRecord(userId: string, dto: CreateQuotationDto) {
    const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
    return this.prisma.$transaction(async (tx) => {
      if (dto.attachmentId) {
        await tx.$queryRaw`SELECT "id" FROM "media_assets" WHERE "id" = ${dto.attachmentId}::uuid FOR UPDATE`;
        const attachment = await tx.mediaAsset.findFirst({
          where: { id: dto.attachmentId, ownerId: userId, purpose: 'BOQ' },
        });
        if (!attachment) throw new NotFoundException('Attachment not found');
      }
      const quotation = await tx.quotation.create({
        data: {
          userId,
          quotationNumber: `QUO-${date}-${randomUUID().slice(0, 8).toUpperCase()}`,
          projectName: dto.projectName,
          companyName: dto.companyName ?? null,
          contactName: dto.contactName,
          contactPhone: dto.contactPhone,
          notes: dto.notes ?? null,
          attachmentId: dto.attachmentId,
          items: { create: dto.items },
        },
        include: { items: true },
      });
      await queueNotification(
        tx,
        userId,
        `quotation:${quotation.id}:submitted`,
        `Permintaan ${quotation.quotationNumber}`,
        'Permintaan penawaran Anda telah diterima.',
      );
      return quotation;
    });
  }
  findMine(userId: string) {
    return this.prisma.quotation.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });
  }
  async findOne(userId: string, id: string) {
    const result = await this.prisma.quotation.findFirst({
      where: { id, userId },
      include: { items: true },
    });
    if (!result) throw new NotFoundException('Quotation not found');
    return result;
  }
  findAdmin() {
    return this.prisma.quotation.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { fullName: true, email: true } },
        items: true,
      },
    });
  }
  async findOneAdmin(id: string) {
    const quotation = await this.prisma.quotation.findUnique({
      where: { id },
      include: {
        user: { select: { fullName: true, email: true, phone: true } },
        items: {
          include: { product: { select: { name: true, sku: true } } },
        },
      },
    });
    if (!quotation) throw new NotFoundException('Quotation not found');
    return quotation;
  }
  async update(id: string, dto: UpdateQuotationDto) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "quotations" WHERE "id" = ${id}::uuid FOR UPDATE`;
      const quotation = await tx.quotation.findUnique({
        where: { id },
        include: { items: true },
      });
      if (!quotation) throw new NotFoundException('Quotation not found');
      const allowed: QuotationStatus[] =
        quotation.status === QuotationStatus.SUBMITTED
          ? [QuotationStatus.REVIEWING, QuotationStatus.REJECTED]
          : quotation.status === QuotationStatus.REVIEWING
            ? [QuotationStatus.QUOTED, QuotationStatus.REJECTED]
            : quotation.status === QuotationStatus.QUOTED
              ? [QuotationStatus.EXPIRED]
              : [];
      if (!allowed.includes(dto.status)) {
        throw new ConflictException(
          `Invalid quotation transition: ${quotation.status} to ${dto.status}`,
        );
      }
      if (dto.status === QuotationStatus.QUOTED) {
        if (!dto.validUntil || dto.validUntil <= new Date()) {
          throw new BadRequestException('Future validUntil is required');
        }
        const prices = new Map(
          dto.items?.map((item) => [item.id, item.unitPrice]) ?? [],
        );
        if (quotation.items.some((item) => !prices.has(item.id))) {
          throw new BadRequestException(
            'Every quotation item requires a unit price',
          );
        }
      }
      if (dto.items)
        for (const item of dto.items)
          await tx.quotationItem.updateMany({
            where: { id: item.id, quotationId: id },
            data: { unitPrice: new Prisma.Decimal(item.unitPrice) },
          });
      await queueNotification(
        tx,
        quotation.userId,
        `quotation:${id}:${dto.status}`,
        `Penawaran ${quotation.quotationNumber}: ${dto.status}`,
        'Status penawaran diperbarui. Buka akun Anda untuk melihat rincian harga dan masa berlaku.',
      );
      return tx.quotation.update({
        where: { id },
        data: { status: dto.status, validUntil: dto.validUntil },
        include: { items: true },
      });
    });
  }
  async decide(
    userId: string,
    id: string,
    decision: typeof QuotationStatus.ACCEPTED | typeof QuotationStatus.REJECTED,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "quotations" WHERE "id" = ${id}::uuid FOR UPDATE`;
      const quotation = await tx.quotation.findFirst({
        where: { id, userId },
      });
      if (!quotation) throw new NotFoundException('Quotation not found');
      if (quotation.status !== QuotationStatus.QUOTED) {
        throw new ConflictException('Quotation is not awaiting a decision');
      }
      if (quotation.validUntil && quotation.validUntil < new Date()) {
        throw new ConflictException('Quotation has expired');
      }
      return tx.quotation.update({
        where: { id },
        data: { status: decision },
        include: { items: true },
      });
    });
  }
}
