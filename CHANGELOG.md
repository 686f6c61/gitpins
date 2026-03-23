# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog.

## Unreleased

## 3.9.6 - 2026-03-23

### Added
- Added `admin:access` CLI tooling to grant, revoke and inspect admin allowlist entries from the database.
- Added audit identity snapshots to admin logs so admin actions remain traceable even after user deletion.
- Added versioned SQL migration for admin hardening in `prisma/migrations/20260323205246_m6_admin_hardening/migration.sql`.
- Added SonarQube project configuration for local static analysis runs.
- Added a visual before/after landing demo that simulates how GitHub ordering changes with GitPins.
- Added a dashboard status summary with saved state, pinned repo count, sync mode and last sync visibility.
- Added new public docs pages for API, admin, deployment and troubleshooting.

### Changed
- Updated core dependencies including Next.js, Prisma, pg, Jest, ESLint and Tailwind-related packages.
- Switched runtime admin authorization to the `admin_accounts` allowlist only.
- Hardened admin mutations with shared authorization checks, CSRF/origin validation, rate limiting and sudo reauthentication.
- Linked pre-granted admin allowlist entries to users on login without relying on environment fallbacks.
- Improved privacy exports with admin allowlist metadata and audit snapshots.
- Replaced temporary sync tag suffix generation with `crypto.randomUUID()`.
- Improved repository filter sorting and accessibility behavior in the help demo.
- Expanded automated test coverage for security and sanitization helpers.
- Reworked the settings modal into clearer sections for ordering, scheduled sync, privacy and danger actions.
- Localized and polished the install, banned and admin surfaces for both Spanish and English.
- Replaced the admin-side inferred `gitpins-config` link with the real saved setup state to avoid pointing to repos that may not exist.
- Refreshed README and docs to explain that GitPins exposes the sync API while scheduling can be handled by GitHub Actions or any external scheduler.

### Security
- Removed runtime dependence on `ADMIN_GITHUB_ID` as an authorization fallback.
- Reworked HTML validation to avoid regex-based hotspot findings.
- Centralized plain-text sanitization for admin reasons and notes.
- Applied admin hardening migration to local and production databases without deleting existing data.
