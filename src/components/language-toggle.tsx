/**
 * GitPins - Control the order of your GitHub repositories
 * @author 686f6c61
 * @repository https://github.com/686f6c61/gitpins
 * @created 2025
 * @license MIT
 *
 * Language Toggle Component
 * Allows users to switch between Spanish (ES) and English (EN) locales.
 */

'use client'

import { useTranslation } from '@/i18n'

/**
 * Language toggle button group.
 * Persists selection to localStorage via the i18n context.
 */
export function LanguageToggle() {
  const { locale, setLocale } = useTranslation()

  return (
    <div className="flex items-center gap-1 p-1 bg-muted rounded-lg text-sm">
      <button
        onClick={() => setLocale('es')}
        className={`px-2 py-1 rounded-md transition-colors font-medium ${
          locale === 'es' ? 'bg-background shadow-sm' : 'hover:bg-background/50 text-muted-foreground'
        }`}
      >
        ES
      </button>
      <button
        onClick={() => setLocale('en')}
        className={`px-2 py-1 rounded-md transition-colors font-medium ${
          locale === 'en' ? 'bg-background shadow-sm' : 'hover:bg-background/50 text-muted-foreground'
        }`}
      >
        EN
      </button>
    </div>
  )
}
