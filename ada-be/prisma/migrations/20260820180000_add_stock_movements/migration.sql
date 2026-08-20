CREATE TYPE "StockMovementType" AS ENUM ('ADJUSTMENT');

CREATE TABLE "stock_movements" (
  "id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "actor_id" UUID NOT NULL,
  "type" "StockMovementType" NOT NULL DEFAULT 'ADJUSTMENT',
  "quantity_before" INTEGER NOT NULL,
  "quantity_delta" INTEGER NOT NULL,
  "quantity_after" INTEGER NOT NULL,
  "reason" VARCHAR(300) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "stock_movements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "stock_movements_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "stock_movements_nonzero_delta_check" CHECK ("quantity_delta" <> 0),
  CONSTRAINT "stock_movements_nonnegative_check" CHECK ("quantity_before" >= 0 AND "quantity_after" >= 0)
);

CREATE INDEX "stock_movements_product_id_created_at_idx" ON "stock_movements"("product_id", "created_at");
CREATE INDEX "stock_movements_actor_id_created_at_idx" ON "stock_movements"("actor_id", "created_at");
