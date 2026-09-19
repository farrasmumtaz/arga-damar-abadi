import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  PurchaseOrderStatus,
  StockMovementType,
} from '../../generated/prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import {
  ProcurementQueryDto,
  PurchaseOrderDto,
  SupplierDto,
} from './dto/procurement.dto';
import { adjustWarehouseStock } from '../warehouses/warehouse-stock';

const orderInclude = {
  warehouse: { select: { id: true, code: true, name: true } },
  supplier: true,
  items: { orderBy: { sku: 'asc' as const } },
} satisfies Prisma.PurchaseOrderInclude;
interface LockedInventory {
  id: string;
  quantity: number;
}

@Injectable()
export class ProcurementService {
  constructor(private readonly prisma: PrismaService) {}

  async suppliers(query: ProcurementQueryDto) {
    const where: Prisma.SupplierWhereInput = query.search
      ? {
          OR: [
            { name: { contains: query.search.trim(), mode: 'insensitive' } },
            { code: { contains: query.search.trim(), mode: 'insensitive' } },
          ],
        }
      : {};
    const [data, total] = await this.prisma.$transaction([
      this.prisma.supplier.findMany({
        where,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.supplier.count({ where }),
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
  async supplier(id: string) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id } });
    if (!supplier) throw new NotFoundException('Supplier tidak ditemukan.');
    return supplier;
  }
  async saveSupplier(actorId: string, dto: SupplierDto, id?: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        if (
          id &&
          !(await tx.supplier.findUnique({
            where: { id },
            select: { id: true },
          }))
        )
          throw new NotFoundException('Supplier tidak ditemukan.');
        const data = {
          ...dto,
          contactName: dto.contactName || null,
          email: dto.email?.trim().toLowerCase() || null,
          phone: dto.phone || null,
          address: dto.address || null,
        };
        const saved = id
          ? await tx.supplier.update({ where: { id }, data })
          : await tx.supplier.create({ data });
        await this.audit(
          tx,
          actorId,
          id ? 'SUPPLIER_UPDATED' : 'SUPPLIER_CREATED',
          'Supplier',
          saved.id,
        );
        return saved;
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new ConflictException('Kode supplier sudah digunakan.');
      throw error;
    }
  }
  async removeSupplier(actorId: string, id: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.supplier.delete({ where: { id } });
        await this.audit(tx, actorId, 'SUPPLIER_DELETED', 'Supplier', id);
        return { message: 'Supplier dihapus.' };
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      )
        throw new ConflictException(
          'Supplier memiliki purchase order. Nonaktifkan supplier untuk mempertahankan riwayat.',
        );
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      )
        throw new NotFoundException('Supplier tidak ditemukan.');
      throw error;
    }
  }
  async orders(query: ProcurementQueryDto) {
    const where: Prisma.PurchaseOrderWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              {
                purchaseNumber: {
                  contains: query.search.trim(),
                  mode: 'insensitive',
                },
              },
              {
                supplierName: {
                  contains: query.search.trim(),
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.purchaseOrder.findMany({
        where,
        include: orderInclude,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.purchaseOrder.count({ where }),
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
  async order(id: string) {
    const order = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: orderInclude,
    });
    if (!order) throw new NotFoundException('Purchase order tidak ditemukan.');
    return order;
  }
  async saveOrder(actorId: string, dto: PurchaseOrderDto, id?: string) {
    if (
      new Set(dto.items.map((item) => item.productId)).size !== dto.items.length
    )
      throw new BadRequestException(
        'Produk yang sama harus digabung dalam satu baris.',
      );
    return this.prisma.$transaction(async (tx) => {
      if (id) {
        await tx.$queryRaw`SELECT "id" FROM "purchase_orders" WHERE "id" = ${id}::uuid FOR UPDATE`;
        const current = await tx.purchaseOrder.findUnique({ where: { id } });
        if (!current)
          throw new NotFoundException('Purchase order tidak ditemukan.');
        if (current.status !== PurchaseOrderStatus.DRAFT)
          throw new ConflictException('Hanya draft yang dapat diubah.');
      }
      const supplier = await tx.supplier.findUnique({
        where: { id: dto.supplierId },
      });
      if (!supplier?.isActive)
        throw new BadRequestException('Pilih supplier aktif.');
      const products = await tx.product.findMany({
        where: { id: { in: dto.items.map((item) => item.productId) } },
        select: { id: true, sku: true, name: true },
      });
      if (products.length !== dto.items.length)
        throw new BadRequestException('Produk purchase order tidak ditemukan.');
      const productMap = new Map(
        products.map((product) => [product.id, product]),
      );
      const items = dto.items.map((item) => {
        const product = productMap.get(item.productId)!;
        const unitCost = new Prisma.Decimal(item.unitCost);
        return {
          productId: item.productId,
          sku: product.sku,
          productName: product.name,
          quantity: item.quantity,
          unitCost,
          subtotal: unitCost.mul(item.quantity),
        };
      });
      const total = items.reduce(
        (value, item) => value.add(item.subtotal),
        new Prisma.Decimal(0),
      );
      if (total.gt('9999999999999.99'))
        throw new BadRequestException(
          'Total purchase order melebihi batas nominal.',
        );
      const data = {
        supplierId: supplier.id,
        supplierName: supplier.name,
        total,
        note: dto.note || null,
      };
      const order = id
        ? await tx.purchaseOrder.update({
            where: { id },
            data: { ...data, items: { deleteMany: {}, create: items } },
            include: orderInclude,
          })
        : await tx.purchaseOrder.create({
            data: {
              ...data,
              actorId,
              purchaseNumber: `PO-${randomUUID()}`,
              items: { create: items },
            },
            include: orderInclude,
          });
      await this.audit(
        tx,
        actorId,
        id ? 'PURCHASE_ORDER_UPDATED' : 'PURCHASE_ORDER_CREATED',
        'PurchaseOrder',
        order.id,
      );
      return order;
    });
  }
  async transition(
    actorId: string,
    id: string,
    action: 'issue' | 'receive' | 'cancel',
    warehouseId?: string,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "purchase_orders" WHERE "id" = ${id}::uuid FOR UPDATE`;
        const current = await tx.purchaseOrder.findUnique({
          where: { id },
          include: orderInclude,
        });
        if (!current)
          throw new NotFoundException('Purchase order tidak ditemukan.');
        const target = {
          issue: PurchaseOrderStatus.ISSUED,
          receive: PurchaseOrderStatus.RECEIVED,
          cancel: PurchaseOrderStatus.CANCELLED,
        }[action];
        // The PO row serializes receipt retries: only the first request writes stock.
        if (current.status === target) {
          if (
            action === 'receive' &&
            warehouseId &&
            warehouseId !== current.warehouseId
          )
            throw new ConflictException(
              'PO sudah diterima di gudang yang berbeda.',
            );
          return current;
        }
        const allowed =
          action === 'issue'
            ? current.status === PurchaseOrderStatus.DRAFT
            : action === 'receive'
              ? current.status === PurchaseOrderStatus.ISSUED
              : [PurchaseOrderStatus.DRAFT, PurchaseOrderStatus.ISSUED].some(
                  (status) => status === current.status,
                );
        if (!allowed)
          throw new ConflictException(
            'Transisi status purchase order tidak diizinkan.',
          );
        if (action === 'issue' && !current.supplier.isActive)
          throw new ConflictException(
            'Supplier harus aktif sebelum PO diterbitkan.',
          );
        let receivedWarehouseId: string | undefined;
        if (action === 'receive') {
          if (!current.items.length)
            throw new ConflictException(
              'Purchase order tanpa item tidak dapat diterima.',
            );
          // Stable product lock ordering matches checkout and refund operations.
          for (const item of [...current.items].sort((a, b) =>
            a.productId.localeCompare(b.productId),
          )) {
            await tx.inventory.upsert({
              where: { productId: item.productId },
              create: { productId: item.productId },
              update: {},
            });
            const rows = await tx.$queryRaw<
              LockedInventory[]
            >`SELECT "id", "quantity" FROM "inventories" WHERE "product_id" = ${item.productId}::uuid FOR UPDATE`;
            const inventory = rows[0];
            if (!inventory)
              throw new ConflictException('Inventory produk tidak tersedia.');
            const quantityAfter = inventory.quantity + item.quantity;
            if (quantityAfter > 2147483647)
              throw new ConflictException('Stok melebihi batas penyimpanan.');
            await tx.inventory.update({
              where: { id: inventory.id },
              data: { quantity: quantityAfter },
            });
            const warehouseStock = await adjustWarehouseStock(
              tx,
              item.productId,
              item.quantity,
              warehouseId,
            );
            receivedWarehouseId = warehouseStock.warehouseId;
            await tx.stockMovement.create({
              data: {
                productId: item.productId,
                actorId,
                warehouseId: warehouseStock.warehouseId,
                type: StockMovementType.PURCHASE_RECEIPT,
                quantityBefore: inventory.quantity,
                quantityDelta: item.quantity,
                quantityAfter,
                reason: `Penerimaan ${current.purchaseNumber}`,
              },
            });
          }
        }
        const now = new Date();
        const result = await tx.purchaseOrder.update({
          where: { id },
          data: {
            status: target,
            ...(action === 'issue'
              ? { issuedAt: now }
              : action === 'receive'
                ? { receivedAt: now, warehouseId: receivedWarehouseId }
                : { cancelledAt: now }),
          },
          include: orderInclude,
        });
        await this.audit(
          tx,
          actorId,
          `PURCHASE_ORDER_${target}`,
          'PurchaseOrder',
          id,
        );
        return result;
      },
      { timeout: 20000 },
    );
  }
  private async audit(
    tx: Prisma.TransactionClient,
    actorId: string,
    action: string,
    entityType: string,
    entityId: string,
  ) {
    await tx.auditLog.create({
      data: { actorId, action, entityType, entityId },
    });
  }
}
