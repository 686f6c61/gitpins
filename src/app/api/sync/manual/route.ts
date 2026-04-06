import { NextRequest, NextResponse } from 'next/server'
import { getSession, verifyCSRFToken } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { addSecurityHeaders, checkAPIRateLimit, validateOrigin } from '@/lib/security'

export async function POST(request: NextRequest) {
  if (!validateOrigin(request)) {
    return addSecurityHeaders(NextResponse.json({ error: 'Invalid request' }, { status: 403 }))
  }

  const session = await getSession()
  if (!session) {
    return addSecurityHeaders(
      NextResponse.json({ error: 'Unauthorized', reason: 'no_session' }, { status: 401 })
    )
  }

  const csrfToken = request.headers.get('X-CSRF-Token')
  if (!csrfToken || !(await verifyCSRFToken(csrfToken))) {
    return addSecurityHeaders(NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 }))
  }

  const rateLimit = checkAPIRateLimit(request, session.userId)
  if (!rateLimit.allowed) {
    return addSecurityHeaders(rateLimit.response!)
  }

  const repoOrder = await prisma.repoOrder.findUnique({
    where: { userId: session.userId },
    select: {
      syncSecret: true,
    },
  })

  if (!repoOrder?.syncSecret) {
    return addSecurityHeaders(
      NextResponse.json({ error: 'Sync is not configured yet' }, { status: 400 })
    )
  }

  try {
    const baseUrl = `http://localhost:${process.env.PORT || 3000}`
    const internalUrl = new URL(`/api/sync/${repoOrder.syncSecret}`, baseUrl)
    internalUrl.searchParams.set('force', 'true')

    const internalResponse = await fetch(internalUrl.toString(), {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'X-Internal-Request': 'manual-sync',
      },
    })

    const bodyText = await internalResponse.text()
    const proxiedResponse = new NextResponse(bodyText, {
      status: internalResponse.status,
      headers: {
        'Content-Type': internalResponse.headers.get('Content-Type') || 'application/json',
      },
    })

    return addSecurityHeaders(proxiedResponse)
  } catch (error) {
    console.error('Manual sync error:', error)
    return addSecurityHeaders(
      NextResponse.json({ error: 'Operation failed' }, { status: 500 })
    )
  }
}
