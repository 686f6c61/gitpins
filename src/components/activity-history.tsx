/**
 * GitPins - Control the order of your GitHub repositories
 * @author 686f6c61
 * @repository https://github.com/686f6c61/gitpins
 * @created 2025
 * @license MIT
 *
 * Activity History Component
 * Unified component that combines order history and sync activity logs.
 * Features: pagination, CSV/JSON export, restore functionality.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui'
import {
  HistoryIcon,
  RefreshIcon,
  LoaderIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  DownloadIcon,
  CheckIcon,
  XIcon,
} from '@/components/icons'
import { useTranslation } from '@/i18n'

/** Unified activity entry from API */
interface ActivityEntry {
  id: string
  type: 'snapshot' | 'sync'
  action: string
  status: string
  repos: string[]
  topN?: number
  details?: {
    results?: Array<{ repo: string; status: string; error?: string }>
    logs?: string[]
    summary?: { total: number; successful: number; failed: number; cleaned: number }
    reason?: string
  }
  createdAt: string
  canRestore: boolean
}

interface ActivityHistoryProps {
  onRestore?: (repos: string[], topN: number) => void
}

/** Format relative time */
function formatTimeAgo(
  dateString: string,
  t: (key: string, params?: Record<string, string | number>) => string
): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return t('activity.justNow')
  if (diffMins < 60) return t('activity.minutesAgo', { count: diffMins })
  if (diffHours < 24) return t('activity.hoursAgo', { count: diffHours })
  return t('activity.daysAgo', { count: diffDays })
}

/** Get action label */
function getActionLabel(action: string, t: (key: string) => string): string {
  const labels: Record<string, string> = {
    manual: t('activity.actions.manual'),
    auto: t('activity.actions.auto'),
    restore: t('activity.actions.restore'),
    auto_sync: t('activity.actions.autoSync'),
    auto_sync_skipped: t('activity.actions.autoSyncSkipped'),
    manual_sync: t('activity.actions.manualSync'),
    manual_order: t('activity.actions.manualOrder'),
    restore_order: t('activity.actions.restoreOrder'),
  }
  return labels[action] || action
}

/** Get status color class */
function getStatusColor(status: string): string {
  switch (status) {
    case 'success':
      return 'text-green-600'
    case 'partial':
      return 'text-yellow-600'
    case 'error':
      return 'text-red-600'
    default:
      return 'text-muted-foreground'
  }
}

/** Status icon component */
function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'success':
      return <CheckIcon className="w-3 h-3 text-green-600" />
    case 'error':
      return <XIcon className="w-3 h-3 text-red-600" />
    default:
      return null
  }
}

