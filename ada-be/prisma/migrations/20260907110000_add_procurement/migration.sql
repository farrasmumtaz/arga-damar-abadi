ALTER TYPE "StockMovementType" ADD VALUE 'PURCHASE_RECEIPT';
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('DRAFT', 'ISSUED', 'RECEIVED', 'CANCELLED');
CREATE TABLE "suppliers" (
  "id" UUID NOT NULL, "code" VARCHAR(40) NOT NULL, "name" VARCHAR(150) NOT NULL,
  "contact_name" VARCHAR(150), "email" VARCHAR(255), "phone" VARCHAR(32), "address" VARCHAR(500),
  "is_active" BOOLEAN NOT NULL DEFAULT true, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL, CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "suppliers_code_key" ON "suppliers"("code");
CREATE INDEX "suppliers_is_active_name_idx" ON "suppliers"("is_active", "name");
CREATE TABLE "purchase_orders" (
  "id" UUID NOT NULL, "purchase_number" VARCHAR(40) NOT NULL, "supplier_id" UUID NOT NULL,
  "supplier_name" VARCHAR(150) NOT NULL, "actor_id" UUID NOT NULL,
  "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT', "total" DECIMAL(15,2) NOT NULL,
  "note" VARCHAR(500), "issued_at" TIMESTAMP(3), "received_at" TIMESTAMP(3), "cancelled_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "purchase_orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "purchase_orders_total_nonnegative" CHECK ("total" >= 0)
);
CREATE UNIQUE INDEX "purchase_orders_purchase_number_key" ON "purchase_orders"("purchase_number");
CREATE INDEX "purchase_orders_supplier_id_created_at_idx" ON "purchase_orders"("supplier_id", "created_at");
CREATE INDEX "purchase_orders_status_created_at_idx" ON "purchase_orders"("status", "created_at");
CREATE TABLE "purchase_order_items" (
  "id" UUID NOT NULL, "purchase_order_id" UUID NOT NULL, "product_id" UUID NOT NULL,
  "sku" VARCHAR(80) NOT NULL, "product_name" VARCHAR(200) NOT NULL, "quantity" INTEGER NOT NULL,
  "unit_cost" DECIMAL(15,2) NOT NULL, "subtotal" DECIMAL(15,2) NOT NULL,
  CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "purchase_order_items_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "purchase_order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "purchase_order_items_positive_quantity" CHECK ("quantity" > 0),
  CONSTRAINT "purchase_order_items_cost_nonnegative" CHECK ("unit_cost" >= 0 AND "subtotal" >= 0)
);
CREATE UNIQUE INDEX "purchase_order_items_purchase_order_id_product_id_key" ON "purchase_order_items"("purchase_order_id", "product_id");
CREATE INDEX "purchase_order_items_product_id_idx" ON "purchase_order_items"("product_id");
