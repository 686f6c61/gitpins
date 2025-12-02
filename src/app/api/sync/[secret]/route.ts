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
    const octokit = createAppOctokit(user.installationId)

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

    const results: { repo: string; status: string; error?: string }[] = []

    // Procesar repos en orden inverso (el último queda más reciente)
    for (let i = reposToSync.length - 1; i >= 0; i--) {
      const repoFullName = reposToSync[i]
      const [owner, repo] = repoFullName.split('/')

      // Validate repo name format (GitHub constraints: 1-100 chars, alphanumeric, hyphen, underscore, dot)
      // Must not start with a dot, and cannot be empty
      const isValidName = (name: string): boolean => {
        if (!name || name.length > 100) return false
        if (name.startsWith('.')) return false
        if (name === '.' || name === '..') return false
        return /^[a-zA-Z0-9._-]+$/.test(name)
      }

      if (!isValidName(owner) || !isValidName(repo)) {
        results.push({
          repo: repoFullName,
          status: 'error',
          error: 'Invalid repository name format',
        })
        continue
      }

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

          // Crear branch temporal
          await octokit.rest.git.createRef({
            owner,
            repo,
            ref: `refs/heads/${tempBranch}`,
            sha: sha,
          })

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

          // Merge a main
          await octokit.rest.repos.merge({
            owner,
            repo,
            base: defaultBranch,
            head: tempBranch,
            commit_message: `[GitPins] Position: ${i + 1}/${reposToSync.length}`,
          })

          // Borrar branch temporal
          await octokit.rest.git.deleteRef({
            owner,
            repo,
            ref: `heads/${tempBranch}`,
          })
        }

        results.push({ repo: repoFullName, status: 'success' })

        // Esperar 1 segundo entre repos para no saturar la API
        await new Promise((resolve) => setTimeout(resolve, 1000))

      } catch (error) {
        results.push({
          repo: repoFullName,
          status: 'error',
          error: 'Operation failed',
        })
      }
    }

    // Registrar en log
    await prisma.syncLog.create({
      data: {
        userId: user.id,
        action: 'auto_sync',
        status: results.every((r) => r.status === 'success') ? 'success' : 'partial',
        details: JSON.stringify({ results }),
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
 * Alias for POST to facilitate manual testing via browser.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ secret: string }> }
) {
  return POST(request, { params })
}
