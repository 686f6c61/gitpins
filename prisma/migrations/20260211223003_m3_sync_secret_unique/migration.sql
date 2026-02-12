-- M3: Sync secret consistency and indexing
UPDATE "repo_orders"
SET "syncSecret" = lower(
  substr(md5(random()::text || clock_timestamp()::text), 1, 8) || '-' ||
  substr(md5(random()::text || clock_timestamp()::text), 1, 4) || '-' ||
  '4' || substr(md5(random()::text || clock_timestamp()::text), 1, 3) || '-' ||
  'a' || substr(md5(random()::text || clock_timestamp()::text), 1, 3) || '-' ||
  substr(md5(random()::text || clock_timestamp()::text), 1, 12)
)
WHERE "syncSecret" IS NULL OR "syncSecret" = '';

CREATE UNIQUE INDEX IF NOT EXISTS "repo_orders_syncSecret_key"
  ON "repo_orders"("syncSecret");

CREATE INDEX IF NOT EXISTS "repo_orders_lastSyncAt_idx"
  ON "repo_orders"("lastSyncAt");
