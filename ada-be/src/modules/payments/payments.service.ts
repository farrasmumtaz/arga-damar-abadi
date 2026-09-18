import { createHash, timingSafeEqual } from 'node:crypto';
import {
  BadGatewayException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '../../generated/prisma/client';
import { OrderStatus, PaymentStatus } from '../../generated/prisma/enums';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { MidtransNotificationDto } from './dto/midtrans-notification.dto';
import { MidtransClient, type MidtransStatus } from './midtrans.client';
import { RefundDto } from './dto/refund.dto';
import { queueNotification } from '../notifications/queue-notification';

export interface SnapResponse {
  token: string;
  redirect_url: string;
}

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly midtrans: MidtransClient,
  ) {}

  async createSession(userId: string, orderId: string) {
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "orders" WHERE "id" = ${orderId}::uuid FOR UPDATE`;
        const order = await tx.order.findFirst({
          where: { id: orderId, userId },
          include: { user: true, items: true, payments: true },
        });
        if (!order) throw new NotFoundException('Order not found');
        if (order.status !== OrderStatus.PENDING_PAYMENT)
          throw new ConflictException('Order is not awaiting payment');
        const expiry = new Date(
          order.createdAt.getTime() +
            this.config.get<number>('ORDER_PAYMENT_TTL_MINUTES', 60) * 60_000,
        );
        if (expiry <= new Date())
          throw new ConflictException('Payment window has expired');
        const pendingPayment = order.payments.find(
          (payment) => payment.provider === 'MIDTRANS',
        );
        const storedPayload = pendingPayment?.providerPayload;
        if (
          storedPayload &&
          typeof storedPayload === 'object' &&
          !Array.isArray(storedPayload) &&
          typeof storedPayload.token === 'string' &&
          typeof storedPayload.redirect_url === 'string'
        ) {
          return {
            token: storedPayload.token,
            redirect_url: storedPayload.redirect_url,
          };
        }
        const key = this.serverKey();
        const baseUrl = this.config.get<boolean>('MIDTRANS_IS_PRODUCTION')
          ? 'https://app.midtrans.com'
          : 'https://app.sandbox.midtrans.com';
        const response = await fetch(`${baseUrl}/snap/v1/transactions`, {
          method: 'POST',
          signal: AbortSignal.timeout(15_000),
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Basic ${Buffer.from(`${key}:`).toString('base64')}`,
          },
          body: JSON.stringify({
            transaction_details: {
              order_id: order.orderNumber,
              gross_amount: order.total.toNumber(),
            },
            expiry: {
              unit: 'minutes',
              duration: Math.max(
                1,
                Math.ceil((expiry.getTime() - Date.now()) / 60_000),
              ),
            },
            customer_details: {
              first_name: order.user.fullName,
              email: order.user.email,
              phone: order.user.phone,
            },
            item_details: [
              ...order.items.map((item) => ({
                id: item.sku,
                price: item.unitPrice.toNumber(),
                quantity: item.quantity,
                name: item.productName,
              })),
              ...(order.shippingCost.isPositive()
                ? [
                    {
                      id: 'SHIPPING',
                      price: order.shippingCost.toNumber(),
                      quantity: 1,
                      name: 'Biaya pengiriman',
                    },
                  ]
                : []),
            ],
            callbacks: {
              finish: `${this.config.getOrThrow<string>('FRONTEND_URL')}/payment/finish`,
            },
          }),
        });
        if (!response.ok)
          throw new BadGatewayException('Midtrans transaction creation failed');
        const snap = (await response.json()) as SnapResponse;
        await tx.payment.upsert({
          where: { externalId: order.orderNumber },
          create: {
            orderId,
            provider: 'MIDTRANS',
            externalId: order.orderNumber,
            amount: order.total,
            providerPayload: {
              token: snap.token,
              redirect_url: snap.redirect_url,
            },
          },
          update: {
            providerPayload: {
              token: snap.token,
              redirect_url: snap.redirect_url,
            },
          },
        });
        return snap;
      },
      { timeout: 25_000 },
    );
  }

  async handleNotification(dto: MidtransNotificationDto) {
    this.verifySignature(dto);
    // Signature doesn't cover transaction_status; obtain authoritative status from the provider.
    const status = await this.midtrans.request(dto.order_id, 'status');
    if (!status) throw new NotFoundException('Payment not found at provider');
    return this.applyStatus(status);
  }

  async applyStatus(dto: MidtransStatus) {
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "orders" WHERE "order_number" = ${dto.order_id} FOR UPDATE`;
        const order = await tx.order.findUnique({
          where: { orderNumber: dto.order_id },
          include: { items: true, payments: true },
        });
        if (!order) throw new NotFoundException('Order not found');
        const payment = order.payments.find(
          (item) => item.provider === 'MIDTRANS',
        );
        if (!payment) throw new NotFoundException('Payment not found');
        if (!new Prisma.Decimal(dto.gross_amount).equals(order.total))
          throw new ConflictException('Payment amount mismatch');

        const successful =
          ['settlement', 'capture'].includes(dto.transaction_status) &&
          (!dto.fraud_status || dto.fraud_status === 'accept');
        const expired = ['expire', 'cancel', 'deny'].includes(
          dto.transaction_status,
        );
        if (payment.status === PaymentStatus.REFUNDED) return payment;
        if (dto.transaction_status === 'refund') {
          if (payment.status !== PaymentStatus.PAID)
            throw new ConflictException(
              'Payment requires reconciliation before refund',
            );
          const refund = await tx.refundRequest.findUnique({
            where: { orderId: order.id },
          });
          if (refund?.restock && !refund.completedAt) {
            for (const item of [...order.items].sort((a, b) =>
              a.productId.localeCompare(b.productId),
            )) {
              await tx.$queryRaw`SELECT "id" FROM "inventories" WHERE "product_id" = ${item.productId}::uuid FOR UPDATE`;
              const stock = await tx.inventory.findUniqueOrThrow({
                where: { productId: item.productId },
              });
              await tx.inventory.update({
                where: { productId: item.productId },
                data: { quantity: { increment: item.quantity } },
              });
              await tx.stockMovement.create({
                data: {
                  productId: item.productId,
                  actorId: refund.actorId,
                  type: 'REFUND_RESTOCK',
                  quantityBefore: stock.quantity,
                  quantityDelta: item.quantity,
                  quantityAfter: stock.quantity + item.quantity,
                  reason: `Refund ${order.orderNumber}: ${refund.reason}`.slice(
                    0,
                    300,
                  ),
                },
              });
            }
          }
          if (refund)
            await tx.refundRequest.update({
              where: { id: refund.id },
              data: { completedAt: new Date() },
            });
          await tx.order.update({
            where: { id: order.id },
            data: { status: OrderStatus.REFUNDED },
          });
          await tx.orderStatusHistory.create({
            data: {
              orderId: order.id,
              fromStatus: order.status,
              toStatus: OrderStatus.REFUNDED,
              note: 'Full refund confirmed by Midtrans',
            },
          });
          await queueNotification(
            tx,
            order.userId,
            `order:${order.id}:refunded`,
            `Refund ${order.orderNumber}`,
            'Refund penuh telah tercatat oleh provider. Waktu dana masuk mengikuti metode pembayaran Anda.',
          );
          return tx.payment.update({
            where: { id: payment.id },
            data: { status: PaymentStatus.REFUNDED },
          });
        }
        // Terminal payments never regress when an older pending/expiry notification is retried.
        if (
          payment.status === PaymentStatus.PAID ||
          (!successful &&
            [PaymentStatus.EXPIRED, PaymentStatus.FAILED].includes(
              payment.status as 'EXPIRED' | 'FAILED',
            ))
        )
          return payment;
        if (successful && order.status !== OrderStatus.PENDING_PAYMENT) {
          throw new ConflictException(
            `Cannot confirm payment for order in ${order.status} status`,
          );
        }
        if (successful) {
          for (const item of order.items) {
            await tx.inventory.update({
              where: { productId: item.productId },
              data: {
                quantity: { decrement: item.quantity },
                reserved: { decrement: item.quantity },
              },
            });
          }
          await tx.orderStatusHistory.create({
            data: {
              orderId: order.id,
              fromStatus: order.status,
              toStatus: OrderStatus.PAID,
              note: 'Payment confirmed by Midtrans',
            },
          });
          await tx.order.update({
            where: { id: order.id },
            data: { status: OrderStatus.PAID },
          });
        } else if (expired && order.status === OrderStatus.PENDING_PAYMENT) {
          for (const item of order.items) {
            await tx.inventory.update({
              where: { productId: item.productId },
              data: { reserved: { decrement: item.quantity } },
            });
          }
          await tx.orderStatusHistory.create({
            data: {
              orderId: order.id,
              fromStatus: order.status,
              toStatus: OrderStatus.CANCELLED,
              note: `Midtrans transaction ${dto.transaction_status}`,
            },
          });
          await tx.order.update({
            where: { id: order.id },
            data: { status: OrderStatus.CANCELLED, cancelledAt: new Date() },
          });
        }
        if (successful || expired)
          await queueNotification(
            tx,
            order.userId,
            `payment:${payment.id}:${successful ? 'paid' : 'cancelled'}`,
            `Pembayaran ${order.orderNumber}`,
            successful
              ? 'Pembayaran berhasil dikonfirmasi.'
              : 'Pembayaran kedaluwarsa atau dibatalkan.',
          );
        return tx.payment.update({
          where: { id: payment.id },
          data: {
            status: successful
              ? PaymentStatus.PAID
              : expired
                ? dto.transaction_status === 'expire'
                  ? PaymentStatus.EXPIRED
                  : PaymentStatus.FAILED
                : PaymentStatus.PENDING,
            method: dto.payment_type ?? null,
            paidAt: successful ? new Date() : payment.paidAt,
            providerPayload: {
              ...(payment.providerPayload &&
              typeof payment.providerPayload === 'object' &&
              !Array.isArray(payment.providerPayload)
                ? payment.providerPayload
                : {}),
              order_id: dto.order_id,
              status_code: dto.status_code,
              gross_amount: dto.gross_amount,
              transaction_id: dto.transaction_id,
              transaction_status: dto.transaction_status,
              fraud_status: dto.fraud_status ?? null,
              payment_type: dto.payment_type ?? null,
            },
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async refund(orderId: string, actorId: string, dto: RefundDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status === OrderStatus.REFUNDED)
      return { message: 'Order already refunded' };
    if (
      !order.payments.some(
        (payment) =>
          payment.provider === 'MIDTRANS' &&
          payment.status === PaymentStatus.PAID,
      )
    )
      throw new ConflictException('Only paid orders can be refunded');
    const request = await this.prisma.refundRequest.upsert({
      where: { orderId },
      create: { orderId, actorId, reason: dto.reason, restock: dto.restock },
      update: {},
    });
    if (request.reason !== dto.reason || request.restock !== dto.restock)
      throw new ConflictException(
        'A refund request already exists with different parameters',
      );
    const current = await this.midtrans.request(order.orderNumber, 'status');
    if (current?.transaction_status === 'refund')
      return this.applyStatus(current);
    if (current?.transaction_status !== 'settlement')
      throw new ConflictException(
        'Midtrans transaction must be settled before refund',
      );
    await this.midtrans.request(order.orderNumber, 'refund', {
      refund_key: request.id,
      amount: order.total.toNumber(),
      reason: request.reason,
    });
    const confirmed = await this.midtrans.request(order.orderNumber, 'status');
    if (confirmed?.transaction_status === 'refund')
      return this.applyStatus(confirmed);
    return { message: 'Refund submitted; awaiting provider confirmation' };
  }

  private verifySignature(dto: MidtransNotificationDto): void {
    const expected = createHash('sha512')
      .update(
        `${dto.order_id}${dto.status_code}${dto.gross_amount}${this.serverKey()}`,
      )
      .digest();
    const received = Buffer.from(dto.signature_key, 'hex');
    if (
      received.length !== expected.length ||
      !timingSafeEqual(received, expected)
    )
      throw new UnauthorizedException('Invalid Midtrans signature');
  }

  private serverKey(): string {
    const key = this.config.get<string>('MIDTRANS_SERVER_KEY');
    if (!key) throw new ConflictException('Midtrans is not configured');
    return key;
  }
}
