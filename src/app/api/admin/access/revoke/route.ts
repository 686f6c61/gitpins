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

    if (githubId === session.githubId) {
      return NextResponse.json({ error: 'Cannot revoke your own admin access' }, { status: 400 })
    }

    const adminAccount = await prisma.adminAccount.findUnique({
      where: { githubId },
      select: { id: true, userId: true },
    })

    if (!adminAccount) {
      return NextResponse.json({ error: 'Admin account not found' }, { status: 404 })
    }

    const reason = typeof reasonRaw === 'string' && reasonRaw.trim()
      ? reasonRaw.trim().slice(0, 500)
      : 'Revoked via admin API'

    const revoked = await prisma.adminAccount.update({
      where: { githubId },
      data: {
        revokedAt: new Date(),
        grantedByUserId: session.userId,
        reason,
      },
    })

    if (adminAccount.userId) {
      await prisma.adminLog.create({
        data: {
          adminId: session.userId,
          targetUserId: adminAccount.userId,
          action: 'REVOKE_ADMIN',
          reason,
        },
      })
    }

    return NextResponse.json({ success: true, admin: revoked })
  } catch (error) {
    console.error('Admin revoke error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
