/**
 * GitPins - Privacy/Sudo API
 * Returns whether the current session is in "sudo mode" (recent reauth).
 */

import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { addSecurityHeaders } from '@/lib/security'
import { getSudoUntilMs, isSudoActive } from '@/lib/sudo'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return addSecurityHeaders(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    )
  }

  const [sudo, untilMs] = await Promise.all([
    isSudoActive(),
    getSudoUntilMs(),
  ])

  return addSecurityHeaders(
    NextResponse.json({
      sudo,
      untilMs: sudo ? untilMs : null,
    }, {
      headers: {
        'Cache-Control': 'no-store',
      },
    })
  )
}

