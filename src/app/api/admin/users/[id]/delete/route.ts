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
import { verifyAdmin, forbiddenResponse, unauthorizedResponse, checkAdminRateLimit, verifyCSRF, csrfFailedResponse } from '@/lib/admin'
import { getSession } from '@/lib/session'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()

    if (!session) {
      return unauthorizedResponse()
    }

    const isAdmin = await verifyAdmin()

    if (!isAdmin) {
      return forbiddenResponse()
    }

    // CSRF verification for destructive action
    const csrfValid = await verifyCSRF(request)
    if (!csrfValid) {
      return csrfFailedResponse()
    }

    // Rate limiting for admin
    const rateLimit = checkAdminRateLimit(session.userId)
    if (!rateLimit.allowed) {
      return rateLimit.response!
    }

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
    if (user.githubId === parseInt(process.env.ADMIN_GITHUB_ID || '0')) {
      return NextResponse.json(
        { error: 'Cannot delete admin user' },
        { status: 400 }
      )
    }

    // Log admin action BEFORE deleting (to maintain FK reference)
    await prisma.adminLog.create({
      data: {
        adminId: session.userId,
        targetUserId: id,
        action: 'DELETE',
        details: `Deleted user: ${user.username} (GitHub ID: ${user.githubId})`,
      }
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
