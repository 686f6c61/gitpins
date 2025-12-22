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

import { useTheme } from './theme-provider'
import { SunIcon, MoonIcon, MonitorIcon } from './icons'

/**
 * Theme toggle button group.
 * Displays three options: light (sun), system (monitor), dark (moon).
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
      <button
        onClick={() => setTheme('light')}
        className={`p-1.5 rounded-md transition-colors ${
          theme === 'light' ? 'bg-background shadow-sm' : 'hover:bg-background/50'
        }`}
        title="Modo claro"
      >
        <SunIcon className="w-4 h-4" />
      </button>
      <button
        onClick={() => setTheme('system')}
        className={`p-1.5 rounded-md transition-colors ${
          theme === 'system' ? 'bg-background shadow-sm' : 'hover:bg-background/50'
        }`}
        title="Sistema"
      >
        <MonitorIcon className="w-4 h-4" />
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={`p-1.5 rounded-md transition-colors ${
          theme === 'dark' ? 'bg-background shadow-sm' : 'hover:bg-background/50'
        }`}
        title="Modo oscuro"
      >
        <MoonIcon className="w-4 h-4" />
      </button>
    </div>
  )
}
