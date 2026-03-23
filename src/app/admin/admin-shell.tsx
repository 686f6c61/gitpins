'use client'

import { PinIcon } from '@/components/icons'
import { useTranslation } from '@/i18n'

interface AdminShellProps {
  denied?: boolean
  children?: React.ReactNode
}

export function AdminShell({ denied = false, children }: AdminShellProps) {
  const { t } = useTranslation()

  if (denied) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <div className="max-w-md w-full bg-background border border-border rounded-2xl p-8 text-center">
          <h1 className="text-2xl font-bold mb-3">{t('admin.accessDenied.title')}</h1>
          <p className="text-muted-foreground mb-6">
            {t('admin.accessDenied.desc')}
          </p>
          <a href="/dashboard" className="text-sm underline text-muted-foreground hover:text-foreground">
            {t('admin.backToDashboard')}
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-background border-b border-border">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <PinIcon className="w-6 h-6" />
            <h1 className="text-xl font-bold">{t('admin.title')}</h1>
          </div>
          <a
            href="/dashboard"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {t('admin.backToDashboard')}
          </a>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}
