/**
 * GitPins - Control the order of your GitHub repositories
 * @author 686f6c61
 * @repository https://github.com/686f6c61/gitpins
 * @created 2025
 * @license MIT
 *
 * Settings Modal Component
 * Modal dialog for configuring repository ordering settings:
 * - Number of repos to pin (topN)
 * - Include/exclude private repos
 * - Sync frequency
 * - Fixed commit strategy (temporary ref touch)
 * - Auto-sync toggle
 * - Config repo visibility
 */

'use client'

import { useMemo, useState, useEffect } from 'react'
import { XIcon } from '@/components/icons'
import { Button } from '@/components/ui'
import { useTranslation } from '@/i18n'
import type { RepoOrderSettings } from '@/types'

/** Props for the SettingsModal component */
interface SettingsModalProps {
  username: string
  settings: RepoOrderSettings
  totalRepos: number
  onClose: () => void
  onChange: (settings: Partial<RepoOrderSettings>) => void
  onStartOnboarding: () => void
  autoOpenDelete?: boolean
}

function SettingsSection({
  title,
  description,
  children,
  tone = 'default',
}: {
  title: string
  description: string
  children: React.ReactNode
  tone?: 'default' | 'danger'
}) {
  const tones = tone === 'danger'
    ? 'border-destructive/20 bg-destructive/5'
    : 'border-border bg-muted/20'

  return (
    <section className={`rounded-xl border p-4 ${tones}`}>
      <div className="mb-4">
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </section>
  )
}

/**
 * Settings modal component.
 * Provides a full settings interface for customizing sync behavior.
 */
