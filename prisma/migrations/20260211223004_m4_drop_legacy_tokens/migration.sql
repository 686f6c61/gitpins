-- M4: Remove legacy token columns now replaced by user_tokens table
ALTER TABLE "users" DROP COLUMN IF EXISTS "accessToken";
ALTER TABLE "users" DROP COLUMN IF EXISTS "refreshToken";
ALTER TABLE "users" DROP COLUMN IF EXISTS "tokenExpiresAt";
