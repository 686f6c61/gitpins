/**
 * GitPins - Control the order of your GitHub repositories
 * @author 686f6c61
 * @repository https://github.com/686f6c61/gitpins
 * @created 2024
 * @license MIT
 *
 * Rate Limit Module
 * Simple in-memory rate limiter using a sliding window approach.
 * For production with multiple instances, replace with Redis or similar.
 */

/** Stores rate limit data per identifier */
interface RateLimitEntry {
  count: number
  resetTime: number
}

// In-memory store for rate limit entries (use Redis in production for scaling)
const rateLimitStore = new Map<string, RateLimitEntry>()

/** Configuration for rate limiting */
interface RateLimitConfig {
  windowMs: number    // Time window in milliseconds
  maxRequests: number // Maximum requests allowed per window
}

/** Result returned by checkRateLimit */
export interface RateLimitResult {
  success: boolean    // true if request is allowed
  remaining: number   // Remaining requests in current window
  resetTime: number   // Unix timestamp when window resets
}

/**
 * Garbage collection: Clean up expired entries every minute
 * This prevents memory leaks from abandoned rate limit entries
 */
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key)
    }
  }
}, 60000)

/**
 * Check if a request should be rate limited.
 * Uses a fixed window algorithm for simplicity.
 * @param identifier - Unique identifier (user ID, IP, etc.)
 * @param config - Rate limit configuration (window size and max requests)
 * @returns RateLimitResult with success status and metadata
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now()
  const entry = rateLimitStore.get(identifier)

  // If no entry or expired, create new one
  if (!entry || entry.resetTime < now) {
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now + config.windowMs,
    }
    rateLimitStore.set(identifier, newEntry)
    return {
      success: true,
      remaining: config.maxRequests - 1,
      resetTime: newEntry.resetTime,
    }
  }

  // Check if limit exceeded
  if (entry.count >= config.maxRequests) {
    return {
      success: false,
      remaining: 0,
      resetTime: entry.resetTime,
    }
  }

  // Increment count
  entry.count++
  return {
    success: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
  }
}

// Pre-configured rate limiters
export const rateLimits = {
  // Sync endpoint: max 10 requests per hour per secret
  sync: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10,
  },
  // API endpoints: max 100 requests per minute per user
  api: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
  },
  // Auth endpoints: max 10 requests per minute per IP
  auth: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
  },
}
