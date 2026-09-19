import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { ShippingCostService } from '../orders/shipping-cost.service';
import { reserveWarehouseStock } from '../warehouses/warehouse-stock';

@Injectable()
export class QuotationOrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly shipping: ShippingCostService,
  ) {}
  async convert(userId: string, quotationId: string, addressId: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "quotations" WHERE "id" = ${quotationId}::uuid FOR UPDATE`;
      const quote = await tx.quotation.findFirst({
        where: { id: quotationId, userId },
        include: {
          order: true,
          items: { include: { product: true }, orderBy: { productId: 'asc' } },
        },
      });
      if (!quote) throw new NotFoundException('Quotation not found');
      if (quote.order) return quote.order;
      if (quote.status !== 'ACCEPTED')
        throw new ConflictException('Terima penawaran terlebih dahulu');
      if (
        !quote.items.length ||
        quote.items.some(
          (item) => !item.product || !item.unitPrice?.isPositive(),
        )
      )
        throw new ConflictException(
          'Semua item harus terhubung ke produk katalog dan memiliki harga sebelum dibuat order',
        );
      const address = await tx.address.findFirst({
        where: { id: addressId, userId },
      });
      if (!address) throw new NotFoundException('Address not found');
      let subtotal = new Prisma.Decimal(0);
      let weight = 0;
      const items: Prisma.OrderItemCreateWithoutOrderInput[] = [];
      for (const item of quote.items) {
        const product = item.product!;
        if (product.status !== 'ACTIVE')
          throw new ConflictException(`${product.name} tidak tersedia`);
        await tx.$queryRaw`SELECT "id" FROM "inventories" WHERE "product_id" = ${product.id}::uuid FOR UPDATE`;
        const stock = await tx.inventory.findUnique({
          where: { productId: product.id },
        });
        if (!stock || stock.quantity - stock.reserved < item.quantity)
          throw new ConflictException(`Stok ${product.name} tidak cukup`);
        await tx.inventory.update({
          where: { productId: product.id },
          data: { reserved: { increment: item.quantity } },
        });
        const lineTotal = item.unitPrice!.mul(item.quantity);
        subtotal = subtotal.plus(lineTotal);
        weight += product.weightGram * item.quantity;
        items.push({
          product: { connect: { id: product.id } },
          sku: product.sku,
          productName: product.name,
          unitPrice: item.unitPrice!,
          quantity: item.quantity,
          subtotal: lineTotal,
        });
      }
      const shippingCost = this.shipping.calculate(weight);
      const order = await tx.order.create({
        data: {
          userId,
          quotationId,
          orderNumber: `ADA-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${randomUUID().slice(0, 8).toUpperCase()}`,
          idempotencyKey: `quotation-${quotationId}`,
          subtotal,
          shippingCost,
          total: subtotal.plus(shippingCost),
          customerNote: `Quotation ${quote.quotationNumber}`,
          shippingAddress: {
            recipient: address.recipient,
            phone: address.phone,
            addressLine: address.addressLine,
            province: address.province,
            city: address.city,
            district: address.district,
            postalCode: address.postalCode,
          },
          items: { create: items },
        },
      });
      const allocations = new Map<string, number>();
      for (const item of quote.items)
        allocations.set(
          item.product!.id,
          (allocations.get(item.product!.id) ?? 0) + item.quantity,
        );
      for (const [productId, quantity] of allocations)
        await reserveWarehouseStock(tx, order.id, productId, quantity);
      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: 'QUOTATION_TO_ORDER',
          entityType: 'Order',
          entityId: order.id,
          metadata: { quotationId },
        },
      });
      return order;
    });
  }
}
