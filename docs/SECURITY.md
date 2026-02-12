# GitPins Security

This document describes the security model, controls, and known limitations.

## Security Goals

1. Prevent unauthorized access to a user's GitPins account.
2. Protect GitHub OAuth tokens at rest and in transit.
3. Prevent cross-site request forgery for state-changing actions.
4. Ensure admin access is explicit, revocable, and auditable.
5. Ensure GitPins cannot delete GitHub repositories (no such permission and no such code path).

## Trust Boundaries

Main components:
1. Browser (untrusted environment, user-controlled).
2. GitPins server (trusted).
3. Postgres database (trusted storage, treat as sensitive).
4. GitHub (external system, trusted for identity but not under our control).

## Authentication

### GitHub OAuth (User Identity)

Files:
1. `src/app/api/auth/login/route.ts`
2. `src/app/api/auth/callback/route.ts`
3. `src/lib/session.ts`
4. `src/lib/github.ts`

Controls:
1. OAuth `state` token is generated server-side and stored in an HTTP-only cookie.
2. `returnTo` is sanitized to internal paths only to prevent open redirects.
3. Banned users are blocked during OAuth callback (see `users.isBanned`).

### Session Cookies (App Session)

Files:
1. `src/lib/session.ts`

Design:
1. Session is a signed JWT in an HTTP-only cookie (`gitpins_session`).
2. The session stores only identifiers: `userId`, `githubId`, `username`.
3. Tokens and admin status are not stored in the session cookie.

## Authorization

### User-Level Access

Most API routes enforce:
1. A valid session.
2. Per-user rate limiting.

### Admin Access (Allowlist)

Files:
1. `src/lib/admin.ts`
2. `prisma/schema.prisma` (`admin_accounts`)

Design:
1. Admin access is granted by inserting a GitHub id into `admin_accounts` with `revokedAt IS NULL`.
2. Allowlist can be revoked (`revokedAt` set).
3. `ADMIN_GITHUB_ID` env var is supported as a temporary fallback (migration aid), but DB allowlist is the intended source of truth.

Auditing:
1. Admin actions write to `admin_logs`.

## CSRF Protections

Files:
1. `src/lib/security.ts` (`validateOrigin`)
2. `src/lib/session.ts` (CSRF token cookie)
3. `src/app/api/auth/csrf/route.ts`

Controls:
1. State-changing routes validate Origin/Referer against `NEXT_PUBLIC_APP_URL`.
2. Destructive routes also require a CSRF token:
   1. Server issues a CSRF token and stores it in an HTTP-only cookie.
   2. Client sends the token back in `X-CSRF-Token`.
   3. Server verifies the header token matches the cookie.

Notes:
1. GET routes generally do not require CSRF tokens.
2. Origin validation allows local dev hosts and the configured app URL.

## Rate Limiting

Files:
1. `src/lib/rate-limit.ts`
2. `src/lib/security.ts`

Current implementation:
1. In-memory fixed window rate limiter.
2. Appropriate for single-instance dev and small deployments.

Limitations:
1. Not shared across instances.
2. Not persistent across restarts.

Recommendation for production:
1. Replace with Redis or similar shared storage.

## Secret Handling

### OAuth Tokens

Files:
1. `src/lib/crypto.ts`
2. `src/lib/github.ts`
3. `src/app/api/auth/callback/route.ts`

At rest:
1. Access tokens (and refresh tokens if present) are stored encrypted in `user_tokens`.
2. Encryption uses AES-256-GCM authenticated encryption.
3. Each token encryption uses a unique random salt and IV.
4. Only server-side code can decrypt tokens.

In transit:
1. Tokens never leave the server after OAuth callback.
2. Tokens are not put into the session cookie.
3. Tokens are not included in privacy exports.

Expiry/refresh:
1. If GitHub provides `expires_in`, it is stored as `user_tokens.expiresAt`.
2. `ensureValidToken()` refreshes when close to expiry (5 minute window) and when forced.
3. If refresh is not possible, the user is required to log in again.

### Sync Secret

Files:
1. `prisma/schema.prisma` (`repo_orders.syncSecret`)
2. `src/app/api/sync/route.ts`
3. `src/app/api/sync/[secret]/route.ts`

Design:
1. Sync endpoint is authenticated by a per-user UUID secret.
2. GitHub Action calls `POST /api/sync` and provides the secret in `X-GitPins-Sync-Secret`.
3. `/api/sync` proxies internally to `/api/sync/[secret]`.

Security properties:
1. Secret is high-entropy (UUIDv4) and stored server-side.
2. Sync endpoint is rate-limited per secret (10/hour) to reduce abuse.

## Dangerous Actions: "Sudo Mode"

Files:
1. `src/lib/sudo.ts`
2. `src/app/api/privacy/delete/route.ts`

Design:
1. Deleting an account requires recent reauthentication.
2. The app issues a short-lived `gitpins_sudo` cookie only after completing a fresh OAuth flow initiated with `sudo=1`.

This reduces risk from:
1. Stolen long-lived session cookies.
2. Shared computers.

## Audit Logging (Privacy and Security)

Files:
1. `src/lib/privacy-audit.ts`
2. `prisma/schema.prisma` (`privacy_events`, `account_deletion_audits`)

Design:
1. Privacy/security events are recorded in `privacy_events`.
2. Events are pseudonymized via `subjectHash` so they can survive deletion without keeping direct user identifiers.
3. IP and user agent can be captured in a privacy-preserving way (hashed IP, trimmed UA).

## GitHub Permissions

GitPins should request only what it needs.

Required in practice for commit+revert:
1. Repository contents read/write (to create commits).
2. Repository metadata read (to list repos and read default branch).

Non-goals:
1. Delete repositories.
2. Modify settings, collaborators, issues, or pull requests.

## High-Risk Operations (Explicit Warning)

Commit cleanup rewrites git history. Any history rewrite has inherent risk:
1. Collaborators must re-clone or hard reset.
2. Forks will diverge.
3. Branch protection may block force-updates.

If you keep the cleanup feature, documentation and UI should always describe it as "history rewrite" and require explicit confirmation.

## Deployment Checklist

1. Set `JWT_SECRET` and `ENCRYPTION_SECRET` to strong unique values.
2. Keep `GITHUB_APP_PRIVATE_KEY` secret and rotated if leaked.
3. Ensure `NEXT_PUBLIC_APP_URL` matches the deployed origin exactly.
4. Run behind HTTPS in production.
5. Enable database backups and access controls.
6. Consider replacing in-memory rate limiting with Redis.

