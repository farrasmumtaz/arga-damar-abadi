import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { QueryInventoryDto } from './dto/query-inventory.dto';
import { adjustWarehouseStock } from '../warehouses/warehouse-stock';

interface LockedInventory {
  id: string;
  quantity: number;
  reserved: number;
}

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryInventoryDto) {
    const where: Prisma.InventoryWhereInput = {
      ...(query.search
        ? {
            product: {
              OR: [
                {
                  name: { contains: query.search.trim(), mode: 'insensitive' },
                },
                { sku: { contains: query.search.trim(), mode: 'insensitive' } },
              ],
            },
          }
        : {}),
      ...(query.lowStockOnly
        ? { quantity: { lte: this.prisma.inventory.fields.lowStockLevel } }
        : {}),
    };
    const skip = (query.page - 1) * query.limit;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.inventory.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          product: {
            select: { id: true, sku: true, name: true, status: true },
          },
        },
      }),
      this.prisma.inventory.count({ where }),
    ]);
    return {
      data: data.map((item) => ({
        ...item,
        available: Math.max(0, item.quantity - item.reserved),
        isLowStock: item.quantity - item.reserved <= item.lowStockLevel,
      })),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async findOne(productId: string) {
    const inventory = await this.prisma.inventory.findUnique({
      where: { productId },
      include: {
        product: { select: { id: true, sku: true, name: true, status: true } },
      },
    });
    if (!inventory) throw new NotFoundException('Product inventory not found');
    return {
      ...inventory,
      available: Math.max(0, inventory.quantity - inventory.reserved),
      isLowStock:
        inventory.quantity - inventory.reserved <= inventory.lowStockLevel,
    };
  }

  async findMovements(productId: string) {
    await this.ensureProduct(productId);
    return this.prisma.stockMovement.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        actor: { select: { id: true, fullName: true, email: true } },
      },
    });
  }

  async adjust(productId: string, actorId: string, dto: AdjustStockDto) {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        return await this.prisma.$transaction(
          async (tx) => {
            await this.ensureProduct(productId, tx);
            await tx.inventory.upsert({
              where: { productId },
              create: { productId },
              update: {},
            });
            const rows = await tx.$queryRaw<LockedInventory[]>`
              SELECT "id", "quantity", "reserved"
              FROM "inventories"
              WHERE "product_id" = ${productId}::uuid
              FOR UPDATE
            `;
            const current = rows[0];
            if (!current)
              throw new NotFoundException('Product inventory not found');
            const quantityAfter = current.quantity + dto.quantityDelta;
            if (quantityAfter < current.reserved) {
              throw new ConflictException(
                `Stock cannot be lower than reserved quantity (${current.reserved})`,
              );
            }
            const inventory = await tx.inventory.update({
              where: { id: current.id },
              data: { quantity: quantityAfter },
            });
            const warehouseStock = await adjustWarehouseStock(
              tx,
              productId,
              dto.quantityDelta,
              dto.warehouseId,
            );
            const movement = await tx.stockMovement.create({
              data: {
                productId,
                actorId,
                warehouseId: warehouseStock.warehouseId,
                quantityBefore: current.quantity,
                quantityDelta: dto.quantityDelta,
                quantityAfter,
                reason: dto.reason,
              },
            });
            return { inventory, movement };
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (error: unknown) {
        if (
          attempt < 3 &&
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2034'
        ) {
          continue;
        }
        throw error;
      }
    }
    throw new ConflictException('Stock adjustment could not be completed');
  }

  async updateThreshold(productId: string, lowStockLevel: number) {
    await this.ensureProduct(productId);
    return this.prisma.inventory.upsert({
      where: { productId },
      create: { productId, lowStockLevel },
      update: { lowStockLevel },
    });
  }

  private async ensureProduct(
    productId: string,
    client: Prisma.TransactionClient | PrismaService = this.prisma,
  ): Promise<void> {
    const product = await client.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });
    if (!product) throw new NotFoundException('Product not found');
  }
}
