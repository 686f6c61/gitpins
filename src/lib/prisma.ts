/**
 * GitPins - Control the order of your GitHub repositories
 * @author 686f6c61
 * @repository https://github.com/686f6c61/gitpins
 * @created 2025
 * @license MIT
 *
 * Prisma Client Module
 * Singleton pattern for Prisma client to prevent multiple instances in development.
 * In development, Next.js hot reloading would create new connections on each reload.
 * Updated for Prisma 7.x with PostgreSQL adapter.
 */

import { PrismaClient } from '../generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

// Store Prisma client in globalThis to persist across hot reloads
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Creates a new Prisma client.
 *
 * Note: in Next.js dev + HMR, we keep a singleton in globalThis to avoid
 * exhausting connections. When the Prisma client is regenerated (schema change),
 * an old singleton can become "stale" and miss new model delegates. We detect
 * that and recreate the client.
 */
function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  })
  return new PrismaClient({ adapter })
}

function hasModelDelegate(client: unknown, model: string): boolean {
  const delegate = (client as Record<string, unknown> | null)?.[model] as { findMany?: unknown } | undefined
  return !!delegate && typeof delegate.findMany === 'function'
}

/**
 * Prisma client instance.
 * Uses singleton pattern: reuses existing instance or creates new one.
 */
let prisma = globalForPrisma.prisma ?? createPrismaClient()

// If a previously cached client is stale (e.g. after prisma generate), recreate it.
if (
  process.env.NODE_ENV !== 'production' &&
  (!hasModelDelegate(prisma, 'privacyEvent') ||
    !hasModelDelegate(prisma, 'dataExportJob') ||
    !hasModelDelegate(prisma, 'accountDeletionAudit'))
) {
  prisma.$disconnect().catch(() => {})
  prisma = createPrismaClient()
}

// In development, store the client globally to prevent connection exhaustion
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export { prisma }
