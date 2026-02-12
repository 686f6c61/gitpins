# GitPins Architecture

This document explains how GitPins is structured and how the main flows work end-to-end.

## What GitPins Does (Scope)

GitPins helps a user keep a chosen set of repositories appearing "on top" by manipulating repository "last updated" ordering on GitHub.

GitPins:
1. Lets users choose an ordered list of repositories (the desired "top").
2. Persists that order in Postgres.
3. Provides a sync endpoint that "touches" repositories (empty commit + revert) so GitHub updates their recency.

GitPins does not:
1. Read or modify repository files beyond creating empty commits.
2. Delete repositories.

## High-Level Diagram

```mermaid
flowchart LR
  Browser[Browser] -->|OAuth redirect| GitHubOAuth[GitHub OAuth]
  GitHubOAuth -->|callback| App[Next.js App Router]
  Browser -->|API calls| App
  App --> DB[(Postgres)]
  App --> GitHubAPI[GitHub REST API]
  Action[GitHub Action (user-owned)] -->|POST /api/sync| App
```

Notes:
1. The GitHub Action is "user-owned": it runs in the user's GitHub account, not in GitPins infrastructure.
2. The sync endpoint is authenticated by a per-user secret (`repo_orders.syncSecret`) passed in a header.

## Code Layout

Key folders:
1. `src/app/`: Next.js App Router pages and route handlers.
2. `src/app/api/`: HTTP API endpoints (Next.js route handlers).
3. `src/lib/`: shared server-side modules (auth, GitHub, crypto, security).
4. `prisma/`: Prisma schema and migrations.
5. `docs/`: architecture and operational documentation (this folder).

## Core Data Model (Postgres)

Prisma schema: `prisma/schema.prisma`

Main tables:
1. `users`
   - One row per GitHub account.
   - Includes `installationId` (GitHub App installation id) when installed.
   - Ban state is stored here (`isBanned`, `bannedAt`, `bannedReason`).
2. `user_tokens`
   - Encrypted OAuth access token (and optionally refresh token).
   - Optional `expiresAt` for expiring access tokens.
3. `repo_orders`
   - User's ordered list and sync settings.
   - `syncSecret` is a per-user UUID used to authenticate `/api/sync`.
4. `order_snapshots`
   - History of configuration changes (manual/restores).
5. `sync_logs`
   - Operational logs for sync and manual events.
6. `admin_accounts`
   - Admin allowlist (GitHub ids), revocable (`revokedAt`).
7. `admin_logs`
   - Audit of admin actions (ban/unban/delete).
8. `privacy_events`
   - Privacy and security relevant events (pseudonymized via `subjectHash`).
   - `userId` is nullable and uses `ON DELETE SET NULL` so events can survive account deletion.
9. `data_export_jobs`
   - Stored exports (gzipped JSON payload).
   - TTL is enforced at the application layer (currently 72h).
10. `account_deletion_audits`
   - Deletion audit that survives the deleted user (no FK).

Important on-delete behavior:
1. Deleting a `user` cascades to `user_tokens`, `repo_orders`, `order_snapshots`, `sync_logs`, `data_export_jobs`.
2. Privacy event rows can survive deletion because `privacy_events.userId` is set to NULL.
3. Admin allowlist rows can survive deletion because `admin_accounts.userId` is set to NULL.

## Request/Response Flows

### 1) Login (GitHub OAuth)

Files:
1. `src/app/api/auth/login/route.ts`
2. `src/app/api/auth/callback/route.ts`
3. `src/lib/session.ts`
4. `src/lib/github.ts`

Sequence:
1. Browser hits `GET /api/auth/login?returnTo=/dashboard`.
2. Server generates an OAuth `state`, stores it in an HTTP-only cookie, and redirects to GitHub.
3. GitHub redirects back to `GET /api/auth/callback?code=...&state=...`.
4. Server verifies the `state` cookie.
5. Server exchanges `code` for an access token (and possibly a refresh token).
6. Server loads the GitHub user profile, upserts `users`, upserts `user_tokens`.
7. Server sets the session cookie (`gitpins_session`) and redirects to `returnTo` (or `/dashboard`).

