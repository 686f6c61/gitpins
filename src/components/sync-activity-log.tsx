/**
 * GitPins - Control the order of your GitHub repositories
 * @author 686f6c61
 * @repository https://github.com/686f6c61/gitpins
 * @created 2025
 * @license MIT
 *
 * Sync Activity Log Component
 * Displays recent sync activity with detailed logs
 */

'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from '@/i18n'
import { ChevronIcon } from './icons'

interface SyncLog {
  id: string
  action: string
  status: string
  details: string
  reposAffected: string
  createdAt: string
}

interface SyncLogDetails {
  results?: Array<{ repo: string; status: string; error?: string; cleaned?: boolean }>
  logs?: string[]
  summary?: {
    total: number
    successful: number
    failed: number
    cleaned: number
  }
  reason?: string
  currentOrder?: string[]
  desiredOrder?: string[]
}

export function SyncActivityLog() {
  const { t } = useTranslation()
  const [logs, setLogs] = useState<SyncLog[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedLog, setExpandedLog] = useState<string | null>(null)

  useEffect(() => {
    fetchLogs()
  }, [])

  async function fetchLogs() {
    try {
      const response = await fetch('/api/sync-logs?limit=10')
      if (response.ok) {
        const data = await response.json()
        setLogs(data.logs || [])
      }
    } catch (error) {
      console.error('Error fetching sync logs:', error)
    } finally {
      setLoading(false)
    }
  }

  function parseDetails(details: string): SyncLogDetails | null {
    try {
      return JSON.parse(details)
    } catch {
      return null
    }
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return t('syncLogs.justNow')
    if (diffMins < 60) return t('syncLogs.minutesAgo', { count: diffMins })
    if (diffHours < 24) return t('syncLogs.hoursAgo', { count: diffHours })
    if (diffDays < 7) return t('syncLogs.daysAgo', { count: diffDays })

    return date.toLocaleDateString()
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'success':
        return 'text-green-600 dark:text-green-400'
      case 'partial':
        return 'text-yellow-600 dark:text-yellow-400'
      case 'error':
        return 'text-red-600 dark:text-red-400'
      default:
        return 'text-muted-foreground'
    }
  }

  function getActionLabel(action: string): string {
    switch (action) {
      case 'auto_sync':
        return t('syncLogs.actions.autoSync')
      case 'auto_sync_skipped':
        return t('syncLogs.actions.autoSyncSkipped')
      case 'manual_sync':
        return t('syncLogs.actions.manualSync')
      default:
        return action
    }
  }

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">{t('syncLogs.title')}</h2>
        <div className="text-sm text-muted-foreground">{t('syncLogs.loading')}</div>
      </div>
    )
  }

  if (logs.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">{t('syncLogs.title')}</h2>
        <div className="text-sm text-muted-foreground">{t('syncLogs.noLogs')}</div>
      </div>
    )
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">{t('syncLogs.title')}</h2>
        <button
          onClick={fetchLogs}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {t('syncLogs.refresh')}
        </button>
      </div>

      <div className="space-y-3">
        {logs.map((log) => {
          const details = parseDetails(log.details || '{}')
          const isExpanded = expandedLog === log.id

          return (
            <div
              key={log.id}
              className="border border-border rounded-lg overflow-hidden"
            >
              <button
                onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                className="w-full p-4 text-left hover:bg-muted/50 transition-colors flex items-center justify-between gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">{getActionLabel(log.action)}</span>
                    <span className={`text-xs font-semibold uppercase ${getStatusColor(log.status)}`}>
                      {log.status}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(log.createdAt)}
                    {details?.summary && (
                      <span className="ml-2">
                        {t('syncLogs.summary', {
                          total: details.summary.total,
                          successful: details.summary.successful,
                          failed: details.summary.failed,
                        })}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronIcon
                  className={`w-5 h-5 text-muted-foreground transition-transform ${
                    isExpanded ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isExpanded && details?.logs && details.logs.length > 0 && (
                <div className="border-t border-border bg-muted/30 p-4">
                  <div className="font-mono text-xs space-y-1">
                    {details.logs.map((logLine, idx) => (
                      <div
                        key={idx}
                        className={`${
                          logLine.includes('FAILED') || logLine.includes('failed')
                            ? 'text-red-600 dark:text-red-400'
                            : logLine.includes('SUCCESS')
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-foreground/80'
                        }`}
                      >
                        {logLine}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
