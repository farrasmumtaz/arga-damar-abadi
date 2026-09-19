import { ConflictException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import {
  reserveWarehouseStock,
  transitionWarehouseAllocations,
} from './warehouse-stock';

describe('Warehouse allocation invariants', () => {
  function fixture() {
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      warehouseStock: { update: jest.fn().mockResolvedValue({}) },
      orderAllocation: {
        create: jest.fn().mockResolvedValue({}),
        findMany: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    return { tx, client: tx as unknown as Prisma.TransactionClient };
  }
  it('splits reservations without consuming physical stock', async () => {
    const { tx, client } = fixture();
    tx.$queryRaw.mockResolvedValueOnce([
      { id: 's1', warehouseId: 'w1', quantity: 5, reserved: 3 },
      { id: 's2', warehouseId: 'w2', quantity: 8, reserved: 1 },
    ]);
    await reserveWarehouseStock(client, 'order', 'product', 6);
    expect(tx.orderAllocation.create.mock.calls).toEqual([
      [
        {
          data: {
            orderId: 'order',
            productId: 'product',
            warehouseId: 'w1',
            quantity: 2,
          },
        },
      ],
      [
        {
          data: {
            orderId: 'order',
            productId: 'product',
            warehouseId: 'w2',
            quantity: 4,
          },
        },
      ],
    ]);
    expect(tx.warehouseStock.update).toHaveBeenNthCalledWith(1, {
      where: { id: 's1' },
      data: { reserved: { increment: 2 } },
    });
  });
  it('rejects insufficient available stock before writing any allocation', async () => {
    const { tx, client } = fixture();
    tx.$queryRaw.mockResolvedValueOnce([
      { id: 's1', warehouseId: 'w1', quantity: 5, reserved: 5 },
    ]);
    await expect(
      reserveWarehouseStock(client, 'order', 'product', 1),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.orderAllocation.create).not.toHaveBeenCalled();
  });
  it.each([
    ['consume', 'RESERVED', 8, 0, 'CONSUMED'],
    ['release', 'RESERVED', 10, 0, 'RELEASED'],
    ['return', 'CONSUMED', 12, 2, 'RETURNED'],
  ] as const)(
    '%s adjusts only the allocated warehouse',
    async (action, state, quantity, reserved, target) => {
      const { tx, client } = fixture();
      tx.orderAllocation.findMany.mockResolvedValue([
        { id: 'a', productId: 'p', warehouseId: 'w', quantity: 2, state },
      ]);
      tx.$queryRaw.mockResolvedValueOnce([
        { id: 'stock', quantity: 10, reserved: 2 },
      ]);
      await transitionWarehouseAllocations(client, 'order', action);
      expect(tx.warehouseStock.update).toHaveBeenCalledWith({
        where: { id: 'stock' },
        data: { quantity, reserved },
      });
      expect(tx.orderAllocation.update).toHaveBeenCalledWith({
        where: { id: 'a' },
        data: { state: target },
      });
    },
  );
  it('rejects missing allocation provenance', async () => {
    const { tx, client } = fixture();
    tx.orderAllocation.findMany.mockResolvedValue([]);
    await expect(
      transitionWarehouseAllocations(client, 'order', 'release'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.warehouseStock.update).not.toHaveBeenCalled();
  });
  it('fails closed when aggregate and warehouse balances differ', async () => {
    const { tx, client } = fixture();
    tx.$queryRaw
      .mockResolvedValueOnce([
        { id: 's', warehouseId: 'w', quantity: 1, reserved: 0 },
      ])
      .mockResolvedValueOnce([{ product_id: 'product' }]);
    await expect(
      reserveWarehouseStock(client, 'order', 'product', 1),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
