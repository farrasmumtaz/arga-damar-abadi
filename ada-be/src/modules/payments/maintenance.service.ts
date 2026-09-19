import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { MidtransClient } from './midtrans.client';
import { PaymentsService } from './payments.service';
import { transitionWarehouseAllocations } from '../warehouses/warehouse-stock';

@Injectable()
export class MaintenanceService implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;
  private running = false;
  private readonly logger = new Logger(MaintenanceService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly midtrans: MidtransClient,
    private readonly payments: PaymentsService,
  ) {}
  onModuleInit(): void {
    if (this.config.get<boolean>('MAINTENANCE_ENABLED', false)) {
      this.timer = setInterval(() => {
        void this.run();
      }, 60_000);
      this.timer.unref();
    }
  }
  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async run(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const before = new Date(
        Date.now() -
          this.config.get<number>('ORDER_PAYMENT_TTL_MINUTES', 60) * 60_000,
      );
      const orders = await this.prisma.order.findMany({
        where: { status: 'PENDING_PAYMENT', createdAt: { lte: before } },
        select: { id: true, orderNumber: true },
        take: 100,
        orderBy: { createdAt: 'asc' },
      });
      for (const order of orders) {
        try {
          await this.expire(order.id, order.orderNumber, before);
        } catch {
          this.logger.error({
            event: 'payment_reconciliation_failed',
            orderId: order.id,
          });
        }
      }
      // Refund approval can complete without another webhook; do not issue a second refund here.
      const refunds = await this.prisma.refundRequest.findMany({
        where: { completedAt: null },
        select: { order: { select: { orderNumber: true } } },
        take: 100,
        orderBy: { createdAt: 'asc' },
      });
      for (const refund of refunds) {
        try {
          const status = await this.midtrans.request(
            refund.order.orderNumber,
            'status',
          );
          if (status?.transaction_status === 'refund')
            await this.payments.applyStatus(status);
        } catch {
          this.logger.error({
            event: 'refund_reconciliation_failed',
            orderNumber: refund.order.orderNumber,
          });
        }
      }
      await this.prisma.quotation.updateMany({
        where: { status: 'QUOTED', validUntil: { lte: new Date() } },
        data: { status: 'EXPIRED' },
      });
      await this.prisma.accountToken.deleteMany({
        where: { expiresAt: { lt: new Date(Date.now() - 7 * 86_400_000) } },
      });
    } catch {
      this.logger.error({ event: 'maintenance_failed' });
    } finally {
      this.running = false;
    }
  }

  async expire(id: string, orderNumber: string, before: Date): Promise<void> {
    const existingPayment = await this.prisma.payment.findUnique({
      where: { externalId: orderNumber },
    });
    const payload = existingPayment?.providerPayload;
    const snapToken =
      payload &&
      typeof payload === 'object' &&
      !Array.isArray(payload) &&
      typeof payload.token === 'string'
        ? payload.token
        : null;
    // Query provider even without a local payment row: a Snap request may have timed out after creation.
    let status = await this.midtrans.request(orderNumber, 'status');
    if (status?.transaction_status === 'pending') {
      // An expiry request can race a settlement or time out after provider success.
      // Always fetch authoritative status before deciding whether reservations can be released.
      try {
        await this.midtrans.request(orderNumber, 'expire');
      } catch {
        /* status below resolves uncertainty; no local release on failure */
      }
      status = await this.midtrans.request(orderNumber, 'status');
    }
    if (status) {
      if (
        snapToken &&
        (status.transaction_status === 'expire' ||
          status.transaction_status === 'cancel' ||
          status.transaction_status === 'deny')
      ) {
        await this.midtrans.cancelSnap(snapToken);
        const latest = await this.midtrans.request(orderNumber, 'status');
        if (!latest)
          throw new Error(
            'Provider status disappeared after session cancellation',
          );
        status = latest;
        // A closed Snap session with a denied final attempt cannot be paid again.
        if (status.transaction_status === 'deny')
          status = { ...status, transaction_status: 'cancel' };
      }
      // Only statuses confirmed by provider can release stock for an external transaction.
      const order = await this.prisma.order.findUniqueOrThrow({
        where: { id },
      });
      await this.prisma.payment.upsert({
        where: { externalId: orderNumber },
        create: {
          orderId: id,
          provider: 'MIDTRANS',
          externalId: orderNumber,
          amount: order.total,
        },
        update: {},
      });
      await this.payments.applyStatus(status);
      return;
    }
    await this.prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "orders" WHERE "id" = ${id}::uuid FOR UPDATE`;
        const order = await tx.order.findUniqueOrThrow({
          where: { id },
          include: { items: true, payments: true },
        });
        if (
          order.status !== 'PENDING_PAYMENT' ||
          order.createdAt > before ||
          order.payments.some(
            (payment) =>
              payment.status !== 'PENDING' || payment.provider !== 'MIDTRANS',
          )
        )
          return;
        // Recheck after acquiring the session-creation lock, closing the external-call timeout race.
        if (snapToken) await this.midtrans.cancelSnap(snapToken);
        else if (order.payments.length) return; // Missing session provenance requires reconciliation, never guess.
        if (await this.midtrans.request(orderNumber, 'status')) return;
        for (const item of [...order.items].sort((a, b) =>
          a.productId.localeCompare(b.productId),
        )) {
          await tx.inventory.update({
            where: { productId: item.productId },
            data: { reserved: { decrement: item.quantity } },
          });
        }
        await transitionWarehouseAllocations(tx, order.id, 'release');
        await tx.payment.updateMany({
          where: { orderId: id, status: 'PENDING' },
          data: { status: 'EXPIRED' },
        });
        await tx.order.update({
          where: { id },
          data: { status: 'CANCELLED', cancelledAt: new Date() },
        });
        await tx.orderStatusHistory.create({
          data: {
            orderId: id,
            fromStatus: 'PENDING_PAYMENT',
            toStatus: 'CANCELLED',
            note: 'Payment window expired; provider confirmed no transaction',
          },
        });
        await tx.auditLog.create({
          data: { action: 'ORDER_EXPIRED', entityType: 'Order', entityId: id },
        });
      },
      { timeout: 25_000 },
    );
  }
}