### 2) "Sudo Mode" (Reauthentication for Dangerous Actions)

Files:
1. `src/lib/sudo.ts`
2. `src/app/api/auth/login/route.ts` (supports `sudo=1`)
3. `src/app/api/auth/callback/route.ts` (sets sudo cookie after reauth)

Design:
1. Destructive actions require a short-lived `gitpins_sudo` cookie.
2. The sudo cookie is issued only after a fresh OAuth round-trip initiated with `sudo=1`.
3. This prevents an old long-lived session from being used to delete data without reauth.

### 3) Dashboard Load

Files:
1. `src/app/dashboard/page.tsx` (server component gatekeeper)
2. `src/app/dashboard/dashboard-client.tsx` (client UI)
3. `src/app/api/repos/route.ts` (fetch repos)
4. `src/lib/github.ts` (GitHub REST calls)

Sequence:
1. Server component checks session.
2. Server component checks user exists in DB and has `installationId`.
3. Client component calls `GET /api/repos` to load repo metadata and apply saved ordering.

### 4) Save Ordering

Files:
1. `src/app/api/repos/order/route.ts`
2. `prisma/schema.prisma` (`repo_orders`, `order_snapshots`, `sync_logs`)

Sequence:
1. Client sends `POST /api/repos/order` with the full list and settings.
2. Server validates repo names and settings.
3. Server upserts `repo_orders` and ensures a `syncSecret` exists.
4. Server creates an `order_snapshots` row and a `sync_logs` row (`manual_order`).

### 5) Sync (Reorder "Last Updated" by Touching Repos)

Files:
1. `src/app/api/sync/[secret]/route.ts`
2. `src/lib/github-app.ts` (installation Octokit)

Auth model:
1. A per-user `syncSecret` is used to authenticate the sync call.
2. The secret is expected in the URL path (`/api/sync/[secret]`) after being proxied by `/api/sync` which reads it from a header.

Guards:
1. Rate-limited per secret (10/hour).
2. Can be globally disabled via `GITPINS_DISABLE_GITHUB_MUTATIONS=true`.
3. Respects `repo_orders.autoEnabled` (unless forced manually).
4. Optional `preferredHour` gate (UTC).
5. Best-effort lock via `lastSyncAt` to avoid concurrent runs.

Algorithm:
1. Fetch current global order from GitHub.
2. Compute the minimal prefix of desired repos that must become "newer" to achieve the exact desired top-N.
3. Touch repos in reverse so the first desired repo ends up most recent.
4. For each repo touched:
   1. Create an empty commit.
   2. Create a revert commit.

Logs:
1. A detailed `sync_logs` entry is written with per-repo results and durations.

### 6) Privacy Export

Files:
1. `src/app/api/privacy/export/route.ts`
2. `src/app/api/privacy/export/[jobId]/download/route.ts`
3. `src/lib/privacy-audit.ts`

Design:
1. Export payload is created server-side and stored as gzipped JSON in `data_export_jobs`.
2. The payload is downloadable for a limited time (72h).
3. Exports never include secrets (OAuth tokens, sync secret).
4. `privacy_events` records export requests and downloads.

### 7) Account Deletion

Files:
1. `src/app/api/privacy/delete/route.ts`
2. `src/lib/sudo.ts`

Design:
1. Requires an authenticated session, CSRF token, and active sudo cookie.
2. Requires typed confirmation (username + phrase).
3. Writes an `account_deletion_audits` row before deletion.
4. Deletes the `users` row (cascade will delete most user-owned data).
5. Writes a `privacy_events` row that survives deletion (`userId: null`).

### 8) Admin

Files:
1. `src/lib/admin.ts`
2. `src/app/api/admin/**`

Design:
1. Admin is allowlisted in `admin_accounts` by GitHub id.
2. Admin endpoints are protected by `verifyAdmin()` and rate limiting.
3. All actions write `admin_logs`.

## Local Development (Short Summary)

See `docs/LOCAL_DEV.md` for end-to-end steps.

## Known Gaps / Future Work

This architecture assumes some external scheduler (often a GitHub Action) calls the sync endpoint regularly. If you run GitPins without that, ordering works in the UI but auto-maintenance will not occur.

