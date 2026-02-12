import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkAdminRateLimit, forbiddenResponse, unauthorizedResponse, verifyAdmin } from '@/lib/admin'
import { getSession } from '@/lib/session'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return unauthorizedResponse()
    }

    const isAdmin = await verifyAdmin(session)
    if (!isAdmin) {
      return forbiddenResponse()
    }

    const rateLimit = checkAdminRateLimit(session.userId)
    if (!rateLimit.allowed) {
      return rateLimit.response!
    }

    const adminAccounts = await prisma.adminAccount.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        githubId: true,
        userId: true,
        grantedByUserId: true,
        reason: true,
        revokedAt: true,
        createdAt: true,
        user: {
          select: {
            username: true,
            avatarUrl: true,
            githubId: true,
          },
        },
      },
    })

    return NextResponse.json({
      admins: adminAccounts,
      currentGithubId: session.githubId,
    })
  } catch (error) {
    console.error('Admin access list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
