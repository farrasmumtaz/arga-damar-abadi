CREATE TYPE "DiscountKind" AS ENUM ('FIXED', 'PERCENTAGE');
ALTER TABLE "orders" ADD COLUMN "promotion_code" VARCHAR(40);

CREATE TABLE "promotions" (
  "id" UUID NOT NULL,
  "code" VARCHAR(40) NOT NULL,
  "name" VARCHAR(150) NOT NULL,
  "kind" "DiscountKind" NOT NULL,
  "amount" DECIMAL(15,2) NOT NULL,
  "min_subtotal" DECIMAL(15,2) NOT NULL DEFAULT 0,
  "max_discount" DECIMAL(15,2),
  "starts_at" TIMESTAMP(3) NOT NULL,
  "ends_at" TIMESTAMP(3) NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "usage_limit" INTEGER NOT NULL,
  "per_user_limit" INTEGER NOT NULL DEFAULT 1,
  "used_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "promotions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "promotions_valid_amount" CHECK ("amount" > 0 AND ("kind" <> 'PERCENTAGE' OR "amount" <= 100)),
  CONSTRAINT "promotions_valid_period" CHECK ("ends_at" > "starts_at"),
  CONSTRAINT "promotions_valid_limits" CHECK ("usage_limit" > 0 AND "per_user_limit" > 0 AND "per_user_limit" <= "usage_limit" AND "used_count" >= 0 AND "used_count" <= "usage_limit"),
  CONSTRAINT "promotions_valid_bounds" CHECK ("min_subtotal" >= 0 AND ("max_discount" IS NULL OR "max_discount" > 0))
);
CREATE UNIQUE INDEX "promotions_code_key" ON "promotions"("code");
CREATE INDEX "promotions_is_active_ends_at_idx" ON "promotions"("is_active", "ends_at");

CREATE TABLE "promotion_redemptions" (
  "id" UUID NOT NULL,
  "promotion_id" UUID NOT NULL,
  "order_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "discount_amount" DECIMAL(15,2) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "promotion_redemptions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "promotion_redemptions_positive_discount" CHECK ("discount_amount" > 0),
  CONSTRAINT "promotion_redemptions_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "promotions"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "promotion_redemptions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "promotion_redemptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "promotion_redemptions_order_id_key" ON "promotion_redemptions"("order_id");
CREATE INDEX "promotion_redemptions_promotion_id_user_id_idx" ON "promotion_redemptions"("promotion_id", "user_id");
CREATE INDEX "promotion_redemptions_user_id_created_at_idx" ON "promotion_redemptions"("user_id", "created_at");
