/**
 * GitPins - Privacy Export API
 * Exports all user-owned data we store (profile, settings, history).
 *
 * Important: we never export secrets (tokens, syncSecret).
 */

import { createHash } from 'node:crypto'
import { gzipSync } from 'node:zlib'
import { NextRequest, NextResponse } from 'next/server'
import { getSession, verifyCSRFToken } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { addSecurityHeaders, checkAPIRateLimit, validateOrigin } from '@/lib/security'
import { ipHashFromRequest, jsonDetails, subjectHashFromGithubId, userAgentFromRequest } from '@/lib/privacy-audit'

function safeParseJSON<T>(value: string | null | undefined): T | null {
  if (!value || typeof value !== 'string') return null
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

function safeParseJSONArray(value: string | null | undefined): string[] {
  const parsed = safeParseJSON<unknown>(value)
  return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : []
}

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return addSecurityHeaders(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    )
  }

  const rateLimit = checkAPIRateLimit(request, session.userId)
  if (!rateLimit.allowed) {
    return addSecurityHeaders(rateLimit.response!)
  }

  try {
    const now = new Date()
    await prisma.dataExportJob.deleteMany({
      where: {
        userId: session.userId,
        expiresAt: { lt: now },
      },
    })

    const jobs = await prisma.dataExportJob.findMany({
      where: { userId: session.userId },
      orderBy: { requestedAt: 'desc' },
      take: 20,
      select: {
        id: true,
        status: true,
        format: true,
        filename: true,
        sha256: true,
        sizeBytes: true,
        requestedAt: true,
        readyAt: true,
        expiresAt: true,
        downloadedAt: true,
        error: true,
      },
    })

    return addSecurityHeaders(
      NextResponse.json({
        jobs: jobs.map((j) => ({
          ...j,
          requestedAt: j.requestedAt.toISOString(),
          readyAt: j.readyAt?.toISOString() ?? null,
          expiresAt: j.expiresAt.toISOString(),
          downloadedAt: j.downloadedAt?.toISOString() ?? null,
        })),
      }, {
        headers: { 'Cache-Control': 'no-store' },
      })
    )
  } catch (error) {
    console.error('Privacy export list error:', error)
    return addSecurityHeaders(
      NextResponse.json({ error: 'Operation failed' }, { status: 500 })
    )
  }
}

