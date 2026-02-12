/**
 * GitPins - Control the order of your GitHub repositories
 * @author 686f6c61
 * @repository https://github.com/686f6c61/gitpins
 * @created 2025
 * @license MIT
 *
 * Sync API Route
 * Called by the GitHub Action to sync repository order.
 * - Validates the sync secret
 * - Applies rate limiting (10 requests/hour per secret)
 * - Creates empty commits to update repo "last updated" timestamps
 * - Uses a single strategy: revert (commit+revert)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAppOctokit } from '@/lib/github-app'
import { checkRateLimit, rateLimits } from '@/lib/rate-limit'
import { ensureValidToken, getUserRepos } from '@/lib/github'
import type { Octokit } from 'octokit'

// Configuración de timeout para Vercel Pro (800s máximo permitido)
export const maxDuration = 800
const GITHUB_MUTATIONS_DISABLED = process.env.GITPINS_DISABLE_GITHUB_MUTATIONS === 'true'

async function getCurrentRepoOrderFromOAuth(userId: string): Promise<string[] | null> {
  try {
    const { accessToken } = await ensureValidToken(userId)
    const repos = await getUserRepos(accessToken)
    return repos.map((r) => r.fullName)
  } catch (error) {
    // OAuth is not strictly required to perform ordering (we can still touch repos via installation),
    // but using it gives us the user's true global order (including private repos) for accurate skips.
    console.error('Error fetching current repo order via OAuth:', error)
    return null
  }
}

async function getCurrentRepoOrderFromInstallation(octokit: Octokit): Promise<string[]> {
  try {
    const repos: Array<{ full_name: string; updated_at?: string | null }> = []

    for await (const response of octokit.paginate.iterator(
      octokit.rest.apps.listReposAccessibleToInstallation,
      { per_page: 100 }
    )) {
      const data = response.data as unknown as { repositories?: Array<{ full_name: string; updated_at?: string | null }> }
      for (const repo of data.repositories || []) {
        repos.push(repo)
      }
    }

    repos.sort((a, b) => {
      const aUpdated = a.updated_at ? Date.parse(a.updated_at) : 0
      const bUpdated = b.updated_at ? Date.parse(b.updated_at) : 0
      return bUpdated - aUpdated
    })

    return repos.map((r) => r.full_name)
  } catch (error) {
    console.error('Error fetching current repo order from installation:', error)
    return []
  }
}

/**
 * Obtiene el orden actual "global" de repositorios.
 * Preferimos OAuth (lista real del usuario, incluyendo privados); si falla, hacemos fallback a la instalación.
 */
async function getCurrentRepoOrder(options: { installationOctokit: Octokit; userId: string }): Promise<string[]> {
  const oauthOrder = await getCurrentRepoOrderFromOAuth(options.userId)
  if (oauthOrder && oauthOrder.length > 0) return oauthOrder

  return getCurrentRepoOrderFromInstallation(options.installationOctokit)
}

function arraysEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false
  for (let i = 0; i < left.length; i++) {
    if (left[i] !== right[i]) return false
  }
  return true
}

/**
 * Verifica si los repositorios ya están en el orden correcto.
 * Compara los primeros N repos globales con los N repos deseados.
 * @param currentOrder - Current order from GitHub API
 * @param desiredTop - Desired repos in top order
 * @returns true if repos are already in correct order
 */
function isRepoOrderCorrect(
  currentOrder: string[],
  desiredTop: string[]
): boolean {
  const currentTop = currentOrder.slice(0, desiredTop.length)
  if (currentTop.length < desiredTop.length) {
    return false
  }

  // Verificar que cada repo esté en la posición correcta
  for (let i = 0; i < desiredTop.length; i++) {
    if (currentTop[i] !== desiredTop[i]) {
      return false
    }
  }

  return true
}

/**
 * Computes the minimal prefix of desired repos that must be "touched" (commit+revert)
 * so the global top-N ends up matching desiredTop exactly.
 */
