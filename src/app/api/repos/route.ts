/**
 * GitPins - Control the order of your GitHub repositories
 * @author 686f6c61
 * @repository https://github.com/686f6c61/gitpins
 * @created 2025
 * @license MIT
 *
 * Repos API Route
 * Fetches user's GitHub repositories and applies saved ordering.
 * Returns repos list along with saved order and settings.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getUserRepos } from '@/lib/github'
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
    // Get user with token from database
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { token: true },
    })

    if (!user || !user.token?.accessToken) {
      return addSecurityHeaders(
        NextResponse.json({ error: 'Session expired' }, { status: 401 })
      )
    }

    // Decrypt the access token from UserToken
    const accessToken = decrypt(user.token.accessToken)

    // Obtener repos de GitHub
    let repos
    try {
      repos = await getUserRepos(accessToken)
    } catch (error: unknown) {
      // Detectar errores de autenticación de GitHub (401/403)
      const githubError = error as { status?: number; message?: string }
      if (githubError.status === 401 || githubError.status === 403) {
        console.error('GitHub token invalid or expired:', githubError.message)
        // Opcionalmente podríamos limpiar el token inválido de la DB aquí
        return addSecurityHeaders(
          NextResponse.json({
            error: 'GitHub authentication expired. Please log out and log in again.',
            needsReauth: true
          }, { status: 401 })
        )
      }
      throw error
    }

    // Obtener orden guardado del usuario
    const repoOrder = await prisma.repoOrder.findUnique({
      where: { userId: session.userId },
    })

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
              preferredHour: repoOrder.preferredHour,
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