export function SettingsModal({
  username,
  settings,
  totalRepos,
  onClose,
  onChange,
  onStartOnboarding,
  autoOpenDelete = false,
}: SettingsModalProps) {
  const { t } = useTranslation()
  const [showStrategyInfo, setShowStrategyInfo] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [privacyMessage, setPrivacyMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)
  const [csrfToken, setCsrfToken] = useState<string | null>(null)
  const [sudoState, setSudoState] = useState<{ sudo: boolean; untilMs: number | null } | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(() => autoOpenDelete)
  const [deleteUsernameConfirm, setDeleteUsernameConfirm] = useState('')
  const [deletePhraseConfirm, setDeletePhraseConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)

  const deleteReturnTo = useMemo(() => '/dashboard?openSettings=1&openDelete=1', [])

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch('/api/privacy/sudo', {
          method: 'GET',
          cache: 'no-store',
        })
        if (!response.ok) return
        const data = await response.json()
        const untilMs = typeof data.untilMs === 'number' ? data.untilMs : null
        setSudoState({ sudo: !!data.sudo, untilMs })
      } catch {
        // non-fatal
      }
    })()
  }, [])

  async function ensureCsrfToken(): Promise<string | null> {
    if (csrfToken) return csrfToken

    try {
      const response = await fetch('/api/auth/csrf', {
        method: 'GET',
        cache: 'no-store',
      })

      if (!response.ok) return null
      const data = await response.json()
      if (typeof data.csrfToken !== 'string' || !data.csrfToken) return null

      setCsrfToken(data.csrfToken)
      return data.csrfToken
    } catch {
      return null
    }
  }

  function usernameMatches(): boolean {
    const trimmed = deleteUsernameConfirm.trim()
    const normalized = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed
    return normalized.toLowerCase() === username.toLowerCase()
  }

  function phraseMatches(): boolean {
    return deletePhraseConfirm.trim().toUpperCase() === 'DELETE MY ACCOUNT'
  }

  async function handleExport() {
    setPrivacyMessage(null)
    setExporting(true)
    try {
      const token = await ensureCsrfToken()
      if (!token) {
        setPrivacyMessage({ type: 'error', text: t('settings.privacy.errors.csrf') })
        return
      }

      const response = await fetch('/api/privacy/export', {
        method: 'POST',
        headers: {
          'X-CSRF-Token': token,
        },
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null) as { error?: string } | null
        setPrivacyMessage({ type: 'error', text: data?.error || t('settings.privacy.errors.exportFailed') })
        return
      }

      const data = await response.json().catch(() => null) as { jobId?: string; filename?: string } | null
      if (!data?.jobId) {
        setPrivacyMessage({ type: 'error', text: t('settings.privacy.errors.exportFailed') })
        return
      }

      const downloadResponse = await fetch(`/api/privacy/export/${encodeURIComponent(data.jobId)}/download`, {
        method: 'GET',
        cache: 'no-store',
      })

      if (!downloadResponse.ok) {
        const err = await downloadResponse.json().catch(() => null) as { error?: string } | null
        setPrivacyMessage({ type: 'error', text: err?.error || t('settings.privacy.errors.exportFailed') })
        return
      }

      const blob = await downloadResponse.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')

      const disposition = downloadResponse.headers.get('content-disposition') || ''
      const match = disposition.match(/filename=\"([^\"]+)\"/)
      const fallbackDate = new Date().toISOString().slice(0, 10)
      a.download = match?.[1] || data.filename || `gitpins-data-${username}-${fallbackDate}.json`
      a.href = url
      a.click()

      URL.revokeObjectURL(url)
      setPrivacyMessage({ type: 'success', text: t('settings.privacy.exportDone') })
    } catch (error) {
      console.error('Export error:', error)
      setPrivacyMessage({ type: 'error', text: t('settings.privacy.errors.exportFailed') })
    } finally {
      setExporting(false)
    }
  }

  async function refreshSudoState() {
    try {
      const response = await fetch('/api/privacy/sudo', {
        method: 'GET',
        cache: 'no-store',
      })
      if (!response.ok) return
      const data = await response.json()
      const untilMs = typeof data.untilMs === 'number' ? data.untilMs : null
      setSudoState({ sudo: !!data.sudo, untilMs })
    } catch {
      // non-fatal
    }
  }

  async function handleDeleteAccount() {
    setPrivacyMessage(null)
    setDeleting(true)
    try {
      const token = await ensureCsrfToken()
      if (!token) {
        setPrivacyMessage({ type: 'error', text: t('settings.privacy.errors.csrf') })
        return
      }

      const response = await fetch('/api/privacy/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': token,
        },
        body: JSON.stringify({
          usernameConfirm: deleteUsernameConfirm,
          phraseConfirm: deletePhraseConfirm,
        }),
      })

      const data = await response.json().catch(() => null) as { error?: string; reason?: string } | null

      if (!response.ok) {
        if (response.status === 403 && data?.reason === 'reauth_required') {
          await refreshSudoState()
          setPrivacyMessage({ type: 'error', text: t('settings.privacy.errors.reauth') })
          return
        }
        setPrivacyMessage({ type: 'error', text: data?.error || t('settings.privacy.errors.deleteFailed') })
        return
      }

      window.location.href = '/?deleted=1'
    } catch (error) {
      console.error('Delete error:', error)
      setPrivacyMessage({ type: 'error', text: t('settings.privacy.errors.deleteFailed') })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-2xl w-full max-w-md border border-border max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-background">
          <h2 className="text-lg font-semibold">{t('settings.title')}</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          <div className="rounded-xl border border-border bg-background p-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-muted/50 px-3 py-2">
                <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  {t('settings.summary.pinned')}
                </div>
                <div className="mt-1 text-sm font-semibold">{settings.topN}</div>
              </div>
              <div className="rounded-lg bg-muted/50 px-3 py-2">
                <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  {t('settings.summary.private')}
                </div>
                <div className="mt-1 text-sm font-semibold">
                  {settings.includePrivate ? t('settings.summary.on') : t('settings.summary.off')}
                </div>
              </div>
              <div className="rounded-lg bg-muted/50 px-3 py-2">
                <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  {t('settings.summary.autoSync')}
                </div>
                <div className="mt-1 text-sm font-semibold">
                  {settings.autoEnabled ? t('settings.summary.on') : t('settings.summary.off')}
                </div>
              </div>
            </div>
          </div>

          <SettingsSection
            title={t('settings.sections.ordering.title')}
            description={t('settings.sections.ordering.desc')}
          >
            <div data-onboarding="settings-topn">
              <label className="block text-sm font-medium mb-2">
                {t('settings.reposToKeep.label')}
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  max={totalRepos}
                  value={settings.topN || ''}
                  onChange={(e) => {
                    const val = parseInt(e.target.value)
                    if (!isNaN(val) && val >= 1 && val <= totalRepos) {
                      onChange({ topN: val })
                    } else if (e.target.value === '') {
                      onChange({ topN: 1 })
                    }
                  }}
                  placeholder="10"
                  className="w-24 h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-foreground text-center"
                />
                <span className="text-sm text-muted-foreground">
                  {t('settings.reposToKeep.of', { total: totalRepos })}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t('settings.reposToKeep.hint')}
              </p>
            </div>

            <div className="flex items-center justify-between" data-onboarding="settings-private">
              <div>
                <div className="font-medium text-sm">{t('settings.includePrivate.label')}</div>
                <div className="text-xs text-muted-foreground">
                  {t('settings.includePrivate.desc')}
                </div>
              </div>
              <button
                onClick={() => onChange({ includePrivate: !settings.includePrivate })}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.includePrivate ? 'bg-foreground' : 'bg-muted'
                }`}
                aria-label={t('settings.includePrivate.label')}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-background shadow transition-transform ${
                    settings.includePrivate ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            <div className="rounded-lg border border-border bg-background p-3">
              <div className="text-sm font-medium mb-1">{t('settings.onboarding.title')}</div>
              <p className="text-xs text-muted-foreground">
                {t('settings.onboarding.desc')}
              </p>
              <Button
                type="button"
                variant="secondary"
                className="mt-3 w-full"
                onClick={onStartOnboarding}
              >
                {t('settings.onboarding.start')}
              </Button>
            </div>
          </SettingsSection>

          <SettingsSection
            title={t('settings.sections.sync.title')}
            description={t('settings.sections.sync.desc')}
          >
            <div data-onboarding="settings-frequency">
              <label className="block text-sm font-medium mb-2">
                {t('settings.syncFrequency.label')}
              </label>
              <select
                value={settings.syncFrequency}
                onChange={(e) => onChange({ syncFrequency: parseInt(e.target.value) })}
                className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-foreground"
              >
                <option value={1}>{t('settings.syncFrequency.options.1')}</option>
                <option value={2}>{t('settings.syncFrequency.options.2')}</option>
                <option value={4}>{t('settings.syncFrequency.options.4')}</option>
                <option value={6}>{t('settings.syncFrequency.options.6')}</option>
                <option value={8}>{t('settings.syncFrequency.options.8')}</option>
                <option value={12}>{t('settings.syncFrequency.options.12')}</option>
                <option value={24}>{t('settings.syncFrequency.options.24')}</option>
                <option value={48}>{t('settings.syncFrequency.options.48')}</option>
                <option value={168}>{t('settings.syncFrequency.options.168')}</option>
                <option value={360}>{t('settings.syncFrequency.options.360')}</option>
                <option value={720}>{t('settings.syncFrequency.options.720')}</option>
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                {t('settings.syncFrequency.hint')}
              </p>
            </div>

            <div className="rounded-lg border border-border bg-background p-4" data-onboarding="settings-schedule">
              <div className="text-sm font-medium mb-2">{t('settings.schedule.title')}</div>
              <label className="block text-xs text-muted-foreground mb-1">
                {t('settings.schedule.preferredHour')}
              </label>
              <select
                value={settings.preferredHour ?? ''}
                onChange={(e) => onChange({
                  preferredHour: e.target.value === '' ? null : parseInt(e.target.value)
                })}
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-foreground"
              >
                <option value="">{t('settings.schedule.anyHour')}</option>
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {i.toString().padStart(2, '0')}:00 UTC
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-2">
                {t('settings.schedule.utcNote')}
              </p>
            </div>

            <div>
              <div className="block text-sm font-medium mb-2">
                {t('settings.commitStrategy.label')}
              </div>
              <div className="p-3 rounded-lg border border-border bg-background">
                <div className="font-medium text-sm">{t('settings.commitStrategy.revert.title')}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {t('settings.commitStrategy.revert.desc')}
                </div>
                <button
                  type="button"
                  onClick={() => setShowStrategyInfo(true)}
                  className="mt-2 text-xs underline text-muted-foreground hover:text-foreground"
                >
                  {t('settings.commitStrategy.learnMore')}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between" data-onboarding="settings-auto">
              <div>
                <div className="font-medium text-sm">{t('settings.autoSync.label')}</div>
                <div className="text-xs text-muted-foreground">
                  {t('settings.autoSync.desc')}
                </div>
              </div>
              <button
                onClick={() => onChange({ autoEnabled: !settings.autoEnabled })}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.autoEnabled ? 'bg-foreground' : 'bg-muted'
                }`}
                aria-label={t('settings.autoSync.label')}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-background shadow transition-transform ${
                    settings.autoEnabled ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </SettingsSection>

          <SettingsSection
            title={t('settings.sections.privacy.title')}
            description={t('settings.sections.privacy.desc')}
          >
            {privacyMessage && (
              <div className={`rounded-lg border px-3 py-2 text-xs ${
                privacyMessage.type === 'success'
                  ? 'bg-muted/30 border-border text-foreground'
                  : privacyMessage.type === 'info'
                  ? 'bg-muted/30 border-border text-muted-foreground'
                  : 'bg-muted/30 border-border text-foreground'
              }`}>
                {privacyMessage.text}
              </div>
            )}

            <div className="rounded-lg border border-border bg-background p-3">
              <div className="text-sm font-medium">{t('settings.privacy.exportTitle')}</div>
              <p className="mt-1 text-xs text-muted-foreground">
                {t('settings.privacy.exportHint')}
              </p>
              <Button
                type="button"
                variant="secondary"
                className="mt-3 w-full"
                onClick={handleExport}
                disabled={exporting}
              >
                {exporting ? t('settings.privacy.exporting') : t('settings.privacy.export')}
              </Button>
            </div>
          </SettingsSection>

          <SettingsSection
            title={t('settings.sections.danger.title')}
            description={t('settings.sections.danger.desc')}
            tone="danger"
          >
            <div className="rounded-lg border border-destructive/20 bg-background p-3">
              <div className="text-sm font-medium">{t('settings.privacy.deleteTitle')}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {t('settings.privacy.deleteDesc')}
              </p>
              <Button
                type="button"
                variant="danger"
                className="mt-3 w-full"
                onClick={() => {
                  setDeleteUsernameConfirm('')
                  setDeletePhraseConfirm('')
                  setShowDeleteModal(true)
                  void refreshSudoState()
                }}
              >
                {t('settings.privacy.deleteButton')}
              </Button>
            </div>
          </SettingsSection>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border sticky bottom-0 bg-background">
          <Button onClick={onClose} className="w-full">
            {t('settings.close')}
          </Button>
        </div>
      </div>

      {/* Strategy Info Popup */}
      {showStrategyInfo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-background rounded-2xl w-full max-w-lg border border-border max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-lg font-semibold">{t('strategyInfo.title')}</h3>
              <button
                onClick={() => setShowStrategyInfo(false)}
                className="p-1 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-6">
              <p className="text-sm text-muted-foreground">
                {t('strategyInfo.intro')}
              </p>

              {/* Temporary ref touch strategy */}
              <div className="border border-border rounded-lg p-4">
                <h4 className="font-semibold mb-2">{t('strategyInfo.revert.title')}</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  {t('strategyInfo.revert.desc')}
                </p>
                <div className="bg-muted rounded-lg p-3 font-mono text-xs space-y-1">
                  <div className="text-muted-foreground">{t('strategyInfo.revert.step1')}</div>
                  <div>git rev-parse HEAD</div>
                  <div className="text-muted-foreground mt-2">{t('strategyInfo.revert.step2')}</div>
                  <div>git push origin HEAD:refs/tags/gitpins-touch-abc123</div>
                  <div className="text-muted-foreground mt-2">{t('strategyInfo.revert.step3')}</div>
                  <div>git push origin :refs/tags/gitpins-touch-abc123</div>
                </div>
                <div className="mt-3 flex gap-4 text-xs">
                  <span className="text-green-600">{t('strategyInfo.revert.pro')}</span>
                  <span className="text-yellow-600">{t('strategyInfo.revert.con')}</span>
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
                <strong>{t('strategyInfo.noteLabel')}:</strong> {t('strategyInfo.note')}
              </div>
            </div>

            <div className="p-4 border-t border-border">
              <Button onClick={() => setShowStrategyInfo(false)} className="w-full">
                {t('settings.understood')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
          <div className="bg-background rounded-2xl w-full max-w-md border border-border max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-background">
              <h3 className="text-lg font-semibold">{t('settings.privacy.deleteModal.title')}</h3>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="p-1 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="text-sm text-muted-foreground">
                {t('settings.privacy.deleteModal.intro')}
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/20 text-xs text-muted-foreground space-y-1">
                <div>{t('settings.privacy.deleteModal.item1')}</div>
                <div>{t('settings.privacy.deleteModal.item2')}</div>
                <div>{t('settings.privacy.deleteModal.item3')}</div>
              </div>

              {sudoState && !sudoState.sudo && (
                <div className="p-3 rounded-lg border border-border bg-muted/20">
                  <div className="text-sm font-medium">{t('settings.privacy.deleteModal.reauthTitle')}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('settings.privacy.deleteModal.reauthDesc')}
                  </p>
                  <a
                    href={`/api/auth/login?sudo=1&returnTo=${encodeURIComponent(deleteReturnTo)}`}
                    className="block mt-3"
                  >
                    <Button type="button" className="w-full">
                      {t('settings.privacy.deleteModal.reauthButton')}
                    </Button>
                  </a>
                </div>
              )}

              {sudoState && sudoState.sudo && (
                <>
                  <div className="space-y-2">
                    <label className="block text-xs font-medium">
                      {t('settings.privacy.deleteModal.confirmUsernameLabel', { username })}
                    </label>
                    <input
                      value={deleteUsernameConfirm}
                      onChange={(e) => setDeleteUsernameConfirm(e.target.value)}
                      placeholder={`@${username}`}
                      className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-foreground"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-medium">
                      {t('settings.privacy.deleteModal.confirmPhraseLabel')}
                    </label>
                    <input
                      value={deletePhraseConfirm}
                      onChange={(e) => setDeletePhraseConfirm(e.target.value)}
                      placeholder="DELETE MY ACCOUNT"
                      className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-foreground"
                    />
                    <div className="text-xs text-muted-foreground">
                      {t('settings.privacy.deleteModal.confirmPhraseHint')}
                    </div>
                  </div>
                </>
              )}

              {!sudoState && (
                <div className="text-xs text-muted-foreground">
                  {t('settings.privacy.deleteModal.loadingSudo')}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border sticky bottom-0 bg-background flex gap-2">
              <Button type="button" variant="secondary" className="w-full" onClick={() => setShowDeleteModal(false)}>
                {t('settings.privacy.deleteModal.cancel')}
              </Button>
              <Button
                type="button"
                variant="danger"
                className="w-full"
                onClick={handleDeleteAccount}
                disabled={deleting || !sudoState?.sudo || !usernameMatches() || !phraseMatches()}
              >
                {deleting ? t('settings.privacy.deleting') : t('settings.privacy.deleteConfirm')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
