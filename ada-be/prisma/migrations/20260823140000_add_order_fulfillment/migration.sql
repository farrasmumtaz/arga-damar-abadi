ALTER TABLE "orders"
ADD COLUMN "shipping_provider" VARCHAR(80),
ADD COLUMN "tracking_number" VARCHAR(120),
ADD COLUMN "shipped_at" TIMESTAMP(3),
ADD COLUMN "delivered_at" TIMESTAMP(3),
ADD COLUMN "cancelled_at" TIMESTAMP(3);

CREATE TABLE "order_status_histories" (
  "id" UUID NOT NULL,
  "order_id" UUID NOT NULL,
  "actor_id" UUID,
  "from_status" "OrderStatus" NOT NULL,
  "to_status" "OrderStatus" NOT NULL,
  "note" VARCHAR(300),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "order_status_histories_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "order_status_histories_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "order_status_histories_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "order_status_histories_order_id_created_at_idx" ON "order_status_histories"("order_id", "created_at");
CREATE INDEX "order_status_histories_actor_id_created_at_idx" ON "order_status_histories"("actor_id", "created_at");
