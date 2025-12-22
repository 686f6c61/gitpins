/**
 * GitPins - Control the order of your GitHub repositories
 * @author 686f6c61
 * @repository https://github.com/686f6c61/gitpins
 * @created 2025
 * @license MIT
 *
 * Theme Provider Component
 * React context provider for managing light/dark/system theme preferences.
 * Persists theme selection to localStorage and handles system preference changes.
 */

'use client'

import { createContext, useContext, useEffect, useState } from 'react'

/** Available theme options */
type Theme = 'light' | 'dark' | 'system'

/** Theme context value interface */
interface ThemeContextType {
  theme: Theme                    // Current theme setting (may be 'system')
  setTheme: (theme: Theme) => void
  resolvedTheme: 'light' | 'dark' // Actual applied theme (never 'system')
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

/**
 * Theme provider component.
 * Wraps the application to provide theme context to all children.
 * Handles localStorage persistence and system preference detection.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Usar lazy initialization para evitar llamar setState en useEffect
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme') as Theme | null
      if (savedTheme) return savedTheme
    }
    return 'system'
  })
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    const root = document.documentElement

    const applyTheme = (isDark: boolean) => {
      if (isDark) {
        root.classList.add('dark')
        setResolvedTheme('dark')
      } else {
        root.classList.remove('dark')
        setResolvedTheme('light')
      }
    }

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      applyTheme(mediaQuery.matches)

      const handler = (e: MediaQueryListEvent) => applyTheme(e.matches)
      mediaQuery.addEventListener('change', handler)
      return () => mediaQuery.removeEventListener('change', handler)
    } else {
      applyTheme(theme === 'dark')
    }
  }, [theme])

  const handleSetTheme = (newTheme: Theme) => {
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme: handleSetTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

/**
 * Hook to access the theme context.
 * Must be used within a ThemeProvider component.
 * @returns Theme context with theme, setTheme, and resolvedTheme
 * @throws Error if used outside of ThemeProvider
 */
export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
