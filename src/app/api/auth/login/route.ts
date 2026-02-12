/**
 * GitPins - Control the order of your GitHub repositories
 * @author 686f6c61
 * @repository https://github.com/686f6c61/gitpins
 * @created 2025
 * @license MIT
 *
 * Login API Route
 * Initiates GitHub OAuth flow by redirecting to GitHub's authorization page.
 * Generates a random state token for CSRF protection.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUrl } from '@/lib/github'
import { generateOAuthState } from '@/lib/session'
import { setSudoIntent } from '@/lib/sudo'

/**
 * GET /api/auth/login
 * Redirects user to GitHub OAuth authorization page.
 * Optional query param: returnTo=/path (internal app path only)
 */
export async function GET(request: NextRequest) {
  const returnTo = request.nextUrl.searchParams.get('returnTo') || undefined
  const sudo = request.nextUrl.searchParams.get('sudo')
  if (sudo === '1') {
    await setSudoIntent()
  }
  const state = await generateOAuthState(returnTo)
  const authUrl = getAuthUrl(state)

  return NextResponse.redirect(authUrl)
}
