'use client'

import Link from 'next/link'
import { PinIcon, AlertTriangleIcon, GitHubIcon } from '@/components/icons'
import { useTranslation } from '@/i18n'

export function BannedContent() {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="flex items-center justify-center gap-2 mb-8">
          <PinIcon className="w-8 h-8" />
          <span className="text-2xl font-bold">GitPins</span>
        </div>

        <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangleIcon className="w-10 h-10 text-destructive" />
        </div>

        <h1 className="text-2xl font-bold mb-4">
          {t('banned.title')}
        </h1>

        <p className="text-muted-foreground mb-6">
          {t('banned.message')}
        </p>

        <div className="bg-muted/30 border border-border rounded-xl p-6 mb-6">
          <p className="text-sm text-muted-foreground mb-4">
            {t('banned.contact')}
          </p>
          <a
            href="https://github.com/686f6c61/gitpins/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-foreground text-background px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
          >
            <GitHubIcon className="w-5 h-5" />
            {t('banned.openIssue')}
          </a>
        </div>

        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground underline"
        >
          {t('banned.backToHome')}
        </Link>
      </div>
    </div>
  )
}
