/**
 * GitPins - Control the order of your GitHub repositories
 * @author 686f6c61
 * @repository https://github.com/686f6c61/gitpins
 * @created 2024
 * @license MIT
 *
 * Landing Content Component
 * Main landing page content shown to unauthenticated visitors.
 * Features hero section, how-it-works steps, feature highlights, and CTAs.
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui'
import { GitHubIcon, PinIcon, CheckIcon, XIcon, AlertTriangleIcon, BriefcaseIcon, UserIcon, BuildingIcon, CodeIcon, FilterIcon, HistoryIcon, CalendarIcon } from '@/components/icons'
import { ThemeToggle } from '@/components/theme-toggle'
import { LanguageToggle } from '@/components/language-toggle'
import { Footer } from '@/components/footer'
import { useTranslation } from '@/i18n'

/**
 * Landing page content component.
 * Renders the full marketing page with all sections.
 */
export function LandingContent() {
  const { t } = useTranslation()
  const [showDisclaimer, setShowDisclaimer] = useState(false)

  const handleOrderClick = (e: React.MouseEvent) => {
    e.preventDefault()
    setShowDisclaimer(true)
  }

  const handleAccept = () => {
    setShowDisclaimer(false)
    window.location.href = '/api/auth/login'
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PinIcon className="w-6 h-6" />
            <span className="text-xl font-bold">GitPins</span>
          </div>
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <ThemeToggle />
            <Button onClick={handleOrderClick}>
              <GitHubIcon className="w-4 h-4 mr-2" />
              {t('nav.connect')}
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 md:py-32">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            {t('landing.hero.title1')}
            <br />
            <span className="text-muted-foreground">{t('landing.hero.title2')}</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            {t('landing.hero.subtitle')}
          </p>
          <Button size="lg" className="text-base" onClick={handleOrderClick}>
            <GitHubIcon className="w-5 h-5 mr-2" />
            {t('landing.hero.cta')}
          </Button>
          <p className="text-sm text-muted-foreground mt-4">
            {t('landing.hero.noCreditCard')}
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-muted/30 border-y border-border">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
            {t('landing.howItWorks.title')}
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-foreground text-background rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                1
              </div>
              <h3 className="font-semibold mb-2">{t('landing.howItWorks.step1.title')}</h3>
              <p className="text-muted-foreground text-sm">
                {t('landing.howItWorks.step1.desc')}
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-foreground text-background rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                2
              </div>
              <h3 className="font-semibold mb-2">{t('landing.howItWorks.step2.title')}</h3>
              <p className="text-muted-foreground text-sm">
                {t('landing.howItWorks.step2.desc')}
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-foreground text-background rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                3
              </div>
              <h3 className="font-semibold mb-2">{t('landing.howItWorks.step3.title')}</h3>
              <p className="text-muted-foreground text-sm">
                {t('landing.howItWorks.step3.desc')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
            {t('landing.features.title')}
          </h2>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="p-6 border border-border rounded-xl">
              <div className="flex items-center gap-3 mb-3">
                <CheckIcon className="w-5 h-5 text-success" />
                <h3 className="font-semibold">{t('landing.features.noLimit.title')}</h3>
              </div>
              <p className="text-muted-foreground text-sm">
                {t('landing.features.noLimit.desc')}
              </p>
            </div>
            <div className="p-6 border border-border rounded-xl">
              <div className="flex items-center gap-3 mb-3">
                <CheckIcon className="w-5 h-5 text-success" />
                <h3 className="font-semibold">{t('landing.features.automatic.title')}</h3>
              </div>
              <p className="text-muted-foreground text-sm">
                {t('landing.features.automatic.desc')}
              </p>
            </div>
            <div className="p-6 border border-border rounded-xl">
              <div className="flex items-center gap-3 mb-3">
                <CheckIcon className="w-5 h-5 text-success" />
                <h3 className="font-semibold">{t('landing.features.noLockIn.title')}</h3>
              </div>
              <p className="text-muted-foreground text-sm">
                {t('landing.features.noLockIn.desc')}
              </p>
            </div>
            <div className="p-6 border border-border rounded-xl">
              <div className="flex items-center gap-3 mb-3">
                <CheckIcon className="w-5 h-5 text-success" />
                <h3 className="font-semibold">{t('landing.features.cleanCommits.title')}</h3>
              </div>
              <p className="text-muted-foreground text-sm">
                {t('landing.features.cleanCommits.desc')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Coming Soon */}
      <section className="py-20 border-y border-border">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-2">
            {t('landing.comingSoon.title')}
          </h2>
          <p className="text-muted-foreground text-center mb-12">
            {t('landing.comingSoon.subtitle')}
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 border border-border rounded-xl">
              <FilterIcon className="w-6 h-6 mb-3 text-muted-foreground" />
              <h3 className="font-semibold mb-2">{t('landing.comingSoon.filters.title')}</h3>
              <p className="text-muted-foreground text-sm">
                {t('landing.comingSoon.filters.desc')}
              </p>
            </div>
            <div className="p-6 border border-border rounded-xl">
              <HistoryIcon className="w-6 h-6 mb-3 text-muted-foreground" />
              <h3 className="font-semibold mb-2">{t('landing.comingSoon.history.title')}</h3>
              <p className="text-muted-foreground text-sm">
                {t('landing.comingSoon.history.desc')}
              </p>
            </div>
            <div className="p-6 border border-border rounded-xl">
              <CalendarIcon className="w-6 h-6 mb-3 text-muted-foreground" />
              <h3 className="font-semibold mb-2">{t('landing.comingSoon.schedule.title')}</h3>
              <p className="text-muted-foreground text-sm">
                {t('landing.comingSoon.schedule.desc')}
              </p>
            </div>
            <div className="p-6 border border-border rounded-xl">
              <BuildingIcon className="w-6 h-6 mb-3 text-muted-foreground" />
              <h3 className="font-semibold mb-2">{t('landing.comingSoon.organizations.title')}</h3>
              <p className="text-muted-foreground text-sm">
                {t('landing.comingSoon.organizations.desc')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section className="py-20 bg-muted/30 border-y border-border">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
            {t('landing.useCases.title')}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-background p-6 rounded-xl border border-border">
              <BriefcaseIcon className="w-6 h-6 mb-3 text-muted-foreground" />
              <h3 className="font-semibold mb-2">{t('landing.useCases.interviews.title')}</h3>
              <p className="text-muted-foreground text-sm">
                {t('landing.useCases.interviews.desc')}
              </p>
            </div>
            <div className="bg-background p-6 rounded-xl border border-border">
              <UserIcon className="w-6 h-6 mb-3 text-muted-foreground" />
              <h3 className="font-semibold mb-2">{t('landing.useCases.developers.title')}</h3>
              <p className="text-muted-foreground text-sm">
                {t('landing.useCases.developers.desc')}
              </p>
            </div>
            <div className="bg-background p-6 rounded-xl border border-border">
              <BuildingIcon className="w-6 h-6 mb-3 text-muted-foreground" />
              <h3 className="font-semibold mb-2">{t('landing.useCases.companies.title')}</h3>
              <p className="text-muted-foreground text-sm">
                {t('landing.useCases.companies.desc')}
              </p>
            </div>
            <div className="bg-background p-6 rounded-xl border border-border">
              <CodeIcon className="w-6 h-6 mb-3 text-muted-foreground" />
              <h3 className="font-semibold mb-2">{t('landing.useCases.openSource.title')}</h3>
              <p className="text-muted-foreground text-sm">
                {t('landing.useCases.openSource.desc')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
            {t('landing.faq.title')}
          </h2>
          <div className="space-y-6">
            <div className="border border-border rounded-xl p-6">
              <h3 className="font-semibold mb-2">{t('landing.faq.q1.question')}</h3>
              <p className="text-muted-foreground text-sm">{t('landing.faq.q1.answer')}</p>
            </div>
            <div className="border border-border rounded-xl p-6">
              <h3 className="font-semibold mb-2">{t('landing.faq.q2.question')}</h3>
              <p className="text-muted-foreground text-sm">{t('landing.faq.q2.answer')}</p>
            </div>
            <div className="border border-border rounded-xl p-6">
              <h3 className="font-semibold mb-2">{t('landing.faq.q3.question')}</h3>
              <p className="text-muted-foreground text-sm">{t('landing.faq.q3.answer')}</p>
            </div>
            <div className="border border-border rounded-xl p-6">
              <h3 className="font-semibold mb-2">{t('landing.faq.q4.question')}</h3>
              <p className="text-muted-foreground text-sm">{t('landing.faq.q4.answer')}</p>
            </div>
            <div className="border border-border rounded-xl p-6">
              <h3 className="font-semibold mb-2">{t('landing.faq.q5.question')}</h3>
              <p className="text-muted-foreground text-sm">{t('landing.faq.q5.answer')}</p>
            </div>
            <div className="border border-border rounded-xl p-6">
              <h3 className="font-semibold mb-2">{t('landing.faq.q6.question')}</h3>
              <p className="text-muted-foreground text-sm">{t('landing.faq.q6.answer')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-muted/30 border-t border-border">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            {t('landing.cta.title')}
          </h2>
          <p className="text-muted-foreground mb-8">
            {t('landing.cta.subtitle')}
          </p>
          <Button size="lg" onClick={handleOrderClick}>
            <GitHubIcon className="w-5 h-5 mr-2" />
            {t('landing.cta.button')}
          </Button>
        </div>
      </section>

      {/* Footer */}
      <Footer />

      {/* Disclaimer Popup */}
      {showDisclaimer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background border border-border rounded-xl max-w-lg w-full p-6 relative">
            <button
              onClick={() => setShowDisclaimer(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <XIcon className="w-5 h-5" />
            </button>

            <div className="flex items-start gap-3 mb-4">
              <AlertTriangleIcon className="w-6 h-6 text-amber-500 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-semibold mb-2">
                  {t('landing.disclaimer.title')}
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  {t('landing.disclaimer.text')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('landing.disclaimer.text2')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <Button
                variant="secondary"
                onClick={() => setShowDisclaimer(false)}
                className="flex-1"
              >
                {t('common.cancel')}
              </Button>
              <Button onClick={handleAccept} className="flex-1">
                <GitHubIcon className="w-4 h-4 mr-2" />
                {t('landing.disclaimer.accept')}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center mt-4">
              {t('landing.disclaimer.legalLink')}{' '}
              <a href="/legal" className="underline hover:text-foreground">
                {t('landing.disclaimer.legalLinkText')}
              </a>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
