/**
 * GitPins - Control the order of your GitHub repositories
 * @author 686f6c61
 * @repository https://github.com/686f6c61/gitpins
 * @created 2024
 * @license MIT
 *
 * Repos Order API Route
 * Saves the user's repository ordering preferences.
 * Validates input and stores order with associated settings.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { validateOrigin, checkAPIRateLimit, isValidRepoFullName, addSecurityHeaders } from '@/lib/security'

/**
 * POST /api/repos/order
 * Saves repository order and settings to database.
 * Body: { reposOrder, topN, syncFrequency, autoEnabled, commitStrategy }
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
    const { reposOrder, topN, syncFrequency, autoEnabled, commitStrategy } = body

    // Validate reposOrder array
    if (!Array.isArray(reposOrder)) {
      return addSecurityHeaders(
        NextResponse.json({ error: 'Invalid request' }, { status: 400 })
      )
    }

    // Validate max repos limit
    if (reposOrder.length > 500) {
      return addSecurityHeaders(
        NextResponse.json({ error: 'Too many repositories' }, { status: 400 })
      )
    }

    // Validate each repo name format
    for (const repoName of reposOrder) {
      if (typeof repoName !== 'string' || !isValidRepoFullName(repoName)) {
        return addSecurityHeaders(
          NextResponse.json({ error: 'Invalid repository name' }, { status: 400 })
        )
      }
    }

    // Validate topN
    const validTopN = Math.min(Math.max(1, topN ?? 10), 100)

    // Validate syncFrequency
    const validFrequencies = [1, 2, 4, 6, 8, 12, 24, 48, 168, 360, 720]
    const validSyncFrequency = validFrequencies.includes(syncFrequency) ? syncFrequency : 168

    // Validate commitStrategy
    const validStrategies = ['branch', 'revert']
    const validCommitStrategy = validStrategies.includes(commitStrategy) ? commitStrategy : 'revert'

    // Validate preferredHour (0-23 or null)
    const preferredHour = body.preferredHour
    const validPreferredHour = (typeof preferredHour === 'number' && preferredHour >= 0 && preferredHour <= 23)
      ? preferredHour
      : null

    // Validate preferredDays (array of 0-6)
    const preferredDays = body.preferredDays
    const validPreferredDays = Array.isArray(preferredDays)
      ? preferredDays.filter((d: any) => typeof d === 'number' && d >= 0 && d <= 6)
      : []

    // Crear o actualizar orden
    const reposOrderJson = JSON.stringify(reposOrder)
    const preferredDaysJson = JSON.stringify(validPreferredDays)
    const repoOrderResult = await prisma.repoOrder.upsert({
      where: { userId: session.userId },
      update: {
        reposOrder: reposOrderJson,
        topN: validTopN,
        includePrivate: body.includePrivate ?? true,
        syncFrequency: validSyncFrequency,
        autoEnabled: autoEnabled ?? true,
        commitStrategy: validCommitStrategy,
        preferredHour: validPreferredHour,
        preferredDays: preferredDaysJson,
      },
      create: {
        userId: session.userId,
        reposOrder: reposOrderJson,
        topN: validTopN,
        includePrivate: body.includePrivate ?? true,
        syncFrequency: validSyncFrequency,
        autoEnabled: autoEnabled ?? true,
        commitStrategy: validCommitStrategy,
        preferredHour: validPreferredHour,
        preferredDays: preferredDaysJson,
      },
    })

    // Guardar snapshot del historial
    await prisma.orderSnapshot.create({
      data: {
        userId: session.userId,
        reposOrder: reposOrderJson,
        topN: validTopN,
        changeType: 'manual',
      },
    })

    // Limpiar snapshots antiguos (mantener solo los últimos 20)
    const oldSnapshots = await prisma.orderSnapshot.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: 'desc' },
      skip: 20,
      select: { id: true },
    })
    if (oldSnapshots.length > 0) {
      await prisma.orderSnapshot.deleteMany({
        where: { id: { in: oldSnapshots.map((s: { id: string }) => s.id) } },
      })
    }

    // Registrar en log
    await prisma.syncLog.create({
      data: {
        userId: session.userId,
        action: 'manual_order',
        status: 'success',
        details: JSON.stringify({ reposCount: reposOrder.length }),
        reposAffected: JSON.stringify(reposOrder.slice(0, validTopN)),
      },
    })

    return addSecurityHeaders(
      NextResponse.json({ success: true, repoOrder: repoOrderResult })
    )
  } catch (error) {
    console.error('Error saving order:', error)
    return addSecurityHeaders(
      NextResponse.json({ error: 'Operation failed' }, { status: 500 })
    )
  }
}
