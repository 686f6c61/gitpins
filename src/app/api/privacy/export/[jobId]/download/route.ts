/**
 * GitPins - Privacy Export Download API
 * Downloads a previously generated export job.
 */

import { gunzipSync } from 'node:zlib'
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { addSecurityHeaders, checkAPIRateLimit, validateOrigin } from '@/lib/security'
import { ipHashFromRequest, jsonDetails, subjectHashFromGithubId, userAgentFromRequest } from '@/lib/privacy-audit'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  // Best-effort CSRF protection for "download" navigation.
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

  try {
    const { jobId } = await params
    const job = await prisma.dataExportJob.findFirst({
      where: { id: jobId, userId: session.userId },
      select: {
        id: true,
        filename: true,
        payloadGzip: true,
        expiresAt: true,
        downloadedAt: true,
        user: {
          select: { githubId: true },
        },
      },
    })

    if (!job) {
      return addSecurityHeaders(
        NextResponse.json({ error: 'Export not found' }, { status: 404 })
      )
    }

    const now = new Date()
    if (job.expiresAt.getTime() < now.getTime()) {
      await prisma.dataExportJob.delete({ where: { id: job.id } })
      return addSecurityHeaders(
        NextResponse.json({ error: 'Export expired' }, { status: 410 })
      )
    }

    if (!job.payloadGzip) {
      return addSecurityHeaders(
        NextResponse.json({ error: 'Export payload unavailable' }, { status: 500 })
      )
    }

    const subjectHash = subjectHashFromGithubId(job.user.githubId)
    const ipHash = ipHashFromRequest(request)
    const userAgent = userAgentFromRequest(request)

    await prisma.$transaction(async (tx) => {
      if (!job.downloadedAt) {
        await tx.dataExportJob.update({
          where: { id: job.id },
          data: { downloadedAt: now },
        })
      }

      await tx.privacyEvent.create({
        data: {
          userId: session.userId,
          subjectHash,
          eventType: 'export_downloaded',
          details: jsonDetails({ jobId: job.id }),
          ipHash,
          userAgent,
        },
      })
    })

    const jsonText = gunzipSync(job.payloadGzip).toString('utf8')
    const response = new NextResponse(jsonText, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'Content-Disposition': `attachment; filename="${job.filename}"`,
      },
    })
    return addSecurityHeaders(response)
  } catch (error) {
    console.error('Privacy export download error:', error)
    return addSecurityHeaders(
      NextResponse.json({ error: 'Operation failed' }, { status: 500 })
    )
  }
}

