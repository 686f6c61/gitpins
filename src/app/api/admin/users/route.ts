/**
 * GitPins - Admin Users API
 * @author 686f6c61
 * @repository https://github.com/686f6c61/gitpins
 * @license MIT
 *
 * Lists all users with their stats for admin dashboard.
 * Protected endpoint - requires admin authentication.
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdmin, forbiddenResponse, unauthorizedResponse, checkAdminRateLimit } from '@/lib/admin'
import { getSession } from '@/lib/session'

export async function GET() {
  try {
    const session = await getSession()

    if (!session) {
      return unauthorizedResponse()
    }

    const isAdmin = await verifyAdmin()

    if (!isAdmin) {
      return forbiddenResponse()
    }

    // Rate limiting for admin
    const rateLimit = checkAdminRateLimit(session.userId)
    if (!rateLimit.allowed) {
      return rateLimit.response!
    }

    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        repoOrder: {
          select: {
            reposOrder: true,
            syncFrequency: true,
            autoEnabled: true,
          }
        },
        _count: {
          select: { syncLogs: true }
        }
      }
    })

    const formattedUsers = users.map((user: typeof users[number]) => ({
      id: user.id,
      githubId: user.githubId,
      username: user.username,
      email: user.email,
      avatarUrl: user.avatarUrl,
      isBanned: user.isBanned,
      bannedAt: user.bannedAt,
      bannedReason: user.bannedReason,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      reposConfigured: user.repoOrder
        ? (() => {
            try {
              const parsed = JSON.parse(user.repoOrder.reposOrder)
              return Array.isArray(parsed) ? parsed.length : 0
            } catch {
              return 0
            }
          })()
        : 0,
      syncCount: user._count.syncLogs,
      hasConfig: !!user.repoOrder,
      syncFrequency: user.repoOrder?.syncFrequency || null,
      autoEnabled: user.repoOrder?.autoEnabled || false,
    }))

    return NextResponse.json({ users: formattedUsers })
  } catch (error) {
    console.error('Admin users error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
