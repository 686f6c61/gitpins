# GitPins API

This document is a maintainer-focused map of the HTTP API exposed by GitPins.

It is not a formal OpenAPI spec. It is the shortest accurate overview of:
1. What each endpoint is for.
2. Which auth model it uses.
3. Which risks or invariants matter operationally.

## Conventions

Authentication patterns:
1. Session auth: HTTP-only session cookie (`gitpins_session`).
2. CSRF: `X-CSRF-Token` header for state-changing browser actions.
3. Origin validation: applied to sensitive state-changing routes.
4. Sync secret: `X-GitPins-Sync-Secret` header to `POST /api/sync`, internally routed to `/api/sync/[secret]`.

Response patterns:
1. `401` for missing authentication.
2. `403` for authenticated but unauthorized requests, CSRF failures, invalid origin, or missing sudo.
3. `429` for rate limit hits.

## Auth

### `GET /api/auth/login`

Purpose:
1. Starts GitHub OAuth.
2. Stores OAuth `state`.
3. Optionally stores `returnTo`.
4. Optionally marks the flow as `sudo=1`.

### `GET /api/auth/callback`

Purpose:
1. Completes OAuth.
2. Upserts `users`.
3. Upserts encrypted `user_tokens`.
4. Creates the app session.
5. Links pre-granted admin allowlist rows to the logged-in user.

### `GET /api/auth/logout`

Purpose:
1. Clears the app session and sudo cookies.

### `GET /api/auth/csrf`

Purpose:
1. Issues a CSRF token for authenticated clients.

### `GET /api/auth/setup`

Purpose:
1. Handles GitHub App installation/setup flow.
2. Ensures the installation belongs to the expected user.

## Repositories and Ordering

### `GET /api/repos`

Purpose:
1. Returns repository list and current saved ordering/settings for the authenticated user.

Notes:
1. Does not expose `syncSecret` to the browser.
2. Exposes booleans such as `syncConfigured` and `canManualSync`.

### `POST /api/repos/order`

Purpose:
1. Saves the ordered list and sync-related settings.
2. Ensures `repo_orders.syncSecret` exists.
3. Writes snapshot and sync log entries.

Security:
1. Session auth.
2. CSRF validation.
3. Input validation for repo names and settings.

### `GET /api/activity`

Purpose:
1. Returns activity history for the user-facing dashboard.

## Sync

### `POST /api/sync`

Purpose:
1. Browser-safe or scheduler-safe entrypoint for sync.
2. Reads `X-GitPins-Sync-Secret`.
3. Proxies internally to `/api/sync/[secret]`.

### `POST /api/sync/[secret]`

Purpose:
1. Executes the ordering algorithm for a single user.
2. Uses installation-scoped GitHub API access to touch repositories.

Guards:
1. Per-secret rate limit.
2. `GITPINS_DISABLE_GITHUB_MUTATIONS`.
3. `autoEnabled`.
4. `preferredHour`.
5. Best-effort concurrency lock with `lastSyncAt`.

### `POST /api/sync/manual`

Purpose:
1. Authenticated manual sync from the dashboard.
2. Looks up the user's `syncSecret`.
3. Calls the same core sync path internally.

Security:
1. Session auth.
2. CSRF token.

## Privacy

### `GET /api/privacy/export`

Purpose:
1. Lists recent export jobs for the authenticated user.

### `POST /api/privacy/export`

Purpose:
1. Creates a new export job.
2. Stores gzipped JSON payload in `data_export_jobs`.
3. Writes privacy audit events.

Security:
1. Session auth.
2. Origin validation.
3. CSRF.
4. Rate limiting.

### `GET /api/privacy/export/[jobId]/download`

Purpose:
1. Downloads a prepared export payload.

### `POST /api/privacy/delete`

Purpose:
1. Deletes the authenticated GitPins account and user-owned data.

Security:
1. Session auth.
2. Origin validation.
3. CSRF.
4. Sudo mode.
5. Typed confirmation.

### `GET /api/privacy/sudo`

Purpose:
1. Returns whether the current session is in sudo mode and until when.

## Admin

### `GET /api/admin/access`

Purpose:
1. Lists admin allowlist rows and current admin identity context.

### `POST /api/admin/access/grant`

Purpose:
1. Grants admin access by GitHub ID.
2. Works even if the target user has not logged in yet.

Security:
1. Session auth.
2. Admin allowlist check.
3. Origin validation.
4. CSRF.
5. Rate limiting.
6. Sudo mode.

### `POST /api/admin/access/revoke`

Purpose:
1. Revokes admin access by GitHub ID.

Notes:
1. Self-revoke is blocked.
2. Audit log is written transactionally.

### `GET /api/admin/users`

Purpose:
1. Lists users for the admin dashboard.

### `POST /api/admin/users/[id]/ban`

Purpose:
1. Bans a user from logging in.

### `POST /api/admin/users/[id]/unban`

Purpose:
1. Removes ban state.

### `DELETE /api/admin/users/[id]/delete`

Purpose:
1. Deletes a user and their user-owned data from GitPins.

Important:
1. This never deletes GitHub repositories.
2. Active admin accounts cannot be banned or deleted accidentally.

### `GET /api/admin/stats`

Purpose:
1. Returns dashboard totals and chart data.

## Operational Advice

For browser-side state-changing calls, always ensure:
1. Session exists.
2. CSRF token has been fetched.
3. The client handles `reauth_required` cleanly for sudo-protected actions.

For external scheduled sync:
1. Treat `syncSecret` like a secret token.
2. Store it in the scheduler secret store, never in browser code.
3. Prefer a scheduler you control.
