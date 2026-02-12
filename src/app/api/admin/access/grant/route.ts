import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  checkAdminRateLimit,
  csrfFailedResponse,
  forbiddenResponse,
  unauthorizedResponse,
  verifyAdmin,
  verifyCSRF,
} from '@/lib/admin'
import { getSession } from '@/lib/session'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return unauthorizedResponse()
    }

    const isAdmin = await verifyAdmin(session)
    if (!isAdmin) {
      return forbiddenResponse()
    }

    const csrfValid = await verifyCSRF(request)
    if (!csrfValid) {
      return csrfFailedResponse()
    }

    const rateLimit = checkAdminRateLimit(session.userId)
    if (!rateLimit.allowed) {
      return rateLimit.response!
    }

    const body = await request.json().catch(() => ({}))
    const githubIdRaw = body.githubId
    const reasonRaw = body.reason

    const githubId = typeof githubIdRaw === 'number' ? githubIdRaw : Number(githubIdRaw)
    if (!Number.isInteger(githubId) || githubId <= 0) {
      return NextResponse.json({ error: 'Invalid githubId' }, { status: 400 })
    }

    const reason = typeof reasonRaw === 'string' && reasonRaw.trim()
      ? reasonRaw.trim().slice(0, 500)
      : 'Granted via admin API'

    const targetUser = await prisma.user.findUnique({
      where: { githubId },
      select: { id: true, username: true },
    })

    const adminAccount = await prisma.adminAccount.upsert({
      where: { githubId },
      update: {
        userId: targetUser?.id || null,
        grantedByUserId: session.userId,
        reason,
        revokedAt: null,
      },
      create: {
        githubId,
        userId: targetUser?.id || null,
        grantedByUserId: session.userId,
        reason,
      },
    })

    if (targetUser) {
      await prisma.adminLog.create({
        data: {
          adminId: session.userId,
          targetUserId: targetUser.id,
          action: 'GRANT_ADMIN',
          reason,
        },
      })
    }

    return NextResponse.json({ success: true, admin: adminAccount })
  } catch (error) {
    console.error('Admin grant error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
