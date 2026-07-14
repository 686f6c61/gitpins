CREATE TABLE IF NOT EXISTS "rate_limit_buckets" (
  "scope" TEXT NOT NULL,
  "identifier" TEXT NOT NULL,
  "windowStart" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "rate_limit_buckets_pkey" PRIMARY KEY ("scope", "identifier", "windowStart")
);

CREATE INDEX IF NOT EXISTS "rate_limit_buckets_expiresAt_idx"
  ON "rate_limit_buckets"("expiresAt");
