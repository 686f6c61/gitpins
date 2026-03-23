ALTER TABLE "admin_accounts"
  ADD COLUMN IF NOT EXISTS "revokedByUserId" TEXT,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "admin_logs"
  ADD COLUMN IF NOT EXISTS "adminGithubId" INTEGER,
  ADD COLUMN IF NOT EXISTS "adminUsernameSnapshot" TEXT,
  ADD COLUMN IF NOT EXISTS "targetGithubId" INTEGER,
  ADD COLUMN IF NOT EXISTS "targetUsernameSnapshot" TEXT;

UPDATE "admin_logs" AS log
SET
  "adminGithubId" = users."githubId",
  "adminUsernameSnapshot" = users."username"
FROM "users" AS users
WHERE log."adminId" = users."id"
  AND (log."adminGithubId" IS NULL OR log."adminUsernameSnapshot" IS NULL);

UPDATE "admin_logs" AS log
SET
  "targetGithubId" = users."githubId",
  "targetUsernameSnapshot" = users."username"
FROM "users" AS users
WHERE log."targetUserId" = users."id"
  AND (log."targetGithubId" IS NULL OR log."targetUsernameSnapshot" IS NULL);

ALTER TABLE "admin_logs"
  ALTER COLUMN "adminId" DROP NOT NULL,
  ALTER COLUMN "targetUserId" DROP NOT NULL;

ALTER TABLE "admin_logs" DROP CONSTRAINT IF EXISTS "admin_logs_adminId_fkey";
ALTER TABLE "admin_logs" DROP CONSTRAINT IF EXISTS "admin_logs_targetUserId_fkey";

ALTER TABLE "admin_logs"
  ADD CONSTRAINT "admin_logs_adminId_fkey"
    FOREIGN KEY ("adminId") REFERENCES "users"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;

ALTER TABLE "admin_logs"
  ADD CONSTRAINT "admin_logs_targetUserId_fkey"
    FOREIGN KEY ("targetUserId") REFERENCES "users"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "admin_logs_action_createdAt_idx"
  ON "admin_logs"("action", "createdAt");
