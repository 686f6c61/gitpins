/**
 * GitPins - Control the order of your GitHub repositories
 * @author 686f6c61
 * @repository https://github.com/686f6c61/gitpins
 * @created 2024
 * @license MIT
 *
 * How It Works Page
 * Detailed explanation of how GitPins works, including:
 * - The problem it solves
 * - Step-by-step process
 * - Commit strategies (branch vs revert)
 * - Security and permissions info
 * - Technical FAQ
 */

'use client'

import Link from 'next/link'
import { Button, Card } from '@/components/ui'
import {
  GitHubIcon,
  RefreshIcon,
  CheckIcon,
  XIcon,
} from '@/components/icons'
import { ThemeToggle } from '@/components/theme-toggle'
import { LanguageToggle } from '@/components/language-toggle'
import { Footer } from '@/components/footer'
import { useTranslation } from '@/i18n'
import { sanitizeHTML } from '@/lib/sanitize'

/**
 * How It Works page component.
 * Educational page explaining GitPins functionality and security.
 */
export default function HowItWorksPage() {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-background border-b border-border">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold">GitPins</Link>
          <div className="flex items-center gap-4">
            <LanguageToggle />
            <ThemeToggle />
            <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
              {t('nav.dashboard')}
            </Link>
            <a href="/api/auth/login">
              <Button size="sm">{t('nav.login')}</Button>
            </a>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-2">{t('howItWorksPage.title')}</h1>
        <p className="text-muted-foreground mb-12">
          {t('howItWorksPage.subtitle')}
        </p>

        {/* El problema */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4">{t('howItWorksPage.problem.title')}</h2>
          <Card>
            <p className="text-muted-foreground mb-4">
              {t('howItWorksPage.problem.p1')}
            </p>
            <p className="text-muted-foreground">
              {t('howItWorksPage.problem.p2')}
            </p>
          </Card>
        </section>

        {/* La solución */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4">{t('howItWorksPage.solution.title')}</h2>
          <Card>
            <p className="text-muted-foreground mb-4" dangerouslySetInnerHTML={{ __html: sanitizeHTML(t('howItWorksPage.solution.p1')) }} />
            <p className="text-muted-foreground">
              {t('howItWorksPage.solution.p2')}
            </p>
          </Card>
        </section>

        {/* Proceso paso a paso */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-6">{t('howItWorksPage.steps.title')}</h2>

          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center font-bold text-sm">
                1
              </div>
              <Card className="flex-1">
                <h3 className="font-medium mb-2">{t('howItWorksPage.steps.step1.title')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('howItWorksPage.steps.step1.desc')}
                </p>
              </Card>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center font-bold text-sm">
                2
              </div>
              <Card className="flex-1">
                <h3 className="font-medium mb-2">{t('howItWorksPage.steps.step2.title')}</h3>
                <p className="text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: sanitizeHTML(t('howItWorksPage.steps.step2.desc')) }} />
              </Card>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center font-bold text-sm">
                3
              </div>
              <Card className="flex-1">
                <h3 className="font-medium mb-2">{t('howItWorksPage.steps.step3.title')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('howItWorksPage.steps.step3.desc')}
                </p>
              </Card>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center font-bold text-sm">
                4
              </div>
              <Card className="flex-1">
                <h3 className="font-medium mb-2">{t('howItWorksPage.steps.step4.title')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('howItWorksPage.steps.step4.desc')}
                </p>
              </Card>
            </div>
          </div>
        </section>

        {/* Estrategias de commit */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4">{t('howItWorksPage.strategies.title')}</h2>
          <p className="text-muted-foreground mb-6">
            {t('howItWorksPage.strategies.intro')}
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <div className="flex items-center gap-2 mb-3">
                <RefreshIcon className="w-5 h-5" />
                <h3 className="font-medium">{t('howItWorksPage.strategies.revert.title')}</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {t('howItWorksPage.strategies.revert.desc')}
              </p>
              <div className="text-xs bg-muted p-3 rounded-lg font-mono">
                <div className="text-muted-foreground">{t('howItWorksPage.strategies.revert.comment')}</div>
                <div>git commit --allow-empty -m &quot;gitpins: bump&quot;</div>
                <div>git revert HEAD --no-edit</div>
                <div>git push</div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center gap-2 mb-3">
                <GitHubIcon className="w-5 h-5" />
                <h3 className="font-medium">{t('howItWorksPage.strategies.branch.title')}</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {t('howItWorksPage.strategies.branch.desc')}
              </p>
              <div className="text-xs bg-muted p-3 rounded-lg font-mono">
                <div className="text-muted-foreground">{t('howItWorksPage.strategies.branch.comment')}</div>
                <div>git checkout -b gitpins-temp</div>
                <div>git commit --allow-empty -m &quot;gitpins: bump&quot;</div>
                <div>git checkout main && git merge gitpins-temp</div>
                <div>git branch -d gitpins-temp && git push</div>
              </div>
            </Card>
          </div>
        </section>

        {/* GitHub Action */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4">{t('howItWorksPage.actionCode.title')}</h2>
          <p className="text-muted-foreground mb-6">
            {t('howItWorksPage.actionCode.intro')}
          </p>

          <Card>
            <h4 className="font-medium mb-4">{t('howItWorksPage.actionCode.whatItDoes')}</h4>
            <ol className="text-sm text-muted-foreground space-y-3">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-bold">1</span>
                <span>{t('howItWorksPage.actionCode.steps.step1')}</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-bold">2</span>
                <div>
                  <span>{t('howItWorksPage.actionCode.steps.step2')}</span>
                  <ul className="mt-2 ml-2 space-y-1 text-xs">
                    <li className="flex items-center gap-2">
                      <CheckIcon className="w-3 h-3 text-muted-foreground" />
                      {t('howItWorksPage.actionCode.steps.step2a')}
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckIcon className="w-3 h-3 text-muted-foreground" />
                      {t('howItWorksPage.actionCode.steps.step2b')}
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckIcon className="w-3 h-3 text-muted-foreground" />
                      {t('howItWorksPage.actionCode.steps.step2c')}
                    </li>
                  </ul>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-bold">3</span>
                <span>{t('howItWorksPage.actionCode.steps.step3')}</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-bold">4</span>
                <span>{t('howItWorksPage.actionCode.steps.step4')}</span>
              </li>
            </ol>

            <div className="mt-6 p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground" dangerouslySetInnerHTML={{ __html: sanitizeHTML(t('howItWorksPage.actionCode.codeLocation')) }} />
            </div>
          </Card>
        </section>

        {/* Seguridad */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4">{t('howItWorksPage.security.title')}</h2>

          {/* Permisos detallados */}
          <Card className="mb-6 border-2 border-green-500/20 bg-green-500/5">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <CheckIcon className="w-5 h-5 text-green-500" />
              {t('howItWorksPage.security.permissionsTitle')}
            </h3>
            <p className="text-sm text-muted-foreground mb-4" dangerouslySetInnerHTML={{ __html: sanitizeHTML(t('howItWorksPage.security.permissionsIntro')) }} />

            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-background rounded-lg p-4 border border-border">
                <h4 className="font-medium text-green-600 mb-3 text-sm">{t('howItWorksPage.security.canDo.title')}</h4>
                <ul className="text-xs space-y-2 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckIcon className="w-3 h-3 text-green-500 mt-0.5 shrink-0" />
                    <span>{t('howItWorksPage.security.canDo.item1')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckIcon className="w-3 h-3 text-green-500 mt-0.5 shrink-0" />
                    <span>{t('howItWorksPage.security.canDo.item2')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckIcon className="w-3 h-3 text-green-500 mt-0.5 shrink-0" />
                    <span>{t('howItWorksPage.security.canDo.item3')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckIcon className="w-3 h-3 text-green-500 mt-0.5 shrink-0" />
                    <span>{t('howItWorksPage.security.canDo.item4')}</span>
                  </li>
                </ul>
              </div>

              <div className="bg-background rounded-lg p-4 border border-border">
                <h4 className="font-medium text-red-600 mb-3 text-sm">{t('howItWorksPage.security.cannotDo.title')}</h4>
                <ul className="text-xs space-y-2 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <XIcon className="w-3 h-3 text-red-500 mt-0.5 shrink-0" />
                    <span dangerouslySetInnerHTML={{ __html: sanitizeHTML(t('howItWorksPage.security.cannotDo.item1')) }} />
                  </li>
                  <li className="flex items-start gap-2">
                    <XIcon className="w-3 h-3 text-red-500 mt-0.5 shrink-0" />
                    <span>{t('howItWorksPage.security.cannotDo.item2')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <XIcon className="w-3 h-3 text-red-500 mt-0.5 shrink-0" />
                    <span>{t('howItWorksPage.security.cannotDo.item3')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <XIcon className="w-3 h-3 text-red-500 mt-0.5 shrink-0" />
                    <span>{t('howItWorksPage.security.cannotDo.item4')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <XIcon className="w-3 h-3 text-red-500 mt-0.5 shrink-0" />
                    <span>{t('howItWorksPage.security.cannotDo.item5')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <XIcon className="w-3 h-3 text-red-500 mt-0.5 shrink-0" />
                    <span>{t('howItWorksPage.security.cannotDo.item6')}</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-4 p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">
                <span dangerouslySetInnerHTML={{ __html: sanitizeHTML(t('howItWorksPage.security.technicalNote')) }} />{' '}
                <a
                  href="https://github.com/settings/installations"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-foreground"
                >
                  {t('howItWorksPage.security.installationsLink')}
                </a>
              </p>
            </div>
          </Card>

          <Card>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CheckIcon className="w-5 h-5 text-green-500 mt-0.5" />
                <div>
                  <h4 className="font-medium">{t('howItWorksPage.security.noCodeStorage.title')}</h4>
                  <p className="text-sm text-muted-foreground">
                    {t('howItWorksPage.security.noCodeStorage.desc')}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckIcon className="w-5 h-5 text-green-500 mt-0.5" />
                <div>
                  <h4 className="font-medium">{t('howItWorksPage.security.runsOnYourAccount.title')}</h4>
                  <p className="text-sm text-muted-foreground">
                    {t('howItWorksPage.security.runsOnYourAccount.desc')}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckIcon className="w-5 h-5 text-green-500 mt-0.5" />
                <div>
                  <h4 className="font-medium">{t('howItWorksPage.security.canDisable.title')}</h4>
                  <p className="text-sm text-muted-foreground">
                    {t('howItWorksPage.security.canDisable.desc')}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckIcon className="w-5 h-5 text-green-500 mt-0.5" />
                <div>
                  <h4 className="font-medium">{t('howItWorksPage.security.openSource.title')}</h4>
                  <p className="text-sm text-muted-foreground">
                    {t('howItWorksPage.security.openSource.desc')}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </section>

        {/* FAQ técnico */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4">{t('howItWorksPage.faq.title')}</h2>

          <div className="space-y-4">
            <Card>
              <h3 className="font-medium mb-2">{t('howItWorksPage.faq.affectsCode.q')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('howItWorksPage.faq.affectsCode.a')}
              </p>
            </Card>

            <Card>
              <h3 className="font-medium mb-2">{t('howItWorksPage.faq.actionsMinutes.q')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('howItWorksPage.faq.actionsMinutes.a')}
              </p>
            </Card>

            <Card>
              <h3 className="font-medium mb-2">{t('howItWorksPage.faq.privateRepos.q')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('howItWorksPage.faq.privateRepos.a')}
              </p>
            </Card>

            <Card>
              <h3 className="font-medium mb-2">{t('howItWorksPage.faq.whatIfPush.q')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('howItWorksPage.faq.whatIfPush.a')}
              </p>
            </Card>

            <Card>
              <h3 className="font-medium mb-2">{t('howItWorksPage.faq.canPause.q')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('howItWorksPage.faq.canPause.a')}
              </p>
            </Card>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center py-8">
          <h2 className="text-xl font-semibold mb-4">{t('howItWorksPage.cta.title')}</h2>
          <a href="/api/auth/login">
            <Button size="lg">
              <GitHubIcon className="w-5 h-5 mr-2" />
              {t('howItWorksPage.cta.button')}
            </Button>
          </a>
        </section>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}
