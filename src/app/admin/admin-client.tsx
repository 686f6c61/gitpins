/**
 * GitPins - Admin Dashboard Client Component
 * @author 686f6c61
 * @repository https://github.com/686f6c61/gitpins
 * @license MIT
 *
 * Interactive admin dashboard with user management and statistics.
 */

'use client'

import { useState, useEffect } from 'react'
import { Button, Card, CardHeader, CardTitle, CardContent } from '@/components/ui'
import { RefreshIcon, XIcon, CheckIcon, AlertTriangleIcon, GitHubIcon } from '@/components/icons'

interface User {
  id: string
  githubId: number
  username: string
  email: string | null
  avatarUrl: string | null
  isBanned: boolean
  bannedAt: string | null
  bannedReason: string | null
  createdAt: string
  lastLoginAt: string
  configRepoUrl: string | null
  reposConfigured: number
  syncCount: number
  hasConfig: boolean
  syncFrequency: number | null
  autoEnabled: boolean
}

interface Stats {
  totals: {
    users: number
    activeUsers: number
    bannedUsers: number
    syncs: number
    configRepos: number
    syncsToday: number
    syncsThisWeek: number
  }
  charts: {
    usersPerDay: { date: string; count: number }[]
    syncsPerDay: { date: string; count: number }[]
  }
}

interface AdminClientProps {
  csrfToken: string
}

