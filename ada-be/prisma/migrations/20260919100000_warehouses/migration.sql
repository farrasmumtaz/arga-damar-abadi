-- Run with application writers stopped. Abort on inconsistent reservations rather than repair data implicitly.
BEGIN;
LOCK TABLE "inventories", "orders", "order_items" IN ACCESS EXCLUSIVE MODE;
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM "inventories" i
    LEFT JOIN (SELECT oi.product_id, SUM(oi.quantity) reserved FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE o.status = 'PENDING_PAYMENT' GROUP BY oi.product_id) pending ON pending.product_id = i.product_id
    WHERE i.quantity < 0 OR i.reserved < 0 OR i.quantity < i.reserved OR i.reserved <> COALESCE(pending.reserved, 0)
  ) OR EXISTS (
    SELECT 1 FROM order_items oi JOIN orders o ON o.id = oi.order_id LEFT JOIN inventories i ON i.product_id = oi.product_id WHERE o.status = 'PENDING_PAYMENT' AND i.id IS NULL
  ) THEN RAISE EXCEPTION 'Warehouse migration refused: inventory reservations differ from pending orders. Reconcile with an audited correction before retry.'; END IF;
END $$;
ALTER TYPE "StockMovementType" ADD VALUE 'WAREHOUSE_TRANSFER';
CREATE TYPE "AllocationState" AS ENUM ('RESERVED', 'CONSUMED', 'RELEASED', 'RETURNED');
CREATE TABLE "warehouses" (
  "id" UUID NOT NULL, "code" VARCHAR(40) NOT NULL, "name" VARCHAR(150) NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "warehouses_code_key" ON "warehouses"("code");
INSERT INTO "warehouses" (id, code, name) VALUES ('11111111-1111-4111-8111-111111111111', 'DEFAULT', 'Gudang utama');
CREATE TABLE "warehouse_stocks" (
  "id" UUID NOT NULL, "warehouse_id" UUID NOT NULL, "product_id" UUID NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 0, "reserved" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "warehouse_stocks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "warehouse_stocks_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "warehouse_stocks_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "warehouse_stocks_balance_check" CHECK (quantity >= 0 AND reserved >= 0 AND quantity >= reserved)
);
CREATE UNIQUE INDEX "warehouse_stocks_warehouse_id_product_id_key" ON "warehouse_stocks"("warehouse_id", "product_id");
CREATE INDEX "warehouse_stocks_product_id_idx" ON "warehouse_stocks"("product_id");
INSERT INTO warehouse_stocks (id, warehouse_id, product_id, quantity, reserved)
SELECT id, '11111111-1111-4111-8111-111111111111', product_id, quantity, reserved FROM inventories;
CREATE TABLE "order_allocations" (
  "id" UUID NOT NULL, "order_id" UUID NOT NULL, "product_id" UUID NOT NULL, "warehouse_id" UUID NOT NULL,
  "quantity" INTEGER NOT NULL, "state" "AllocationState" NOT NULL DEFAULT 'RESERVED',
  CONSTRAINT "order_allocations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "order_allocations_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "order_allocations_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "order_allocations_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "order_allocations_quantity_check" CHECK (quantity > 0)
);
CREATE UNIQUE INDEX "order_allocations_order_id_product_id_warehouse_id_key" ON "order_allocations"("order_id", "product_id", "warehouse_id");
CREATE INDEX "order_allocations_product_id_state_idx" ON "order_allocations"("product_id", "state");
CREATE INDEX "order_allocations_warehouse_id_state_idx" ON "order_allocations"("warehouse_id", "state");
-- Historic paid stock has already been deducted. Seed provenance only, never deduct twice.
INSERT INTO order_allocations (id, order_id, product_id, warehouse_id, quantity, state)
SELECT (MIN(oi.id::text))::uuid, oi.order_id, oi.product_id, '11111111-1111-4111-8111-111111111111', SUM(oi.quantity)::integer,
  CASE WHEN o.status = 'PENDING_PAYMENT' THEN 'RESERVED' WHEN o.status = 'CANCELLED' THEN 'RELEASED'
    WHEN o.status = 'REFUNDED' AND EXISTS (SELECT 1 FROM refund_requests r WHERE r.order_id = o.id AND r.restock = true AND r.completed_at IS NOT NULL) THEN 'RETURNED'
    ELSE 'CONSUMED' END::"AllocationState"
FROM order_items oi JOIN orders o ON o.id = oi.order_id GROUP BY oi.order_id, oi.product_id, o.id, o.status;
ALTER TABLE purchase_orders ADD COLUMN warehouse_id UUID;
ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE RESTRICT ON UPDATE CASCADE;
UPDATE purchase_orders SET warehouse_id = '11111111-1111-4111-8111-111111111111';
ALTER TABLE stock_movements ADD COLUMN warehouse_id UUID;
ALTER TABLE stock_movements ADD CONSTRAINT stock_movements_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE RESTRICT ON UPDATE CASCADE;
UPDATE stock_movements SET warehouse_id = '11111111-1111-4111-8111-111111111111';
CREATE TABLE "warehouse_transfers" (
  "id" UUID NOT NULL, "product_id" UUID NOT NULL, "from_warehouse_id" UUID NOT NULL, "to_warehouse_id" UUID NOT NULL,
  "actor_id" UUID NOT NULL, "quantity" INTEGER NOT NULL, "reason" VARCHAR(300) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "warehouse_transfers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "warehouse_transfers_product_id_fkey" FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "warehouse_transfers_from_warehouse_id_fkey" FOREIGN KEY (from_warehouse_id) REFERENCES warehouses(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "warehouse_transfers_to_warehouse_id_fkey" FOREIGN KEY (to_warehouse_id) REFERENCES warehouses(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "warehouse_transfers_actor_id_fkey" FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "warehouse_transfers_check" CHECK (quantity > 0 AND from_warehouse_id <> to_warehouse_id)
);
CREATE INDEX "warehouse_transfers_product_id_created_at_idx" ON warehouse_transfers(product_id, created_at);
COMMIT;
