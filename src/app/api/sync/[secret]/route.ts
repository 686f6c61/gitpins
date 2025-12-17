/**
 * GitPins - Control the order of your GitHub repositories
 * @author 686f6c61
 * @repository https://github.com/686f6c61/gitpins
 * @created 2024
 * @license MIT
 *
 * Sync API Route
 * Called by the GitHub Action to sync repository order.
 * - Validates the sync secret
 * - Applies rate limiting (10 requests/hour per secret)
 * - Creates empty commits to update repo "last updated" timestamps
 * - Supports two strategies: revert (commit+revert) and branch (temp branch merge)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAppOctokit } from '@/lib/github-app'
import { checkRateLimit, rateLimits } from '@/lib/rate-limit'
import type { Octokit } from 'octokit'

/**
 * Obtiene el orden actual de los repositorios desde GitHub API.
 * Los repositorios se retornan ordenados por 'updated_at' descendente.
 * @param octokit - Authenticated Octokit client
 * @param username - GitHub username
 * @param repoNames - Array of repository full names to filter
 * @returns Array of repository full names in current order
 */
async function getCurrentRepoOrder(
  octokit: Octokit,
  username: string,
  repoNames: string[]
): Promise<string[]> {
  try {
    const { data: repos } = await octokit.rest.repos.listForUser({
      username,
      sort: 'updated',
      direction: 'desc',
      per_page: 100,
    })

    // Filtrar solo los repos que nos interesan y mantener el orden actual
    const relevantRepos = repos
      .filter(r => repoNames.includes(r.full_name))
      .map(r => r.full_name)

    return relevantRepos
  } catch (error) {
    console.error('Error fetching current repo order:', error)
    return []
  }
}

/**
 * Verifica si los repositorios ya están en el orden correcto.
 * Compara los primeros N repos actuales con los N repos deseados.
 * @param currentOrder - Current order from GitHub API
 * @param desiredOrder - Desired order from config
 * @param topN - Number of top repos to verify
 * @returns true if repos are already in correct order
 */
