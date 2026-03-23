import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  authorizeAdminMutation,
  createAdminAuditLog,
} from '@/lib/admin'
import { sanitizePlainText } from '@/lib/security'

export async function POST(request: NextRequest) {
  try {
    const auth = await authorizeAdminMutation(request)
    if ('response' in auth) {
      return auth.response
    }
    const { session } = auth

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
      select: {
        id: true,
        userId: true,
        githubId: true,
        user: {
          select: {
            id: true,
            username: true,
            githubId: true,
          },
        },
      },
    })

    if (!adminAccount) {
      return NextResponse.json({ error: 'Admin account not found' }, { status: 404 })
    }

    const reason = typeof reasonRaw === 'string' && sanitizePlainText(reasonRaw, 500)
      ? sanitizePlainText(reasonRaw, 500)
      : 'Revoked via admin API'

    const revoked = await prisma.$transaction(async (tx) => {
      const updated = await tx.adminAccount.update({
        where: { githubId },
        data: {
          revokedAt: new Date(),
          revokedByUserId: session.userId,
          reason,
        },
      })

      await createAdminAuditLog({
        action: 'REVOKE_ADMIN',
        admin: session,
        target: adminAccount.user,
        targetGithubId: adminAccount.githubId,
        reason,
        client: tx,
      })

      return updated
    })

    return NextResponse.json({ success: true, admin: revoked })
  } catch (error) {
    console.error('Admin revoke error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
