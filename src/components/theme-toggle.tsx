/**
 * GitPins - Control the order of your GitHub repositories
 * @author 686f6c61
 * @repository https://github.com/686f6c61/gitpins
 * @created 2025
 * @license MIT
 *
 * Theme Toggle Component
 * Allows users to switch between light, dark, and system theme modes.
 */

'use client'

import { useSyncExternalStore } from 'react'
import { useTheme } from './theme-provider'
import { SunIcon, MoonIcon, MonitorIcon } from './icons'
import { useTranslation } from '@/i18n'

let hasHydrated = false
const hydrationListeners = new Set<() => void>()

function getHydrationSnapshot() {
  return hasHydrated
}

function subscribeHydration(callback: () => void) {
  hydrationListeners.add(callback)

  if (!hasHydrated) {
    hasHydrated = true
    const schedule = typeof queueMicrotask === 'function'
      ? queueMicrotask
      : (fn: () => void) => Promise.resolve().then(fn)

    schedule(() => {
      hydrationListeners.forEach((listener) => listener())
    })
  }

  return () => {
    hydrationListeners.delete(callback)
  }
}

/**
 * Theme toggle button group.
 * Displays three options: light (sun), system (monitor), dark (moon).
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const { t } = useTranslation()
  const hydrated = useSyncExternalStore(subscribeHydration, getHydrationSnapshot, () => false)

  // Keep first SSR/client render deterministic to avoid hydration mismatch.
  const selectedTheme = hydrated ? theme : 'system'

  return (
    <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
      <button
        onClick={() => setTheme('light')}
        className={`p-1.5 rounded-md transition-colors ${
          selectedTheme === 'light' ? 'bg-background shadow-sm' : 'hover:bg-background/50'
        }`}
        title={t('common.theme.light')}
      >
        <SunIcon className="w-4 h-4" />
      </button>
      <button
        onClick={() => setTheme('system')}
        className={`p-1.5 rounded-md transition-colors ${
          selectedTheme === 'system' ? 'bg-background shadow-sm' : 'hover:bg-background/50'
        }`}
        title={t('common.theme.system')}
      >
        <MonitorIcon className="w-4 h-4" />
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={`p-1.5 rounded-md transition-colors ${
          selectedTheme === 'dark' ? 'bg-background shadow-sm' : 'hover:bg-background/50'
        }`}
        title={t('common.theme.dark')}
      >
        <MoonIcon className="w-4 h-4" />
      </button>
    </div>
  )
}
