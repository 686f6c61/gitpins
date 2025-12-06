/**
 * GitPins - Control the order of your GitHub repositories
 * @author 686f6c61
 * @repository https://github.com/686f6c61/gitpins
 * @created 2024
 * @license MIT
 *
 * Repos API Route
 * Fetches user's GitHub repositories and applies saved ordering.
 * Returns repos list along with saved order and settings.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getUserRepos, createUserOctokit } from '@/lib/github'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/crypto'
import { checkAPIRateLimit, addSecurityHeaders } from '@/lib/security'

/**
 * GET /api/repos
 * Fetches all user repos from GitHub, applies saved ordering.
 * Returns: repos[], savedOrder[], settings
 */
export async function GET(request: NextRequest) {
  const session = await getSession()

  if (!session) {
    return addSecurityHeaders(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    )
  }

  // Rate limiting
  const rateLimit = checkAPIRateLimit(request, session.userId)
  if (!rateLimit.allowed) {
    return addSecurityHeaders(rateLimit.response!)
  }

  try {
    // Get user with encrypted token from database
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    })

    if (!user || !user.accessToken) {
      return addSecurityHeaders(
        NextResponse.json({ error: 'Session expired' }, { status: 401 })
      )
    }

    // Decrypt the access token
    const accessToken = decrypt(user.accessToken)

    // Obtener repos de GitHub
    const repos = await getUserRepos(accessToken)

    // Obtener orden guardado del usuario
    let repoOrder = await prisma.repoOrder.findUnique({
      where: { userId: session.userId },
    })

    // Verificar si el repo de config realmente existe en GitHub
    if (repoOrder?.configRepoCreated) {
      const configRepoName = repoOrder.configRepoName || 'gitpins-config'
      const configRepoExists = repos.some(r => r.name === configRepoName)

      if (!configRepoExists) {
        // El repo fue borrado, actualizar el flag
        repoOrder = await prisma.repoOrder.update({
          where: { userId: session.userId },
          data: { configRepoCreated: false },
        })
      }
    }

    // Si hay orden guardado, aplicarlo
    let savedReposOrder: string[] = []
    if (repoOrder) {
      try {
        const parsed = JSON.parse(repoOrder.reposOrder)
        savedReposOrder = Array.isArray(parsed) ? parsed : []
      } catch {
        savedReposOrder = []
      }
    }
    if (savedReposOrder.length > 0) {
      const orderMap = new Map(
        savedReposOrder.map((fullName, index) => [fullName, index])
      )

      repos.sort((a, b) => {
        const orderA = orderMap.get(a.fullName)
        const orderB = orderMap.get(b.fullName)

        // Si ambos tienen orden, ordenar por ese orden
        if (orderA !== undefined && orderB !== undefined) {
          return orderA - orderB
        }
        // Si solo uno tiene orden, ese va primero
        if (orderA !== undefined) return -1
        if (orderB !== undefined) return 1
        // Si ninguno tiene orden, mantener orden original (por updated_at)
        return 0
      })
    }

    return addSecurityHeaders(
      NextResponse.json({
        repos,
        savedOrder: savedReposOrder,
        settings: repoOrder
          ? {
              topN: repoOrder.topN,
              includePrivate: repoOrder.includePrivate,
              syncFrequency: repoOrder.syncFrequency,
              autoEnabled: repoOrder.autoEnabled,
              commitStrategy: repoOrder.commitStrategy,
              configRepoName: repoOrder.configRepoName,
              configRepoCreated: repoOrder.configRepoCreated,
              configRepoPrivate: repoOrder.configRepoPrivate,
              syncSecret: repoOrder.syncSecret,
            }
          : null,
      })
    )
  } catch (error) {
    console.error('Error fetching repos:', error)
    return addSecurityHeaders(
      NextResponse.json({ error: 'Operation failed' }, { status: 500 })
    )
  }
}
