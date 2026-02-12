# Database Migrations

GitPins currently uses two mechanisms:
1. `prisma db push` to synchronize schema directly (used for local/dev and Docker).
2. Idempotent SQL migration scripts in `prisma/migrations/` for incremental changes on an existing database.

This document explains what exists today and how to apply changes safely.

## Current State (Important)

1. The repository contains Prisma migrations, but local development uses `prisma db push`.
2. If your database was created via `db push`, it will not have Prisma's `_prisma_migrations` table.
3. Running `prisma migrate deploy` on a non-empty database without a baseline will fail with `P3005`.

## Recommended Approach (Today)

### Local Development

Use:
1. `npx prisma db push`

Reason:
1. It creates/updates the schema quickly and avoids baseline issues.

### Production / Existing Databases

Apply SQL migrations manually in order.

Why:
1. The SQL migrations in this repo are written to be idempotent (`IF NOT EXISTS`, guarded `DO $$ ... $$` blocks).
2. This avoids Prisma migrate baseline friction for existing databases.

## Applying SQL Migrations

Folder:
1. `prisma/migrations/*/migration.sql`

Order:
1. Apply in chronological order (folder name prefix is a timestamp).

Suggested process:
1. Take a database backup.
2. Apply migrations in a transaction when possible.
3. Verify schema changes (tables, indexes, constraints) match expectations.
4. Deploy the application code that depends on the migration.

Example (psql):

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f prisma/migrations/20260211223001_m1_admin_accounts/migration.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f prisma/migrations/20260211223002_m2_repo_order_checks/migration.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f prisma/migrations/20260211223003_m3_sync_secret_unique/migration.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f prisma/migrations/20260211223004_m4_drop_legacy_tokens/migration.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f prisma/migrations/20260212001000_m5_privacy_audit_and_exports/migration.sql
```

Notes:
1. M1 expects the `users` table to exist because it bootstraps from it. If you are setting up a brand new database, run `prisma db push` first.
2. M4 drops legacy columns. Apply only after confirming the application no longer depends on those columns.

## Moving to `prisma migrate` (Future)

If you want to fully adopt Prisma Migrate:
1. Create a baseline migration for the initial schema (M0).
2. Ensure the production database has `_prisma_migrations`.
3. Mark already-applied migrations as applied (`prisma migrate resolve`) if needed.

This requires careful planning because a database created by `db push` has no migration history.

