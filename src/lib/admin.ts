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

import type { NextRequest } from 'next/server'
import { getSession, verifyCSRFToken } from './session'
import { checkRateLimit, rateLimits } from './rate-limit'
import { prisma } from './prisma'
import { validateOrigin } from './security'
import { isSudoActive } from './sudo'

export interface Session {
  userId: string
  githubId: number
  username: string
}

interface AdminTarget {
  id?: string | null
  githubId?: number | null
  username?: string | null
}

type AdminLogWriter = Pick<typeof prisma, 'adminLog'>
type AdminMutationAuthorization = { session: Session } | { response: Response }

/**
 * Verifies if the current session belongs to an admin user.
 * @returns true if user is admin, false otherwise
 */
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
    console.error('Admin allowlist lookup error:', error)
  }

  return false
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
 * Creates a 403 response for invalid request origin / CSRF origin mismatch.
 */
export function invalidRequestResponse(): Response {
  return new Response(
    JSON.stringify({ error: 'Forbidden', message: 'Invalid request origin' }),
    { status: 403, headers: { 'Content-Type': 'application/json' } }
  )
}

/**
 * Creates a 403 response when a sensitive admin action requires recent reauthentication.
 */
export function adminReauthRequiredResponse(): Response {
  return new Response(
    JSON.stringify({
      error: 'Forbidden',
      message: 'Recent reauthentication required',
      reason: 'reauth_required',
    }),
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

/**
 * Shared guard for mutating admin endpoints.
 * Enforces session, allowlist, origin+CSRF validation, rate limits and optional sudo mode.
 */
export async function authorizeAdminMutation(
  request: NextRequest,
  options?: { requireSudo?: boolean }
): Promise<AdminMutationAuthorization> {
  const session = await getSession() as Session | null
  if (!session) {
    return { response: unauthorizedResponse() }
  }

  const isAdmin = await verifyAdmin(session)
  if (!isAdmin) {
    return { response: forbiddenResponse() }
  }

  if (!validateOrigin(request)) {
    return { response: invalidRequestResponse() }
  }

  const csrfValid = await verifyCSRF(request)
  if (!csrfValid) {
    return { response: csrfFailedResponse() }
  }

  const rateLimit = checkAdminRateLimit(session.userId)
  if (!rateLimit.allowed) {
    return { response: rateLimit.response! }
  }

  const requireSudo = options?.requireSudo ?? true
  if (requireSudo) {
    const sudo = await isSudoActive()
    if (!sudo) {
      return { response: adminReauthRequiredResponse() }
    }
  }

  return { session }
}

/**
 * Links an allowlisted admin account to the concrete user row on login.
 * This lets us pre-grant admin access by GitHub ID before the user exists in DB.
 */
export async function syncAdminAccountUserLink(user: Pick<Session, 'userId' | 'githubId'>): Promise<void> {
  await prisma.adminAccount.updateMany({
    where: {
      githubId: user.githubId,
      userId: { not: user.userId },
    },
    data: { userId: user.userId },
  })
}

/**
 * Creates an admin audit log that preserves actor/target identity even if users are later deleted.
 */
export async function createAdminAuditLog(input: {
  action: string
  admin: Session | null
  target?: AdminTarget | null
  targetGithubId?: number | null
  targetUsernameSnapshot?: string | null
  reason?: string | null
  details?: string | null
  client?: AdminLogWriter
}): Promise<void> {
  const target = input.target ?? null
  const client = input.client ?? prisma

  await client.adminLog.create({
    data: {
      adminId: input.admin?.userId ?? null,
      adminGithubId: input.admin?.githubId ?? null,
      adminUsernameSnapshot: input.admin?.username ?? null,
      targetUserId: target?.id ?? null,
      targetGithubId: target?.githubId ?? input.targetGithubId ?? null,
      targetUsernameSnapshot: target?.username ?? input.targetUsernameSnapshot ?? null,
      action: input.action,
      reason: input.reason ?? null,
      details: input.details ?? null,
    },
  })
}
