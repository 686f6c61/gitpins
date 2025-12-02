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
import { verifyAdmin, forbiddenResponse, unauthorizedResponse, checkAdminRateLimit } from '@/lib/admin'
import { getSession } from '@/lib/session'

export async function POST(
  _request: NextRequest,
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

    // Unban user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        isBanned: false,
        bannedAt: null,
        bannedReason: null,
      }
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
