# Local Development

This document describes a reproducible local setup using Docker Compose (app + Postgres) and optional cloning of a production PostgreSQL database into local Postgres.

## Prerequisites

1. Docker Desktop with Docker Compose v2.
2. Git.
3. For production DB cloning: `pg_dump`, `pg_restore`, `psql` installed on your host machine.

## Quick Start (Docker Compose)

Files:
1. `docker-compose.yml`
2. `Dockerfile.dev`
3. `.env.docker.example`

Steps:
1. Copy env file:

```bash
cp .env.docker.example .env.docker
```

2. Fill in required values in `.env.docker`:
1. `GITHUB_APP_ID`
2. `GITHUB_APP_CLIENT_ID`
3. `GITHUB_APP_CLIENT_SECRET`
4. `GITHUB_APP_PRIVATE_KEY`
5. `JWT_SECRET`
6. `ENCRYPTION_SECRET`

3. Start the stack:

```bash
docker compose up -d
```

If you already have a local PostgreSQL server bound to `localhost:5432`, use a different host port for Docker:

```bash
GITPINS_DB_PORT=5433 docker compose up -d
```

4. Open:
1. App: `http://localhost:3001`
2. Postgres: `localhost:5432` by default, or `localhost:5433` if you set `GITPINS_DB_PORT=5433`

Notes:
1. The Docker setup runs with `GITPINS_DISABLE_GITHUB_MUTATIONS=true` by default. This prevents any GitHub writes from local.
2. If you want to test sync/cleanup behavior against real repos, set it to `false` and restart the `app` container.

## GitHub App Setup for Localhost

You should create a dedicated GitHub App for local development (recommended).

If you use Docker Compose, GitPins runs at `http://localhost:3001`, so configure your GitHub App URLs accordingly:

1. Homepage URL: `http://localhost:3001`
2. Callback URL: `http://localhost:3001/api/auth/callback`
3. Setup URL: `http://localhost:3001/api/auth/setup`

If you run `pnpm run dev` directly (not Docker) and use `http://localhost:3000`, use `3000` for the URLs above.

Required permissions (minimal for current code paths):
1. Repository permissions:
1. Contents: Read & write (to create/delete temporary refs).
2. Metadata: Read-only (to list and inspect repos).
2. Account permissions:
1. Email addresses: Read-only (optional, for email display).

OAuth settings:
1. Ensure "Request user authorization (OAuth) during installation" is enabled.

## Database Setup

Docker creates a Postgres container and persists data in a volume.

Default database:
1. Postgres user: `gitpins`
2. Postgres password: `gitpins`
3. Database used by the app: `gitpins_local_clone`

Schema management:
1. In Docker, the app currently runs `prisma db push` at startup to ensure the schema matches `prisma/schema.prisma`.
2. The repository also contains SQL migrations in `prisma/migrations/`. If you need production-safe migration workflows, see `docs/MIGRATIONS.md`.

## Clone Production DB to Local Postgres (One-Shot)

Script:
1. `scripts/clone-production-db-to-local.sh`

Steps:
1. Start only the DB container:

```bash
docker compose up -d db
```

2. Run the clone script from your host machine:

```bash
SOURCE_DB_URL='postgresql://...' ./scripts/clone-production-db-to-local.sh
```

If Docker Postgres is exposed on a non-default host port:

```bash
GITPINS_DB_PORT=5433 SOURCE_DB_URL='postgresql://...' ./scripts/clone-production-db-to-local.sh
```

What it does:
1. Creates the target database (`gitpins_local_clone`) if missing.
2. `pg_dump` from the production PostgreSQL source to a temporary file under `/tmp`.
3. `pg_restore` into local Postgres with `--clean --if-exists`.
4. Prints row counts for a few tables.
5. Removes the temporary dump file.

Security notes:
1. Never commit production DB URLs or dumps.
2. Treat dumps as production data.

## Running Tests and Checks

From the host machine:

```bash
pnpm exec eslint .
pnpm exec tsc --noEmit
pnpm test
```

From inside the container:

```bash
docker compose exec app pnpm exec eslint .
```

## Common Issues

1. OAuth callback mismatch:
1. Ensure the GitHub App callback URL matches `NEXT_PUBLIC_APP_URL` exactly.
2. If you use Docker, this is usually `http://localhost:3001`.
2. DB schema not matching:
1. Ensure `docker compose up -d` was run after pulling schema changes.
2. For a full reset: stop containers and remove the DB volume (destructive).
3. If `localhost:5432` points to another PostgreSQL instance on your machine, start Docker with `GITPINS_DB_PORT=5433`.
4. A cloned or `db push`-managed database will fail under `prisma migrate deploy` with `P3005` unless you baseline `_prisma_migrations` first. For local development, use `pnpm exec prisma db push`.
