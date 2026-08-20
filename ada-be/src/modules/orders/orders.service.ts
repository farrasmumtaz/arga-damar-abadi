import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '../../generated/prisma/client';
import { OrderStatus, ProductStatus } from '../../generated/prisma/enums';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CheckoutDto } from './dto/checkout.dto';
import { QueryOrderDto } from './dto/query-order.dto';

interface LockedStock {
  quantity: number;
  reserved: number;
}

const orderInclude = {
  items: true,
  payments: { orderBy: { createdAt: 'desc' as const } },
} satisfies Prisma.OrderInclude;

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async checkout(userId: string, dto: CheckoutDto) {
    const existing = await this.prisma.order.findUnique({
      where: { idempotencyKey: dto.idempotencyKey },
      include: orderInclude,
    });
    if (existing) {
      if (existing.userId !== userId)
        throw new ConflictException('Idempotency key already used');
      return existing;
    }

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        return await this.prisma.$transaction(
          async (tx) => {
            const address = await tx.address.findFirst({
              where: { id: dto.addressId, userId },
            });
            if (!address) throw new NotFoundException('Address not found');
            const cart = await tx.cart.findUnique({
              where: { userId },
              include: {
                items: {
                  include: { product: true },
                  orderBy: { productId: 'asc' },
                },
              },
            });
            if (!cart?.items.length)
              throw new ConflictException('Cart is empty');

            let subtotal = new Prisma.Decimal(0);
            for (const item of cart.items) {
              if (item.product.status !== ProductStatus.ACTIVE) {
                throw new ConflictException(
                  `${item.product.name} is no longer available`,
                );
              }
              const stocks = await tx.$queryRaw<LockedStock[]>`
              SELECT "quantity", "reserved" FROM "inventories"
              WHERE "product_id" = ${item.productId}::uuid FOR UPDATE
            `;
              const stock = stocks[0];
              const available = stock ? stock.quantity - stock.reserved : 0;
              if (available < item.quantity) {
                throw new ConflictException(
                  `Insufficient stock for ${item.product.name}`,
                );
              }
              await tx.inventory.update({
                where: { productId: item.productId },
                data: { reserved: { increment: item.quantity } },
              });
              subtotal = subtotal.plus(item.product.price.mul(item.quantity));
            }

            const shippingCost = new Prisma.Decimal(0);
            const order = await tx.order.create({
              data: {
                userId,
                orderNumber: this.createOrderNumber(),
                idempotencyKey: dto.idempotencyKey,
                subtotal,
                shippingCost,
                total: subtotal.plus(shippingCost),
                customerNote: dto.customerNote ?? null,
                shippingAddress: {
                  label: address.label,
                  recipient: address.recipient,
                  phone: address.phone,
                  addressLine: address.addressLine,
                  province: address.province,
                  city: address.city,
                  district: address.district,
                  postalCode: address.postalCode,
                },
                items: {
                  create: cart.items.map((item) => ({
                    productId: item.productId,
                    sku: item.product.sku,
                    productName: item.product.name,
                    unitPrice: item.product.price,
                    quantity: item.quantity,
                    subtotal: item.product.price.mul(item.quantity),
                  })),
                },
              },
              include: orderInclude,
            });
            await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
            return order;
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (error: unknown) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          const order = await this.prisma.order.findUnique({
            where: { idempotencyKey: dto.idempotencyKey },
            include: orderInclude,
          });
          if (order?.userId === userId) return order;
        }
        if (
          attempt < 3 &&
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2034'
        )
          continue;
        throw error;
      }
    }
    throw new ConflictException('Checkout could not be completed');
  }

  async findMine(userId: string, query: QueryOrderDto) {
    const where = { userId } satisfies Prisma.OrderWhereInput;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: { items: true },
      }),
      this.prisma.order.count({ where }),
    ]);
    return {
      data,
      meta: { ...query, total, totalPages: Math.ceil(total / query.limit) },
    };
  }

  async findOne(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: orderInclude,
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async cancel(userId: string, orderId: string) {
    return this.prisma.$transaction(
      async (tx) => {
        const order = await tx.order.findFirst({
          where: { id: orderId, userId },
          include: { items: true },
        });
        if (!order) throw new NotFoundException('Order not found');
        if (order.status !== OrderStatus.PENDING_PAYMENT) {
          throw new ConflictException(
            'Only pending payment orders can be cancelled',
          );
        }
        for (const item of order.items) {
          await tx.inventory.update({
            where: { productId: item.productId },
            data: { reserved: { decrement: item.quantity } },
          });
        }
        return tx.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.CANCELLED },
          include: orderInclude,
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  private createOrderNumber(): string {
    const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
    return `ADA-${date}-${randomUUID().slice(0, 8).toUpperCase()}`;
  }
}
