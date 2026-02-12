/**
 * GitPins - Privacy Delete API
 * Self-serve account deletion with "sudo mode" (recent reauth) + typed confirmation.
 *
 * This deletes GitPins data only. It does not delete any GitHub repositories.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession, verifyCSRFToken, destroySession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { addSecurityHeaders, checkAPIRateLimit, sanitizeInput, validateOrigin } from '@/lib/security'
import { isSudoActive } from '@/lib/sudo'
import { ipHashFromRequest, jsonDetails, subjectHashFromGithubId, userAgentFromRequest } from '@/lib/privacy-audit'

const REQUIRED_PHRASE = 'DELETE MY ACCOUNT'

function usernameMatches(input: string, expectedUsername: string): boolean {
  const trimmed = input.trim()
  const normalized = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed
  return normalized.toLowerCase() === expectedUsername.toLowerCase()
}

export async function POST(request: NextRequest) {
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

  const sudo = await isSudoActive()
  if (!sudo) {
    return addSecurityHeaders(
      NextResponse.json({ error: 'Forbidden', reason: 'reauth_required' }, { status: 403 })
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return addSecurityHeaders(
      NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    )
  }

  const raw = body as { usernameConfirm?: unknown; phraseConfirm?: unknown }
  const usernameConfirm = sanitizeInput(String(raw.usernameConfirm ?? ''), 100)
  const phraseConfirm = sanitizeInput(String(raw.phraseConfirm ?? ''), 100)

  if (!usernameConfirm || !phraseConfirm) {
    return addSecurityHeaders(
      NextResponse.json({ error: 'Missing confirmation fields' }, { status: 400 })
    )
  }

  if (phraseConfirm.trim().toUpperCase() !== REQUIRED_PHRASE) {
    return addSecurityHeaders(
      NextResponse.json({ error: 'Invalid confirmation phrase' }, { status: 400 })
    )
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, username: true, githubId: true },
    })

    if (!user) {
      // Treat as success: there is nothing left to delete.
      await destroySession()
      return addSecurityHeaders(NextResponse.json({ success: true }))
    }

    if (!usernameMatches(usernameConfirm, user.username)) {
      return addSecurityHeaders(
        NextResponse.json({ error: 'Username confirmation does not match' }, { status: 400 })
      )
    }

    const subjectHash = subjectHashFromGithubId(user.githubId)
    const ipHash = ipHashFromRequest(request)
    const userAgent = userAgentFromRequest(request)

    const audit = await prisma.accountDeletionAudit.create({
      data: {
        subjectHash,
        usernameSnapshot: user.username,
        githubIdSnapshot: user.githubId,
        status: 'requested',
        requestedAt: new Date(),
        ipHash,
        userAgent,
        reason: 'self_service',
      },
      select: { id: true },
    })

    await prisma.privacyEvent.create({
      data: {
        userId: session.userId,
        subjectHash,
        eventType: 'account_delete_requested',
        details: jsonDetails({ auditId: audit.id }),
        ipHash,
        userAgent,
      },
    })

    try {
      const now = new Date()
      await prisma.$transaction(async (tx) => {
        await tx.user.delete({
          where: { id: user.id },
        })

        await tx.accountDeletionAudit.update({
          where: { id: audit.id },
          data: { status: 'executed', executedAt: now },
        })

        await tx.privacyEvent.create({
          data: {
            userId: null,
            subjectHash,
            eventType: 'account_deleted',
            details: jsonDetails({ auditId: audit.id }),
            ipHash,
            userAgent,
          },
        })
      })
    } catch (error) {
      const errText = sanitizeInput(
        error instanceof Error ? error.message : String(error),
        500
      )

      await prisma.accountDeletionAudit.update({
        where: { id: audit.id },
        data: { status: 'failed', error: errText },
      })

      await prisma.privacyEvent.create({
        data: {
          userId: session.userId,
          subjectHash,
          eventType: 'account_delete_failed',
          details: jsonDetails({ auditId: audit.id }),
          ipHash,
          userAgent,
        },
      })

      throw error
    }

    await destroySession()

    return addSecurityHeaders(
      NextResponse.json({
        success: true,
        message: 'Account deleted. GitPins does not delete any GitHub repositories.',
      })
    )
  } catch (error) {
    console.error('Privacy delete error:', error)
    return addSecurityHeaders(
      NextResponse.json({ error: 'Operation failed' }, { status: 500 })
    )
  }
}
