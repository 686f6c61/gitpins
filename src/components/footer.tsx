/**
 * GitPins - Control the order of your GitHub repositories
 * @author 686f6c61
 * @repository https://github.com/686f6c61/gitpins
 * @created 2024
 * @license MIT
 *
 * Footer Component
 * Site footer with copyright and GitHub repository link.
 */

'use client'

import { useTranslation } from '@/i18n'
import { GitHubIcon } from './icons'
import packageJson from '../../package.json'

/** GitHub repository URL for the GitPins project */
const GITHUB_REPO_URL = 'https://github.com/686f6c61/gitpins'

/**
 * Footer component displayed at the bottom of all pages.
 * Shows copyright year and link to GitHub repository.
 */
export function Footer() {
  const { t } = useTranslation()
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t border-border py-6">
      <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-muted-foreground">
        <span>{t('footer.copyright', { year: currentYear })}</span>
        <span className="hidden sm:inline">·</span>
        <span className="flex items-center gap-1.5">
          {t('footer.sourceCode')}{' '}
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
          >
            <GitHubIcon className="w-4 h-4" />
            <span>{t('footer.github')}</span>
          </a>
        </span>
        <span className="hidden sm:inline">·</span>
        <a
          href="/legal"
          className="hover:text-foreground transition-colors"
        >
          {t('footer.legal')}
        </a>
        <span className="hidden sm:inline">·</span>
        <span className="text-xs">v{packageJson.version}</span>
      </div>
    </footer>
  )
}
