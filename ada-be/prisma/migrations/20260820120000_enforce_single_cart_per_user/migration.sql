DROP INDEX IF EXISTS "carts_user_id_idx";

CREATE UNIQUE INDEX "carts_user_id_key" ON "carts"("user_id");
