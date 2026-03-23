/**
 * GitPins - Admin Dashboard Client Component
 * @author 686f6c61
 * @repository https://github.com/686f6c61/gitpins
 * @license MIT
 *
 * Interactive admin dashboard with user management and statistics.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button, Card, CardHeader, CardTitle, CardContent } from '@/components/ui'
import { RefreshIcon, XIcon, CheckIcon, AlertTriangleIcon, GitHubIcon } from '@/components/icons'
import { useTranslation } from '@/i18n'

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

export function AdminClient() {
  const { t, locale } = useTranslation()
  const [users, setUsers] = useState<User[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [banModal, setBanModal] = useState<{ userId: string; username: string } | null>(null)
  const [banReason, setBanReason] = useState('')
  const [csrfToken, setCsrfToken] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
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
      setError(t('admin.errors.loadingData'))
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void fetchData()
    void (async () => {
      try {
        const response = await fetch('/api/auth/csrf', {
          method: 'GET',
          cache: 'no-store',
        })
        if (!response.ok) return
        const data = await response.json()
        if (typeof data.csrfToken === 'string' && data.csrfToken) {
          setCsrfToken(data.csrfToken)
        }
      } catch {
        // No-op: token can be requested again before sensitive actions.
      }
    })()
  }, [fetchData])

  const ensureCsrfToken = async (): Promise<string | null> => {
    if (csrfToken) return csrfToken

    try {
      const response = await fetch('/api/auth/csrf', {
        method: 'GET',
        cache: 'no-store',
      })

      if (!response.ok) {
        return null
      }

      const data = await response.json()
      if (typeof data.csrfToken !== 'string' || !data.csrfToken) {
        return null
      }

      setCsrfToken(data.csrfToken)
      return data.csrfToken
    } catch {
      return null
    }
  }

  const redirectToAdminSudoLogin = () => {
    globalThis.location.href = `/api/auth/login?sudo=1&returnTo=${encodeURIComponent('/admin')}`
  }

  const ensureAdminActionSucceeded = async (response: Response, fallbackMessage: string) => {
    if (response.ok) {
      return
    }

    const data = await response.json().catch(() => null) as { error?: string; reason?: string } | null
    if (response.status === 403 && data?.reason === 'reauth_required') {
      setError(t('admin.errors.reauthRequired'))
      redirectToAdminSudoLogin()
      throw new Error('__handled__')
    }

    throw new Error(data?.error || fallbackMessage)
  }

  const handleBan = async (userId: string, reason: string) => {
    try {
      setActionLoading(userId)
      const token = await ensureCsrfToken()
        if (!token) {
        setError(t('admin.errors.securityToken'))
        return
      }

      const res = await fetch(`/api/admin/users/${userId}/ban`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': token,
        },
        body: JSON.stringify({ reason })
      })

      await ensureAdminActionSucceeded(res, 'Failed to ban user')

      await fetchData()
      setBanModal(null)
      setBanReason('')
    } catch (err) {
      if (err instanceof Error && err.message === '__handled__') {
        return
      }
      console.error(err)
      setError(err instanceof Error ? err.message : t('admin.errors.banningUser'))
    } finally {
      setActionLoading(null)
    }
  }

  const handleUnban = async (userId: string) => {
    try {
      setActionLoading(userId)
      const token = await ensureCsrfToken()
      if (!token) {
        setError(t('admin.errors.securityToken'))
        return
      }

      const res = await fetch(`/api/admin/users/${userId}/unban`, {
        method: 'POST',
        headers: {
          'X-CSRF-Token': token,
        },
      })

      await ensureAdminActionSucceeded(res, 'Failed to unban user')

      await fetchData()
    } catch (err) {
      if (err instanceof Error && err.message === '__handled__') {
        return
      }
      console.error(err)
      setError(err instanceof Error ? err.message : t('admin.errors.unbanningUser'))
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (userId: string, username: string) => {
    if (!confirm(t('admin.deleteConfirm', { username }))) {
      return
    }

    try {
      setActionLoading(userId)
      const token = await ensureCsrfToken()
      if (!token) {
        setError(t('admin.errors.securityToken'))
        return
      }

      const res = await fetch(`/api/admin/users/${userId}/delete`, {
        method: 'DELETE',
        headers: {
          'X-CSRF-Token': token,
        },
      })

      await ensureAdminActionSucceeded(res, 'Failed to delete user')

      await fetchData()
    } catch (err) {
      if (err instanceof Error && err.message === '__handled__') {
        return
      }
      console.error(err)
      setError(err instanceof Error ? err.message : t('admin.errors.deletingUser'))
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
              <div className="text-xs text-muted-foreground">{t('admin.stats.totalUsers')}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-success">{stats.totals.activeUsers}</div>
              <div className="text-xs text-muted-foreground">{t('admin.stats.activeUsers')}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-destructive">{stats.totals.bannedUsers}</div>
              <div className="text-xs text-muted-foreground">{t('admin.stats.bannedUsers')}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.totals.configRepos}</div>
              <div className="text-xs text-muted-foreground">{t('admin.stats.configRepos')}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.totals.syncs}</div>
              <div className="text-xs text-muted-foreground">{t('admin.stats.totalSyncs')}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.totals.syncsToday}</div>
              <div className="text-xs text-muted-foreground">{t('admin.stats.syncsToday')}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.totals.syncsThisWeek}</div>
              <div className="text-xs text-muted-foreground">{t('admin.stats.syncsThisWeek')}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts */}
      {stats && (
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('admin.charts.registrations')}</CardTitle>
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
                      title={`${day.date}: ${day.count} ${t('admin.users.title').toLowerCase()}`}
                    />
                  )
                })}
              </div>
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <span>{t('admin.charts.daysAgo')}</span>
                <span>{t('admin.charts.today')}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('admin.charts.syncActivity')}</CardTitle>
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
                      title={`${day.date}: ${day.count} ${t('admin.users.syncs').toLowerCase()}`}
                    />
                  )
                })}
              </div>
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <span>{t('admin.charts.daysAgo')}</span>
                <span>{t('admin.charts.today')}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Users Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('admin.users.title')} ({users.length})</CardTitle>
          <Button variant="ghost" size="sm" onClick={fetchData}>
            <RefreshIcon className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2">{t('admin.users.user')}</th>
                  <th className="text-left py-3 px-2">{t('admin.users.configRepo')}</th>
                  <th className="text-center py-3 px-2">{t('admin.users.repos')}</th>
                  <th className="text-center py-3 px-2">{t('admin.users.syncs')}</th>
                  <th className="text-left py-3 px-2">{t('admin.users.lastLogin')}</th>
                  <th className="text-center py-3 px-2">{t('admin.users.status')}</th>
                  <th className="text-right py-3 px-2">{t('admin.users.actions')}</th>
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
                            {new Date(user.createdAt).toLocaleDateString(locale === 'en' ? 'en-US' : 'es-ES')}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      {user.hasConfig ? (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 rounded-full bg-foreground/5 px-2 py-1 text-xs font-medium text-foreground/80">
                            {user.autoEnabled
                              ? t('admin.users.syncSetupAuto')
                              : t('admin.users.syncSetupManual')}
                          </span>
                          {user.autoEnabled && user.syncFrequency ? (
                            <div className="text-xs text-muted-foreground">
                              {t('admin.users.syncSetupEveryHours', { hours: user.syncFrequency })}
                            </div>
                          ) : (
                            <div className="text-xs text-muted-foreground">
                              {t('admin.users.syncSetupSavedOrder')}
                            </div>
                          )}
                        </div>
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
                        {new Date(user.lastLoginAt).toLocaleDateString(locale === 'en' ? 'en-US' : 'es-ES')}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-center">
                      {user.isBanned ? (
                        <span className="inline-flex items-center gap-1 text-xs bg-destructive/10 text-destructive px-2 py-1 rounded">
                          <XIcon className="w-3 h-3" />
                          {t('admin.users.banned')}
                        </span>
                      ) : user.hasConfig ? (
                        <span className="inline-flex items-center gap-1 text-xs bg-success/10 text-success px-2 py-1 rounded">
                          <CheckIcon className="w-3 h-3" />
                          {t('admin.users.active')}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">{t('admin.users.inactive')}</span>
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
                            {t('admin.users.unban')}
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setBanModal({ userId: user.id, username: user.username })}
                            disabled={actionLoading === user.id}
                          >
                            {t('admin.users.ban')}
                          </Button>
                        )}
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDelete(user.id, user.username)}
                          disabled={actionLoading === user.id}
                        >
                          {t('admin.users.delete')}
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
              {t('admin.banModal.title', { username: banModal.username })}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t('admin.banModal.message')}
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                {t('admin.banModal.reasonLabel')}
              </label>
              <input
                type="text"
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder={t('admin.banModal.reasonPlaceholder')}
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
                {t('admin.banModal.cancel')}
              </Button>
              <Button
                variant="danger"
                onClick={() => handleBan(banModal.userId, banReason || t('admin.banModal.reasonPlaceholder'))}
                disabled={actionLoading === banModal.userId}
                className="flex-1"
              >
                {t('admin.banModal.confirm')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
