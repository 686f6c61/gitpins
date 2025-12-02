/**
 * GitPins - Control the order of your GitHub repositories
 * @author 686f6c61
 * @repository https://github.com/686f6c61/gitpins
 * @created 2024
 * @license MIT
 *
 * Legal Content Component
 * Full legal disclaimer page with all terms and conditions.
 */

'use client'

import { Button } from '@/components/ui'
import { PinIcon, GitHubIcon, CheckIcon, XIcon, AlertTriangleIcon, ShieldIcon } from '@/components/icons'
import { ThemeToggle } from '@/components/theme-toggle'
import { LanguageToggle } from '@/components/language-toggle'
import { Footer } from '@/components/footer'
import { useTranslation } from '@/i18n'

export function LegalContent() {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <PinIcon className="w-6 h-6" />
            <span className="text-xl font-bold">GitPins</span>
          </a>
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        {/* Title */}
        <div className="text-center mb-12">
          <ShieldIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            {t('legal.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('legal.subtitle')}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            {t('legal.lastUpdated')}
          </p>
        </div>

        {/* Disclaimer */}
        <section className="mb-10">
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <AlertTriangleIcon className="w-6 h-6 text-destructive flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-xl font-semibold mb-3 text-destructive">
                  {t('legal.disclaimer.title')}
                </h2>
                <p className="text-sm mb-3">{t('legal.disclaimer.p1')}</p>
                <p className="text-sm mb-3">{t('legal.disclaimer.p2')}</p>
                <p className="text-sm font-medium">{t('legal.disclaimer.p3')}</p>
              </div>
            </div>
          </div>
        </section>

        {/* How it works - Transparency */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-4">{t('legal.howItWorks.title')}</h2>
          <p className="text-muted-foreground mb-6">{t('legal.howItWorks.intro')}</p>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-muted/30 rounded-xl p-5 border border-border">
              <div className="w-10 h-10 bg-foreground text-background rounded-full flex items-center justify-center mb-3 font-bold">1</div>
              <h3 className="font-semibold mb-2">{t('legal.howItWorks.step1.title')}</h3>
              <p className="text-sm text-muted-foreground">{t('legal.howItWorks.step1.desc')}</p>
            </div>
            <div className="bg-muted/30 rounded-xl p-5 border border-border">
              <div className="w-10 h-10 bg-foreground text-background rounded-full flex items-center justify-center mb-3 font-bold">2</div>
              <h3 className="font-semibold mb-2">{t('legal.howItWorks.step2.title')}</h3>
              <p className="text-sm text-muted-foreground">{t('legal.howItWorks.step2.desc')}</p>
            </div>
            <div className="bg-muted/30 rounded-xl p-5 border border-border">
              <div className="w-10 h-10 bg-foreground text-background rounded-full flex items-center justify-center mb-3 font-bold">3</div>
              <h3 className="font-semibold mb-2">{t('legal.howItWorks.step3.title')}</h3>
              <p className="text-sm text-muted-foreground">{t('legal.howItWorks.step3.desc')}</p>
            </div>
          </div>
        </section>

        {/* Risks */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-4">{t('legal.risks.title')}</h2>
          <p className="text-muted-foreground mb-6">{t('legal.risks.intro')}</p>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="border border-amber-500/30 bg-amber-500/5 rounded-xl p-5">
              <h3 className="font-semibold mb-2">{t('legal.risks.risk1.title')}</h3>
              <p className="text-sm text-muted-foreground">{t('legal.risks.risk1.desc')}</p>
            </div>
            <div className="border border-amber-500/30 bg-amber-500/5 rounded-xl p-5">
              <h3 className="font-semibold mb-2">{t('legal.risks.risk2.title')}</h3>
              <p className="text-sm text-muted-foreground">{t('legal.risks.risk2.desc')}</p>
            </div>
            <div className="border border-amber-500/30 bg-amber-500/5 rounded-xl p-5">
              <h3 className="font-semibold mb-2">{t('legal.risks.risk3.title')}</h3>
              <p className="text-sm text-muted-foreground">{t('legal.risks.risk3.desc')}</p>
            </div>
            <div className="border border-amber-500/30 bg-amber-500/5 rounded-xl p-5">
              <h3 className="font-semibold mb-2">{t('legal.risks.risk4.title')}</h3>
              <p className="text-sm text-muted-foreground">{t('legal.risks.risk4.desc')}</p>
            </div>
          </div>
        </section>

        {/* No Delete - Important */}
        <section className="mb-10">
          <div className="bg-success/10 border border-success/30 rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-4 text-success">{t('legal.noDelete.title')}</h2>
            <p
              className="text-sm mb-6"
              dangerouslySetInnerHTML={{ __html: t('legal.noDelete.p1') }}
            />

            <div className="grid md:grid-cols-2 gap-6">
              {/* Can Do */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <CheckIcon className="w-5 h-5 text-success" />
                  {t('legal.noDelete.canDo')}
                </h3>
                <ul className="space-y-2">
                  {[1, 2, 3, 4].map((i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <CheckIcon className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                      <span>{t(`legal.noDelete.canDo${i}`)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Cannot Do */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <XIcon className="w-5 h-5 text-destructive" />
                  {t('legal.noDelete.cannotDo')}
                </h3>
                <ul className="space-y-2">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <XIcon className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                      <span>{t(`legal.noDelete.cannotDo${i}`)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <p className="text-sm mt-6 text-muted-foreground">
              {t('legal.noDelete.verify')}{' '}
              <a
                href="https://github.com/settings/installations"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground"
              >
                github.com/settings/installations
              </a>
            </p>
          </div>
        </section>

        {/* Your Responsibility */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-4">{t('legal.yourResponsibility.title')}</h2>
          <p className="text-muted-foreground mb-4">{t('legal.yourResponsibility.p1')}</p>
          <p className="text-muted-foreground mb-4">{t('legal.yourResponsibility.p2')}</p>
          <p className="text-muted-foreground">{t('legal.yourResponsibility.p3')}</p>
        </section>

        {/* No Warranty */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-4">{t('legal.noWarranty.title')}</h2>
          <p className="text-muted-foreground mb-4">{t('legal.noWarranty.p1')}</p>
          <p className="text-muted-foreground">{t('legal.noWarranty.p2')}</p>
        </section>

        {/* Limitation of Liability */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-4">{t('legal.limitation.title')}</h2>
          <p className="text-muted-foreground mb-4">{t('legal.limitation.p1')}</p>
          <ul className="space-y-2 mb-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <li key={i} className="text-sm flex items-start gap-2">
                <span className="text-foreground">•</span>
                <span>{t(`legal.limitation.item${i}`)}</span>
              </li>
            ))}
          </ul>
          <p className="text-muted-foreground mb-4">{t('legal.limitation.p2')}</p>
          <ul className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <li key={i} className="text-sm flex items-start gap-2">
                <span className="text-foreground">•</span>
                <span>{t(`legal.limitation.item2_${i}`)}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Open Source */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-4">{t('legal.openSource.title')}</h2>
          <p className="text-muted-foreground mb-4">{t('legal.openSource.p1')}</p>
          <ul className="space-y-2 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <li key={i} className="text-sm flex items-start gap-2">
                <CheckIcon className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                <span>{t(`legal.openSource.item${i}`)}</span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground">
            {t('legal.openSource.repo')}{' '}
            <a
              href="https://github.com/686f6c61/gitpins"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 underline hover:text-foreground"
            >
              <GitHubIcon className="w-4 h-4" />
              github.com/686f6c61/gitpins
            </a>
          </p>
        </section>

        {/* Contact */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-4">{t('legal.contact.title')}</h2>
          <p className="text-muted-foreground mb-4">{t('legal.contact.p1')}</p>
          <a
            href="https://github.com/686f6c61/gitpins/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm bg-foreground text-background px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
          >
            <GitHubIcon className="w-4 h-4" />
            {t('legal.contact.issuesLink')}
          </a>
        </section>

        {/* Acceptance */}
        <section className="mb-10">
          <div className="bg-muted/50 border border-border rounded-xl p-6 text-center">
            <h2 className="text-xl font-bold mb-3">{t('legal.acceptance.title')}</h2>
            <p className="text-muted-foreground mb-6">{t('legal.acceptance.p1')}</p>
            <a href="/">
              <Button>
                {t('legal.backToHome')}
              </Button>
            </a>
          </div>
        </section>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}
