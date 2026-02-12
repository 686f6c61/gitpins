# GitPins Privacy

This document describes what data GitPins stores, why it stores it, and how export and deletion work.

This is a technical document meant for maintainers and self-hosters.

## Principles

1. Data minimization: store only what is needed to provide the service.
2. Secret minimization: never expose OAuth tokens or sync secrets to end users via exports.
3. Auditability: record privacy-relevant actions (export, deletion) in a way that can survive account deletion without keeping direct identifiers.

## Data We Store

### Account Data (`users`)

Stored fields include:
1. GitHub id and username (primary identity keys).
2. Optional email and avatar URL (if returned by GitHub).
3. GitHub App installation id (when installed).
4. Ban/admin flags (operational controls).
5. Timestamps (created, updated, last login).

### OAuth Tokens (`user_tokens`)

1. Encrypted access token.
2. Optional encrypted refresh token.
3. Optional access token expiration (`expiresAt`) if GitHub provides it.

Notes:
1. Tokens are encrypted at rest.
2. Tokens are never included in data exports.

### Ordering and Sync Settings (`repo_orders`)

1. The ordered list (`reposOrder`) as JSON string.
2. User settings (`topN`, `includePrivate`, `autoEnabled`, `preferredHour`, `syncFrequency`).
3. Per-user sync secret (`syncSecret`) used to authenticate sync requests.

### Operational History (`order_snapshots`, `sync_logs`)

1. Order snapshots are written on manual saves and restore operations.
2. Sync logs are written for sync runs and skips.

### Admin Control and Audit (`admin_accounts`, `admin_logs`)

1. Admin allowlist entries can reference a user but also survive deletion (nullable FK).
2. Admin action logs exist to explain bans/unbans/deletions.

### Privacy Audit (`privacy_events`, `account_deletion_audits`, `data_export_jobs`)

`privacy_events`:
1. Records privacy-relevant actions (export requested, export downloaded, delete requested, delete executed/failed).
2. Uses a pseudonymous `subjectHash` so events can survive user deletion.
3. Can record `ipHash` and `userAgent` for abuse prevention and incident response.

`data_export_jobs`:
1. Stores gzipped export payload (JSON) temporarily.
2. Payload is deleted automatically when the user is deleted (FK cascade).
3. Expiration is enforced in the API handlers (currently 72 hours).
4. Storage is bounded to the most recent 10 exports per user.

`account_deletion_audits`:
1. Stores an audit record for deletion requests.
2. Does not have a foreign key to `users` so it survives deletion.
3. Stores a pseudonymous `subjectHash` plus snapshots of username and GitHub id at deletion time.

## Data We Do Not Store

1. Repository source code.
2. Repository secrets or GitHub Action secrets.
3. Full IP addresses in plaintext (only a hash may be stored).

## Data Export

Endpoints:
1. `POST /api/privacy/export`: creates an export job.
2. `GET /api/privacy/export`: lists recent export jobs (metadata).
3. `GET /api/privacy/export/:jobId/download`: downloads the export payload.

Security requirements:
1. Valid session.
2. Origin validation.
3. CSRF token (`X-CSRF-Token`) for export creation.
4. Rate limiting.

Export content (high level):
1. Account metadata.
2. Ordering settings and history.
3. Sync logs.
4. Admin logs targeting the user (if any).
5. Privacy event history for the user (metadata/details).

Explicit exclusions:
1. OAuth tokens (access/refresh).
2. Sync secret.

Retention:
1. Export payload is stored for 72 hours.
2. Exports are limited to the most recent 10 jobs per user.

## Account Deletion

Endpoint:
1. `POST /api/privacy/delete`

Security requirements:
1. Valid session.
2. Origin validation.
3. CSRF token (`X-CSRF-Token`).
4. "Sudo mode" active (recent reauthentication cookie).
5. Typed confirmation (username + fixed phrase).

What gets deleted:
1. `users` row for the user.
2. All user-owned data with `ON DELETE CASCADE`:
   1. `user_tokens`
   2. `repo_orders`
   3. `order_snapshots`
   4. `sync_logs`
   5. `data_export_jobs`

What survives deletion (pseudonymized audit trail):
1. `privacy_events` rows are retained with `userId` set to NULL.
2. `account_deletion_audits` rows are retained.

Important: GitPins account deletion does not delete any GitHub repositories.

## Local Clones of Production Data

If you clone a production database into a local Postgres instance:
1. Treat the dump as sensitive.
2. Store dumps outside the repository (example: `/tmp`).
3. Do not commit dumps.
4. Prefer working in an isolated machine/account.

Script reference:
1. `scripts/clone-neon-to-local.sh`

## Suggested Future Improvements

1. Add a scheduled job to purge `privacy_events` older than a defined retention window (policy decision).
2. Add an explicit "privacy retention" policy to the public website and README.
3. Add an admin export of aggregated privacy events for incident response (careful with privacy).

