# Deployment

This document describes how GitPins is deployed and operated in production.

The current reference deployment model is:
1. Vercel for the Next.js application.
2. Neon for PostgreSQL.

## Recommended Topology

Components:
1. Vercel project for the web app and API routes.
2. Neon PostgreSQL database.
3. GitHub App for OAuth and installation-based repository access.
4. Optional external scheduler for automatic sync:
   1. GitHub Actions in a repo you control.
   2. Cron on another server.
   3. Any scheduler that can call `POST /api/sync`.

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

Notes:
1. `NEXT_PUBLIC_APP_URL` must match the deployed origin exactly.
2. Use the canonical production domain if you have one.
3. If `NEXT_PUBLIC_APP_URL` is wrong, login redirects and origin validation can fail.

## Preview vs Production

### Preview deployments

Use previews to validate:
1. Build correctness.
2. Type safety.
3. Route generation.
4. Non-OAuth pages and API behavior.

Be careful:
1. OAuth callbacks may not be usable on previews unless the GitHub App callback URL is configured for that preview domain.
2. CSRF origin validation depends on `NEXT_PUBLIC_APP_URL`.

### Production deployments

Before promoting to production:
1. Ensure database migrations are already applied.
2. Ensure the production domain is correct in `NEXT_PUBLIC_APP_URL`.
3. Confirm GitHub App callback/setup URLs match that domain.

## GitHub App Checklist

For production:
1. Homepage URL: `https://your-domain.com`
2. Callback URL: `https://your-domain.com/api/auth/callback`
3. Setup URL: `https://your-domain.com/api/auth/setup`

Permissions:
1. Repository contents: read/write
2. Repository metadata: read-only
3. Account email addresses: read-only

## Database Changes

GitPins currently uses:
1. `prisma db push` for local/dev.
2. SQL migrations for existing databases.

For production:
1. Apply SQL migrations manually with `psql`.
2. Deploy the app after the schema change is confirmed.

Reference:
1. `docs/MIGRATIONS.md`

## Safe Rollout Process

Recommended order:
1. Run tests locally.
2. Create a Vercel preview.
3. Apply any required SQL migration to Neon.
4. Verify preview against the migrated database.
5. Promote or deploy to production.

## Rollback Strategy

Application rollback:
1. Roll back to a previous Vercel deployment if the issue is app-only.

Database rollback:
1. Prefer forward-fixes over destructive rollback.
2. Only roll back schema manually if you have reviewed impact on running code and existing data.

## Operational Checks After Deploy

Check these first:
1. Can users log in?
2. Does `/dashboard` load?
3. Does `/api/repos` return cleanly for an authenticated user?
4. Does manual sync work?
5. Does admin `/admin` access behave correctly for an allowlisted admin?
6. Does privacy export still work?

## Secret Hygiene

If any of these are exposed outside approved secret storage, rotate them:
1. `GITHUB_APP_CLIENT_SECRET`
2. `GITHUB_APP_PRIVATE_KEY`
3. `JWT_SECRET`
4. `ENCRYPTION_SECRET`
5. database credentials

## Notes on Automatic Sync

GitPins does not run scheduled jobs itself on Vercel.

Automatic sync depends on an external caller hitting `POST /api/sync`.

That caller can be:
1. GitHub Actions.
2. Another CI runner.
3. A cron job.
4. A platform scheduler.
