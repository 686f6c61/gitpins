import { NextRequest, NextResponse } from 'next/server'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(request: NextRequest) {
  const secret = request.headers.get('X-GitPins-Sync-Secret')

  if (!secret || !UUID_REGEX.test(secret)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  try {
    const internalUrl = new URL(`/api/sync/${secret}`, request.url)

    for (const [key, value] of request.nextUrl.searchParams.entries()) {
      internalUrl.searchParams.set(key, value)
    }

    const internalResponse = await fetch(internalUrl.toString(), {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'X-Internal-Request': 'header-sync',
      },
    })

    const bodyText = await internalResponse.text()
    return new NextResponse(bodyText, {
      status: internalResponse.status,
      headers: {
        'Content-Type': internalResponse.headers.get('Content-Type') || 'application/json',
      },
    })
  } catch (error) {
    console.error('Header sync proxy error:', error)
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST instead.' },
    { status: 405, headers: { Allow: 'POST' } }
  )
}
