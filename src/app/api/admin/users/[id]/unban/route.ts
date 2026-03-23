/**
 * GitPins - Admin Unban User API
 * @author 686f6c61
 * @repository https://github.com/686f6c61/gitpins
 * @license MIT
 *
 * Unbans a previously banned user.
 * Protected endpoint - requires admin authentication.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authorizeAdminMutation, createAdminAuditLog } from '@/lib/admin'

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

    // Unban user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        isBanned: false,
        bannedAt: null,
        bannedReason: null,
      }
    })

    // Log admin action
    await createAdminAuditLog({
      action: 'UNBAN',
      admin: session,
      target: {
        id: user.id,
        githubId: user.githubId,
        username: user.username,
      },
    })

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        isBanned: updatedUser.isBanned,
      }
    })
  } catch (error) {
    console.error('Admin unban user error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