export function ActivityHistory({ onRestore }: ActivityHistoryProps) {
  const { t } = useTranslation()
  const [entries, setEntries] = useState<ActivityEntry[]>([])
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [restoring, setRestoring] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const fetchActivity = useCallback(async (offset = 0, append = false) => {
    if (offset === 0) setLoading(true)
    else setLoadingMore(true)

    try {
      const response = await fetch(`/api/activity?limit=30&offset=${offset}`)
      const data = await response.json()

      if (response.ok) {
        if (append) {
          setEntries((prev) => [...prev, ...data.entries])
        } else {
          setEntries(data.entries)
        }
        setTotal(data.total)
        setHasMore(data.hasMore)
      }
    } catch (error) {
      console.error('Error fetching activity:', error)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  useEffect(() => {
    fetchActivity()
  }, [fetchActivity])

  async function handleRestore(entry: ActivityEntry) {
    if (!entry.canRestore) return

    setRestoring(entry.id)
    setMessage(null)

    try {
      const response = await fetch('/api/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshotId: entry.id }),
      })

      if (response.ok) {
        const data = await response.json()
        setMessage({ type: 'success', text: t('activity.restored') })
        if (onRestore && data.restoredOrder) {
          onRestore(data.restoredOrder, data.topN)
        }
        await fetchActivity()
      } else {
        setMessage({ type: 'error', text: t('activity.restoreError') })
      }
    } catch (error) {
      console.error('Error restoring:', error)
      setMessage({ type: 'error', text: t('activity.restoreError') })
    } finally {
      setRestoring(null)
      setTimeout(() => setMessage(null), 3000)
    }
  }

  function handleLoadMore() {
    fetchActivity(entries.length, true)
  }

  function exportToJSON() {
    const data = {
      exportDate: new Date().toISOString(),
      totalEntries: entries.length,
      entries: entries.map((e) => ({
        date: e.createdAt,
        type: e.type,
        action: e.action,
        status: e.status,
        reposCount: e.repos.length,
        repos: e.repos,
        topN: e.topN,
        details: e.details,
      })),
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gitpins-activity-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function exportToCSV() {
    const headers = ['Date', 'Type', 'Action', 'Status', 'Repos Count', 'Top Repos']
    const rows = entries.map((e) => [
      e.createdAt,
      e.type,
      e.action,
      e.status,
      e.repos.length.toString(),
      e.repos.slice(0, 5).join('; '),
    ])

    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gitpins-activity-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-center py-4">
          <LoaderIcon className="w-5 h-5 text-muted-foreground" />
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 hover:opacity-80"
        >
          <HistoryIcon className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium text-sm">{t('activity.title')}</span>
          <span className="text-xs text-muted-foreground">({total})</span>
          {expanded ? (
            <ChevronUpIcon className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDownIcon className="w-4 h-4 text-muted-foreground" />
          )}
        </button>

        <div className="flex items-center gap-1">
          <button
            onClick={exportToCSV}
            className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
            title={t('activity.exportCSV')}
          >
            <DownloadIcon className="w-4 h-4" />
            <span className="sr-only">CSV</span>
          </button>
          <button
            onClick={exportToJSON}
            className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground text-xs font-mono"
            title={t('activity.exportJSON')}
          >
            { }
          </button>
          <button
            onClick={() => fetchActivity()}
            className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
            title={t('activity.refresh')}
          >
            <RefreshIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {expanded && (
        <div>
          {message && (
            <div
              className={`px-4 py-2 text-sm ${
                message.type === 'success'
                  ? 'bg-green-500/10 text-green-700'
                  : 'bg-red-500/10 text-red-700'
              }`}
            >
              {message.text}
            </div>
          )}

          {entries.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              {t('activity.empty')}
            </div>
          ) : (
            <>
              <div className="divide-y divide-border max-h-96 overflow-y-auto">
                {entries.map((entry, index) => (
                  <div key={entry.id} className="px-4 py-3">
                    {/* Entry header */}
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">
                            {entry.repos.length} repo(s)
                          </span>
                          <span className="text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground">
                            {getActionLabel(entry.action, t)}
                          </span>
                          <span className={`text-xs flex items-center gap-1 ${getStatusColor(entry.status)}`}>
                            <StatusIcon status={entry.status} />
                            {entry.status}
                          </span>
                          {index === 0 && entry.type === 'snapshot' && (
                            <span className="text-xs px-2 py-0.5 bg-foreground text-background rounded-full">
                              {t('activity.current')}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 truncate">
                          {entry.repos.slice(0, 3).join(', ')}
                          {entry.repos.length > 3 && ` +${entry.repos.length - 3}`}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {formatTimeAgo(entry.createdAt, t)}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Details toggle */}
                        {entry.details && (
                          <button
                            onClick={() =>
                              setExpandedEntry(expandedEntry === entry.id ? null : entry.id)
                            }
                            className="text-xs px-2 py-1 text-muted-foreground hover:text-foreground"
                          >
                            {expandedEntry === entry.id ? t('activity.hideDetails') : t('activity.showDetails')}
                          </button>
                        )}

                        {/* Restore button */}
                        {entry.canRestore && index !== 0 && (
                          <button
                            onClick={() => handleRestore(entry)}
                            disabled={restoring !== null}
                            className="text-xs px-3 py-1.5 border border-border rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {restoring === entry.id ? (
                              <LoaderIcon className="w-3 h-3" />
                            ) : (
                              t('activity.restore')
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expanded details */}
                    {expandedEntry === entry.id && entry.details && (
                      <div className="mt-3 p-3 bg-muted/30 rounded-lg text-xs font-mono overflow-x-auto">
                        {entry.details.summary && (
                          <div className="mb-2 text-muted-foreground">
                            Total: {entry.details.summary.total} |
                            Success: {entry.details.summary.successful} |
                            Failed: {entry.details.summary.failed} |
                            Cleaned: {entry.details.summary.cleaned}
                          </div>
                        )}
                        {entry.details.reason && (
                          <div className="text-yellow-600 mb-2">
                            Reason: {entry.details.reason}
                          </div>
                        )}
                        {entry.details.logs && (
                          <div className="space-y-0.5 max-h-48 overflow-y-auto">
                            {entry.details.logs.slice(0, 50).map((log, i) => (
                              <div
                                key={i}
                                className={
                                  log.includes('SUCCESS')
                                    ? 'text-green-600'
                                    : log.includes('FAILED')
                                    ? 'text-red-600'
                                    : 'text-muted-foreground'
                                }
                              >
                                {log}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Load more */}
              {hasMore && (
                <div className="p-4 border-t border-border text-center">
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
                  >
                    {loadingMore ? (
                      <LoaderIcon className="w-4 h-4 inline mr-2" />
                    ) : null}
                    {t('activity.loadMore', { remaining: total - entries.length })}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </Card>
  )
}
