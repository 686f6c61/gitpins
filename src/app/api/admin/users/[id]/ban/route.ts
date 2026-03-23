/**
 * GitPins - Admin Ban User API
 * @author 686f6c61
 * @repository https://github.com/686f6c61/gitpins
 * @license MIT
 *
 * Bans a user from using the application.
 * Protected endpoint - requires admin authentication.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authorizeAdminMutation, createAdminAuditLog } from '@/lib/admin'
import { sanitizePlainText } from '@/lib/security'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorizeAdminMutation(request)
    if ('response' in auth) {
      return auth.response
    }
    const { session } = auth

    const { id } = await params
    const body = await request.json().catch(() => ({}))

    // Validate and sanitize ban reason
    const sanitizedReason = typeof body.reason === 'string'
      ? sanitizePlainText(body.reason, 500)
      : ''
    const reason = sanitizedReason || 'Violation of terms of service'

    // Check user exists
    const user = await prisma.user.findUnique({
      where: { id }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Prevent banning yourself
    if (user.githubId === session.githubId) {
      return NextResponse.json(
        { error: 'Cannot ban admin user' },
        { status: 400 }
      )
    }

    const activeAdmin = await prisma.adminAccount.findFirst({
      where: {
        githubId: user.githubId,
        revokedAt: null,
      },
      select: { id: true },
    })
    if (activeAdmin) {
      return NextResponse.json(
        { error: 'Cannot ban an active admin account' },
        { status: 400 }
      )
    }

    // Ban user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        isBanned: true,
        bannedAt: new Date(),
        bannedReason: reason,
      }
    })

    // Log admin action
    await createAdminAuditLog({
      action: 'BAN',
      admin: session,
      target: {
        id: user.id,
        githubId: user.githubId,
        username: user.username,
      },
      reason,
    })

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        isBanned: updatedUser.isBanned,
        bannedAt: updatedUser.bannedAt,
        bannedReason: updatedUser.bannedReason,
      }
    })
  } catch (error) {
    console.error('Admin ban user error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
