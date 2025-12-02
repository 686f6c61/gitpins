/**
 * GitPins - Control the order of your GitHub repositories
 * @author 686f6c61
 * @repository https://github.com/686f6c61/gitpins
 * @created 2024
 * @license MIT
 *
 * Prisma Client Module
 * Singleton pattern for Prisma client to prevent multiple instances in development.
 * In development, Next.js hot reloading would create new connections on each reload.
 */

import { PrismaClient } from '@prisma/client'

// Store Prisma client in globalThis to persist across hot reloads
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Prisma client instance.
 * Uses singleton pattern: reuses existing instance or creates new one.
 */
export const prisma = globalForPrisma.prisma ?? new PrismaClient()

// In development, store the client globally to prevent connection exhaustion
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
