# Deployment

This document describes the public, self-hostable deployment model for GitPins.

GitPins is designed to run as:
1. A Next.js application.
2. A PostgreSQL-backed service.
3. A GitHub App integration.
4. An optional external scheduler for automatic sync.

GitPins does not depend on any specific hosting vendor.

## Minimum Production Requirements

You need:
1. A stable public origin such as `https://your-domain.com`.
2. A PostgreSQL database.
3. A place to run the Next.js app:
   - Docker host,
   - container platform,
   - VM,
   - or equivalent Node.js environment.
4. A GitHub App configured for that public origin.
5. HTTPS in front of the app.

## Required Environment Variables

Required:
1. `DATABASE_URL`
2. `DIRECT_URL`
3. `GITHUB_APP_ID`
4. `GITHUB_APP_CLIENT_ID`
5. `GITHUB_APP_CLIENT_SECRET`
6. `GITHUB_APP_PRIVATE_KEY`
7. `NEXT_PUBLIC_APP_URL`
8. `JWT_SECRET`
9. `ENCRYPTION_SECRET`

Optional:
1. `GITPINS_DISABLE_GITHUB_MUTATIONS`
2. observability variables such as Sentry-compatible DSNs

Notes:
1. `NEXT_PUBLIC_APP_URL` must match the public origin exactly.
2. `DATABASE_URL` and `DIRECT_URL` can point to the same PostgreSQL server if you do not need separate pooled and direct connections.
3. In production, `GITPINS_DISABLE_GITHUB_MUTATIONS` should normally be `false`.

## GitHub App Checklist

For production:
1. Homepage URL: `https://your-domain.com`
2. Callback URL: `https://your-domain.com/api/auth/callback`
3. Setup URL: `https://your-domain.com/api/auth/setup`

Permissions:
1. Repository contents: read/write
2. Repository metadata: read-only
3. Account email addresses: read-only

OAuth settings:
1. Enable "Request user authorization (OAuth) during installation".

## Database and Schema

GitPins currently uses:
1. `prisma db push` for local development convenience.
2. versioned SQL migrations in `prisma/migrations/` for incremental production updates.

For production:
1. apply SQL migrations in order,
2. verify the new schema objects exist before rolling out the app version that needs them,
3. prefer additive and forward-compatible changes.

Reference:
1. `docs/MIGRATIONS.md`

## Deployment Flow

Recommended order:
1. Set all required environment variables.
2. Build the application.
3. Apply any required SQL migration to the PostgreSQL database.
4. Start or update the application.
5. Verify login, dashboard, sync, admin, and privacy export flows.

## Runtime Assumptions

The production app expects:
1. `NODE_ENV=production`
2. HTTPS at the public origin
3. database schema already present for the deployed app version
4. port `3000` inside the container image when using the provided Docker setup

## Post-Deploy Verification

Check these first:
1. Can users log in?
2. Does `/dashboard` load?
3. Does `/api/repos` return cleanly for an authenticated user?
4. Does manual sync work?
5. Does admin `/admin` access behave correctly for an allowlisted admin?
6. Does privacy export still work?

## Rollback Strategy

Application rollback:
1. redeploy the last known-good application version,
2. confirm the running app really changed.

Database rollback:
1. prefer forward-fixes over destructive rollback,
2. only revert schema manually after reviewing app compatibility and existing data impact.

## Secret Hygiene

If any of these are exposed outside approved secret storage, rotate them:
1. `GITHUB_APP_CLIENT_SECRET`
2. `GITHUB_APP_PRIVATE_KEY`
3. `JWT_SECRET`
4. `ENCRYPTION_SECRET`
5. database credentials

## Notes on Automatic Sync

GitPins does not run scheduled jobs by itself.

Automatic sync requires an external caller to hit `POST /api/sync`.

That caller can be:
1. GitHub Actions
2. another CI runner
3. cron
4. any scheduler capable of sending an HTTP request
