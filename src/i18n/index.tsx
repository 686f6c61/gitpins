/**
 * GitPins - Control the order of your GitHub repositories
 * @author 686f6c61
 * @repository https://github.com/686f6c61/gitpins
 * @created 2025
 * @license MIT
 *
 * Internationalization (i18n) Module
 * Provides multi-language support with Spanish and English locales.
 * Handles locale detection, persistence, and string interpolation.
 */

'use client'

import { createContext, useContext, useCallback, useEffect, useState } from 'react'
import es from './locales/es.json'
import en from './locales/en.json'

/** Supported locales */
type Locale = 'es' | 'en'

/** Type-safe translations object */
type Translations = typeof es

/** Map of locale codes to translation files */
const translations: Record<Locale, Translations> = { es, en }

/** i18n context value interface */
interface I18nContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string, params?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)
const LOCALE_STORAGE_KEY = 'locale'
const LOCALE_CHANGE_EVENT = 'gitpins:locale-change'

/**
 * Gets a nested value from an object using dot notation.
 * @param obj - The object to search
 * @param path - Dot-separated path (e.g., 'dashboard.title')
 * @returns The value at the path, or the path itself if not found
 */
function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split('.')
  let result: unknown = obj

  for (const key of keys) {
    if (result && typeof result === 'object' && key in result) {
      result = (result as Record<string, unknown>)[key]
    } else {
      return path // Return key if not found
    }
  }

  return typeof result === 'string' ? result : path
}

function resolveBrowserLocale(): Locale {
  const savedLocale = localStorage.getItem(LOCALE_STORAGE_KEY)
  if (savedLocale === 'es' || savedLocale === 'en') {
    return savedLocale
  }

  return navigator.language.toLowerCase().startsWith('en') ? 'en' : 'es'
}

/**
 * I18n provider component.
 * Detects browser language on mount, loads saved preference from localStorage.
 * Provides translation function and locale switching to all children.
 */
export function I18nProvider({ children }: { children: React.ReactNode }) {
  // SSR and first client render must be deterministic to avoid hydration mismatches.
  // We start with 'es' and then sync to localStorage / browser language on mount.
  const [locale, setLocaleState] = useState<Locale>('es')

  useEffect(() => {
    const syncLocale = () => {
      try {
        setLocaleState(resolveBrowserLocale())
      } catch {
        // non-fatal
      }
    }

    syncLocale()

    const handleChange = () => syncLocale()
    window.addEventListener('storage', handleChange)
    window.addEventListener(LOCALE_CHANGE_EVENT, handleChange)

    return () => {
      window.removeEventListener('storage', handleChange)
      window.removeEventListener(LOCALE_CHANGE_EVENT, handleChange)
    }
  }, [])

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const setLocale = useCallback((newLocale: Locale) => {
    if (localStorage.getItem(LOCALE_STORAGE_KEY) !== newLocale) {
      localStorage.setItem(LOCALE_STORAGE_KEY, newLocale)
    }
    setLocaleState(newLocale)
    window.dispatchEvent(new Event(LOCALE_CHANGE_EVENT))
  }, [])

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    let resolvedKey = key

    // Handle pluralization: if 'count' param exists, try _one/_other suffixes
    if (params && 'count' in params) {
      const count = Number(params.count)
      const pluralSuffix = count === 1 ? '_one' : '_other'
      const pluralKey = `${key}${pluralSuffix}`
      const pluralText = getNestedValue(translations[locale] as unknown as Record<string, unknown>, pluralKey)
      if (pluralText !== pluralKey) {
        resolvedKey = pluralKey
      }
    }

    let text = getNestedValue(translations[locale] as unknown as Record<string, unknown>, resolvedKey)

    // Reemplazar parámetros {param}
    if (params) {
      Object.entries(params).forEach(([paramKey, value]) => {
        text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(value))
      })
    }

    return text
  }, [locale])

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  )
}

/**
 * Hook to access the i18n context.
 * Must be used within an I18nProvider component.
 * @returns I18n context with locale, setLocale, and t function
 * @throws Error if used outside of I18nProvider
 */
export function useTranslation() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useTranslation must be used within an I18nProvider')
  }
  return context
}

export type { Locale }
