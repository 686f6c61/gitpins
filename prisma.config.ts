/**
 * GitPins - Control the order of your GitHub repositories
 * @author 686f6c61
 * @repository https://github.com/686f6c61/gitpins
 * @created 2024
 * @license MIT
 *
 * Prisma Configuration
 * Configuration file for Prisma ORM 7.x
 */

import 'dotenv/config'
import { defineConfig } from 'prisma/config'

// `prisma generate` only needs a syntactically valid URL, not a live database.
// Using a placeholder keeps installs/builds reproducible when DATABASE_URL is
// injected only at runtime (for example in CI preview builds or OSS forks).
const databaseUrl =
  process.env.DATABASE_URL ||
  'postgresql://gitpins:gitpins@localhost:5432/gitpins'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: databaseUrl,
  },
})
