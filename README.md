<div align="center">

# GitPins

### Control the order of your GitHub repositories

**Keep your best projects always visible on your GitHub profile**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white)](https://nextjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-7.1-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-black?logo=vercel&logoColor=white)](https://vercel.com/)

[Live Demo](https://gitpins.com) | [Documentation](#documentation) | [Self-Hosting](#self-hosting)

---

</div>

## Screenshots

<div align="center">

### Landing Page
![GitPins Landing](assets/screenshot-landing.png)

### Dashboard
![GitPins Dashboard](assets/screenshot-dashboard.png)

### Configuration
![GitPins Configuration](assets/screenshot-config.png)

### Admin Dashboard
![GitPins Admin](assets/screenshot-admin.png)

### Ban User
![GitPins Ban](assets/screenshot-ban.png)

</div>

## The Problem

GitHub sorts repositories by "last updated" date. This means your most important projects can get buried when you make a small fix to an old repo or create a new experimental project.

**GitPins solves this** by "touching" your chosen repositories (create/delete of a short-lived tag ref) in a controlled sequence, so GitHub's recency-based order matches your preferred top list.

## Features

- **Drag & Drop Ordering** - visually arrange your top list
- **Manual Sync** - "Sync now" from the dashboard (CSRF-protected)
- **Scheduled Sync** - trigger `/api/sync` from GitHub Actions or any scheduler you control
- **Smart Sync** - skips when already ordered + touches only the minimal prefix needed
- **Single Strategy (Temporary Ref Touch)** - no default-branch history noise, no file changes
- **Commit Cleanup (Optional)** - removes GitPins commits (history rewrite; explicit warning)
- **Private Repos Support** - include/exclude private repositories in the dashboard list
- **Bilingual UI** - English and Spanish
- **Dark/Light Mode** - theme toggle with system default
- **Privacy Controls** - export your data and delete your account (requires reauth / sudo)
- **Admin Allowlist** - admins are granted via `admin_accounts` (revocable)

## How It Works

1. **Connect with GitHub (OAuth)** - we create an app session cookie (JWT)
2. **Install the GitHub App** - required so GitPins can create/delete temporary refs in selected repos
3. **Arrange your repos** - save your desired top list and settings
4. **Sync**
   - Manual: click "Sync now" in the dashboard
   - Scheduled: run GitHub Actions or any scheduler that calls `POST /api/sync`

### Technical Details

GitPins updates the "last updated" timestamp by creating a temporary tag ref that points to `HEAD`, then deleting that tag immediately.

This keeps your default branch history clean (no `[GitPins]` commits in `main/master`).

Conceptually:
```bash
git rev-parse HEAD
git push origin HEAD:refs/tags/gitpins-touch-<id>
git push origin :refs/tags/gitpins-touch-<id>
```

See `docs/ORDERING.md` for the detailed algorithm, including the minimal-prefix optimization and what "single-pass" means in practice.

## Security

GitPins is designed with security in mind:

- **Minimal GitHub App Permissions** - only what is needed for temporary ref updates
- **No File Changes** - GitPins creates commits that point to the existing tree
- **Encrypted Tokens** - Access tokens are encrypted with AES-256-GCM
- **Open Source** - full code transparency

### What GitPins CAN do:
- Create/delete temporary refs in repos you installed the app on
- Read repository metadata (name, stars, etc.) via the GitHub API
- Optionally rewrite history to remove GitPins commits (cleanup feature; explicit confirmation)

### What GitPins CANNOT do:
- Delete repositories
- Modify tracked files (it uses the existing tree SHA)
- Access other GitHub data (issues, PRs, etc.) unless you grant additional permissions

> Cleanup warning: cleanup rewrites git history (force-updates the default branch). This can impact collaborators and forks. Treat it as a dangerous, opt-in operation.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5
- **Database**: PostgreSQL (via Prisma 7)
- **Auth**: GitHub OAuth (GitHub Apps)
- **Styling**: Tailwind CSS 4
- **Drag & Drop**: dnd-kit
- **Deployment**: Vercel

## Documentation

Maintainer docs (recommended starting points):
- `docs/README.md` - documentation index and suggested reading order
- `docs/LOCAL_DEV.md` - Docker Compose local dev + Neon clone
- `docs/ARCHITECTURE.md` - system overview and flows
- `docs/SECURITY.md` - threat model, auth, CSRF, admin, sync secret
- `docs/PRIVACY.md` - export + deletion model
- `docs/ORDERING.md` - ordering algorithm details
- `docs/DEPLOYMENT.md` - Vercel/Neon deployment and rollback guidance
- `docs/ADMIN.md` - allowlist, sudo, audit model, bootstrap CLI
- `docs/API.md` - maintainer API overview
- `docs/MIGRATIONS.md` - Prisma migration notes for existing DBs
- `docs/TROUBLESHOOTING.md` - common failure modes and operational fixes

## Self-Hosting

### Prerequisites

- Node.js 20+ (recommended) or Docker
- PostgreSQL database
- GitHub App

#### Recommended Database: Neon

[Neon](https://neon.tech) offers a generous free tier perfect for GitPins:
- **Free tier**: 0.5 GB storage, 190 compute hours/month
- **Serverless**: Scales to zero when not in use
- **Fast**: Optimized for serverless environments like Vercel
- **Easy setup**: Create a database in seconds

Other compatible options: Supabase, PlanetScale, Railway, or any PostgreSQL provider.

### 1. Create a GitHub App

Go to [GitHub Developer Settings](https://github.com/settings/apps/new) and create a new app.

#### URLs Configuration

**For Production:**
| Field | Value |
|-------|-------|
| Homepage URL | `https://your-domain.com` |
| Callback URL | `https://your-domain.com/api/auth/callback` |
| Setup URL (optional) | `https://your-domain.com/api/auth/setup` |
| Webhook URL | Leave empty (not required) |
| Webhook Active | ❌ Unchecked |

**For Local Development (Docker default):**
| Field | Value |
|-------|-------|
| Homepage URL | `http://localhost:3001` |
| Callback URL | `http://localhost:3001/api/auth/callback` |
| Setup URL (optional) | `http://localhost:3001/api/auth/setup` |
| Webhook URL | Leave empty |
| Webhook Active | ❌ Unchecked |

If you run `npm run dev` directly (no Docker), use `http://localhost:3000` instead of `3001`.

#### Required Permissions

Configure these permissions in your GitHub App settings:

**Repository Permissions:**
| Permission | Access Level | Purpose |
|------------|--------------|---------|
| **Contents** | Read and write | Create and delete temporary refs |
| **Metadata** | Read-only | Read repository list and info |

**Account Permissions:**
| Permission | Access Level | Purpose |
|------------|--------------|---------|
| **Email addresses** | Read-only | Get user email for identification |

#### OAuth Settings

In the OAuth section of your GitHub App:
- **Request user authorization (OAuth) during installation**: Enabled
- **Enable Device Flow**: Optional

### 2. Clone and Install

```bash
git clone https://github.com/686f6c61/gitpins.git
cd gitpins
npm install
```

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
GITHUB_APP_ID="your_app_id"
GITHUB_APP_CLIENT_ID="your_client_id"
GITHUB_APP_CLIENT_SECRET="your_client_secret"
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----..."
NEXT_PUBLIC_APP_URL="https://your-domain.com"
JWT_SECRET="generate_with_openssl_rand_base64_32"
ENCRYPTION_SECRET="generate_with_openssl_rand_base64_32"
```

### 4. Setup Database

```bash
npx prisma db push
```

### 5. Run

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

### Local Development Tips

When running locally with a dedicated GitHub App (`gitpins-local`):

1. **Use localhost app URLs**:
   - Docker: `http://localhost:3001`
   - Non-Docker: `http://localhost:3000`
2. **Set environment variable**: `NEXT_PUBLIC_APP_URL=http://localhost:3001` (Docker) or `http://localhost:3000` (non-Docker)
3. **Re-authenticate** after changing app settings to refresh OAuth grants

### Local Docker Setup (App + Postgres)

```bash
cp .env.docker.example .env.docker
docker compose up -d
```

Services:
- App: `http://localhost:3001`
- Postgres: `localhost:5432`

By default, local Docker runs with:
- `GITPINS_DISABLE_GITHUB_MUTATIONS=true` (safe mode: no GitHub write operations)

### One-shot Clone: Neon -> Local Postgres

```bash
# 1) Start only the DB
docker compose up -d db

# 2) Clone production data to local
SOURCE_DB_URL='postgresql://...' ./scripts/clone-neon-to-local.sh
```

Notes:
- The script does not hardcode Neon credentials.
- It writes a temporary dump to `/tmp` and removes it after restore.
- Use this only in secure local environments because data is cloned with full fidelity.

#### Required OAuth Scopes

When authenticating, GitPins requests these OAuth scopes:
- `repo` - Access to private repositories (used by the dashboard repo list)
- `user:email` - Access to email address

If you're experiencing "Resource not accessible by integration" errors, the user needs to re-authenticate to get a token with the correct scopes.

### Scheduled Sync (GitHub Actions or Any Scheduler)

GitPins provides the sync endpoint (`POST /api/sync`) but does not automatically create a `gitpins-config` repository for you.

A common setup is to create a private repo (many people name it `gitpins-config`) and add a scheduled GitHub Actions workflow that calls your GitPins instance. If you prefer, any scheduler that can send the same HTTP request will work.

```yaml
name: GitPins - Maintain Repo Order

on:
  schedule:
    - cron: '0 */6 * * *'
  workflow_dispatch:

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Sync
        run: |
          curl -s -X POST "${{ vars.GITPINS_APP_URL }}/api/sync" \
            -H "X-GitPins-Sync-Secret: ${{ secrets.GITPINS_SYNC_SECRET }}"
```

You must set:
1. `GITPINS_SYNC_SECRET` (repo secret): the per-user secret stored in `repo_orders.syncSecret`.
2. `GITPINS_APP_URL` (repo variable): your app URL (for example `https://your-domain.com`).

### Troubleshooting

| Issue | Solution |
|-------|----------|
| "Resource not accessible" | Re-authenticate (logout/login) to refresh OAuth token |
| "Bad credentials" | Check GITHUB_APP_PRIVATE_KEY format (include BEGIN/END lines) |
| Scheduled sync not running | Check the scheduler logs. If you use GitHub Actions, inspect the workflow logs in the repo that hosts it |
| Repos not syncing | Verify the GitHub App is installed on those repos |

## Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2F686f6c61%2Fgitpins)

1. Click the button above
2. Add a PostgreSQL database (Neon recommended)
3. Configure environment variables
4. Deploy!

## Admin Dashboard

GitPins includes an admin dashboard for managing users and viewing statistics.

### Accessing the Admin Panel

1. **Grant admin access in the allowlist** (`admin_accounts` table).
   Use `npm run admin:access -- grant --github-id <id>` or insert directly in DB.
2. **Log in with the granted account.**
3. **Access the dashboard:**
   Navigate to `/admin` after logging in with the admin account.

### Admin Features

- **User Statistics**: Total users, active users, banned users, sync counts
- **User Management**: View all users with their config repos and activity
- **Ban/Unban Users**: Suspend users who violate terms of service
- **Delete Users**: Remove users from the application (they can re-register)
- **Activity Charts**: Visual graphs of registrations and syncs over 30 days

### Security

The admin panel is protected by:
- Session validation (must be logged in)
- Database allowlist verification (`admin_accounts`, where `revokedAt IS NULL`)
- All admin API endpoints return 403 Forbidden for non-admin users

## Project Structure

```
src/
├── app/                   # Next.js App Router
│   ├── api/               # API Routes
│   │   ├── auth/          # OAuth endpoints
│   │   ├── repos/         # Repository management
│   │   └── sync/          # Sync endpoints (called manually or by an external scheduler)
│   ├── dashboard/         # Main dashboard
│   ├── admin/             # Admin panel
│   └── how-it-works/      # Documentation page
├── components/            # React components
├── lib/                   # Utility modules
│   ├── crypto.ts          # AES-256-GCM encryption
│   ├── session.ts         # JWT session management
│   ├── security.ts        # CSRF, rate limiting
│   ├── github.ts          # GitHub OAuth
│   └── github-app.ts      # GitHub App operations
├── i18n/                  # Internationalization
└── types/                 # TypeScript definitions
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

**686f6c61** - [@686f6c61](https://github.com/686f6c61)

---

<div align="center">

Made with code and mass energy by [@686f6c61](https://github.com/686f6c61)

If you find this useful, consider giving it a star!

</div>
