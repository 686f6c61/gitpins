-- M5: Privacy audit events + data export jobs + account deletion audits

CREATE TABLE IF NOT EXISTS "privacy_events" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "subjectHash" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "details" TEXT,
  "ipHash" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "privacy_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "privacy_events_userId_createdAt_idx"
  ON "privacy_events"("userId", "createdAt");

CREATE INDEX IF NOT EXISTS "privacy_events_subjectHash_createdAt_idx"
  ON "privacy_events"("subjectHash", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'privacy_events_userId_fkey'
  ) THEN
    ALTER TABLE "privacy_events"
      ADD CONSTRAINT "privacy_events_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "data_export_jobs" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ready',
  "format" TEXT NOT NULL DEFAULT 'json',
  "filename" TEXT NOT NULL,
  "payloadGzip" BYTEA,
  "sha256" TEXT,
  "sizeBytes" INTEGER,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "readyAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "downloadedAt" TIMESTAMP(3),
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "data_export_jobs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "data_export_jobs_userId_requestedAt_idx"
  ON "data_export_jobs"("userId", "requestedAt");

CREATE INDEX IF NOT EXISTS "data_export_jobs_expiresAt_idx"
  ON "data_export_jobs"("expiresAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'data_export_jobs_userId_fkey'
  ) THEN
    ALTER TABLE "data_export_jobs"
      ADD CONSTRAINT "data_export_jobs_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "account_deletion_audits" (
  "id" TEXT NOT NULL,
  "subjectHash" TEXT NOT NULL,
  "usernameSnapshot" TEXT NOT NULL,
  "githubIdSnapshot" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'requested',
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "executedAt" TIMESTAMP(3),
  "ipHash" TEXT,
  "userAgent" TEXT,
  "reason" TEXT,
  "error" TEXT,
  CONSTRAINT "account_deletion_audits_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "account_deletion_audits_subjectHash_requestedAt_idx"
  ON "account_deletion_audits"("subjectHash", "requestedAt");

