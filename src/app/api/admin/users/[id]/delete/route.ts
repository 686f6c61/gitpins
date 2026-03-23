/**
 * GitPins - Admin Delete User API
 * @author 686f6c61
 * @repository https://github.com/686f6c61/gitpins
 * @license MIT
 *
 * Deletes a user from the application (user can re-register).
 * Protected endpoint - requires admin authentication.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authorizeAdminMutation, createAdminAuditLog } from '@/lib/admin'

export async function DELETE(
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

    // Prevent deleting yourself
    if (user.githubId === session.githubId) {
      return NextResponse.json(
        { error: 'Cannot delete admin user' },
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
        { error: 'Cannot delete an active admin account' },
        { status: 400 }
      )
    }

    // Log admin action BEFORE deleting (to maintain FK reference)
    await createAdminAuditLog({
      action: 'DELETE',
      admin: session,
      target: {
        id: user.id,
        githubId: user.githubId,
        username: user.username,
      },
      details: `Deleted user: ${user.username} (GitHub ID: ${user.githubId})`,
    })

    // Delete user (cascade will delete repoOrder, syncLogs, userToken)
    await prisma.user.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: `User ${user.username} deleted successfully`
    })
  } catch (error) {
    console.error('Admin delete user error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
