ALTER TYPE "StockMovementType" ADD VALUE 'REFUND_RESTOCK';
CREATE TABLE "refund_requests" (
  "id" UUID NOT NULL,
  "order_id" UUID NOT NULL,
  "actor_id" UUID NOT NULL,
  "reason" VARCHAR(255) NOT NULL,
  "restock" BOOLEAN NOT NULL DEFAULT false,
  "completed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "refund_requests_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "refund_requests_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
-- One full refund per order provides retry idempotency; compound index supports expiry scans.
CREATE UNIQUE INDEX "refund_requests_order_id_key" ON "refund_requests"("order_id");
CREATE INDEX "orders_status_created_at_idx" ON "orders"("status", "created_at");
