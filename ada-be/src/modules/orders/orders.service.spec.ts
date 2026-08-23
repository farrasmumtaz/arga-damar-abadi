import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { OrdersService } from './orders.service';
import { ShippingCostService } from './shipping-cost.service';

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
});
