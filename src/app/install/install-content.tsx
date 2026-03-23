'use client'

import Link from 'next/link'
import { Button } from '@/components/ui'
import { GitHubIcon, CheckIcon, XIcon } from '@/components/icons'
import { useTranslation } from '@/i18n'

interface InstallContentProps {
  installUrl: string
}

export function InstallContent({ installUrl }: InstallContentProps) {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-10">
      <div className="max-w-3xl w-full">
        <div className="bg-background border border-border rounded-2xl p-8 md:p-10">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
            <GitHubIcon className="w-8 h-8" />
          </div>

          <div className="text-center">
            <h1 className="text-2xl md:text-3xl font-bold mb-3">{t('install.title')}</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t('install.subtitle')}
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((step) => (
              <div key={step} className="rounded-xl border border-border bg-muted/20 p-4">
                <div className="w-9 h-9 rounded-full bg-foreground text-background flex items-center justify-center text-sm font-semibold mb-3">
                  {step}
                </div>
                <p className="text-sm text-muted-foreground">{t(`install.steps.step${step}`)}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-success/20 bg-success/5 p-5">
              <h2 className="text-sm font-semibold mb-3">{t('install.canTitle')}</h2>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[1, 2, 3].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckIcon className="w-4 h-4 mt-0.5 text-success shrink-0" />
                    <span>{t(`install.can${item}`)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-5">
              <h2 className="text-sm font-semibold mb-3">{t('install.cannotTitle')}</h2>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[1, 2, 3].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <XIcon className="w-4 h-4 mt-0.5 text-destructive shrink-0" />
                    <span>{t(`install.cannot${item}`)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <a href={installUrl} className="flex-1">
              <Button className="w-full" size="lg">
                <GitHubIcon className="w-5 h-5 mr-2" />
                {t('install.button')}
              </Button>
            </a>
            <Link href="/how-it-works" className="flex-1">
              <Button variant="secondary" className="w-full" size="lg">
                {t('install.learnMore')}
              </Button>
            </Link>
          </div>

          <p className="text-xs text-muted-foreground mt-4 text-center">
            {t('install.redirectNote')}
          </p>
        </div>
      </div>
    </div>
  )
}
