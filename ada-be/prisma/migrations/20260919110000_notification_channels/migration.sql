ALTER TABLE "users" ADD COLUMN "whatsapp_opt_in_at" TIMESTAMP(3);
ALTER TABLE "notifications" ADD COLUMN "channel" VARCHAR(10) NOT NULL DEFAULT 'EMAIL', ADD COLUMN "user_id" UUID;
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at");
