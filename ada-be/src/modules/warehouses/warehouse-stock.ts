import { ConflictException, NotFoundException } from '@nestjs/common';
import { AllocationState, Prisma } from '../../generated/prisma/client';

interface StockRow {
  id: string;
  warehouseId: string;
  quantity: number;
  reserved: number;
}

/** Callers own aggregate inventory locks first, in ascending productId order. Never call outside their transaction. */
export async function assertWarehouseBalance(
  tx: Prisma.TransactionClient,
  productIds: string[],
): Promise<void> {
  if (!productIds.length) return;
  const mismatches = await tx.$queryRaw<
    Array<{ product_id: string }>
  >(Prisma.sql`
    SELECT i.product_id FROM inventories i LEFT JOIN warehouse_stocks s ON s.product_id = i.product_id
    WHERE i.product_id IN (${Prisma.join([...new Set(productIds)].map((id) => Prisma.sql`${id}::uuid`))})
    GROUP BY i.product_id, i.quantity, i.reserved
    HAVING i.quantity <> COALESCE(SUM(s.quantity), 0) OR i.reserved <> COALESCE(SUM(s.reserved), 0)`);
  if (mismatches.length)
    throw new ConflictException(
      'Saldo gudang tidak sesuai inventory. Transaksi dibatalkan; rekonsiliasi stok diperlukan.',
    );
}

export async function adjustWarehouseStock(
  tx: Prisma.TransactionClient,
  productId: string,
  quantityDelta: number,
  warehouseId?: string,
) {
  const warehouse = await tx.warehouse.findUnique({
    where: warehouseId ? { id: warehouseId } : { code: 'DEFAULT' },
  });
  if (!warehouse?.isActive)
    throw new NotFoundException('Gudang aktif tidak ditemukan.');
  await tx.warehouseStock.upsert({
    where: { warehouseId_productId: { warehouseId: warehouse.id, productId } },
    create: { warehouseId: warehouse.id, productId },
    update: {},
  });
  const [stock] = await tx.$queryRaw<
    StockRow[]
  >`SELECT id, warehouse_id AS "warehouseId", quantity, reserved FROM warehouse_stocks WHERE warehouse_id = ${warehouse.id}::uuid AND product_id = ${productId}::uuid FOR UPDATE`;
  if (!stock) throw new ConflictException('Saldo gudang tidak tersedia.');
  const quantityAfter = stock.quantity + quantityDelta;
  if (
    !Number.isSafeInteger(quantityAfter) ||
    quantityAfter < stock.reserved ||
    quantityAfter > 2147483647
  )
    throw new ConflictException(
      'Perubahan stok melampaui saldo tersedia atau batas penyimpanan gudang.',
    );
  await tx.warehouseStock.update({
    where: { id: stock.id },
    data: { quantity: quantityAfter },
  });
  await assertWarehouseBalance(tx, [productId]);
  return {
    warehouseId: warehouse.id,
    quantityBefore: stock.quantity,
    quantityAfter,
  };
}

export async function reserveWarehouseStock(
  tx: Prisma.TransactionClient,
  orderId: string,
  productId: string,
  quantity: number,
): Promise<void> {
  if (!Number.isSafeInteger(quantity) || quantity < 1)
    throw new ConflictException('Jumlah reservasi tidak valid.');
  const stocks = await tx.$queryRaw<StockRow[]>`
    SELECT s.id, s.warehouse_id AS "warehouseId", s.quantity, s.reserved FROM warehouse_stocks s
    JOIN warehouses w ON w.id = s.warehouse_id WHERE s.product_id = ${productId}::uuid AND w.is_active = true
    ORDER BY CASE WHEN w.code = 'DEFAULT' THEN 0 ELSE 1 END, w.id FOR UPDATE OF s`;
  if (
    stocks.reduce((sum, stock) => sum + stock.quantity - stock.reserved, 0) <
    quantity
  )
    throw new ConflictException(
      'Stok tersedia pada gudang aktif tidak mencukupi.',
    );
  let remaining = quantity;
  for (const stock of stocks) {
    const allocated = Math.min(remaining, stock.quantity - stock.reserved);
    if (!allocated) continue;
    await tx.warehouseStock.update({
      where: { id: stock.id },
      data: { reserved: { increment: allocated } },
    });
    await tx.orderAllocation.create({
      data: {
        orderId,
        productId,
        warehouseId: stock.warehouseId,
        quantity: allocated,
      },
    });
    remaining -= allocated;
    if (!remaining) break;
  }
  await assertWarehouseBalance(tx, [productId]);
}

export async function transitionWarehouseAllocations(
  tx: Prisma.TransactionClient,
  orderId: string,
  action: 'consume' | 'release' | 'return',
): Promise<void> {
  const from =
    action === 'return' ? AllocationState.CONSUMED : AllocationState.RESERVED;
  const to =
    action === 'consume'
      ? AllocationState.CONSUMED
      : action === 'release'
        ? AllocationState.RELEASED
        : AllocationState.RETURNED;
  const allocations = await tx.orderAllocation.findMany({
    where: { orderId },
    orderBy: [{ productId: 'asc' }, { warehouseId: 'asc' }],
  });
  // Missing provenance must never silently leave warehouse stock out of sync.
  if (!allocations.length)
    throw new ConflictException(
      'Alokasi gudang order tidak ditemukan. Rekonsiliasi diperlukan.',
    );
  for (const allocation of allocations) {
    if (allocation.state === to) continue;
    if (allocation.state !== from)
      throw new ConflictException(
        'Status alokasi gudang tidak sesuai transisi pembayaran.',
      );
    const [stock] = await tx.$queryRaw<
      StockRow[]
    >`SELECT id, warehouse_id AS "warehouseId", quantity, reserved FROM warehouse_stocks WHERE product_id = ${allocation.productId}::uuid AND warehouse_id = ${allocation.warehouseId}::uuid FOR UPDATE`;
    if (!stock)
      throw new ConflictException('Saldo gudang alokasi tidak ditemukan.');
    const quantity =
      stock.quantity +
      (action === 'consume'
        ? -allocation.quantity
        : action === 'return'
          ? allocation.quantity
          : 0);
    const reserved =
      stock.reserved - (action === 'return' ? 0 : allocation.quantity);
    if (reserved < 0 || quantity < reserved || quantity > 2147483647)
      throw new ConflictException('Saldo gudang alokasi tidak konsisten.');
    await tx.warehouseStock.update({
      where: { id: stock.id },
      data: { quantity, reserved },
    });
    await tx.orderAllocation.update({
      where: { id: allocation.id },
      data: { state: to },
    });
  }
  await assertWarehouseBalance(
    tx,
    allocations.map((allocation) => allocation.productId),
  );
}
