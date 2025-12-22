/**
 * GitPins - Control the order of your GitHub repositories
 * @author 686f6c61
 * @repository https://github.com/686f6c61/gitpins
 * @created 2025
 * @license MIT
 *
 * Activity API Route
 * Unified endpoint for activity history (combines OrderSnapshot + SyncLog).
 * Supports pagination and restoration of previous orders.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { validateOrigin, checkAPIRateLimit, addSecurityHeaders } from '@/lib/security'

/** Unified activity entry type */
interface ActivityEntry {
  id: string
  type: 'snapshot' | 'sync'
  action: string
  status: string
  repos: string[]
  topN?: number
  details?: unknown
  createdAt: string
  canRestore: boolean
}

/**
 * GET /api/activity
 * Returns unified activity history with pagination.
 * Query params: limit (default 30), offset (default 0)
 */
export async function GET(request: NextRequest) {
  const session = await getSession()

  if (!session) {
    return addSecurityHeaders(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '30'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    // Fetch snapshots and sync logs in parallel
    const [snapshots, syncLogs, snapshotCount, syncLogCount] = await Promise.all([
      prisma.orderSnapshot.findMany({
        where: { userId: session.userId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          reposOrder: true,
          topN: true,
          changeType: true,
          createdAt: true,
        },
      }),
      prisma.syncLog.findMany({
        where: { userId: session.userId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          action: true,
          status: true,
          details: true,
          reposAffected: true,
          createdAt: true,
        },
      }),
      prisma.orderSnapshot.count({ where: { userId: session.userId } }),
      prisma.syncLog.count({ where: { userId: session.userId } }),
    ])

    // Convert snapshots to unified format
    const snapshotEntries: ActivityEntry[] = snapshots.map((s) => ({
      id: s.id,
      type: 'snapshot' as const,
      action: s.changeType,
      status: 'success',
      repos: JSON.parse(s.reposOrder) as string[],
      topN: s.topN,
      createdAt: s.createdAt.toISOString(),
      canRestore: true,
    }))

    // Convert sync logs to unified format
    const syncEntries: ActivityEntry[] = syncLogs.map((log) => {
      let repos: string[] = []
      let details: unknown = null

      try {
        repos = JSON.parse(log.reposAffected) as string[]
      } catch {
        repos = []
      }

      try {
        details = log.details ? JSON.parse(log.details) : null
      } catch {
        details = null
      }

      return {
        id: log.id,
        type: 'sync' as const,
        action: log.action,
        status: log.status,
        repos,
        details,
        createdAt: log.createdAt.toISOString(),
        canRestore: false,
      }
    })

    // Merge and sort by date descending
    const allEntries = [...snapshotEntries, ...syncEntries]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    // Apply pagination
    const paginatedEntries = allEntries.slice(offset, offset + limit)
    const total = snapshotCount + syncLogCount

    return addSecurityHeaders(
      NextResponse.json({
        entries: paginatedEntries,
        total,
        hasMore: offset + limit < total,
        limit,
        offset,
      })
    )
  } catch (error) {
    console.error('Error fetching activity:', error)
    return addSecurityHeaders(
      NextResponse.json({ error: 'Operation failed' }, { status: 500 })
    )
  }
}

/**
 * POST /api/activity
 * Restores a previous order from a snapshot.
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
