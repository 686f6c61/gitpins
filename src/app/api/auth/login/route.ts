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

import { NextResponse } from 'next/server'
import { getAuthUrl } from '@/lib/github'
import { generateOAuthState } from '@/lib/session'

/**
 * GET /api/auth/login
 * Redirects user to GitHub OAuth authorization page.
 */
export async function GET() {
  const state = await generateOAuthState()
  const authUrl = getAuthUrl(state)

  return NextResponse.redirect(authUrl)
}
