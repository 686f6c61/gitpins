/**
 * GitPins - Control the order of your GitHub repositories
 * @author 686f6c61
 * @repository https://github.com/686f6c61/gitpins
 * @created 2025
 * @license MIT
 *
 * Help Content Component
 * Main content for the help/documentation page.
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui'
import {
  PinIcon,
  GitHubIcon,
  CheckIcon,
  XIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  DownloadIcon,
  RefreshIcon,
  SettingsIcon,
  HistoryIcon,
  GripVerticalIcon,
  StarIcon,
} from '@/components/icons'
import { ThemeToggle } from '@/components/theme-toggle'
import { LanguageToggle } from '@/components/language-toggle'
import { Footer } from '@/components/footer'
import { useTranslation } from '@/i18n'

/** Interactive drag demo component */
function DragDemo() {
  const { t } = useTranslation()
  const [pinnedRepos, setPinnedRepos] = useState([
    { name: 'my-awesome-project', stars: 142 },
    { name: 'react-components', stars: 89 },
  ])
  const [poolRepos] = useState([
    { name: 'old-experiment', stars: 12 },
    { name: 'dotfiles', stars: 5 },
    { name: 'learning-rust', stars: 3 },
  ])

  const handleRemove = (index: number) => {
    setPinnedRepos(prev => prev.filter((_, i) => i !== index))
  }

  const handleAdd = (repo: { name: string; stars: number }) => {
    if (pinnedRepos.length < 3) {
      setPinnedRepos(prev => [...prev, repo])
    }
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Pinned zone */}
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="bg-muted/50 px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <PinIcon className="w-4 h-4" />
            <span className="font-medium text-sm">{t('help.demo.pinnedZone')}</span>
            <span className="text-xs text-muted-foreground">({pinnedRepos.length}/3)</span>
          </div>
        </div>
        <div className="p-2 min-h-[120px]">
          {pinnedRepos.length === 0 ? (
            <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
              {t('help.demo.dragHere')}
            </div>
          ) : (
            <div className="space-y-2">
              {pinnedRepos.map((repo, index) => (
                <div
                  key={repo.name}
                  className="flex items-center gap-3 p-3 bg-background border border-border rounded-lg"
                >
                  <GripVerticalIcon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium flex-1">{repo.name}</span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <StarIcon className="w-3 h-3" />
                    {repo.stars}
                  </span>
                  <button
                    onClick={() => handleRemove(index)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <XIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pool zone */}
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="bg-muted/50 px-4 py-3 border-b border-border">
          <span className="font-medium text-sm text-muted-foreground">{t('help.demo.allRepos')}</span>
        </div>
        <div className="p-2">
          <div className="space-y-2">
            {poolRepos.map((repo) => {
              const isAdded = pinnedRepos.some(p => p.name === repo.name)
              return (
                <div
                  key={repo.name}
                  className={`flex items-center gap-3 p-3 border border-border rounded-lg ${
                    isAdded ? 'opacity-50' : 'bg-background cursor-pointer hover:bg-muted/50'
                  }`}
                  onClick={() => !isAdded && handleAdd(repo)}
                >
                  <GripVerticalIcon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm flex-1">{repo.name}</span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <StarIcon className="w-3 h-3" />
                    {repo.stars}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

/** Collapsible FAQ item */
function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border border-border rounded-xl">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <span className="font-medium">{question}</span>
        {open ? (
          <ChevronUpIcon className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronDownIcon className="w-5 h-5 text-muted-foreground" />
        )}
      </button>
      {open && (
        <div className="px-4 pb-4 text-sm text-muted-foreground">
          {answer}
        </div>
      )}
    </div>
  )
}

export function HelpContent() {
  const { t } = useTranslation()

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 bg-background z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <PinIcon className="w-6 h-6" />
            <span className="text-xl font-bold">GitPins</span>
          </Link>
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <ThemeToggle />
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                {t('nav.dashboard')}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 border-b border-border">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            {t('help.hero.title')}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('help.hero.subtitle')}
          </p>
        </div>
      </section>

      {/* Table of contents */}
      <section className="py-8 border-b border-border bg-muted/30">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex flex-wrap gap-3 justify-center">
            {['quickstart', 'github-app', 'ordering', 'sync', 'strategies', 'history', 'troubleshooting'].map((id) => (
              <button
                key={id}
                onClick={() => scrollToSection(id)}
                className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-background transition-colors"
              >
                {t(`help.toc.${id}`)}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Start */}
      <section id="quickstart" className="py-16">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl font-bold mb-8">{t('help.quickstart.title')}</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="text-center">
                <div className="w-12 h-12 bg-foreground text-background rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  {step}
                </div>
                <h3 className="font-semibold mb-2">{t(`help.quickstart.step${step}.title`)}</h3>
                <p className="text-sm text-muted-foreground">
                  {t(`help.quickstart.step${step}.desc`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* GitHub App */}
      <section id="github-app" className="py-16 bg-muted/30 border-y border-border">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl font-bold mb-4">{t('help.githubApp.title')}</h2>
          <p className="text-muted-foreground mb-8">{t('help.githubApp.intro')}</p>

          {/* Permissions table */}
          <div className="mb-8">
            <h3 className="font-semibold mb-4">{t('help.githubApp.permissionsTitle')}</h3>
            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">{t('help.githubApp.permission')}</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">{t('help.githubApp.why')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="px-4 py-3 text-sm font-mono">Contents (write)</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{t('help.githubApp.perm1')}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm font-mono">Metadata (read)</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{t('help.githubApp.perm2')}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* What we can't do */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="border border-border rounded-xl p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <CheckIcon className="w-5 h-5 text-green-600" />
                {t('help.githubApp.canDo')}
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>{t('help.githubApp.can1')}</li>
                <li>{t('help.githubApp.can2')}</li>
                <li>{t('help.githubApp.can3')}</li>
                <li>{t('help.githubApp.can4')}</li>
              </ul>
            </div>
            <div className="border border-border rounded-xl p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <XIcon className="w-5 h-5 text-red-600" />
                {t('help.githubApp.cannotDo')}
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>{t('help.githubApp.cannot1')}</li>
                <li>{t('help.githubApp.cannot2')}</li>
                <li>{t('help.githubApp.cannot3')}</li>
                <li>{t('help.githubApp.cannot4')}</li>
              </ul>
            </div>
          </div>

          <p className="text-sm text-muted-foreground mt-6">
            {t('help.githubApp.verify')}{' '}
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

      {/* Ordering repos */}
      <section id="ordering" className="py-16">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl font-bold mb-4">{t('help.ordering.title')}</h2>
          <p className="text-muted-foreground mb-8">{t('help.ordering.intro')}</p>

          {/* Interactive demo */}
          <div className="mb-8">
            <h3 className="font-semibold mb-4">{t('help.ordering.demoTitle')}</h3>
            <p className="text-sm text-muted-foreground mb-4">{t('help.ordering.demoDesc')}</p>
            <DragDemo />
          </div>

          {/* What happens when you save */}
          <div className="border border-border rounded-xl p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <RefreshIcon className="w-5 h-5" />
              {t('help.ordering.saveTitle')}
            </h3>
            <ol className="space-y-3 text-sm text-muted-foreground">
              <li className="flex gap-3">
                <span className="font-mono text-foreground">1.</span>
                {t('help.ordering.save1')}
              </li>
              <li className="flex gap-3">
                <span className="font-mono text-foreground">2.</span>
                {t('help.ordering.save2')}
              </li>
              <li className="flex gap-3">
                <span className="font-mono text-foreground">3.</span>
                {t('help.ordering.save3')}
              </li>
              <li className="flex gap-3">
                <span className="font-mono text-foreground">4.</span>
                {t('help.ordering.save4')}
              </li>
            </ol>
          </div>
        </div>
      </section>

      {/* Sync configuration */}
      <section id="sync" className="py-16 bg-muted/30 border-y border-border">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl font-bold mb-4">{t('help.sync.title')}</h2>
          <p className="text-muted-foreground mb-8">{t('help.sync.intro')}</p>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Frequency */}
            <div className="border border-border rounded-xl p-6 bg-background">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <SettingsIcon className="w-5 h-5" />
                {t('help.sync.frequencyTitle')}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">{t('help.sync.frequencyDesc')}</p>
              <div className="text-sm space-y-1">
                <div className="flex justify-between py-1">
                  <span>1-2h</span>
                  <span className="text-muted-foreground">{t('help.sync.freq1')}</span>
                </div>
                <div className="flex justify-between py-1 font-medium">
                  <span>6h</span>
                  <span className="text-muted-foreground">{t('help.sync.freq6')}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>24h+</span>
                  <span className="text-muted-foreground">{t('help.sync.freq24')}</span>
                </div>
              </div>
            </div>

            {/* Preferred hour */}
            <div className="border border-border rounded-xl p-6 bg-background">
              <h3 className="font-semibold mb-4">{t('help.sync.hourTitle')}</h3>
              <p className="text-sm text-muted-foreground mb-4">{t('help.sync.hourDesc')}</p>
              <div className="bg-muted/50 rounded-lg p-4 text-sm font-mono">
                <div className="text-muted-foreground">{t('help.sync.hourExample')}</div>
                <div className="mt-2">
                  <span className="text-foreground">preferredHour: 14</span>
                  <span className="text-muted-foreground"> = 14:00 UTC</span>
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  {t('help.sync.hourNote')}
                </div>
              </div>
            </div>
          </div>

          {/* How GitHub Action works */}
          <div className="border border-border rounded-xl p-6 bg-background">
            <h3 className="font-semibold mb-4">{t('help.sync.actionTitle')}</h3>
            <p className="text-sm text-muted-foreground mb-4">{t('help.sync.actionDesc')}</p>
            <div className="bg-muted/50 rounded-lg p-4 text-sm font-mono space-y-1">
              <div className="text-muted-foreground"># .github/workflows/maintain-order.yml</div>
              <div>schedule:</div>
              <div className="pl-4">- cron: &apos;0 */6 * * *&apos;</div>
              <div className="text-muted-foreground mt-2"># {t('help.sync.actionCron')}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Commit strategies */}
      <section id="strategies" className="py-16">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl font-bold mb-4">{t('help.strategies.title')}</h2>
          <p className="text-muted-foreground mb-8">{t('help.strategies.intro')}</p>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Revert strategy */}
            <div className="border-2 border-foreground rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="font-semibold">{t('help.strategies.revertTitle')}</h3>
                <span className="text-xs px-2 py-1 bg-foreground text-background rounded-full">
                  {t('help.strategies.recommended')}
                </span>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 text-sm font-mono space-y-1 mb-4">
                <div className="text-muted-foreground"># Step 1</div>
                <div>git commit --allow-empty -m &quot;[GitPins]&quot;</div>
                <div className="text-muted-foreground mt-2"># Step 2</div>
                <div>git revert HEAD --no-edit</div>
                <div className="text-muted-foreground mt-2"># Step 3 (auto cleanup)</div>
                <div>git rebase -i HEAD~2 (drop both)</div>
              </div>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2 text-green-600">
                  <CheckIcon className="w-4 h-4" />
                  {t('help.strategies.revertPro1')}
                </li>
                <li className="flex items-center gap-2 text-green-600">
                  <CheckIcon className="w-4 h-4" />
                  {t('help.strategies.revertPro2')}
                </li>
              </ul>
            </div>

            {/* Branch strategy */}
            <div className="border border-border rounded-xl p-6">
              <h3 className="font-semibold mb-4">{t('help.strategies.branchTitle')}</h3>
              <div className="bg-muted/50 rounded-lg p-4 text-sm font-mono space-y-1 mb-4">
                <div className="text-muted-foreground"># Step 1</div>
                <div>git checkout -b gitpins-temp</div>
                <div className="text-muted-foreground mt-2"># Step 2</div>
                <div>git commit --allow-empty -m &quot;[GitPins]&quot;</div>
                <div className="text-muted-foreground mt-2"># Step 3</div>
                <div>git checkout main && git merge</div>
                <div className="text-muted-foreground mt-2"># Step 4</div>
                <div>git branch -d gitpins-temp</div>
              </div>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2 text-muted-foreground">
                  <CheckIcon className="w-4 h-4" />
                  {t('help.strategies.branchPro1')}
                </li>
                <li className="flex items-center gap-2 text-yellow-600">
                  <span className="w-4 h-4 text-center">~</span>
                  {t('help.strategies.branchCon1')}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* History & Export */}
      <section id="history" className="py-16 bg-muted/30 border-y border-border">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl font-bold mb-4">{t('help.history.title')}</h2>
          <p className="text-muted-foreground mb-8">{t('help.history.intro')}</p>

          <div className="grid md:grid-cols-3 gap-6">
            {/* What gets logged */}
            <div className="border border-border rounded-xl p-6 bg-background">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <HistoryIcon className="w-5 h-5" />
                {t('help.history.loggedTitle')}
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>{t('help.history.logged1')}</li>
                <li>{t('help.history.logged2')}</li>
                <li>{t('help.history.logged3')}</li>
                <li>{t('help.history.logged4')}</li>
              </ul>
            </div>

            {/* Export */}
            <div className="border border-border rounded-xl p-6 bg-background">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <DownloadIcon className="w-5 h-5" />
                {t('help.history.exportTitle')}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">{t('help.history.exportDesc')}</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-mono px-2 py-1 bg-muted rounded">CSV</span>
                  <span className="text-muted-foreground">{t('help.history.csv')}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-mono px-2 py-1 bg-muted rounded">JSON</span>
                  <span className="text-muted-foreground">{t('help.history.json')}</span>
                </div>
              </div>
            </div>

            {/* Restore */}
            <div className="border border-border rounded-xl p-6 bg-background">
              <h3 className="font-semibold mb-4">{t('help.history.restoreTitle')}</h3>
              <p className="text-sm text-muted-foreground mb-4">{t('help.history.restoreDesc')}</p>
              <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
                {t('help.history.restoreNote')}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Troubleshooting */}
      <section id="troubleshooting" className="py-16">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl font-bold mb-8">{t('help.troubleshooting.title')}</h2>
          <div className="space-y-4 max-w-3xl">
            <FAQItem
              question={t('help.troubleshooting.q1.q')}
              answer={t('help.troubleshooting.q1.a')}
            />
            <FAQItem
              question={t('help.troubleshooting.q2.q')}
              answer={t('help.troubleshooting.q2.a')}
            />
            <FAQItem
              question={t('help.troubleshooting.q3.q')}
              answer={t('help.troubleshooting.q3.a')}
            />
            <FAQItem
              question={t('help.troubleshooting.q4.q')}
              answer={t('help.troubleshooting.q4.a')}
            />
            <FAQItem
              question={t('help.troubleshooting.q5.q')}
              answer={t('help.troubleshooting.q5.a')}
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-muted/30 border-t border-border">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold mb-4">{t('help.cta.title')}</h2>
          <p className="text-muted-foreground mb-8">{t('help.cta.subtitle')}</p>
          <div className="flex gap-4 justify-center">
            <Link href="/dashboard">
              <Button size="lg">
                {t('help.cta.dashboard')}
              </Button>
            </Link>
            <a
              href="https://github.com/686f6c61/gitpins/issues"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="secondary" size="lg">
                <GitHubIcon className="w-5 h-5 mr-2" />
                {t('help.cta.reportIssue')}
              </Button>
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
