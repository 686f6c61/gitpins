/**
 * GitPins - Control the order of your GitHub repositories
 * @author 686f6c61
 * @repository https://github.com/686f6c61/gitpins
 * @created 2024
 * @license MIT
 *
 * Security Module
 * Provides security utilities for API endpoints including:
 * - Origin validation (CSRF protection)
 * - Security headers
 * - Rate limiting wrapper
 * - Input validation and sanitization
 */

import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, rateLimits } from './rate-limit'

/**
 * Validates that the request originates from our own domain.
 * This provides CSRF protection by checking Origin/Referer headers.
 * @param request - The incoming Next.js request
 * @returns true if the request origin is valid
 */
export function validateOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')
  const host = request.headers.get('host')

  // For same-origin requests, origin might not be set
  if (!origin && !referer) {
    // Could be a same-origin request or a server-to-server call
    return true
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || `http://${host}`
  const allowedOrigins = [appUrl]

  // Allow localhost in development
  if (process.env.NODE_ENV === 'development') {
    allowedOrigins.push('http://localhost:3000')
    allowedOrigins.push('http://127.0.0.1:3000')
  }

  if (origin) {
    return allowedOrigins.some(allowed => origin.startsWith(allowed))
  }

  if (referer) {
    return allowedOrigins.some(allowed => referer.startsWith(allowed))
  }

  return false
}

/**
 * Adds security headers to API responses.
 * These headers help prevent common web vulnerabilities.
 * @param response - The Next.js response to add headers to
 * @returns The response with security headers added
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  return response
}

/**
 * Checks rate limits for API endpoints.
 * Uses the user ID if available, otherwise falls back to IP address.
 * @param request - The incoming request (used to extract IP)
 * @param userId - Optional user ID for authenticated requests
 * @returns Object with allowed status and optional rate limit response
 */
export function checkAPIRateLimit(request: NextRequest, userId?: string): { allowed: boolean; response?: NextResponse } {
  // Get IP from headers (works with proxies) or use unknown as fallback
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') || 'unknown'
  const identifier = userId || ip
  const result = checkRateLimit(`api:${identifier}`, rateLimits.api)

  if (!result.success) {
    const response = NextResponse.json(
      { error: 'Too many requests' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((result.resetTime - Date.now()) / 1000)),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(result.resetTime),
        },
      }
    )
    return { allowed: false, response }
  }

  return { allowed: true }
}

/**
 * Sanitizes user input by trimming and truncating.
 * Basic protection against overly long inputs.
 * @param input - The input string to sanitize
 * @param maxLength - Maximum allowed length (default 1000)
 * @returns Sanitized string, or empty string if input is invalid
 */
export function sanitizeInput(input: string, maxLength: number = 1000): string {
  if (typeof input !== 'string') return ''
  return input.slice(0, maxLength).trim()
}

/**
 * Validates a GitHub repository name format.
 * GitHub allows: alphanumeric, hyphens, underscores, dots (max 100 chars)
 * @param name - The repository name to validate
 * @returns true if the name is valid
 */
export function isValidRepoName(name: string): boolean {
  return /^[a-zA-Z0-9._-]{1,100}$/.test(name)
}

/**
 * Validates a full GitHub repository name (owner/repo format).
 * Both owner and repo must be valid GitHub names.
 * @param fullName - The full repository name (e.g., "octocat/hello-world")
 * @returns true if the format is valid
 */
export function isValidRepoFullName(fullName: string): boolean {
  const parts = fullName.split('/')
  if (parts.length !== 2) return false
  return isValidRepoName(parts[0]) && isValidRepoName(parts[1])
}
