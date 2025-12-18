/**
 * GitPins - Control the order of your GitHub repositories
 * @author 686f6c61
 * @repository https://github.com/686f6c61/gitpins
 * @created 2024
 * @license MIT
 *
 * Order History Component
 * Displays the history of repository order changes and allows restoring previous orders.
 */

'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui'
import { HistoryIcon, RefreshIcon, LoaderIcon, ChevronDownIcon, ChevronUpIcon } from '@/components/icons'
import { useTranslation } from '@/i18n'

interface HistoryEntry {
  id: string
  repos: string[]
  topN: number
  changeType: string
  createdAt: string
}

interface OrderHistoryProps {
  onRestore?: (repos: string[], topN: number) => void
}

function formatTimeAgo(dateString: string, t: (key: string, params?: Record<string, any>) => string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return t('syncLogs.justNow')
  if (diffMins < 60) return t('syncLogs.minutesAgo', { count: diffMins })
  if (diffHours < 24) return t('syncLogs.hoursAgo', { count: diffHours })
  return t('syncLogs.daysAgo', { count: diffDays })
}

function getChangeTypeLabel(changeType: string, t: (key: string) => string): string {
  switch (changeType) {
    case 'manual':
      return t('orderHistory.manual')
    case 'auto':
      return t('orderHistory.auto')
    case 'restore':
      return t('orderHistory.restoreAction')
    default:
      return changeType
  }
}

export function OrderHistory({ onRestore }: OrderHistoryProps) {
  const { t } = useTranslation()
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [restoring, setRestoring] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetchHistory()
  }, [])

  async function fetchHistory() {
    setLoading(true)
    try {
      const response = await fetch('/api/repos/history')
      const data = await response.json()
      if (response.ok && data.history) {
        setHistory(data.history)
      }
    } catch (error) {
      console.error('Error fetching history:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleRestore(entry: HistoryEntry) {
    setRestoring(entry.id)
    setMessage(null)
    try {
      const response = await fetch('/api/repos/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshotId: entry.id }),
      })

      if (response.ok) {
        setMessage({ type: 'success', text: t('orderHistory.restored') })
        if (onRestore) {
          onRestore(entry.repos, entry.topN)
        }
        // Refresh history
        await fetchHistory()
      } else {
        setMessage({ type: 'error', text: 'Error restoring order' })
      }
    } catch (error) {
      console.error('Error restoring:', error)
      setMessage({ type: 'error', text: 'Error restoring order' })
    } finally {
      setRestoring(null)
      setTimeout(() => setMessage(null), 3000)
    }
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
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <HistoryIcon className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium text-sm">{t('orderHistory.title')}</span>
          <span className="text-xs text-muted-foreground">({history.length})</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              fetchHistory()
            }}
            className="p-1 hover:bg-muted rounded"
          >
            <RefreshIcon className="w-4 h-4 text-muted-foreground" />
          </button>
          {expanded ? (
            <ChevronUpIcon className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDownIcon className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Content */}
      {expanded && (
        <div className="border-t border-border">
          {message && (
            <div className={`px-4 py-2 text-sm ${
              message.type === 'success' ? 'bg-muted/50 text-foreground' : 'bg-muted/50 text-foreground'
            }`}>
              {message.text}
            </div>
          )}

          {history.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              {t('orderHistory.empty')}
            </div>
          ) : (
            <div className="divide-y divide-border max-h-80 overflow-y-auto">
              {history.map((entry, index) => (
                <div key={entry.id} className="px-4 py-3 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {t('orderHistory.repos', { count: entry.repos.length })}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground">
                        {getChangeTypeLabel(entry.changeType, t)}
                      </span>
                      {index === 0 && (
                        <span className="text-xs px-2 py-0.5 bg-foreground text-background rounded-full">
                          {t('orderHistory.current')}
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
                  {index !== 0 && (
                    <button
                      onClick={() => handleRestore(entry)}
                      disabled={restoring !== null}
                      className="text-xs px-3 py-1.5 border border-border rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {restoring === entry.id ? (
                        <LoaderIcon className="w-3 h-3" />
                      ) : (
                        t('orderHistory.restore')
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
