# Troubleshooting

This document is a runbook for common GitPins failures.

## Login Problems

### Symptom

User cannot log in or gets redirected back with an auth error.

Check:
1. `NEXT_PUBLIC_APP_URL` matches the deployed origin exactly.
2. GitHub App callback URL matches the same origin.
3. `GITHUB_APP_CLIENT_ID`, `GITHUB_APP_CLIENT_SECRET`, and `GITHUB_APP_PRIVATE_KEY` are valid.

## GitHub App Installation Problems

### Symptom

Repos are missing or install/setup feels incomplete.

Check:
1. The GitHub App is installed on the target repositories.
2. The stored `installationId` exists on the user row.
3. Repository metadata permissions are still granted.

## Manual Sync Does Nothing

### Symptom

User presses "Sync now" and ordering is skipped or fails.

Check:
1. `repo_orders.syncSecret` exists.
2. `installationId` exists for the user.
3. `GITPINS_DISABLE_GITHUB_MUTATIONS` is not `true`.
4. App has contents write access on the target repos.

## Scheduled Sync Does Not Run

### Symptom

Auto-maintenance never happens.

Remember:
1. GitPins does not run a scheduler by itself.
2. An external scheduler must call `POST /api/sync`.

Check:
1. The scheduler is actually running.
2. It calls the correct app URL.
3. It sends the correct `X-GitPins-Sync-Secret`.
4. `autoEnabled` is still true.
5. If `preferredHour` is set, the current UTC hour matches it.

If using GitHub Actions:
1. Check the Actions logs in the repository that hosts your workflow.

## User Is Not Recognized as Admin

### Symptom

User can log in but `/admin` returns 403.

Check:
1. There is an active row in `admin_accounts` for that GitHub ID.
2. `revokedAt` is NULL.
3. The user logged in with the same GitHub account that was allowlisted.

Fix:
1. `pnpm run admin:access -- list`
2. `pnpm run admin:access -- grant --github-id <id>`

## Admin Action Returns `reauth_required`

### Symptom

Ban, unban, delete, grant, or revoke returns 403 with `reauth_required`.

Meaning:
1. The user is authenticated but not in sudo mode.

Fix:
1. Reauthenticate with GitHub.
2. Retry during the short sudo window.

## Privacy Export Fails

### Symptom

`POST /api/privacy/export` returns 500 or the download fails.

Check:
1. Session exists.
2. CSRF token is valid.
3. DB writes to `data_export_jobs` and `privacy_events` succeed.
4. Payload generation does not include unserializable data.

## Old GitPins Commits Still Exist

### Symptom

User sees old `[GitPins]` commits from historical versions.

Meaning:
1. Current versions no longer create those commits during normal sync.
2. Old commits remain until explicit cleanup.

Check:
1. Current sync path uses temporary tag refs, not commit creation.
2. User understands cleanup rewrites history and is optional.

## Local Docker Can Reach DB But Host Cannot

### Symptom

The app works in Docker, but host-side `psql` using `.env.docker` fails.

Reason:
1. `.env.docker` typically uses host `db`, which only resolves inside the Docker network.

Fix:
1. Replace `@db:` with `@localhost:` when connecting from the host machine.

## `localhost:5432` Hits the Wrong PostgreSQL

### Symptom

`docker compose` reports the GitPins DB as healthy, but host-side `psql` or Prisma talks to a different cluster.

Reason:
1. A local PostgreSQL service is already bound to `127.0.0.1:5432`.
2. Docker can still expose the container, but host tools may resolve to the host server instead of the GitPins container.

Fix:
1. Start GitPins DB on another host port: `GITPINS_DB_PORT=5433 docker compose up -d db`
2. Or stop the local PostgreSQL service that owns `127.0.0.1:5432`

## `prisma migrate deploy` Returns `P3005`

### Symptom

Prisma says the database schema is not empty.

Meaning:
1. The database was created by `prisma db push` or restored from a dump.
2. It has schema objects but no `_prisma_migrations` baseline history.

Fix:
1. For local development, use `pnpm exec prisma db push`
2. For existing production-style databases, apply the SQL files in `prisma/migrations/` manually
3. Only adopt `prisma migrate deploy` after creating and resolving a proper baseline

## `Failed to find Server Action` After Deploy

### Symptom

Users see `Failed to find Server Action` errors shortly after a deployment.

Meaning:
1. The browser still holds action identifiers from a previous Next.js build.
2. The server is already serving a newer build, so those action IDs no longer exist.

Fix:
1. Hard refresh the page.
2. Close stale tabs and reopen the app.
3. If the problem persists for all users, confirm only one active app version is serving traffic and verify the latest deployment completed cleanly.
