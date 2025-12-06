/**
 * GitPins - Admin Stats API
 * @author 686f6c61
 * @repository https://github.com/686f6c61/gitpins
 * @license MIT
 *
 * Returns statistics for admin dashboard charts.
 * Protected endpoint - requires admin authentication.
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdmin, forbiddenResponse, unauthorizedResponse, checkAdminRateLimit } from '@/lib/admin'
import { getSession } from '@/lib/session'

export async function GET() {
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

    // Get date 30 days ago
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Total counts
    const totalUsers = await prisma.user.count()
    const activeUsers = await prisma.user.count({
      where: { repoOrder: { isNot: null } }
    })
    const bannedUsers = await prisma.user.count({
      where: { isBanned: true }
    })
    const totalSyncs = await prisma.syncLog.count()

    // Users registered per day (last 30 days)
    const usersPerDay = await prisma.user.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: { gte: thirtyDaysAgo }
      },
      _count: true,
    })

    // Process users per day into daily counts
    const usersByDay: Record<string, number> = {}
    for (let i = 29; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const key = date.toISOString().split('T')[0]
      usersByDay[key] = 0
    }

    const allUsers = await prisma.user.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true }
    })

    allUsers.forEach(user => {
      const key = user.createdAt.toISOString().split('T')[0]
      if (usersByDay[key] !== undefined) {
        usersByDay[key]++
      }
    })

    // Syncs per day (last 30 days)
    const syncsByDay: Record<string, number> = {}
    for (let i = 29; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const key = date.toISOString().split('T')[0]
      syncsByDay[key] = 0
    }

    const allSyncs = await prisma.syncLog.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true }
    })

    allSyncs.forEach(sync => {
      const key = sync.createdAt.toISOString().split('T')[0]
      if (syncsByDay[key] !== undefined) {
        syncsByDay[key]++
      }
    })

    // Syncs today
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const syncsToday = await prisma.syncLog.count({
      where: { createdAt: { gte: today } }
    })

    // Syncs this week
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const syncsThisWeek = await prisma.syncLog.count({
      where: { createdAt: { gte: weekAgo } }
    })

    return NextResponse.json({
      totals: {
        users: totalUsers,
        activeUsers,
        bannedUsers,
        syncs: totalSyncs,
        syncsToday,
        syncsThisWeek,
      },
      charts: {
        usersPerDay: Object.entries(usersByDay).map(([date, count]) => ({
          date,
          count
        })),
        syncsPerDay: Object.entries(syncsByDay).map(([date, count]) => ({
          date,
          count
        })),
      }
    })
  } catch (error) {
    console.error('Admin stats error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
