/**
 * GitPins - Control the order of your GitHub repositories
 * @author 686f6c61
 * @repository https://github.com/686f6c61/gitpins
 * @created 2024
 * @license MIT
 *
 * Admin Page
 * Administrative dashboard for viewing app statistics.
 * Only accessible to users with admin privileges.
 * Shows total users, active users, configurations, and recent sync logs.
 */

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui'
import type { User, RepoOrder, SyncLog } from '@prisma/client'

/** User with related repoOrder and syncLog count */
type UserWithOrder = User & {
  repoOrder: RepoOrder | null
  _count: { syncLogs: number }
}

/** SyncLog with username for display */
type LogWithUser = SyncLog & {
  user: { username: string }
}

/**
 * Admin page component.
 * Displays application statistics and recent activity.
 */
export default async function AdminPage() {
  const session = await getSession()

  if (!session || !session.isAdmin) {
    redirect('/')
  }

  // Obtener estadísticas
  const totalUsers = await prisma.user.count()
  const totalRepoOrders = await prisma.repoOrder.count()
  const recentLogs: LogWithUser[] = await prisma.syncLog.findMany({
    take: 20,
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { username: true } } },
  })
  const users: UserWithOrder[] = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      repoOrder: true,
      _count: { select: { syncLogs: true } },
    },
  })

  const activeUsers = await prisma.user.count({
    where: {
      repoOrder: { isNot: null },
    },
  })

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-background border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold">GitPins Admin</h1>
          </div>
          <a href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
            Volver al dashboard
          </a>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold">{totalUsers}</div>
              <div className="text-sm text-muted-foreground">Usuarios totales</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold">{activeUsers}</div>
              <div className="text-sm text-muted-foreground">Usuarios activos</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold">{totalRepoOrders}</div>
              <div className="text-sm text-muted-foreground">Configuraciones</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold">
                {users.filter((u: typeof users[0]) => u.repoOrder?.configRepoCreated).length}
              </div>
              <div className="text-sm text-muted-foreground">Repos config creados</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Users */}
          <Card>
            <CardHeader>
              <CardTitle>Usuarios recientes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      {user.avatarUrl && (
                        <img
                          src={user.avatarUrl}
                          alt={user.username}
                          className="w-8 h-8 rounded-full"
                        />
                      )}
                      <div>
                        <div className="font-medium text-sm">{user.username}</div>
                        <div className="text-xs text-muted-foreground">
                          {user.repoOrder
                            ? `${JSON.parse(user.repoOrder.reposOrder).length} repos configurados`
                            : 'Sin configurar'}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent logs */}
          <Card>
            <CardHeader>
              <CardTitle>Logs recientes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recentLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            log.status === 'success'
                              ? 'bg-success'
                              : log.status === 'error'
                              ? 'bg-error'
                              : 'bg-warning'
                          }`}
                        />
                        <span className="text-sm font-medium">{log.action}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        @{log.user.username}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
