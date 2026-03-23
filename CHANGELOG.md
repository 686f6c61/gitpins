# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog.

## Unreleased

### Added
- Added `admin:access` CLI tooling to grant, revoke and inspect admin allowlist entries from the database.
- Added audit identity snapshots to admin logs so admin actions remain traceable even after user deletion.
- Added versioned SQL migration for admin hardening in `prisma/migrations/20260323205246_m6_admin_hardening/migration.sql`.
- Added SonarQube project configuration for local static analysis runs.

### Changed
- Updated core dependencies including Next.js, Prisma, pg, Jest, ESLint and Tailwind-related packages.
- Switched runtime admin authorization to the `admin_accounts` allowlist only.
- Hardened admin mutations with shared authorization checks, CSRF/origin validation, rate limiting and sudo reauthentication.
- Linked pre-granted admin allowlist entries to users on login without relying on environment fallbacks.
- Improved privacy exports with admin allowlist metadata and audit snapshots.
- Replaced temporary sync tag suffix generation with `crypto.randomUUID()`.
- Improved repository filter sorting and accessibility behavior in the help demo.
- Expanded automated test coverage for security and sanitization helpers.

### Security
- Removed runtime dependence on `ADMIN_GITHUB_ID` as an authorization fallback.
- Reworked HTML validation to avoid regex-based hotspot findings.
- Centralized plain-text sanitization for admin reasons and notes.
- Applied admin hardening migration to local and production databases without deleting existing data.
