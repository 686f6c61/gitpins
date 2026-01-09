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
import { verifyAdmin, forbiddenResponse, unauthorizedResponse, checkAdminRateLimit, verifyCSRF, csrfFailedResponse } from '@/lib/admin'
import { getSession } from '@/lib/session'

export async function POST(
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
    const body = await request.json().catch(() => ({}))

    // Validate and sanitize ban reason
    const MAX_REASON_LENGTH = 500
    let reason = body.reason
    if (typeof reason !== 'string' || !reason.trim()) {
      reason = 'Violation of terms of service'
    } else {
      // Sanitize: trim, limit length, remove control characters
      reason = reason
        .trim()
        .slice(0, MAX_REASON_LENGTH)
        .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    }

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
    if (user.githubId === parseInt(process.env.ADMIN_GITHUB_ID || '0')) {
      return NextResponse.json(
        { error: 'Cannot ban admin user' },
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
    await prisma.adminLog.create({
      data: {
        adminId: session.userId,
        targetUserId: id,
        action: 'BAN',
        reason: reason,
      }
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
