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

    const reason = typeof reasonRaw === 'string' && sanitizePlainText(reasonRaw, 500)
      ? sanitizePlainText(reasonRaw, 500)
      : 'Granted via admin API'

    const adminAccount = await prisma.$transaction(async (tx) => {
      const targetUser = await tx.user.findUnique({
        where: { githubId },
        select: { id: true, username: true, githubId: true },
      })

      const updated = await tx.adminAccount.upsert({
        where: { githubId },
        update: {
          userId: targetUser?.id ?? null,
          grantedByUserId: session.userId,
          revokedByUserId: null,
          reason,
          revokedAt: null,
        },
        create: {
          githubId,
          userId: targetUser?.id ?? null,
          grantedByUserId: session.userId,
          revokedByUserId: null,
          reason,
        },
      })

      await createAdminAuditLog({
        action: 'GRANT_ADMIN',
        admin: session,
        target: targetUser,
        targetGithubId: githubId,
        reason,
        client: tx,
      })

      return updated
    })

    return NextResponse.json({ success: true, admin: adminAccount })
  } catch (error) {
    console.error('Admin grant error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
