/**
 * GitPins - Control the order of your GitHub repositories
 * @author 686f6c61
 * @repository https://github.com/686f6c61/gitpins
 * @created 2024
 * @license MIT
 *
 * GitHub App Module
 * Provides GitHub App authentication and content generation for user config repositories.
 * Generates config.json, workflow YAML, and README files for each user's gitpins-config repo.
 */

import { Octokit } from 'octokit'
import { createAppAuth } from '@octokit/auth-app'

/**
 * Creates an Octokit client authenticated as a GitHub App installation.
 * This allows the app to perform actions on behalf of the user's installation.
 * @param installationId - The GitHub App installation ID for the user
 * @returns Authenticated Octokit instance
 */
export function createAppOctokit(installationId: number): Octokit {
  return new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: process.env.GITHUB_APP_ID!,
      privateKey: process.env.GITHUB_APP_PRIVATE_KEY!,
      installationId,
    },
  })
}

/**
 * Generates the content for config.json file in user's gitpins-config repo.
 * This file stores the user's repository order and sync settings.
 * @param options.reposOrder - Array of repository full names in desired order
 * @param options.topN - Number of top repos to maintain (6-20)
 * @param options.syncFrequency - Sync frequency in hours
 * @param options.commitStrategy - How to handle commits ('branch' or 'revert')
 * @param options.username - GitHub username for ownership attribution
 * @returns JSON string formatted with 2-space indentation
 */
export function generateConfigJson(options: {
  reposOrder: string[]
  topN: number
  syncFrequency: number
  commitStrategy: 'branch' | 'revert'
  username: string
}): string {
  return JSON.stringify(
    {
      version: '1.0',
      owner: options.username,
      repos: options.reposOrder.slice(0, options.topN),
      settings: {
        topN: options.topN,
        syncFrequency: options.syncFrequency,
        commitStrategy: options.commitStrategy,
      },
      updatedAt: new Date().toISOString(),
    },
    null,
    2
  )
}

/**
 * Generates the GitHub Actions workflow YAML for automated syncing.
 * The workflow runs on a schedule (cron) and triggers the GitPins sync endpoint.
 * @param options.syncFrequency - How often to sync in hours (converted to cron)
 * @param options.appUrl - The base URL of the GitPins instance (from NEXT_PUBLIC_APP_URL)
 * @returns YAML string for .github/workflows/maintain-order.yml
 */
export function generateWorkflowYaml(options: {
  syncFrequency: number
  appUrl: string
}): string {
  // Convertir horas a cron expression
  const cronHours = options.syncFrequency
  const cronExpression = cronHours === 1
    ? '0 * * * *' // Cada hora
    : `0 */${cronHours} * * *` // Cada N horas

  return `name: GitPins - Maintain Repo Order

on:
  schedule:
    - cron: '${cronExpression}'
  workflow_dispatch: # Manual trigger / Ejecución manual

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger GitPins Sync
        run: |
          curl -s -X POST "${options.appUrl}/api/sync/\${{ secrets.GITPINS_SYNC_SECRET }}" \\
            -H "Content-Type: application/json" \\
            -o response.json

          echo "Response:"
          cat response.json

          # Check if sync was successful
          if grep -q '"success":true' response.json; then
            echo "Sync completed successfully!"
          else
            echo "Sync may have had issues, check response above"
          fi
`
}

/**
 * Generates the README.md content for the user's gitpins-config repository.
 * Includes bilingual (EN/ES) explanation of what GitPins does.
 * @param username - GitHub username to personalize the README
 * @returns Markdown string for the README file
 */
export function generateReadme(username: string): string {
  return `# GitPins Config

> **EN:** GitPins keeps your most important repositories always visible at the top of your GitHub profile, regardless of when they were last updated. It works by using a GitHub Action that periodically updates the "last updated" timestamp through empty commits.
>
> **ES:** GitPins mantiene tus repositorios más importantes siempre visibles en tu perfil de GitHub, sin importar cuándo fue su última actualización. Funciona mediante un GitHub Action que actualiza periódicamente la fecha de "última actualización" con commits vacíos.

---

## Enable Automatic Sync / Activar Sincronización Automática

**EN:** Go to the [Actions tab](../../actions) and click "I understand my workflows, go ahead and enable them" to enable automatic syncing.

**ES:** Ve a la [pestaña Actions](../../actions) y haz clic en "I understand my workflows, go ahead and enable them" para activar la sincronización automática.

---

**@${username}** config file for [GitPins](https://gitpins.vercel.app)

**Files / Archivos:**
- \`config.json\` - Repos & settings / Repos y configuración
- \`.github/workflows/maintain-order.yml\` - GitHub Action

**Links:**
- Web: [gitpins.vercel.app](https://gitpins.vercel.app)
- Repo: [github.com/686f6c61/gitpins](https://github.com/686f6c61/gitpins)

**Uninstall / Desinstalar:** Delete this repo & uninstall the app at [github.com/settings/installations](https://github.com/settings/installations)

---

Made by [@686f6c61](https://github.com/686f6c61)
`
}
