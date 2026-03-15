CREATE UNIQUE INDEX "provider_connections_one_default_per_user_idx"
ON "provider_connections"("user_id")
WHERE "is_default" = true;
