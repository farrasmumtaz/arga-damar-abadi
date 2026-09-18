CREATE TABLE "notifications" (
  "id" UUID NOT NULL, "event_key" VARCHAR(200) NOT NULL,
  "recipient" VARCHAR(255) NOT NULL, "subject" VARCHAR(200) NOT NULL, "body" TEXT NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'QUEUED', "attempts" INTEGER NOT NULL DEFAULT 0,
  "next_attempt_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sent_at" TIMESTAMP(3), "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "notifications_event_key_key" ON "notifications"("event_key");
-- Queue polling only touches ready rows rather than scanning sent history.
CREATE INDEX "notifications_status_next_attempt_at_idx" ON "notifications"("status", "next_attempt_at");