export function AdminClient({ csrfToken }: AdminClientProps) {
  const [users, setUsers] = useState<User[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [banModal, setBanModal] = useState<{ userId: string; username: string } | null>(null)
  const [banReason, setBanReason] = useState('')

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [usersRes, statsRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/stats')
      ])

      if (!usersRes.ok || !statsRes.ok) {
        throw new Error('Failed to fetch data')
      }

      const usersData = await usersRes.json()
      const statsData = await statsRes.json()

      setUsers(usersData.users)
      setStats(statsData)
    } catch (err) {
      setError('Error loading data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleBan = async (userId: string, reason: string) => {
    try {
      setActionLoading(userId)
      const res = await fetch(`/api/admin/users/${userId}/ban`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({ reason })
      })

      if (!res.ok) throw new Error('Failed to ban user')

      await fetchData()
      setBanModal(null)
      setBanReason('')
    } catch (err) {
      console.error(err)
      setError('Error banning user')
    } finally {
      setActionLoading(null)
    }
  }

  const handleUnban = async (userId: string) => {
    try {
      setActionLoading(userId)
      const res = await fetch(`/api/admin/users/${userId}/unban`, {
        method: 'POST',
        headers: {
          'X-CSRF-Token': csrfToken,
        },
      })

      if (!res.ok) throw new Error('Failed to unban user')

      await fetchData()
    } catch (err) {
      console.error(err)
      setError('Error unbanning user')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (userId: string, username: string) => {
    if (!confirm(`Are you sure you want to delete user @${username}? This action cannot be undone.`)) {
      return
    }

    try {
      setActionLoading(userId)
      const res = await fetch(`/api/admin/users/${userId}/delete`, {
        method: 'DELETE',
        headers: {
          'X-CSRF-Token': csrfToken,
        },
      })

      if (!res.ok) throw new Error('Failed to delete user')

      await fetchData()
    } catch (err) {
      console.error(err)
      setError('Error deleting user')
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshIcon className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div>
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6 flex items-center gap-2">
          <AlertTriangleIcon className="w-5 h-5 text-destructive" />
          <span className="text-sm">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto">
            <XIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.totals.users}</div>
              <div className="text-xs text-muted-foreground">Total Users</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-success">{stats.totals.activeUsers}</div>
              <div className="text-xs text-muted-foreground">Active Users</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-destructive">{stats.totals.bannedUsers}</div>
              <div className="text-xs text-muted-foreground">Banned</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.totals.configRepos}</div>
              <div className="text-xs text-muted-foreground">Config Repos</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.totals.syncs}</div>
              <div className="text-xs text-muted-foreground">Total Syncs</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.totals.syncsToday}</div>
              <div className="text-xs text-muted-foreground">Syncs Today</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.totals.syncsThisWeek}</div>
              <div className="text-xs text-muted-foreground">This Week</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts */}
      {stats && (
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">User Registrations (30 days)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-32 flex items-end gap-1">
                {stats.charts.usersPerDay.map((day, i) => {
                  const maxCount = Math.max(...stats.charts.usersPerDay.map(d => d.count), 1)
                  const height = (day.count / maxCount) * 100
                  return (
                    <div
                      key={i}
                      className="flex-1 bg-foreground/20 hover:bg-foreground/40 rounded-t transition-colors"
                      style={{ height: `${Math.max(height, 2)}%` }}
                      title={`${day.date}: ${day.count} users`}
                    />
                  )
                })}
              </div>
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <span>30 days ago</span>
                <span>Today</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sync Activity (30 days)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-32 flex items-end gap-1">
                {stats.charts.syncsPerDay.map((day, i) => {
                  const maxCount = Math.max(...stats.charts.syncsPerDay.map(d => d.count), 1)
                  const height = (day.count / maxCount) * 100
                  return (
                    <div
                      key={i}
                      className="flex-1 bg-success/40 hover:bg-success/60 rounded-t transition-colors"
                      style={{ height: `${Math.max(height, 2)}%` }}
                      title={`${day.date}: ${day.count} syncs`}
                    />
                  )
                })}
              </div>
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <span>30 days ago</span>
                <span>Today</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Users Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Users ({users.length})</CardTitle>
          <Button variant="ghost" size="sm" onClick={fetchData}>
            <RefreshIcon className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2">User</th>
                  <th className="text-left py-3 px-2">Config Repo</th>
                  <th className="text-center py-3 px-2">Repos</th>
                  <th className="text-center py-3 px-2">Syncs</th>
                  <th className="text-left py-3 px-2">Last Login</th>
                  <th className="text-center py-3 px-2">Status</th>
                  <th className="text-right py-3 px-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-3">
                        {user.avatarUrl && (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={user.avatarUrl}
                            alt={user.username}
                            className="w-8 h-8 rounded-full"
                          />
                        )}
                        <div>
                          <a
                            href={`https://github.com/${user.username}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium hover:underline flex items-center gap-1"
                          >
                            {user.username}
                            <GitHubIcon className="w-3 h-3 opacity-50" />
                          </a>
                          <div className="text-xs text-muted-foreground">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      {user.configRepoUrl ? (
                        <a
                          href={user.configRepoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs hover:underline text-muted-foreground"
                        >
                          gitpins-config
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className="text-muted-foreground">{user.reposConfigured}</span>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className="text-muted-foreground">{user.syncCount}</span>
                    </td>
                    <td className="py-3 px-2">
                      <span className="text-xs text-muted-foreground">
                        {new Date(user.lastLoginAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-center">
                      {user.isBanned ? (
                        <span className="inline-flex items-center gap-1 text-xs bg-destructive/10 text-destructive px-2 py-1 rounded">
                          <XIcon className="w-3 h-3" />
                          Banned
                        </span>
                      ) : user.hasConfig ? (
                        <span className="inline-flex items-center gap-1 text-xs bg-success/10 text-success px-2 py-1 rounded">
                          <CheckIcon className="w-3 h-3" />
                          Active
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Inactive</span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {user.isBanned ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUnban(user.id)}
                            disabled={actionLoading === user.id}
                          >
                            Unban
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setBanModal({ userId: user.id, username: user.username })}
                            disabled={actionLoading === user.id}
                          >
                            Ban
                          </Button>
                        )}
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDelete(user.id, user.username)}
                          disabled={actionLoading === user.id}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Ban Modal */}
      {banModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background border border-border rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">
              Ban @{banModal.username}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              This user will not be able to log in or use GitPins until unbanned.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Reason (optional)
              </label>
              <input
                type="text"
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Violation of terms of service"
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
              />
            </div>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setBanModal(null)
                  setBanReason('')
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => handleBan(banModal.userId, banReason || 'Violation of terms of service')}
                disabled={actionLoading === banModal.userId}
                className="flex-1"
              >
                Ban User
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
