/**
 * GitPins - Control the order of your GitHub repositories
 * @author 686f6c61
 * @repository https://github.com/686f6c61/gitpins
 * @created 2024
 * @license MIT
 *
 * Settings Modal Component
 * Modal dialog for configuring repository ordering settings:
 * - Number of repos to pin (topN)
 * - Include/exclude private repos
 * - Sync frequency
 * - Commit strategy (revert vs branch)
 * - Auto-sync toggle
 * - Config repo visibility
 */

'use client'

import { useState } from 'react'
import { XIcon, InfoIcon } from '@/components/icons'
import { Button } from '@/components/ui'
import { useTranslation } from '@/i18n'
import type { RepoOrderSettings } from '@/types'

/** Props for the SettingsModal component */
interface SettingsModalProps {
  settings: RepoOrderSettings
  totalRepos: number
  onClose: () => void
  onChange: (settings: Partial<RepoOrderSettings>) => void
}

/**
 * Settings modal component.
 * Provides a full settings interface for customizing sync behavior.
 */
export function SettingsModal({ settings, totalRepos, onClose, onChange }: SettingsModalProps) {
  const { t } = useTranslation()
  const [showStrategyInfo, setShowStrategyInfo] = useState(false)

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
          {/* Cuantos repos ordenar */}
          <div>
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
                placeholder="Ej: 10"
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

          {/* Incluir privados */}
          <div className="flex items-center justify-between">
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
            >
              <div
                className={`w-5 h-5 rounded-full bg-background shadow transition-transform ${
                  settings.includePrivate ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <hr className="border-border" />

          {/* Sync frequency */}
          <div>
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

          {/* Advanced scheduling */}
          <div className="space-y-4 p-4 bg-muted/30 rounded-lg border border-border">
            <div className="text-sm font-medium">{t('settings.schedule.title')}</div>
            <p className="text-xs text-muted-foreground">
              {t('settings.schedule.hint')}
            </p>

            {/* Preferred hour */}
            <div>
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
                    {i.toString().padStart(2, '0')}:00
                  </option>
                ))}
              </select>
            </div>

            {/* Preferred days */}
            <div>
              <label className="block text-xs text-muted-foreground mb-2">
                {t('settings.schedule.preferredDays')}
              </label>
              <div className="flex flex-wrap gap-2">
                {[0, 1, 2, 3, 4, 5, 6].map((day) => {
                  const isSelected = settings.preferredDays?.includes(day) ?? false
                  const allSelected = !settings.preferredDays || settings.preferredDays.length === 0
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => {
                        const currentDays = settings.preferredDays || []
                        let newDays: number[]
                        if (isSelected) {
                          newDays = currentDays.filter(d => d !== day)
                        } else {
                          newDays = [...currentDays, day].sort()
                        }
                        // Si todos están seleccionados o ninguno, usar array vacío (= todos)
                        if (newDays.length === 7 || newDays.length === 0) {
                          newDays = []
                        }
                        onChange({ preferredDays: newDays })
                      }}
                      className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                        isSelected || allSelected
                          ? 'bg-foreground text-background border-foreground'
                          : 'bg-background border-border hover:bg-muted'
                      }`}
                    >
                      {t(`settings.schedule.days.${day}`)}
                    </button>
                  )
                })}
              </div>
              {(!settings.preferredDays || settings.preferredDays.length === 0) && (
                <p className="text-xs text-muted-foreground mt-1">
                  {t('settings.schedule.allDays')}
                </p>
              )}
            </div>
          </div>

          {/* Commit strategy */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <label className="block text-sm font-medium">
                {t('settings.commitStrategy.label')}
              </label>
              <button
                type="button"
                onClick={() => setShowStrategyInfo(true)}
                className="text-muted-foreground hover:text-foreground"
              >
                <InfoIcon className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              <label className="flex items-start gap-3 p-3 rounded-lg border border-border cursor-pointer hover:bg-muted/50">
                <input
                  type="radio"
                  name="commitStrategy"
                  value="revert"
                  checked={settings.commitStrategy === 'revert'}
                  onChange={() => onChange({ commitStrategy: 'revert' })}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-sm">{t('settings.commitStrategy.revert.title')}</div>
                  <div className="text-xs text-muted-foreground">
                    {t('settings.commitStrategy.revert.desc')}
                  </div>
                </div>
              </label>
              <label className="flex items-start gap-3 p-3 rounded-lg border border-border cursor-pointer hover:bg-muted/50">
                <input
                  type="radio"
                  name="commitStrategy"
                  value="branch"
                  checked={settings.commitStrategy === 'branch'}
                  onChange={() => onChange({ commitStrategy: 'branch' })}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-sm">{t('settings.commitStrategy.branch.title')}</div>
                  <div className="text-xs text-muted-foreground">
                    {t('settings.commitStrategy.branch.desc')}
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Auto enabled */}
          <div className="flex items-center justify-between">
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
            >
              <div
                className={`w-5 h-5 rounded-full bg-background shadow transition-transform ${
                  settings.autoEnabled ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

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

              {/* Revert Strategy */}
              <div className="border border-border rounded-lg p-4">
                <h4 className="font-semibold mb-2">{t('strategyInfo.revert.title')}</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  {t('strategyInfo.revert.desc')}
                </p>
                <div className="bg-muted rounded-lg p-3 font-mono text-xs space-y-1">
                  <div className="text-muted-foreground">{t('strategyInfo.revert.step1')}</div>
                  <div>git commit --allow-empty -m "gitpins: bump"</div>
                  <div className="text-muted-foreground mt-2">{t('strategyInfo.revert.step2')}</div>
                  <div>git revert HEAD --no-edit</div>
                  <div className="text-muted-foreground mt-2">{t('strategyInfo.revert.step3')}</div>
                  <div>git push</div>
                </div>
                <div className="mt-3 flex gap-4 text-xs">
                  <span className="text-green-600">{t('strategyInfo.revert.pro')}</span>
                  <span className="text-yellow-600">{t('strategyInfo.revert.con')}</span>
                </div>
              </div>

              {/* Branch Strategy */}
              <div className="border border-border rounded-lg p-4">
                <h4 className="font-semibold mb-2">{t('strategyInfo.branch.title')}</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  {t('strategyInfo.branch.desc')}
                </p>
                <div className="bg-muted rounded-lg p-3 font-mono text-xs space-y-1">
                  <div className="text-muted-foreground">{t('strategyInfo.branch.step1')}</div>
                  <div>git checkout -b gitpins-temp</div>
                  <div className="text-muted-foreground mt-2">{t('strategyInfo.branch.step2')}</div>
                  <div>git commit --allow-empty -m "gitpins: sync"</div>
                  <div className="text-muted-foreground mt-2">{t('strategyInfo.branch.step3')}</div>
                  <div>git checkout main && git merge gitpins-temp</div>
                  <div>git branch -d gitpins-temp && git push</div>
                </div>
                <div className="mt-3 flex gap-4 text-xs">
                  <span className="text-green-600">{t('strategyInfo.branch.pro')}</span>
                  <span className="text-yellow-600">{t('strategyInfo.branch.con')}</span>
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
                <strong>Nota:</strong> {t('strategyInfo.note')}
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
    </div>
  )
}
