/**
 * GitPins - Privacy Audit Helpers
 * Utility helpers to record privacy-related events safely.
 */

import { createHash } from 'node:crypto'
import { sanitizeInput } from './security'

function getAuditSalt(): string {
  // Prefer a dedicated salt. Fallbacks keep local/dev usable.
  return (
    process.env.PRIVACY_AUDIT_SALT ||
    process.env.ENCRYPTION_SECRET ||
    process.env.JWT_SECRET ||
    'gitpins-unsafe-default-salt'
  )
}

export function sha256Hex(input: string): string {
  return createHash('sha256').update(input).digest('hex')
}

export function subjectHashFromGithubId(githubId: number): string {
  return sha256Hex(`${getAuditSalt()}|githubId:${githubId}`)
}

export function getRequestIp(request: { headers: Headers }): string | null {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }

  const realIp = request.headers.get('x-real-ip')
  return realIp ? realIp.trim() : null
}

export function ipHashFromRequest(request: { headers: Headers }): string | null {
  const ip = getRequestIp(request)
  if (!ip) return null
  return sha256Hex(`${getAuditSalt()}|ip:${ip}`)
}

export function userAgentFromRequest(request: { headers: Headers }): string | null {
  const ua = request.headers.get('user-agent')
  if (!ua) return null
  return sanitizeInput(ua, 500)
}

export function jsonDetails(value: unknown, maxLen: number = 10_000): string {
  try {
    const text = JSON.stringify(value)
    if (typeof text !== 'string') return ''
    return text.length > maxLen ? text.slice(0, maxLen) : text
  } catch {
    return ''
  }
}

