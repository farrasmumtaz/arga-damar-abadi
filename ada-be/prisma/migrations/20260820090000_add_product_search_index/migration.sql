CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX "products_name_trgm_idx"
ON "products" USING GIN ("name" gin_trgm_ops);
