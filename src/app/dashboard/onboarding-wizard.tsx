/**
 * GitPins - Control the order of your GitHub repositories
 * @author 686f6c61
 * @repository https://github.com/686f6c61/gitpins
 * @created 2025
 * @license MIT
 *
 * Onboarding Wizard
 * First-run guided tour for dashboard and settings.
 */

'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui'
import { useTranslation } from '@/i18n'

interface OnboardingWizardProps {
  open: boolean
  isSettingsOpen: boolean
  onComplete: () => void
  onSkip: () => void
  onRequestOpenSettings: () => void
  onRequestCloseSettings: () => void
}

interface WizardStep {
  title: string
  description: string
  target?: string
  requiresSettingsOpen?: boolean
  requiredAction?: 'settings-click'
}

interface HighlightRect {
  top: number
  left: number
  width: number
  height: number
}

export function OnboardingWizard({
  open,
  isSettingsOpen,
  onComplete,
  onSkip,
  onRequestOpenSettings,
  onRequestCloseSettings,
}: OnboardingWizardProps) {
  const { t } = useTranslation()
  const [stepIndex, setStepIndex] = useState(0)
  const [highlightRect, setHighlightRect] = useState<HighlightRect | null>(null)

  const steps = useMemo<WizardStep[]>(() => [
    {
      title: t('dashboard.onboarding.steps.welcome.title'),
      description: t('dashboard.onboarding.steps.welcome.desc'),
    },
    {
      title: t('dashboard.onboarding.steps.headerControls.title'),
      description: t('dashboard.onboarding.steps.headerControls.desc'),
      target: 'dashboard-header-controls',
    },
    {
      title: t('dashboard.onboarding.steps.pinnedZone.title'),
      description: t('dashboard.onboarding.steps.pinnedZone.desc'),
      target: 'dashboard-pinned-zone',
    },
    {
      title: t('dashboard.onboarding.steps.poolZone.title'),
      description: t('dashboard.onboarding.steps.poolZone.desc'),
      target: 'dashboard-pool-zone',
    },
    {
      title: t('dashboard.onboarding.steps.settingsButton.title'),
      description: t('dashboard.onboarding.steps.settingsButton.desc'),
      target: 'dashboard-settings-button',
      requiredAction: 'settings-click',
    },
    {
      title: t('dashboard.onboarding.steps.settingsTopN.title'),
      description: t('dashboard.onboarding.steps.settingsTopN.desc'),
      target: 'settings-topn',
      requiresSettingsOpen: true,
    },
    {
      title: t('dashboard.onboarding.steps.settingsPrivate.title'),
      description: t('dashboard.onboarding.steps.settingsPrivate.desc'),
      target: 'settings-private',
      requiresSettingsOpen: true,
    },
    {
      title: t('dashboard.onboarding.steps.settingsFrequency.title'),
      description: t('dashboard.onboarding.steps.settingsFrequency.desc'),
      target: 'settings-frequency',
      requiresSettingsOpen: true,
    },
    {
      title: t('dashboard.onboarding.steps.settingsSchedule.title'),
      description: t('dashboard.onboarding.steps.settingsSchedule.desc'),
      target: 'settings-schedule',
      requiresSettingsOpen: true,
    },
    {
      title: t('dashboard.onboarding.steps.settingsAuto.title'),
      description: t('dashboard.onboarding.steps.settingsAuto.desc'),
      target: 'settings-auto',
      requiresSettingsOpen: true,
    },
    {
      title: t('dashboard.onboarding.steps.done.title'),
      description: t('dashboard.onboarding.steps.done.desc'),
    },
  ], [t])

  const totalSteps = steps.length
  const currentStep = steps[Math.min(stepIndex, totalSteps - 1)]
  const isLastStep = stepIndex === totalSteps - 1
  const isWaitingForSettingsClick = currentStep.requiredAction === 'settings-click'
  const overlayClassName = isSettingsOpen ? 'bg-black/0' : 'bg-black/8'

  useEffect(() => {
    if (!open) return

    if (currentStep.requiresSettingsOpen) {
      onRequestOpenSettings()
    } else {
      onRequestCloseSettings()
    }
  }, [
    open,
    currentStep.requiresSettingsOpen,
    onRequestOpenSettings,
    onRequestCloseSettings,
  ])

  useEffect(() => {
    if (!open || currentStep.requiredAction !== 'settings-click') {
      return
    }

    const handleSettingsClick = () => {
      setStepIndex((prev) => Math.min(totalSteps - 1, prev + 1))
    }

    window.addEventListener('gitpins:onboarding-settings-click', handleSettingsClick)
    return () => {
      window.removeEventListener('gitpins:onboarding-settings-click', handleSettingsClick)
    }
  }, [open, currentStep.requiredAction, totalSteps])

  const updateHighlight = useCallback(() => {
    if (!currentStep.target) {
      setHighlightRect(null)
      return
    }

    const element = document.querySelector<HTMLElement>(`[data-onboarding="${currentStep.target}"]`)
    if (!element) {
      setHighlightRect(null)
      return
    }

    element.scrollIntoView({
      block: 'center',
      inline: 'nearest',
      behavior: 'smooth',
    })

    const rect = element.getBoundingClientRect()
    const viewportPadding = 8
    const ringPadding = 10

    const top = Math.max(rect.top - ringPadding, viewportPadding)
    const left = Math.max(rect.left - ringPadding, viewportPadding)
    const right = Math.min(rect.right + ringPadding, window.innerWidth - viewportPadding)
    const bottom = Math.min(rect.bottom + ringPadding, window.innerHeight - viewportPadding)

    setHighlightRect({
      top,
      left,
      width: Math.max(0, right - left),
      height: Math.max(0, bottom - top),
    })
  }, [currentStep.target])

  useEffect(() => {
    if (!open) return

    let rafId: number | null = null
    const scheduleUpdate = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
      }
      rafId = requestAnimationFrame(() => {
        updateHighlight()
      })
    }

    scheduleUpdate()
    window.addEventListener('resize', scheduleUpdate)
    window.addEventListener('scroll', scheduleUpdate, true)

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
      }
      window.removeEventListener('resize', scheduleUpdate)
      window.removeEventListener('scroll', scheduleUpdate, true)
    }
  }, [open, stepIndex, isSettingsOpen, updateHighlight])

  if (!open) {
    return null
  }

  return (
    <>
      <div className={`fixed inset-0 z-[70] pointer-events-none ${overlayClassName}`} />

      {highlightRect && (
        <div
          className="fixed z-[71] rounded-xl border-2 border-foreground/90 ring-4 ring-white/70 shadow-[0_8px_24px_rgba(0,0,0,0.18)] pointer-events-none"
          style={{
            top: highlightRect.top,
            left: highlightRect.left,
            width: highlightRect.width,
            height: highlightRect.height,
          }}
        />
      )}

      <div className={`fixed z-[72] w-[min(92vw,480px)] ${
        currentStep.target ? 'left-1/2 bottom-6 -translate-x-1/2' : 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2'
      }`}>
        <div className="rounded-2xl border border-border bg-background p-5 shadow-2xl">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              {t('dashboard.onboarding.badge')}
            </div>
            <div className="text-xs text-muted-foreground">
              {t('dashboard.onboarding.progress', { current: stepIndex + 1, total: totalSteps })}
            </div>
          </div>

          <h3 className="text-lg font-semibold">{currentStep.title}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{currentStep.description}</p>

          {!highlightRect && currentStep.target && (
            <p className="mt-2 text-xs text-muted-foreground">
              {t('dashboard.onboarding.targetFallback')}
            </p>
          )}
          {isWaitingForSettingsClick && (
            <p className="mt-2 text-xs font-medium text-foreground">
              {t('dashboard.onboarding.waitingForSettingsClick')}
            </p>
          )}

          <div className="mt-5 h-1 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-foreground transition-all"
              style={{ width: `${((stepIndex + 1) / totalSteps) * 100}%` }}
            />
          </div>

          <div className="mt-5 flex items-center justify-between gap-2">
            <Button variant="ghost" size="sm" onClick={onSkip}>
              {t('dashboard.onboarding.skip')}
            </Button>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setStepIndex((prev) => Math.max(0, prev - 1))}
                disabled={stepIndex === 0}
              >
                {t('dashboard.onboarding.back')}
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  if (isLastStep) {
                    onComplete()
                    return
                  }
                  setStepIndex((prev) => Math.min(totalSteps - 1, prev + 1))
                }}
                disabled={isWaitingForSettingsClick}
              >
                {isLastStep ? t('dashboard.onboarding.finish') : t('dashboard.onboarding.next')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
