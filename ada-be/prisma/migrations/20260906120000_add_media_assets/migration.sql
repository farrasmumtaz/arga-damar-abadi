CREATE TABLE "media_assets" (
  "id" UUID NOT NULL, "owner_id" UUID NOT NULL, "purpose" VARCHAR(20) NOT NULL,
  "bucket" VARCHAR(100) NOT NULL, "object_key" VARCHAR(200) NOT NULL,
  "content_type" VARCHAR(100) NOT NULL, "size_bytes" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "media_assets_object_key_key" ON "media_assets"("object_key");
CREATE INDEX "media_assets_owner_id_created_at_idx" ON "media_assets"("owner_id", "created_at");
ALTER TABLE "quotations" ADD COLUMN "attachment_id" UUID;
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_attachment_id_fkey" FOREIGN KEY ("attachment_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "quotations_attachment_id_idx" ON "quotations"("attachment_id");
