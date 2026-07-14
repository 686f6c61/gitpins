# Deployment

This document describes how GitPins is deployed and operated in production today.

## Reference Production Topology

The current reference deployment model is:
1. Coolify as the application orchestrator.
2. A self-hosted Contabo server running the Docker workloads.
3. A PostgreSQL service attached inside the same Coolify project.
4. A GitHub App for OAuth and installation-based repository access.
5. An external scheduler that calls `POST /api/sync`.

Notes:
1. GitPins does not depend on Vercel.
2. GitPins does not require a managed database provider such as Neon.
3. The app remains portable to other Docker-compatible platforms as long as the environment variables and PostgreSQL connectivity are equivalent.

## Sources of Truth

When local files and production differ, trust production in this order:
1. Coolify application settings and environment variables.
2. The running container environment.
3. Coolify deployment history (`application_deployment_queues`).
4. The repository documentation.

Why:
1. Old local `.env` files can preserve obsolete providers or domains.
2. The running container proves what the app is actually using now.

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
2. `ADMIN_GITHUB_ID` as a temporary fallback during migrations only
3. Observability variables such as Sentry/GlitchTip DSNs

Notes:
1. `NEXT_PUBLIC_APP_URL` must match the canonical production origin exactly.
2. If `NEXT_PUBLIC_APP_URL` is wrong, login redirects and origin checks can fail.
3. `DATABASE_URL` and `DIRECT_URL` can point to the same PostgreSQL host if you are not separating pooled and direct connections.

## Current Runtime Assumptions

The production app currently expects:
1. Port `3000` inside the container.
2. `NODE_ENV=production`.
3. HTTPS termination in the reverse proxy layer.
4. A PostgreSQL schema already present before the app version depending on it is rolled out.

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
1. `prisma db push` for local/dev convenience.
2. SQL migrations for existing databases.

For production:
1. Apply SQL migrations manually with `psql`.
2. Verify the new schema objects exist before deploying the app code that requires them.
3. Prefer additive, forward-compatible changes.

Reference:
1. `docs/MIGRATIONS.md`

## Safe Rollout Process

Recommended order:
1. Run tests locally.
2. Build locally with `pnpm exec next build`.
3. Apply any required SQL migration to the production PostgreSQL database.
4. Push the code to the tracked branch.
5. Trigger or wait for the Coolify deployment.
6. Verify the running container uses the intended commit and environment.
7. Test login, dashboard, sync, admin, and privacy export on the live domain.

## What to Verify in Coolify

Before or after a deployment, verify:
1. The app points to the correct repository and branch.
2. The FQDN list matches the intended domains.
3. The environment variables are set in Coolify, not just locally.
4. The deployment finished successfully in `application_deployment_queues`.
5. The running container image/commit matches the rollout you intended.

## Rollback Strategy

Application rollback:
1. Redeploy the last known-good commit in Coolify.
2. Confirm the running container changed to that commit.

Database rollback:
1. Prefer forward-fixes over destructive rollback.
2. Only revert schema manually if you have reviewed the effect on existing data and app compatibility.

## Operational Checks After Deploy

Check these first:
1. Can users log in?
2. Does `/dashboard` load?
3. Does `/api/repos` return cleanly for an authenticated user?
4. Does manual sync work?
5. Does admin `/admin` access behave correctly for an allowlisted admin?
6. Does privacy export still work?
7. Do response headers include the expected hardening configuration?

## Common Post-Deploy Gotcha

If users report `Failed to find Server Action` shortly after a release:
1. Ask them to hard refresh or reopen the tab.
2. Check whether a stale page is calling server actions from an older build.
3. Confirm only the latest app version is serving traffic.

## Secret Hygiene

If any of these are exposed outside approved secret storage, rotate them:
1. `GITHUB_APP_CLIENT_SECRET`
2. `GITHUB_APP_PRIVATE_KEY`
3. `JWT_SECRET`
4. `ENCRYPTION_SECRET`
5. database credentials

## Notes on Automatic Sync

GitPins does not run scheduled jobs by itself.

Automatic sync depends on an external caller hitting `POST /api/sync`.

That caller can be:
1. GitHub Actions.
2. Another CI runner.
3. A cron job.
4. A platform scheduler.
