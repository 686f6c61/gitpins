-- M1: Admin allowlist table
CREATE TABLE IF NOT EXISTS "admin_accounts" (
  "id" TEXT NOT NULL,
  "githubId" INTEGER NOT NULL,
  "userId" TEXT,
  "grantedByUserId" TEXT,
  "reason" TEXT,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "admin_accounts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "admin_accounts_githubId_key" ON "admin_accounts"("githubId");
CREATE INDEX IF NOT EXISTS "admin_accounts_revokedAt_idx" ON "admin_accounts"("revokedAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'admin_accounts_userId_fkey'
  ) THEN
    ALTER TABLE "admin_accounts"
      ADD CONSTRAINT "admin_accounts_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Bootstrap allowlist from legacy users.isAdmin=true
INSERT INTO "admin_accounts" ("id", "githubId", "userId", "reason")
SELECT
  CONCAT('bootstrap-', "githubId"::text),
  "githubId",
  "id",
  'Bootstrapped from legacy users.isAdmin'
FROM "users"
WHERE "isAdmin" = true
ON CONFLICT ("githubId") DO NOTHING;
