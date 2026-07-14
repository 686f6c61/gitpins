/**
 * GitPins - Control the order of your GitHub repositories
 * @author 686f6c61
 * @repository https://github.com/686f6c61/gitpins
 * @created 2025
 * @license MIT
 *
 * Rate Limit Module
 * Uses PostgreSQL for cross-instance consistency and falls back to in-memory
 * storage when the database is intentionally unavailable (tests/local scripts).
 */

interface RateLimitEntry {
  count: number
  resetTime: number
}

interface DatabaseRateLimitRow {
  count: number | bigint
  expiresAt: Date
  allowed: boolean
}

/** Configuration for rate limiting */
export interface RateLimitConfig {
  scope: string
  windowMs: number
  maxRequests: number
}

/** Result returned by checkRateLimit */
export interface RateLimitResult {
  success: boolean
  remaining: number
  resetTime: number
}

const memoryRateLimitStore = new Map<string, RateLimitEntry>()
let lastMemoryCleanupAt = 0
let lastDatabaseCleanupAt = 0

function getWindowStart(now: number, windowMs: number): number {
  return Math.floor(now / windowMs) * windowMs
}

function shouldUseDatabase(): boolean {
  return process.env.NODE_ENV !== 'test' && !!process.env.DATABASE_URL
}

function maybeCleanupMemoryStore(now: number): void {
  if (now - lastMemoryCleanupAt < 60_000) {
    return
  }

  lastMemoryCleanupAt = now
  for (const [key, entry] of memoryRateLimitStore.entries()) {
    if (entry.resetTime <= now) {
      memoryRateLimitStore.delete(key)
    }
  }
}

async function maybeCleanupDatabase(now: number): Promise<void> {
  if (!shouldUseDatabase() || now - lastDatabaseCleanupAt < 5 * 60_000) {
    return
  }

  lastDatabaseCleanupAt = now

  try {
    const { prisma } = await import('./prisma')
    await prisma.rateLimitBucket.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(now),
        },
      },
    })
  } catch {
    // Cleanup is best-effort and should never block request handling.
  }
}

function checkRateLimitInMemory(
  identifier: string,
  config: RateLimitConfig,
  now: number
): RateLimitResult {
  maybeCleanupMemoryStore(now)

  const key = `${config.scope}:${identifier}`
  const windowStart = getWindowStart(now, config.windowMs)
  const resetTime = windowStart + config.windowMs
  const entry = memoryRateLimitStore.get(key)

  if (!entry || entry.resetTime <= now) {
    memoryRateLimitStore.set(key, {
      count: 1,
      resetTime,
    })

    return {
      success: true,
      remaining: config.maxRequests - 1,
      resetTime,
    }
  }

  if (entry.count >= config.maxRequests) {
    return {
      success: false,
      remaining: 0,
      resetTime: entry.resetTime,
    }
  }

  entry.count += 1

  return {
    success: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
  }
}

async function checkRateLimitInDatabase(
  identifier: string,
  config: RateLimitConfig,
  now: number
): Promise<RateLimitResult | null> {
  if (!shouldUseDatabase()) {
    return null
  }

  try {
    const { prisma } = await import('./prisma')
    const windowStartMs = getWindowStart(now, config.windowMs)
    const windowStart = new Date(windowStartMs)
    const expiresAt = new Date(windowStartMs + config.windowMs)

    const rows = await prisma.$queryRaw<Array<DatabaseRateLimitRow>>`
      WITH upsert AS (
        INSERT INTO "rate_limit_buckets" (
          "scope",
          "identifier",
          "windowStart",
          "expiresAt",
          "count",
          "createdAt",
          "updatedAt"
        )
        VALUES (
          ${config.scope},
          ${identifier},
          ${windowStart},
          ${expiresAt},
          1,
          NOW(),
          NOW()
        )
        ON CONFLICT ("scope", "identifier", "windowStart")
        DO UPDATE SET
          "count" = "rate_limit_buckets"."count" + 1,
          "expiresAt" = EXCLUDED."expiresAt",
          "updatedAt" = NOW()
        WHERE "rate_limit_buckets"."count" < ${config.maxRequests}
        RETURNING
          "count",
          "expiresAt",
          TRUE AS "allowed"
      )
      SELECT "count", "expiresAt", "allowed" FROM upsert
      UNION ALL
      SELECT
        "count",
        "expiresAt",
        FALSE AS "allowed"
      FROM "rate_limit_buckets"
      WHERE "scope" = ${config.scope}
        AND "identifier" = ${identifier}
        AND "windowStart" = ${windowStart}
        AND NOT EXISTS (SELECT 1 FROM upsert)
      LIMIT 1
    `

    const row = rows[0]
    if (!row) {
      return null
    }

    const count = typeof row.count === 'bigint' ? Number(row.count) : row.count
    void maybeCleanupDatabase(now)

    return {
      success: row.allowed,
      remaining: row.allowed
        ? Math.max(config.maxRequests - count, 0)
        : 0,
      resetTime: row.expiresAt.getTime(),
    }
  } catch {
    return null
  }
}

/**
 * Check if a request should be rate limited.
 * PostgreSQL is used when available so limits remain correct across instances.
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const now = Date.now()
  const databaseResult = await checkRateLimitInDatabase(identifier, config, now)

  if (databaseResult) {
    return databaseResult
  }

  return checkRateLimitInMemory(identifier, config, now)
}

export const rateLimits = {
  sync: {
    scope: 'sync',
    windowMs: 60 * 60 * 1000,
    maxRequests: 10,
  },
  api: {
    scope: 'api',
    windowMs: 60 * 1000,
    maxRequests: 100,
  },
  auth: {
    scope: 'auth',
    windowMs: 60 * 1000,
    maxRequests: 10,
  },
  admin: {
    scope: 'admin',
    windowMs: 60 * 1000,
    maxRequests: 30,
  },
} satisfies Record<string, RateLimitConfig>
