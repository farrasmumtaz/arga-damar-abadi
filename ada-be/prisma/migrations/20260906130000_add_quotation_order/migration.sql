ALTER TABLE "orders" ADD COLUMN "quotation_id" UUID;
ALTER TABLE "orders" ADD CONSTRAINT "orders_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- Unique relation guarantees at most one order for each accepted quotation, including concurrent requests.
CREATE UNIQUE INDEX "orders_quotation_id_key" ON "orders"("quotation_id");