function getReposToTouch(
  currentOrder: string[],
  desiredTop: string[]
): string[] {
  if (desiredTop.length === 0) return []

  for (let prefixLength = 0; prefixLength <= desiredTop.length; prefixLength++) {
    const touchedPrefix = desiredTop.slice(0, prefixLength)
    const touchedSet = new Set(touchedPrefix)

    const currentWithoutTouched = currentOrder.filter(fullName => !touchedSet.has(fullName))
    const candidateTop = [
      ...touchedPrefix,
      ...currentWithoutTouched.slice(0, desiredTop.length - prefixLength),
    ]

    if (arraysEqual(candidateTop, desiredTop)) {
      return touchedPrefix
    }
  }

  return [...desiredTop]
}

/**
 * POST /api/sync/[secret]
 * Syncs repository order by creating empty commits.
 * Called by GitHub Action on schedule.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ secret: string }> }
) {
  const syncStartedAt = Date.now()
  const { secret } = await params

  // Validate secret format (should be UUID)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(secret)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  // Rate limiting per sync secret
  const rateLimitResult = checkRateLimit(`sync:${secret}`, rateLimits.sync)
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(rateLimitResult.resetTime),
        },
      }
    )
  }

  try {
    // Buscar usuario por sync secret
    const repoOrder = await prisma.repoOrder.findFirst({
      where: { syncSecret: secret },
      include: { user: true },
    })

    if (!repoOrder || !repoOrder.user) {
      // Use generic error message to prevent enumeration
      return NextResponse.json({ error: 'Invalid request' }, { status: 401 })
    }

    const user = repoOrder.user

    if (!user.installationId) {
      return NextResponse.json({ error: 'Configuration error' }, { status: 400 })
    }

    // Verificar si es una ejecución forzada (manual desde dashboard)
    const forceSync = request.nextUrl.searchParams.get('force') === 'true'

    if (!repoOrder.autoEnabled && !forceSync) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: 'auto_disabled',
        message: 'Sync is disabled in settings.',
      }, { status: 200 })
    }

    if (GITHUB_MUTATIONS_DISABLED) {
      await prisma.syncLog.create({
        data: {
          userId: user.id,
          action: 'auto_sync_skipped',
          status: 'success',
          details: JSON.stringify({
            reason: 'GitHub mutations are disabled by environment',
            flag: 'GITPINS_DISABLE_GITHUB_MUTATIONS',
          }),
          reposAffected: '[]',
        },
      })
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: 'mutations_disabled',
        message: 'GitHub mutations are disabled in this environment.',
      })
    }

    // ========== VERIFICACIÓN DE HORA PREFERIDA ==========
    // Si el usuario ha configurado una hora preferida, solo sincronizar a esa hora
    // EXCEPTO si es una ejecución forzada manualmente
    if (repoOrder.preferredHour !== null && !forceSync) {
      const currentHour = new Date().getUTCHours()
      if (currentHour !== repoOrder.preferredHour) {
        // Log del skip por hora
        await prisma.syncLog.create({
          data: {
            userId: user.id,
            action: 'auto_sync_skipped',
            status: 'success',
            details: JSON.stringify({
              reason: 'Outside preferred hour window',
              currentHourUTC: currentHour,
              preferredHourUTC: repoOrder.preferredHour,
            }),
            reposAffected: '[]',
          },
        })

        return NextResponse.json({
          success: true,
          message: `Skipped: Current hour (${currentHour} UTC) doesn't match preferred hour (${repoOrder.preferredHour} UTC)`,
          skipped: true,
          reason: 'preferred_hour',
          currentHour,
          preferredHour: repoOrder.preferredHour,
        })
      }
    }
    // ========== FIN VERIFICACIÓN DE HORA PREFERIDA ==========

    // ========== LOCK: Evitar syncs concurrentes ==========
    // Si hay un sync en los últimos 10 minutos, saltar
    const TEN_MINUTES = 10 * 60 * 1000
    if (repoOrder.lastSyncAt) {
      const timeSinceLastSync = Date.now() - repoOrder.lastSyncAt.getTime()
      if (timeSinceLastSync < TEN_MINUTES) {
        return NextResponse.json({
          success: true,
          message: 'Sync already in progress or completed recently. Skipping.',
          skipped: true,
          reason: 'recent_sync',
          lastSyncAt: repoOrder.lastSyncAt.toISOString(),
          waitMinutes: Math.ceil((TEN_MINUTES - timeSinceLastSync) / 60000),
        })
      }
    }

    // Marcar inicio de sync
    await prisma.repoOrder.update({
      where: { id: repoOrder.id },
      data: { lastSyncAt: new Date() },
    })
    // ========== FIN LOCK ==========

    // Crear cliente con token de la GitHub App
    let octokit
    try {
      octokit = createAppOctokit(user.installationId)
    } catch (error: unknown) {
      console.error('Failed to create GitHub App client:', error)
      await prisma.syncLog.create({
        data: {
          userId: user.id,
          action: 'auto_sync',
          status: 'error',
          details: JSON.stringify({
            error: 'GitHub App authentication failed',
            message: 'The GitHub App may have been uninstalled'
          }),
          reposAffected: '[]',
        },
      })
      return NextResponse.json({
        error: 'GitHub App authentication failed. Please reinstall the app.',
      }, { status: 401 })
    }

    // Obtener lista de repos a ordenar
    let reposOrderParsed: string[] = []
    try {
      reposOrderParsed = JSON.parse(repoOrder.reposOrder)
      if (!Array.isArray(reposOrderParsed)) {
        reposOrderParsed = []
      }
    } catch {
      return NextResponse.json({ error: 'Invalid configuration' }, { status: 400 })
    }
    const reposToSync = reposOrderParsed.slice(0, repoOrder.topN || reposOrderParsed.length)

    if (reposToSync.length === 0) {
      return NextResponse.json({ message: 'No repos to sync' }, { status: 200 })
    }

    // ========== VERIFICACIÓN DE ORDEN ==========
    // Verificar si los repos ya están en el orden correcto global.
    const currentOrder = await getCurrentRepoOrder({ installationOctokit: octokit, userId: user.id })
    const isOrdered = isRepoOrderCorrect(currentOrder, reposToSync)

    if (isOrdered) {
      // Los repos ya están en el orden correcto - no hacer nada
      await prisma.syncLog.create({
        data: {
          userId: user.id,
          action: 'auto_sync_skipped',
          status: 'success',
          details: JSON.stringify({
            reason: 'Repositories already in correct order',
            currentOrder: currentOrder.slice(0, reposToSync.length),
            desiredOrder: reposToSync,
          }),
          reposAffected: JSON.stringify(reposToSync),
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Repositories already in correct order. No sync needed.',
        skipped: true,
        reason: 'already_ordered',
        currentOrder: currentOrder.slice(0, reposToSync.length),
        desiredOrder: reposToSync,
      })
    }

    // Optimization: touch only the minimal prefix that must become "newer"
    // to transform current global top-N into desired top-N.
    const reposToTouch = getReposToTouch(currentOrder, reposToSync)
    if (reposToTouch.length === 0) {
      await prisma.syncLog.create({
        data: {
          userId: user.id,
          action: 'auto_sync_skipped',
          status: 'success',
          details: JSON.stringify({
            reason: 'No touch operations required after optimization',
            desiredOrder: reposToSync,
          }),
          reposAffected: JSON.stringify(reposToSync),
        },
      })
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: 'no_touch_needed',
        message: 'No touch operations required.',
      })
    }
    // ========== FIN VERIFICACIÓN DE ORDEN ==========

    const results: { repo: string; status: string; error?: string; durationMs: number }[] = []
    const detailedLogs: string[] = []

    // Procesar en orden inverso para que el primero deseado quede más reciente.
    for (let i = reposToTouch.length - 1; i >= 0; i--) {
      const repoFullName = reposToTouch[i]
      const [owner, repo] = repoFullName.split('/')
      const desiredPosition = reposToSync.indexOf(repoFullName) + 1
      const position = reposToTouch.length - i
      const total = reposToTouch.length

      // Validate repo name format (GitHub constraints: 1-100 chars, alphanumeric, hyphen, underscore, dot)
      // Must not start with a dot, and cannot be empty
      const isValidName = (name: string): boolean => {
        if (!name || name.length > 100) return false
        if (name.startsWith('.')) return false
        if (name === '.' || name === '..') return false
        return /^[a-zA-Z0-9._-]+$/.test(name)
      }

      if (!isValidName(owner) || !isValidName(repo)) {
        detailedLogs.push(`[${position}/${total}] ${repoFullName}: Invalid repository name format`)
        results.push({
          repo: repoFullName,
          status: 'error',
          error: 'Invalid repository name format',
          durationMs: 0,
        })
        continue
      }

      detailedLogs.push(`[${position}/${total}] Ordering ${repoFullName} (target ${desiredPosition}/${reposToSync.length})...`)
      const repoStartedAt = Date.now()

      try {
        // Obtener referencia del branch principal
        let refData
        try {
          const response = await octokit.rest.git.getRef({
            owner,
            repo,
            ref: 'heads/main',
          })
          refData = response.data
        } catch {
          const response = await octokit.rest.git.getRef({
            owner,
            repo,
            ref: 'heads/master',
          })
          refData = response.data
        }

        const defaultBranch = refData.ref.replace('refs/heads/', '')
        const sha = refData.object.sha

        // Obtener el tree del commit actual
        const { data: commitData } = await octokit.rest.git.getCommit({
          owner,
          repo,
          commit_sha: sha,
        })

        // Fixed strategy: Commit + Revert
        detailedLogs.push(`  - Creating commit for target position ${desiredPosition}/${reposToSync.length}...`)

        // Crear commit vacío
        const { data: newCommit } = await octokit.rest.git.createCommit({
          owner,
          repo,
          message: `[GitPins] Position: ${desiredPosition}/${reposToSync.length}`,
          tree: commitData.tree.sha,
          parents: [sha],
        })

        // Actualizar referencia
        await octokit.rest.git.updateRef({
          owner,
          repo,
          ref: `heads/${defaultBranch}`,
          sha: newCommit.sha,
        })

        detailedLogs.push(`  - Reverting commit...`)

        // Revertir inmediatamente
        const { data: revertCommit } = await octokit.rest.git.createCommit({
          owner,
          repo,
          message: '[GitPins] Revert',
          tree: commitData.tree.sha,
          parents: [newCommit.sha],
        })

        await octokit.rest.git.updateRef({
          owner,
          repo,
          ref: `heads/${defaultBranch}`,
          sha: revertCommit.sha,
        })

        detailedLogs.push(`[${position}/${total}] ${repoFullName} - SUCCESS`)
        results.push({
          repo: repoFullName,
          status: 'success',
          durationMs: Date.now() - repoStartedAt,
        })

        // Esperar 1 segundo adicional entre repos para no saturar la API
        await new Promise((resolve) => setTimeout(resolve, 1000))

      } catch (error) {
        detailedLogs.push(`[${position}/${total}] ${repoFullName} - FAILED: ${error instanceof Error ? error.message : 'Operation failed'}`)
        results.push({
          repo: repoFullName,
          status: 'error',
          error: 'Operation failed',
          durationMs: Date.now() - repoStartedAt,
        })
      }
    }

    // Registrar en log con detalles completos
    await prisma.syncLog.create({
      data: {
        userId: user.id,
        action: 'auto_sync',
        status: results.every((r) => r.status === 'success') ? 'success' : 'partial',
        details: JSON.stringify({
          results,
          logs: detailedLogs,
          summary: {
            totalTouched: results.length,
            desiredTopN: reposToSync.length,
            successful: results.filter(r => r.status === 'success').length,
            failed: results.filter(r => r.status === 'error').length,
            durationMs: Date.now() - syncStartedAt,
          }
        }),
        reposAffected: JSON.stringify(reposToSync),
      },
    })

    return NextResponse.json({
      success: true,
      synced: results.filter((r) => r.status === 'success').length,
      failed: results.filter((r) => r.status === 'error').length,
      results,
    })

  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json(
      { error: 'Operation failed' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/sync/[secret]
 * Disabled for security reasons - only POST is allowed to prevent CSRF attacks.
 * If you need to test manually, use curl or a tool that supports POST requests:
 * curl -X POST https://your-domain.com/api/sync/YOUR_SECRET
 */
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST instead.' },
    { status: 405, headers: { Allow: 'POST' } }
  )
}
