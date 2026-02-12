-- M2: Data integrity checks for repo orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'repo_orders_topn_check'
  ) THEN
    ALTER TABLE "repo_orders"
      ADD CONSTRAINT "repo_orders_topn_check"
      CHECK ("topN" BETWEEN 1 AND 100);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'repo_orders_preferred_hour_check'
  ) THEN
    ALTER TABLE "repo_orders"
      ADD CONSTRAINT "repo_orders_preferred_hour_check"
      CHECK ("preferredHour" IS NULL OR "preferredHour" BETWEEN 0 AND 23);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'repo_orders_sync_frequency_check'
  ) THEN
    ALTER TABLE "repo_orders"
      ADD CONSTRAINT "repo_orders_sync_frequency_check"
      CHECK ("syncFrequency" IN (1, 2, 4, 6, 8, 12, 24, 48, 168, 360, 720));
  END IF;
END $$;
