import { NextResponse } from 'next/server'
import { addSecurityHeaders } from '@/lib/security'
import { generateCSRFToken, getSession } from '@/lib/session'

/**
 * GET /api/auth/csrf
 * Generates a CSRF token and stores it in an HTTP-only cookie.
 * Must be called from authenticated pages before destructive actions.
 */
export async function GET() {
  const session = await getSession()
  if (!session) {
    return addSecurityHeaders(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    )
  }

  const csrfToken = await generateCSRFToken()

  return addSecurityHeaders(
    NextResponse.json(
      { csrfToken },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  )
}
