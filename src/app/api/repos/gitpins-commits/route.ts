/**
 * GitPins - Control the order of your GitHub repositories
 * @author 686f6c61
 * @repository https://github.com/686f6c61/gitpins
 * @created 2024
 * @license MIT
 *
 * GitPins Commits Count API Route
 * Returns the count of GitPins commits for each repository.
 * This helps users see which repos have GitPins commits that can be cleaned.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { createAppOctokit } from '@/lib/github-app'
import { validateOrigin, addSecurityHeaders } from '@/lib/security'

interface RepoCommitCount {
  repo: string
  gitpinsCommits: number
  totalCommits: number
  lastGitpinsCommit?: {
    message: string
    date: string
  }
}

/**
 * GET /api/repos/gitpins-commits
 * Returns count of GitPins commits for user's repositories.
 */
export async function GET(request: NextRequest) {
  if (!validateOrigin(request)) {
    return addSecurityHeaders(
      NextResponse.json({ error: 'Invalid request' }, { status: 403 })
    )
  }

  const session = await getSession()
  if (!session) {
    return addSecurityHeaders(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    )
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { repoOrder: true },
    })

    if (!user || !user.installationId || !user.repoOrder) {
      return addSecurityHeaders(
        NextResponse.json({ error: 'Configuration required' }, { status: 400 })
      )
    }

    const octokit = createAppOctokit(user.installationId)

    // Obtener lista de repos configurados
    let reposOrder: string[] = []
    try {
      reposOrder = JSON.parse(user.repoOrder.reposOrder)
      if (!Array.isArray(reposOrder)) {
        reposOrder = []
      }
    } catch {
      return addSecurityHeaders(
        NextResponse.json({ error: 'Invalid configuration' }, { status: 400 })
      )
    }

    const results: RepoCommitCount[] = []

    // Revisar cada repo
    for (const repoFullName of reposOrder) {
      const [owner, repo] = repoFullName.split('/')

      try {
        // Obtener commits recientes (últimos 100)
        const { data: commits } = await octokit.rest.repos.listCommits({
          owner,
          repo,
          per_page: 100,
        })

        // Filtrar commits GitPins
        const gitpinsCommits = commits.filter(c =>
          c.commit.message.includes('[GitPins]')
        )

        // Obtener el último commit GitPins
        const lastGitpinsCommit = gitpinsCommits.length > 0
          ? {
              message: gitpinsCommits[0].commit.message,
              date: gitpinsCommits[0].commit.author?.date || '',
            }
          : undefined

        results.push({
          repo: repoFullName,
          gitpinsCommits: gitpinsCommits.length,
          totalCommits: commits.length,
          lastGitpinsCommit,
        })

      } catch (error) {
        // Si hay error accediendo al repo, lo saltamos
        console.error(`Error fetching commits for ${repoFullName}:`, error)
        results.push({
          repo: repoFullName,
          gitpinsCommits: 0,
          totalCommits: 0,
        })
      }

      // Pequeño delay para no saturar la API
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    return addSecurityHeaders(
      NextResponse.json({
        success: true,
        repos: results,
        totalGitpinsCommits: results.reduce((sum, r) => sum + r.gitpinsCommits, 0),
      })
    )

  } catch (error) {
    console.error('Error counting GitPins commits:', error)
    return addSecurityHeaders(
      NextResponse.json({ error: 'Operation failed' }, { status: 500 })
    )
  }
}
