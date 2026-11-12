import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { OrdersService } from './orders.service';
import { ShippingCostService } from './shipping-cost.service';
import { PromotionsService } from '../promotions/promotions.service';
import { Prisma } from '../../generated/prisma/client';

describe('OrdersService', () => {
  let service: OrdersService;
  let orderFindUnique: jest.Mock;
  let orderFindFirst: jest.Mock;

  beforeEach(async () => {
    orderFindUnique = jest.fn();
    orderFindFirst = jest.fn();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: PrismaService,
          useValue: {
            order: { findUnique: orderFindUnique, findFirst: orderFindFirst },
          },
        },
        {
          provide: PromotionsService,
          useValue: { evaluate: jest.fn(), recordRedemption: jest.fn() },
        },
        {
          provide: ShippingCostService,
          useValue: { calculate: jest.fn().mockReturnValue(20_000) },
        },
      ],
    }).compile();
    service = module.get(OrdersService);
  });

  it('returns an existing idempotent order', async () => {
    const order = { id: 'order-id', userId: 'user-id' };
    orderFindUnique.mockResolvedValue(order);
    await expect(
      service.checkout('user-id', {
        addressId: 'address-id',
        idempotencyKey: 'key-id',
      }),
    ).resolves.toBe(order);
  });

  it('rejects an idempotency key owned by another user', async () => {
    orderFindUnique.mockResolvedValue({ id: 'order-id', userId: 'other-user' });
    await expect(
      service.checkout('user-id', {
        addressId: 'address-id',
        idempotencyKey: 'key-id',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('hides orders owned by another user', async () => {
    orderFindFirst.mockResolvedValue(null);
    await expect(service.findOne('user-id', 'order-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects a changed checkout total before creating an order', async () => {
    const create = jest.fn();
    const tx = {
      address: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'address', postalCode: '12345' }),
      },
      cart: {
        findUnique: jest.fn().mockResolvedValue({
          items: [
            {
              productId: 'product',
              quantity: 1,
              product: {
                id: 'product',
                name: 'Kabel',
                status: 'ACTIVE',
                price: new Prisma.Decimal('1000.25'),
                weightGram: 500,
              },
            },
          ],
        }),
      },
      $queryRaw: jest.fn().mockResolvedValue([{ quantity: 5, reserved: 0 }]),
      inventory: { update: jest.fn() },
      order: { create },
    };
    const prisma = {
      order: { findUnique: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn(
        (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
      ),
    };
    const checkout = new OrdersService(
      prisma as unknown as PrismaService,
      {
        resolve: () => ({ amount: 20000, provider: 'INTERNAL' }),
      } as unknown as ShippingCostService,
      {} as PromotionsService,
    );
    await expect(
      checkout.checkout('user', {
        addressId: 'address',
        idempotencyKey: 'key',
        expectedTotal: '21000.00',
      }),
    ).rejects.toThrow('Total pesanan berubah');
    expect(create).not.toHaveBeenCalled();
  });
});
