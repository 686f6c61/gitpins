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
1. `npm run admin:access -- list`
2. `npm run admin:access -- grant --github-id <id>`

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

## SonarQube Shows Old Findings

### Symptom

Local code is fixed but Sonar still shows old bugs/hotspots.

Check:
1. A fresh scan has been run.
2. The local SonarQube CE task completed successfully.
3. You are looking at the latest analysis for the correct project key.
