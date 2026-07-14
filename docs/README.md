# GitPins Documentation

This folder contains the public technical documentation for GitPins.

It is written for:
1. Maintainers of the open source project.
2. Security reviewers and auditors.
3. Self-hosters and platform engineers.
4. Contributors who want a fast mental model of the system.

## Suggested Reading Order

If you are new to the project:
1. `ARCHITECTURE.md` - system overview, trust boundaries, and main request flows.
2. `LOCAL_DEV.md` - Docker-based local development setup and localhost GitHub App wiring.
3. `DEPLOYMENT.md` - generic self-hosted deployment checklist for production.
4. `ORDERING.md` - how GitPins actually changes repository recency and why.
5. `SECURITY.md` - authentication, authorization, CSRF, secrets, and operational risk.
6. `PRIVACY.md` - data model, exports, deletion, and retention.
7. `ADMIN.md` - allowlist model, admin bootstrap, sudo mode, and audit trail.
8. `API.md` - API surface grouped by auth, repos, sync, admin, and privacy.
9. `MIGRATIONS.md` - how schema changes are applied safely on existing databases.
10. `TROUBLESHOOTING.md` - common failures and the shortest path to resolution.

## Key Concepts

### GitPins is not a GitHub workflow runner

GitPins is the web application and API.

GitPins provides:
1. The dashboard for configuring desired order.
2. The persistence layer in Postgres.
3. Manual sync endpoints.
4. Scheduled sync endpoints.

GitPins does not require GitHub Actions specifically.

Scheduled sync can be triggered by:
1. GitHub Actions in a repository you control.
2. A cron job on your server.
3. A third-party scheduler.
4. Any system capable of calling `POST /api/sync`.

GitHub Actions is the most common example in the UI and README because it is familiar to GitHub users, but it is not a hard dependency of the product architecture.

### Temporary ref touch

GitPins does not need to create commits in the default branch anymore.

The current ordering strategy:
1. Resolves the current HEAD SHA of the repository default branch.
2. Creates a short-lived tag ref pointing to that SHA.
3. Deletes the ref immediately.

This updates repository recency signals while keeping branch history clean.

### Admin is database-backed

Runtime admin authorization is based on `admin_accounts`, not on an environment fallback.

Admin mutations are protected by:
1. Valid session.
2. Admin allowlist lookup.
3. Origin validation.
4. CSRF token.
5. Rate limiting.
6. Sudo reauthentication for sensitive actions.

## Documentation Map

- `ARCHITECTURE.md`: components, flows, data model, trust boundaries.
- `LOCAL_DEV.md`: Docker setup, localhost GitHub App, and day-to-day development workflow.
- `DEPLOYMENT.md`: production-oriented self-hosting checklist for any Docker-compatible platform.
- `ORDERING.md`: ordering algorithm, minimal-prefix optimization, single-pass behavior.
- `SECURITY.md`: auth, tokens, sync secret, admin hardening, known limitations.
- `PRIVACY.md`: exports, deletion, audit records, stored data.
- `ADMIN.md`: admin operations, recovery, audit semantics.
- `API.md`: HTTP contract summary for maintainers.
- `MIGRATIONS.md`: applying SQL migrations to existing databases.
- `TROUBLESHOOTING.md`: common setup and runtime failures.

## Contribution Rule for Docs

If you change any of these areas, update the matching document in the same pull request:
1. Auth/session/admin logic.
2. Sync behavior or ordering strategy.
3. Database schema or migrations.
4. Privacy/export/deletion behavior.
5. Deployment assumptions or environment variables.
