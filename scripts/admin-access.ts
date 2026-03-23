import { createAdminAuditLog } from '../src/lib/admin'
import { prisma } from '../src/lib/prisma'

type Command = 'grant' | 'revoke' | 'list'

function getArg(name: string): string | null {
  const index = process.argv.findIndex((arg) => arg === `--${name}`)
  if (index === -1) return null
  return process.argv[index + 1] ?? null
}

function parseGithubId(): number {
  const raw = getArg('github-id')
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error('Missing or invalid --github-id')
  }
  return parsed
}

function getReason(fallback: string): string {
  const reason = getArg('reason')?.trim()
  return reason ? reason.slice(0, 500) : fallback
}

function getCommand(): Command {
  const command = process.argv[2]
  if (command === 'grant' || command === 'revoke' || command === 'list') {
    return command
  }
  throw new Error('Usage: npm run admin:access -- <grant|revoke|list> [--github-id <id>] [--reason <text>]')
}

async function listAdmins(): Promise<void> {
  const admins = await prisma.adminAccount.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      githubId: true,
      userId: true,
      grantedByUserId: true,
      revokedByUserId: true,
      reason: true,
      revokedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  for (const admin of admins) {
    console.log(JSON.stringify(admin))
  }
}

async function grantAdmin(): Promise<void> {
  const githubId = parseGithubId()
  const reason = getReason('Granted via admin bootstrap CLI')

  const targetUser = await prisma.user.findUnique({
    where: { githubId },
    select: { id: true, githubId: true, username: true },
  })

  const admin = await prisma.adminAccount.upsert({
    where: { githubId },
    update: {
      userId: targetUser?.id ?? null,
      grantedByUserId: null,
      revokedByUserId: null,
      reason,
      revokedAt: null,
    },
    create: {
      githubId,
      userId: targetUser?.id ?? null,
      grantedByUserId: null,
      revokedByUserId: null,
      reason,
    },
  })

  await createAdminAuditLog({
    action: 'BOOTSTRAP_GRANT_ADMIN',
    admin: null,
    target: targetUser,
    targetGithubId: githubId,
    reason,
  })

  console.log(JSON.stringify({ success: true, admin }))
}

async function revokeAdmin(): Promise<void> {
  const githubId = parseGithubId()
  const reason = getReason('Revoked via admin bootstrap CLI')

  const existing = await prisma.adminAccount.findUnique({
    where: { githubId },
    select: {
      githubId: true,
      user: {
        select: {
          id: true,
          githubId: true,
          username: true,
        },
      },
    },
  })

  if (!existing) {
    throw new Error(`Admin account not found for githubId=${githubId}`)
  }

  const admin = await prisma.adminAccount.update({
    where: { githubId },
    data: {
      revokedAt: new Date(),
      revokedByUserId: null,
      reason,
    },
  })

  await createAdminAuditLog({
    action: 'BOOTSTRAP_REVOKE_ADMIN',
    admin: null,
    target: existing.user,
    targetGithubId: githubId,
    reason,
  })

  console.log(JSON.stringify({ success: true, admin }))
}

async function main(): Promise<void> {
  const command = getCommand()

  if (command === 'list') {
    await listAdmins()
    return
  }

  if (command === 'grant') {
    await grantAdmin()
    return
  }

  await revokeAdmin()
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => {})
  })