export async function POST(request: NextRequest) {
  // CSRF protections: origin check + token header.
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

  const rateLimit = checkAPIRateLimit(request, session.userId)
  if (!rateLimit.allowed) {
    return addSecurityHeaders(rateLimit.response!)
  }

  const csrfToken = request.headers.get('X-CSRF-Token')
  if (!csrfToken || !(await verifyCSRFToken(csrfToken))) {
    return addSecurityHeaders(
      NextResponse.json({ error: 'Forbidden', reason: 'csrf_failed' }, { status: 403 })
    )
  }

  try {
    const [user, repoOrder, snapshots, syncLogs, targetedAdminLogs, privacyEvents, exportJobs, adminAccounts] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.userId },
        select: {
          id: true,
          githubId: true,
          username: true,
          email: true,
          avatarUrl: true,
          installationId: true,
          isAdmin: true,
          isBanned: true,
          bannedAt: true,
          bannedReason: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true,
          token: {
            select: {
              refreshToken: true,
              expiresAt: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      }),
      prisma.repoOrder.findUnique({
        where: { userId: session.userId },
        select: {
          reposOrder: true,
          topN: true,
          includePrivate: true,
          syncFrequency: true,
          autoEnabled: true,
          commitStrategy: true,
          preferredHour: true,
          lastSyncAt: true,
          createdAt: true,
          updatedAt: true,
          // syncSecret intentionally excluded (secret)
        },
      }),
      prisma.orderSnapshot.findMany({
        where: { userId: session.userId },
        orderBy: { createdAt: 'asc' },
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
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          action: true,
          status: true,
          details: true,
          reposAffected: true,
          createdAt: true,
        },
      }),
      prisma.adminLog.findMany({
        where: { targetUserId: session.userId },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          action: true,
          reason: true,
          details: true,
          createdAt: true,
        },
      }),
      prisma.privacyEvent.findMany({
        where: { userId: session.userId },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          eventType: true,
          details: true,
          createdAt: true,
        },
      }),
      prisma.dataExportJob.findMany({
        where: { userId: session.userId },
        orderBy: { requestedAt: 'asc' },
        select: {
          id: true,
          status: true,
          format: true,
          filename: true,
          sha256: true,
          sizeBytes: true,
          requestedAt: true,
          readyAt: true,
          expiresAt: true,
          downloadedAt: true,
          error: true,
        },
      }),
      prisma.adminAccount.findMany({
        where: { userId: session.userId },
        orderBy: { createdAt: 'asc' },
        select: {
          githubId: true,
          grantedByUserId: true,
          reason: true,
          revokedAt: true,
          createdAt: true,
        },
      }),
    ])

    if (!user) {
      return addSecurityHeaders(
        NextResponse.json({ error: 'User not found' }, { status: 404 })
      )
    }

    const now = new Date()
    await prisma.dataExportJob.deleteMany({
      where: {
        userId: session.userId,
        expiresAt: { lt: now },
      },
    })

    const subjectHash = subjectHashFromGithubId(user.githubId)
    const ipHash = ipHashFromRequest(request)
    const userAgent = userAgentFromRequest(request)

    const payload = {
      exportVersion: 1,
      generatedAt: now.toISOString(),
      app: {
        name: 'GitPins',
      },
      user: {
        githubId: user.githubId,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl,
        installationId: user.installationId,
        isAdmin: user.isAdmin,
        isBanned: user.isBanned,
        bannedAt: user.bannedAt?.toISOString() ?? null,
        bannedReason: user.bannedReason,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
        lastLoginAt: user.lastLoginAt.toISOString(),
      },
      tokenMeta: user.token
        ? {
            hasRefreshToken: !!user.token.refreshToken,
            expiresAt: user.token.expiresAt?.toISOString() ?? null,
            createdAt: user.token.createdAt.toISOString(),
            updatedAt: user.token.updatedAt.toISOString(),
          }
        : null,
      repoOrder: repoOrder
        ? {
            reposOrder: safeParseJSONArray(repoOrder.reposOrder),
            topN: repoOrder.topN,
            includePrivate: repoOrder.includePrivate,
            syncFrequency: repoOrder.syncFrequency,
            autoEnabled: repoOrder.autoEnabled,
            commitStrategy: repoOrder.commitStrategy,
            preferredHour: repoOrder.preferredHour,
            lastSyncAt: repoOrder.lastSyncAt?.toISOString() ?? null,
            createdAt: repoOrder.createdAt.toISOString(),
            updatedAt: repoOrder.updatedAt.toISOString(),
          }
        : null,
      history: {
        orderSnapshots: snapshots.map((s) => ({
          id: s.id,
          changeType: s.changeType,
          topN: s.topN,
          reposOrder: safeParseJSONArray(s.reposOrder),
          createdAt: s.createdAt.toISOString(),
        })),
        syncLogs: syncLogs.map((log) => ({
          id: log.id,
          action: log.action,
          status: log.status,
          reposAffected: safeParseJSONArray(log.reposAffected),
          details: safeParseJSON<unknown>(log.details),
          createdAt: log.createdAt.toISOString(),
        })),
      },
      admin: {
        logsTargetingMe: targetedAdminLogs.map((l) => ({
          id: l.id,
          action: l.action,
          reason: l.reason,
          details: l.details,
          createdAt: l.createdAt.toISOString(),
        })),
        allowlistEntries: adminAccounts.map((a) => ({
          githubId: a.githubId,
          grantedByUserId: a.grantedByUserId,
          reason: a.reason,
          revokedAt: a.revokedAt?.toISOString() ?? null,
          createdAt: a.createdAt.toISOString(),
        })),
      },
      privacy: {
        events: privacyEvents.map((e) => ({
          id: e.id,
          eventType: e.eventType,
          details: safeParseJSON<unknown>(e.details),
          createdAt: e.createdAt.toISOString(),
        })),
        exports: exportJobs.map((j) => ({
          id: j.id,
          status: j.status,
          format: j.format,
          filename: j.filename,
          sha256: j.sha256,
          sizeBytes: j.sizeBytes,
          requestedAt: j.requestedAt.toISOString(),
          readyAt: j.readyAt?.toISOString() ?? null,
          expiresAt: j.expiresAt.toISOString(),
          downloadedAt: j.downloadedAt?.toISOString() ?? null,
          error: j.error,
        })),
      },
      notes: [
        'This export does not include secrets (OAuth tokens, syncSecret).',
        'Deleting your GitPins account does not delete any GitHub repositories.',
      ],
    }

    const fileDate = payload.generatedAt.slice(0, 10)
    const filename = `gitpins-data-${user.username}-${fileDate}.json`

    const jsonText = JSON.stringify(payload, null, 2)
    const sizeBytes = Buffer.byteLength(jsonText, 'utf8')
    const payloadGzip = gzipSync(Buffer.from(jsonText, 'utf8'))
    const sha256 = createHash('sha256').update(payloadGzip).digest('hex')
    const expiresAt = new Date(now.getTime() + 72 * 60 * 60 * 1000)

    const created = await prisma.$transaction(async (tx) => {
      const job = await tx.dataExportJob.create({
        data: {
          userId: session.userId,
          status: 'ready',
          format: 'json',
          filename,
          payloadGzip,
          sha256,
          sizeBytes,
          requestedAt: now,
          readyAt: now,
          expiresAt,
        },
        select: { id: true },
      })

      await tx.privacyEvent.create({
        data: {
          userId: session.userId,
          subjectHash,
          eventType: 'export_requested',
          details: jsonDetails({ jobId: job.id, filename, sizeBytes, sha256 }),
          ipHash,
          userAgent,
        },
      })

      // Keep storage bounded: keep last 10 exports per user.
      const overflow = await tx.dataExportJob.findMany({
        where: { userId: session.userId },
        orderBy: { requestedAt: 'desc' },
        skip: 10,
        select: { id: true },
      })
      if (overflow.length > 0) {
        await tx.dataExportJob.deleteMany({
          where: { id: { in: overflow.map((j) => j.id) } },
        })
      }

      return job
    })

    return addSecurityHeaders(
      NextResponse.json(
        { jobId: created.id, filename, expiresAt: expiresAt.toISOString() },
        { headers: { 'Cache-Control': 'no-store' } }
      )
    )
  } catch (error) {
    console.error('Privacy export error:', error)
    return addSecurityHeaders(
      NextResponse.json({ error: 'Operation failed' }, { status: 500 })
    )
  }
}
