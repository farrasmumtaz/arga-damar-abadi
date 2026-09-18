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
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { ShippingCostService } from './shipping-cost.service';
import { queueNotification } from '../notifications/queue-notification';
import { PromotionsService } from '../promotions/promotions.service';

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly shippingCostService: ShippingCostService,
    private readonly promotions: PromotionsService,
  ) {}

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
            const checkoutItems = [...(cart?.items ?? [])].map((item) => ({
              productId: item.productId,
              product: item.product,
              quantity: item.quantity,
            }));
            if (dto.productId) {
              const product = await tx.product.findUnique({
                where: { id: dto.productId },
              });
              if (!product) throw new NotFoundException('Product not found');
              const existingItem = checkoutItems.find(
                (item) => item.productId === product.id,
              );
              if (existingItem) existingItem.quantity += 1;
              else
                checkoutItems.push({
                  productId: product.id,
                  product,
                  quantity: 1,
                });
            }
            checkoutItems.sort((a, b) =>
              a.productId.localeCompare(b.productId),
            );
            if (!checkoutItems.length)
              throw new ConflictException('Cart is empty');

            let subtotal = new Prisma.Decimal(0);
            let totalWeightGram = 0;
            for (const item of checkoutItems) {
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
              totalWeightGram += item.product.weightGram * item.quantity;
            }

            const shippingRate = this.shippingCostService.resolve(
              totalWeightGram,
              subtotal.toString(),
              userId,
              address.id,
              address.postalCode,
              dto.shippingQuote,
            );
            const shippingCost = new Prisma.Decimal(shippingRate.amount);
            const promotion = dto.promotionCode
              ? await this.promotions.evaluate(
                  tx,
                  dto.promotionCode,
                  userId,
                  subtotal,
                )
              : null;
            const discountAmount =
              promotion?.discountAmount ?? new Prisma.Decimal(0);
            const order = await tx.order.create({
              data: {
                userId,
                orderNumber: this.createOrderNumber(),
                idempotencyKey: dto.idempotencyKey,
                subtotal,
                shippingCost,
                shippingProvider: shippingRate.provider,
                promotionCode: promotion?.code ?? null,
                discountAmount,
                total: subtotal.plus(shippingCost).minus(discountAmount),
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
                  create: checkoutItems.map((item) => ({
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
            if (promotion)
              await this.promotions.recordRedemption(
                tx,
                promotion,
                order.id,
                userId,
              );
            if (cart)
              await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
            await queueNotification(
              tx,
              userId,
              `order:${order.id}:created`,
              `Order ${order.orderNumber} dibuat`,
              'Pesanan menunggu pembayaran. Buka akun Anda untuk melihat rincian dan melanjutkan pembayaran.',
            );
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

  findAdmin() {
    return this.prisma.order.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { fullName: true, email: true } },
        items: true,
        payments: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
  }

  async findOneAdmin(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: {
          select: { id: true, fullName: true, email: true, phone: true },
        },
        items: true,
        payments: { orderBy: { createdAt: 'desc' } },
        statusHistories: {
          orderBy: { createdAt: 'desc' },
          include: { actor: { select: { fullName: true, email: true } } },
        },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async updateStatus(
    orderId: string,
    actorId: string,
    dto: UpdateOrderStatusDto,
  ) {
    const transitions: Partial<Record<OrderStatus, OrderStatus>> = {
      [OrderStatus.PAID]: OrderStatus.PROCESSING,
      [OrderStatus.PROCESSING]: OrderStatus.SHIPPED,
      [OrderStatus.SHIPPED]: OrderStatus.DELIVERED,
    };
    return this.prisma.$transaction(
      async (tx) => {
        const order = await tx.order.findUnique({ where: { id: orderId } });
        if (!order) throw new NotFoundException('Order not found');
        if (transitions[order.status] !== dto.status) {
          throw new ConflictException(
            `Invalid order transition: ${order.status} to ${dto.status}`,
          );
        }
        const now = new Date();
        await tx.orderStatusHistory.create({
          data: {
            orderId,
            actorId,
            fromStatus: order.status,
            toStatus: dto.status,
            note: dto.note ?? null,
          },
        });
        await tx.order.update({
          where: { id: orderId },
          data: {
            status: dto.status,
            ...(dto.status === OrderStatus.SHIPPED
              ? {
                  shippingProvider: dto.shippingProvider,
                  trackingNumber: dto.trackingNumber,
                  shippedAt: now,
                }
              : {}),
            ...(dto.status === OrderStatus.DELIVERED
              ? { deliveredAt: now }
              : {}),
          },
        });
        await queueNotification(
          tx,
          order.userId,
          `order:${order.id}:${dto.status}`,
          `Order ${order.orderNumber}: ${dto.status}`,
          `Status pesanan menjadi ${dto.status}. Lihat detail pengiriman di akun Anda.`,
        );
        return tx.order.findUniqueOrThrow({
          where: { id: orderId },
          include: {
            items: true,
            payments: true,
            statusHistories: { orderBy: { createdAt: 'desc' } },
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async cancel(userId: string, orderId: string) {
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "orders" WHERE "id" = ${orderId}::uuid FOR UPDATE`;
        const order = await tx.order.findFirst({
          where: { id: orderId, userId },
          include: { items: true, payments: true },
        });
        if (!order) throw new NotFoundException('Order not found');
        if (order.status !== OrderStatus.PENDING_PAYMENT) {
          throw new ConflictException(
            'Only pending payment orders can be cancelled',
          );
        }
        if (order.payments.some((payment) => payment.provider === 'MIDTRANS')) {
          throw new ConflictException(
            'Pembayaran sudah diterbitkan. Tunggu pembatalan atau kedaluwarsa dikonfirmasi provider sebelum stok dilepas.',
          );
        }
        for (const item of order.items) {
          await tx.inventory.update({
            where: { productId: item.productId },
            data: { reserved: { decrement: item.quantity } },
          });
        }
        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            actorId: userId,
            fromStatus: order.status,
            toStatus: OrderStatus.CANCELLED,
            note: 'Cancelled by customer',
          },
        });
        return tx.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.CANCELLED, cancelledAt: new Date() },
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
