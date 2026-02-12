/**
 * GitPins - Control the order of your GitHub repositories
 * @author 686f6c61
 * @repository https://github.com/686f6c61/gitpins
 * @created 2025
 * @license MIT
 *
 * Admin Verification Module
 * Centralized security functions for admin access control.
 */

import { getSession, verifyCSRFToken } from './session'
import { checkRateLimit, rateLimits } from './rate-limit'
import { prisma } from './prisma'

interface Session {
  userId: string
  githubId: number
  username: string
}

/**
 * Verifies if the current session belongs to an admin user.
 * Uses DB allowlist and temporary fallback to ADMIN_GITHUB_ID during migration.
 * @returns true if user is admin, false otherwise
 */
function parseAdminGithubId(): number | null {
  const envValue = process.env.ADMIN_GITHUB_ID
  if (!envValue) return null
  const parsed = parseInt(envValue, 10)
  return Number.isNaN(parsed) ? null : parsed
}

export async function verifyAdmin(sessionOverride?: Session | null): Promise<boolean> {
  const session = (sessionOverride ?? await getSession()) as Session | null

  if (!session) {
    return false
  }

  try {
    const adminAccount = await prisma.adminAccount.findUnique({
      where: { githubId: session.githubId },
      select: { revokedAt: true },
    })

    if (adminAccount && adminAccount.revokedAt === null) {
      return true
    }
  } catch (error) {
    // Allow temporary fallback when migrations are not yet applied
    console.error('Admin allowlist lookup warning:', error)
  }

  // Temporary fallback during migration to DB allowlist
  const envAdminGithubId = parseAdminGithubId()
  return envAdminGithubId !== null && session.githubId === envAdminGithubId
}

/**
 * Gets admin session if user is verified admin.
 * @returns Session object if admin, null otherwise
 */
export async function getAdminSession(): Promise<Session | null> {
  const session = await getSession() as Session | null

  if (!session) {
    return null
  }

  const isAdmin = await verifyAdmin(session)
  if (!isAdmin) {
    return null
  }

  return session
}

/**
 * Creates a 403 Forbidden response for unauthorized access attempts.
 */
export function forbiddenResponse(): Response {
  return new Response(
    JSON.stringify({ error: 'Forbidden', message: 'Admin access required' }),
    { status: 403, headers: { 'Content-Type': 'application/json' } }
  )
}

/**
 * Creates a 401 Unauthorized response for missing authentication.
 */
export function unauthorizedResponse(): Response {
  return new Response(
    JSON.stringify({ error: 'Unauthorized', message: 'Authentication required' }),
    { status: 401, headers: { 'Content-Type': 'application/json' } }
  )
}

/**
 * Creates a 429 Too Many Requests response.
 */
export function rateLimitResponse(resetTime: number): Response {
  return new Response(
    JSON.stringify({ error: 'Too many requests', message: 'Rate limit exceeded' }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(Math.ceil((resetTime - Date.now()) / 1000)),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(resetTime),
      }
    }
  )
}

/**
 * Checks admin rate limit.
 * @param adminId - Admin user ID for rate limiting
 * @returns Object with allowed status and optional response
 */
export function checkAdminRateLimit(adminId: string): { allowed: boolean; response?: Response } {
  const result = checkRateLimit(`admin:${adminId}`, rateLimits.admin)
  if (!result.success) {
    return { allowed: false, response: rateLimitResponse(result.resetTime) }
  }
  return { allowed: true }
}

/**
 * Creates a 403 CSRF validation failed response.
 */
export function csrfFailedResponse(): Response {
  return new Response(
    JSON.stringify({ error: 'Forbidden', message: 'CSRF validation failed' }),
    { status: 403, headers: { 'Content-Type': 'application/json' } }
  )
}

/**
 * Verifies CSRF token from request header.
 * Token should be sent in 'X-CSRF-Token' header.
 * @param request - NextRequest object
 * @returns true if CSRF token is valid
 */
export async function verifyCSRF(request: Request): Promise<boolean> {
  const csrfToken = request.headers.get('X-CSRF-Token')
  if (!csrfToken) {
    return false
  }
  return verifyCSRFToken(csrfToken)
}
