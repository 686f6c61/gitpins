/**
 * GitPins - Control the order of your GitHub repositories
 * @author 686f6c61
 * @repository https://github.com/686f6c61/gitpins
 * @created 2024
 * @license MIT
 *
 * Order History API Route
 * Retrieves order history snapshots and allows restoring previous orders.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { validateOrigin, checkAPIRateLimit, addSecurityHeaders } from '@/lib/security'

/**
 * GET /api/repos/history
 * Returns the order history for the current user.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
  const session = await getSession()

  if (!session) {
    return addSecurityHeaders(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    )
  }

  try {
    const snapshots = await prisma.orderSnapshot.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        reposOrder: true,
        topN: true,
        changeType: true,
        createdAt: true,
      },
    })

    // Parse reposOrder for each snapshot
    const history = snapshots.map((snapshot: { id: string; reposOrder: string; topN: number; changeType: string; createdAt: Date }) => ({
      id: snapshot.id,
      repos: JSON.parse(snapshot.reposOrder) as string[],
      topN: snapshot.topN,
      changeType: snapshot.changeType,
      createdAt: snapshot.createdAt.toISOString(),
    }))

    return addSecurityHeaders(
      NextResponse.json({ history })
    )
  } catch (error) {
    console.error('Error fetching history:', error)
    return addSecurityHeaders(
      NextResponse.json({ error: 'Operation failed' }, { status: 500 })
    )
  }
}

/**
 * POST /api/repos/history
 * Restores a previous order from history.
 * Body: { snapshotId }
 */
export async function POST(request: NextRequest) {
  // Validate origin for CSRF protection
  if (!validateOrigin(request)) {
    return addSecurityHeaders(
      NextResponse.json({ error: 'Invalid request' }, { status: 403 })
    )
  }

  const session = await getSession()

  if (!session) {
    return addSecurityHeaders(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    )
  }

  // Rate limiting
  const rateLimit = checkAPIRateLimit(request, session.userId)
  if (!rateLimit.allowed) {
    return addSecurityHeaders(rateLimit.response!)
  }

  try {
    const body = await request.json()
    const { snapshotId } = body

    if (!snapshotId || typeof snapshotId !== 'string') {
      return addSecurityHeaders(
        NextResponse.json({ error: 'Invalid snapshot ID' }, { status: 400 })
      )
    }

    // Find the snapshot
    const snapshot = await prisma.orderSnapshot.findFirst({
      where: {
        id: snapshotId,
        userId: session.userId,
      },
    })

    if (!snapshot) {
      return addSecurityHeaders(
        NextResponse.json({ error: 'Snapshot not found' }, { status: 404 })
      )
    }

    // Restore the order
    await prisma.repoOrder.upsert({
      where: { userId: session.userId },
      update: {
        reposOrder: snapshot.reposOrder,
        topN: snapshot.topN,
      },
      create: {
        userId: session.userId,
        reposOrder: snapshot.reposOrder,
        topN: snapshot.topN,
      },
    })

    // Create a new snapshot for this restore action
    await prisma.orderSnapshot.create({
      data: {
        userId: session.userId,
        reposOrder: snapshot.reposOrder,
        topN: snapshot.topN,
        changeType: 'restore',
      },
    })

    // Log the restore action
    await prisma.syncLog.create({
      data: {
        userId: session.userId,
        action: 'restore_order',
        status: 'success',
        details: JSON.stringify({
          restoredFrom: snapshotId,
          originalDate: snapshot.createdAt.toISOString(),
        }),
        reposAffected: snapshot.reposOrder,
      },
    })

    return addSecurityHeaders(
      NextResponse.json({
        success: true,
        restoredOrder: JSON.parse(snapshot.reposOrder),
        topN: snapshot.topN,
      })
    )
  } catch (error) {
    console.error('Error restoring order:', error)
    return addSecurityHeaders(
      NextResponse.json({ error: 'Operation failed' }, { status: 500 })
    )
  }
}
