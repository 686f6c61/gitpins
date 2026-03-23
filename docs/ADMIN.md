# GitPins Admin

This document explains the admin model used by GitPins and how to operate it safely.

## Design Goals

The admin system should be:
1. Explicit.
2. Revocable.
3. Auditable.
4. Recoverable without code changes.

## Source of Truth

Runtime admin authorization is based on:
1. `admin_accounts.githubId`
2. active row = `revokedAt IS NULL`

Runtime admin authorization is not based on:
1. `users.isAdmin`
2. `ADMIN_GITHUB_ID`

Notes:
1. `users.isAdmin` remains a legacy field only.
2. `ADMIN_GITHUB_ID` may still exist in old deployments but should not be relied upon.

## Main Tables

### `admin_accounts`

Purpose:
1. Stores allowlist entries by GitHub ID.
2. Can optionally link to a concrete `users` row.
3. Survives account deletion because `userId` is nullable.

Important fields:
1. `githubId`
2. `userId`
3. `grantedByUserId`
4. `revokedByUserId`
5. `reason`
6. `revokedAt`
7. `createdAt`
8. `updatedAt`

### `admin_logs`

Purpose:
1. Records admin actions in a way that remains meaningful even if users are later deleted.

Important fields:
1. `adminId`
2. `adminGithubId`
3. `adminUsernameSnapshot`
4. `targetUserId`
5. `targetGithubId`
6. `targetUsernameSnapshot`
7. `action`
8. `reason`
9. `details`
10. `createdAt`

Deletion semantics:
1. `adminId` and `targetUserId` use `ON DELETE SET NULL`.
2. Identity snapshots preserve useful audit context.

## Bootstrap and Recovery

### CLI

GitPins includes:

```bash
npm run admin:access -- list
npm run admin:access -- grant --github-id 6115107 --reason "Initial bootstrap"
npm run admin:access -- revoke --github-id 6115107 --reason "Access removed"
```

File:
1. `scripts/admin-access.ts`

Use cases:
1. Initial bootstrap after fresh deploy.
2. Disaster recovery if the web admin UI is unavailable.
3. Pre-granting admin to a GitHub account before first login.

### Direct SQL

Direct SQL is acceptable for emergencies, but the CLI is preferred because:
1. It is repeatable.
2. It writes audit logs.
3. It keeps operational steps documented.

## Login and Allowlist Linking

If a GitHub ID is pre-granted before that user logs in:
1. The allowlist row exists with `userId = NULL`.
2. The user logs in later through OAuth.
3. GitPins links the `admin_accounts` row to the concrete `users.id`.

This is handled during:
1. `GET /api/auth/callback`

## Protection Model for Admin Routes

Sensitive admin mutations require:
1. Valid session.
2. Positive admin allowlist result.
3. Valid Origin/Referer.
4. Valid CSRF token.
5. Admin-specific rate limit.
6. Active sudo mode.

This currently applies to:
1. Grant admin.
2. Revoke admin.
3. Ban user.
4. Unban user.
5. Delete user.

## Operational Rules

Recommended rules for production:
1. Keep the number of active admins small.
2. Record a reason for every grant and revoke.
3. Require a fresh reauth before destructive actions.
4. Review `admin_logs` periodically.
5. Never delete audit rows casually.

## Failure Modes

### User is in `users.isAdmin` but cannot access `/admin`

Expected behavior.

Reason:
1. Runtime checks use `admin_accounts`, not `users.isAdmin`.

Fix:
1. Grant access through the CLI or DB allowlist.

### Admin can log in but mutations return `reauth_required`

Expected behavior.

Fix:
1. Reauthenticate through GitHub.
2. Retry the action during the sudo window.

### Granted GitHub ID has never logged in

Expected behavior.

Fix:
1. No action needed.
2. The row stays valid by GitHub ID and will relink on login.

## Review Checklist

When auditing admin behavior, verify:
1. `verifyAdmin()` reads only `admin_accounts`.
2. Sensitive admin routes use shared authorization helpers.
3. Audit writes happen in the same transaction as grant/revoke state changes.
4. Deleting a user does not erase the forensic trail in `admin_logs`.
