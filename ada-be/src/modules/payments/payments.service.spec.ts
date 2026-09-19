import {
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { PaymentsService } from './payments.service';
import { MidtransClient, type MidtransStatus } from './midtrans.client';

describe('PaymentsService state machine', () => {
  const key = 'test-server-key';
  const status: MidtransStatus = {
    order_id: 'ADA-TEST',
    transaction_id: 'tx',
    transaction_status: 'settlement',
    gross_amount: '100.00',
    status_code: '200',
  };
  function fixture(paymentStatus = 'PENDING', orderStatus = 'PENDING_PAYMENT') {
    const payment = {
      id: 'payment',
      provider: 'MIDTRANS',
      status: paymentStatus,
      paidAt: null,
      providerPayload: {},
    };
    const order = {
      id: 'order',
      userId: 'user',
      orderNumber: 'ADA-TEST',
      status: orderStatus,
      total: new Prisma.Decimal(100),
      createdAt: new Date(),
      items: [{ productId: 'product', quantity: 1 }],
      payments: [payment],
    };
    const tx = {
      $queryRaw: jest.fn().mockImplementation((query: unknown) => {
        const sql = Array.isArray(query) ? query.join('') : '';
        return Promise.resolve(
          sql.includes('FROM warehouse_stocks')
            ? [{ id: 'stock', quantity: 10, reserved: 1 }]
            : [],
        );
      }),
      orderAllocation: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'allocation',
            productId: 'product',
            warehouseId: 'warehouse',
            quantity: 1,
            state: paymentStatus === 'PAID' ? 'CONSUMED' : 'RESERVED',
          },
        ]),
        update: jest.fn(),
      },
      warehouseStock: { update: jest.fn() },
      order: {
        findFirst: jest.fn().mockResolvedValue(order),
        findUnique: jest.fn().mockResolvedValue(order),
        update: jest.fn(),
      },
      payment: {
        update: jest
          .fn<
            Promise<typeof payment>,
            [args: { where: { id: string }; data: { status: string } }]
          >()
          .mockImplementation((args) => {
            payment.status = args.data.status;
            return Promise.resolve(payment);
          }),
      },
      inventory: {
        update: jest.fn(),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ quantity: 10 }),
      },
      stockMovement: { create: jest.fn() },
      orderStatusHistory: { create: jest.fn() },
      user: { findUnique: jest.fn().mockResolvedValue(null) },
      refundRequest: {
        findUnique: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
      },
    };
    const prisma = {
      $transaction: jest.fn(
        async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx),
      ),
    } as unknown as PrismaService;
    const config = {
      get: jest.fn((name: string, fallback?: unknown) =>
        name === 'MIDTRANS_SERVER_KEY' ? key : fallback,
      ),
    } as unknown as ConfigService;
    const provider = { request: jest.fn().mockResolvedValue(status) };
    return {
      service: new PaymentsService(
        prisma,
        config,
        provider as unknown as MidtransClient,
      ),
      tx,
      payment,
      provider,
    };
  }
  it('rejects sessions for missing orders', async () => {
    const { service, tx } = fixture();
    tx.order.findFirst.mockResolvedValue(null);
    await expect(service.createSession('user', 'order')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
  it('rejects invalid signatures before contacting provider', async () => {
    const { service, provider } = fixture();
    await expect(
      service.handleNotification({ ...status, signature_key: '00' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(provider.request).not.toHaveBeenCalled();
  });
  it('uses authoritative provider state instead of unsigned transaction_status', async () => {
    const { service, provider, tx } = fixture('PAID', 'PROCESSING');
    const signature_key = createHash('sha512')
      .update(status.order_id + status.status_code + status.gross_amount + key)
      .digest('hex');
    await service.handleNotification({
      ...status,
      transaction_status: 'pending',
      signature_key,
    });
    expect(provider.request).toHaveBeenCalledWith('ADA-TEST', 'status');
    expect(tx.inventory.update).not.toHaveBeenCalled();
  });
  it.each(['pending', 'expire', 'deny', 'settlement'])(
    'does not regress or decrement paid stock on %s',
    async (transaction_status) => {
      const { service, tx } = fixture('PAID', 'SHIPPED');
      await service.applyStatus({ ...status, transaction_status });
      expect(tx.inventory.update).not.toHaveBeenCalled();
      expect(tx.payment.update).not.toHaveBeenCalled();
      expect(tx.order.update).not.toHaveBeenCalled();
    },
  );
  it('rejects amount mismatches without stock changes', async () => {
    const { service, tx } = fixture();
    await expect(
      service.applyStatus({ ...status, gross_amount: '99.00' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.inventory.update).not.toHaveBeenCalled();
  });
  it('does not revive a cancelled order on late settlement', async () => {
    const { service, tx } = fixture('EXPIRED', 'CANCELLED');
    await expect(service.applyStatus(status)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(tx.inventory.update).not.toHaveBeenCalled();
  });
  it('releases reservation without decreasing physical stock on expiry', async () => {
    const { service, tx } = fixture();
    await service.applyStatus({ ...status, transaction_status: 'expire' });
    expect(tx.inventory.update).toHaveBeenCalledWith({
      where: { productId: 'product' },
      data: { reserved: { decrement: 1 } },
    });
    expect(tx.payment.update.mock.calls[0][0].data.status).toBe('EXPIRED');
  });
  it('ignores repeated full refunds', async () => {
    const { service, tx } = fixture('REFUNDED', 'REFUNDED');
    await service.applyStatus({ ...status, transaction_status: 'refund' });
    expect(tx.inventory.update).not.toHaveBeenCalled();
  });
  it('restocks an approved full refund exactly once across duplicate notifications', async () => {
    const { service, tx } = fixture('PAID', 'DELIVERED');
    tx.refundRequest.findUnique.mockResolvedValue({
      id: 'refund',
      actorId: 'admin',
      restock: true,
      completedAt: null,
      reason: 'Returned items received',
    });
    await service.applyStatus({ ...status, transaction_status: 'refund' });
    await service.applyStatus({ ...status, transaction_status: 'refund' });
    expect(tx.inventory.update).toHaveBeenCalledTimes(1);
    expect(tx.inventory.update).toHaveBeenCalledWith({
      where: { productId: 'product' },
      data: { quantity: { increment: 1 } },
    });
    expect(tx.stockMovement.create).toHaveBeenCalledTimes(1);
    expect(tx.refundRequest.update).toHaveBeenCalledTimes(1);
  });
  it('does not assume physical goods were returned on a provider-initiated refund', async () => {
    const { service, tx } = fixture('PAID', 'DELIVERED');
    await service.applyStatus({ ...status, transaction_status: 'refund' });
    expect(tx.inventory.update).not.toHaveBeenCalled();
    expect(tx.payment.update.mock.calls[0][0].data.status).toBe('REFUNDED');
  });
  it('does not mark partial refunds as full or return stock', async () => {
    const { service, tx } = fixture('PAID', 'DELIVERED');
    await service.applyStatus({
      ...status,
      transaction_status: 'partial_refund',
    });
    expect(tx.inventory.update).not.toHaveBeenCalled();
    expect(tx.payment.update).not.toHaveBeenCalled();
  });
});
