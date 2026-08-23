import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CreateQuotationDto } from './dto/create-quotation.dto';
import { UpdateQuotationDto } from './dto/update-quotation.dto';

@Injectable()
export class QuotationsService {
  constructor(private readonly prisma: PrismaService) {}
  async create(userId: string, dto: CreateQuotationDto) {
    if (dto.items.some((item) => !item.productId)) {
      return this.createRecord(userId, dto);
    }
    const ids = dto.items.map((item) => item.productId as string);
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
    return this.prisma.quotation.create({
      data: {
        userId,
        quotationNumber: `QUO-${date}-${randomUUID().slice(0, 8).toUpperCase()}`,
        projectName: dto.projectName,
        companyName: dto.companyName ?? null,
        contactName: dto.contactName,
        contactPhone: dto.contactPhone,
        notes: dto.notes ?? null,
        items: { create: dto.items },
      },
      include: { items: true },
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
  async update(id: string, dto: UpdateQuotationDto) {
    return this.prisma.$transaction(async (tx) => {
      const quotation = await tx.quotation.findUnique({
        where: { id },
        select: { id: true },
      });
      if (!quotation) throw new NotFoundException('Quotation not found');
      if (dto.items)
        for (const item of dto.items)
          await tx.quotationItem.updateMany({
            where: { id: item.id, quotationId: id },
            data: { unitPrice: new Prisma.Decimal(item.unitPrice) },
          });
      return tx.quotation.update({
        where: { id },
        data: { status: dto.status, validUntil: dto.validUntil },
        include: { items: true },
      });
    });
  }
}