function isRepoOrderCorrect(
  currentOrder: string[],
  desiredOrder: string[],
  topN: number
): boolean {
  const currentTop = currentOrder.slice(0, topN)
  const desiredTop = desiredOrder.slice(0, topN)

  // Verificar que tengamos suficientes repos
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
 * POST /api/sync/[secret]
 * Syncs repository order by creating empty commits.
 * Called by GitHub Action on schedule.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ secret: string }> }
) {
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

    if (!repoOrder.autoEnabled) {
      return NextResponse.json({ message: 'Sync disabled' }, { status: 200 })
    }

    // Crear cliente con token de la GitHub App
    let octokit
    try {
      octokit = createAppOctokit(user.installationId)
    } catch (error: any) {
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
    // Verificar si los repos ya están en el orden correcto
    // Si lo están, no necesitamos crear commits innecesarios
    const currentOrder = await getCurrentRepoOrder(
      octokit,
      user.username,
      reposOrderParsed
    )

    const isOrdered = isRepoOrderCorrect(
      currentOrder,
      reposToSync,
      repoOrder.topN
    )

    if (isOrdered) {
      // Los repos ya están en el orden correcto - no hacer nada
      await prisma.syncLog.create({
        data: {
          userId: user.id,
          action: 'auto_sync_skipped',
          status: 'success',
          details: JSON.stringify({
            reason: 'Repositories already in correct order',
            currentOrder: currentOrder.slice(0, repoOrder.topN),
            desiredOrder: reposToSync,
          }),
          reposAffected: JSON.stringify(reposToSync),
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Repositories already in correct order. No sync needed.',
        skipped: true,
        currentOrder: currentOrder.slice(0, repoOrder.topN),
        desiredOrder: reposToSync,
      })
    }
    // ========== FIN VERIFICACIÓN DE ORDEN ==========

    const results: { repo: string; status: string; error?: string; cleaned?: boolean }[] = []
    const detailedLogs: string[] = []

    // Procesar repos en orden inverso (el último queda más reciente)
    for (let i = reposToSync.length - 1; i >= 0; i--) {
      const repoFullName = reposToSync[i]
      const [owner, repo] = repoFullName.split('/')
      const position = i + 1
      const total = reposToSync.length

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
        })
        continue
      }

      detailedLogs.push(`[${position}/${total}] Ordering ${repoFullName}...`)

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

        if (repoOrder.commitStrategy === 'revert') {
          // Estrategia: Commit + Revert
          detailedLogs.push(`  - Creating commit for position ${position}/${total}...`)

          // Crear commit vacío
          const { data: newCommit } = await octokit.rest.git.createCommit({
            owner,
            repo,
            message: `[GitPins] Position: ${i + 1}/${reposToSync.length}`,
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

        } else {
          // Estrategia: Branch temporal
          const tempBranch = `gitpins-${Date.now()}`

          detailedLogs.push(`  - Creating temporary branch ${tempBranch}...`)

          // Crear branch temporal
          await octokit.rest.git.createRef({
            owner,
            repo,
            ref: `refs/heads/${tempBranch}`,
            sha: sha,
          })

          detailedLogs.push(`  - Creating commit for position ${position}/${total}...`)

          // Commit vacío en el branch temporal
          const { data: newCommit } = await octokit.rest.git.createCommit({
            owner,
            repo,
            message: `[GitPins] Sync position: ${i + 1}/${reposToSync.length}`,
            tree: commitData.tree.sha,
            parents: [sha],
          })

          await octokit.rest.git.updateRef({
            owner,
            repo,
            ref: `heads/${tempBranch}`,
            sha: newCommit.sha,
          })

          detailedLogs.push(`  - Merging to ${defaultBranch}...`)

          // Merge a main
          await octokit.rest.repos.merge({
            owner,
            repo,
            base: defaultBranch,
            head: tempBranch,
            commit_message: `[GitPins] Position: ${i + 1}/${reposToSync.length}`,
          })

          detailedLogs.push(`  - Deleting temporary branch...`)

          // Borrar branch temporal
          await octokit.rest.git.deleteRef({
            owner,
            repo,
            ref: `heads/${tempBranch}`,
          })
        }

        // ========== LIMPIEZA INMEDIATA POST-COMMIT ==========
        // Limpiar los commits de GitPins que acabamos de crear
        // Esto mantiene el repo ordenado (timestamp actualizado) pero limpio (sin commits)
        let cleaned = false
        try {
          detailedLogs.push(`  - Cleaning GitPins commits...`)

          // Esperar 2 segundos para que GitHub procese los commits
          await new Promise((resolve) => setTimeout(resolve, 2000))

          const { cleanupRepoCommitsAutomatic } = await import('../../repos/cleanup-helper')
          const cleanupResult = await cleanupRepoCommitsAutomatic(octokit, owner, repo)

          if (cleanupResult.status === 'success') {
            cleaned = true
            detailedLogs.push(`  - Cleaned ${cleanupResult.removedCommits || 0} commit(s)`)
          } else {
            detailedLogs.push(`  - Cleanup skipped`)
          }
        } catch (cleanupError) {
          // Si falla la limpieza, no es crítico - el repo quedó ordenado
          console.error(`Cleanup failed for ${repoFullName}:`, cleanupError)
          detailedLogs.push(`  - Cleanup failed (repo still ordered)`)
        }
        // ========== FIN LIMPIEZA INMEDIATA ==========

        detailedLogs.push(`[${position}/${total}] ${repoFullName} - SUCCESS`)
        results.push({ repo: repoFullName, status: 'success', cleaned })

        // Esperar 1 segundo adicional entre repos para no saturar la API
        await new Promise((resolve) => setTimeout(resolve, 1000))

      } catch (error) {
        detailedLogs.push(`[${position}/${total}] ${repoFullName} - FAILED: ${error instanceof Error ? error.message : 'Operation failed'}`)
        results.push({
          repo: repoFullName,
          status: 'error',
          error: 'Operation failed',
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
            total: results.length,
            successful: results.filter(r => r.status === 'success').length,
            failed: results.filter(r => r.status === 'error').length,
            cleaned: results.filter(r => r.cleaned).length,
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
