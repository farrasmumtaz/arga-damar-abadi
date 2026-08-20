CREATE UNIQUE INDEX "addresses_one_default_per_user_idx"
ON "addresses" ("user_id")
WHERE "is_default" = true;
