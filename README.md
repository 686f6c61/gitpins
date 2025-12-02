<div align="center">

# GitPins

### Control the order of your GitHub repositories

**Keep your best projects always visible on your GitHub profile**

[Live Demo](https://gitpins.vercel.app) | [How It Works](#how-it-works) | [Self-Host](#self-hosting)

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

</div>

## The Problem

GitHub sorts repositories by "last updated" date. This means your most important projects can get buried when you make a small fix to an old repo or create a new experimental project.

**GitPins solves this** by automatically updating the "last updated" timestamp of your chosen repositories, keeping them at the top of your profile.

## Features

- **Drag & Drop Ordering** - Visually arrange your repositories in the order you want
- **Automatic Syncing** - GitHub Actions keep your repos in order automatically
- **Two Commit Strategies** - Choose between "revert" (cleaner history) or "branch" (more commits)
- **Configurable Frequency** - Sync every 1, 2, 4, 6, 8, 12, or 24 hours
- **Private Repos Support** - Include or exclude private repositories
- **Bilingual UI** - Available in English and Spanish
- **Dark/Light Mode** - Automatic theme detection with manual override
- **Open Source** - Self-host or contribute

## How It Works

1. **Connect with GitHub** - Authenticate and install the GitPins GitHub App
2. **Arrange Your Repos** - Drag and drop to set your preferred order
3. **Activate Sync** - GitPins creates a config repo with a GitHub Action
4. **Automatic Updates** - The Action periodically "bumps" your repos to maintain order

### Technical Details

GitPins uses empty commits to update the "last updated" timestamp:

**Revert Strategy** (Recommended):
```bash
git commit --allow-empty -m "gitpins: bump"
git revert HEAD --no-edit
git push
```

**Branch Strategy**:
```bash
git checkout -b gitpins-temp
git commit --allow-empty -m "gitpins: sync"
git checkout main && git merge gitpins-temp
git branch -d gitpins-temp && git push
```

## Security

GitPins is designed with security in mind:

- **Minimal Permissions** - Only requests access to repository contents (for empty commits)
- **No Code Access** - Cannot read, modify, or delete your actual code
- **Encrypted Tokens** - Access tokens are encrypted with AES-256-GCM
- **Open Source** - Full code transparency

### What GitPins CAN do:
- Create empty commits in your repositories
- Create the `gitpins-config` repository
- Read repository metadata (name, stars, etc.)

### What GitPins CANNOT do:
- Read your source code
- Modify existing files
- Delete repositories or branches
- Access other GitHub data

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL (via Prisma)
- **Auth**: GitHub OAuth (GitHub Apps)
- **Styling**: Tailwind CSS
- **Drag & Drop**: dnd-kit
- **Deployment**: Vercel

## Self-Hosting

### Prerequisites

- Node.js 18+
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

**For Local Development:**
| Field | Value |
|-------|-------|
| Homepage URL | `http://localhost:3000` |
| Callback URL | `http://localhost:3000/api/auth/callback` |
| Setup URL (optional) | `http://localhost:3000/api/auth/setup` |
| Webhook URL | Leave empty |
| Webhook Active | ❌ Unchecked |

> **Note:** You can update these URLs later. For local development, you'll need to use localhost URLs.

#### Required Permissions

Configure these permissions in your GitHub App settings:

**Repository Permissions:**
| Permission | Access Level | Purpose |
|------------|--------------|---------|
| **Actions** | Read and write | Enable/disable workflows in repos |
| **Administration** | Read and write | Enable GitHub Actions on config repo |
| **Contents** | Read and write | Create empty commits for ordering |
| **Metadata** | Read-only | Read repository list and info |
| **Secrets** | Read and write | Create GITPINS_SYNC_SECRET |
| **Workflows** | Read and write | Create and manage the sync workflow |

**Account Permissions:**
| Permission | Access Level | Purpose |
|------------|--------------|---------|
| **Email addresses** | Read-only | Get user email for identification |

#### OAuth Settings

In the OAuth section of your GitHub App:
- **Request user authorization (OAuth) during installation**: ✅ Enabled
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
ADMIN_GITHUB_ID="your_github_user_id"
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

When running locally:

1. **Update your GitHub App URLs** to use `http://localhost:3000`
2. **Set environment variable**: `NEXT_PUBLIC_APP_URL=http://localhost:3000`
3. **Re-authenticate**: Log out and log back in after changing URLs to get a fresh OAuth token with correct scopes

#### Required OAuth Scopes

When authenticating, GitPins requests these OAuth scopes:
- `repo` - Full control of private repositories (needed to create the config repo)
- `user:email` - Access to email address

If you're experiencing "Resource not accessible by integration" errors, the user needs to re-authenticate to get a token with the correct scopes.

### Troubleshooting

| Issue | Solution |
|-------|----------|
| "Resource not accessible" | Re-authenticate (logout/login) to refresh OAuth token |
| "Bad credentials" | Check GITHUB_APP_PRIVATE_KEY format (include BEGIN/END lines) |
| Actions not running | Enable Actions in the gitpins-config repo settings |
| Repos not syncing | Check Actions tab in gitpins-config for workflow errors |

## Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2F686f6c61%2Fgitpins)

1. Click the button above
2. Add a PostgreSQL database (Neon recommended)
3. Configure environment variables
4. Deploy!

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   ├── auth/          # OAuth endpoints
│   │   ├── repos/         # Repository management
│   │   ├── config/        # Config repo creation
│   │   └── sync/          # Sync endpoint (called by GitHub Action)
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
