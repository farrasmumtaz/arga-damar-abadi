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

export interface SnapResponse {
  token: string;
  redirect_url: string;
}

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async createSession(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: { user: true, items: true, payments: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== OrderStatus.PENDING_PAYMENT)
      throw new ConflictException('Order is not awaiting payment');
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
        customer_details: {
          first_name: order.user.fullName,
          email: order.user.email,
          phone: order.user.phone,
        },
        item_details: order.items.map((item) => ({
          id: item.sku,
          price: item.unitPrice.toNumber(),
          quantity: item.quantity,
          name: item.productName,
        })),
        callbacks: {
          finish: `${this.config.getOrThrow<string>('FRONTEND_URL')}/payment/finish`,
        },
      }),
    });
    if (!response.ok)
      throw new BadGatewayException('Midtrans transaction creation failed');
    const snap = (await response.json()) as SnapResponse;
    await this.prisma.payment.upsert({
      where: { externalId: order.orderNumber },
      create: {
        orderId,
        provider: 'MIDTRANS',
        externalId: order.orderNumber,
        amount: order.total,
        providerPayload: { token: snap.token, redirect_url: snap.redirect_url },
      },
      update: {
        providerPayload: { token: snap.token, redirect_url: snap.redirect_url },
      },
    });
    return snap;
  }

  async handleNotification(dto: MidtransNotificationDto) {
    this.verifySignature(dto);
    return this.prisma.$transaction(
      async (tx) => {
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
        if (successful && payment.status !== PaymentStatus.PAID) {
          for (const item of order.items) {
            await tx.inventory.update({
              where: { productId: item.productId },
              data: {
                quantity: { decrement: item.quantity },
                reserved: { decrement: item.quantity },
              },
            });
          }
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
          await tx.order.update({
            where: { id: order.id },
            data: { status: OrderStatus.CANCELLED },
          });
        }
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
