/**
 * GitPins - Control the order of your GitHub repositories
 * @author 686f6c61
 * @repository https://github.com/686f6c61/gitpins
 * @created 2024
 * @license MIT
 *
 * Dashboard Client Component
 * Main interactive dashboard with drag-and-drop repository ordering.
 * Uses dnd-kit for drag functionality across two zones:
 * - Top zone: Pinned repositories (up to topN)
 * - Pool zone: All other repositories
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  useDroppable,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { Button, Card } from '@/components/ui'
import { LogOutIcon, RefreshIcon, SettingsIcon, LoaderIcon, CheckIcon, PinIcon, HelpCircleIcon } from '@/components/icons'
import { ThemeToggle } from '@/components/theme-toggle'
import { LanguageToggle } from '@/components/language-toggle'
import { SortableRepoItem } from './sortable-repo-item'
import { SettingsModal } from './settings-modal'
import { Footer } from '@/components/footer'
import { useTranslation } from '@/i18n'
import type { Repo, RepoOrderSettings } from '@/types'

/** Props for the DashboardClient component */
interface DashboardClientProps {
  user: {
    username: string
    avatarUrl: string | null
  }
}

/**
 * Droppable zone component for drag-and-drop.
 * Highlights when items are dragged over it.
 */
function DroppableZone({ id, children, className }: { id: string; children: React.ReactNode; className?: string }) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div
      ref={setNodeRef}
      className={`${className} ${isOver ? 'ring-2 ring-foreground ring-offset-2' : ''}`}
    >
      {children}
    </div>
  )
}

/**
 * Main dashboard client component.
 * Manages repo fetching, drag-and-drop ordering, and sync configuration.
 */
export function DashboardClient({ user }: DashboardClientProps) {
  const { t, locale } = useTranslation()
  const [repos, setRepos] = useState<Repo[]>([])
  const [pinnedRepos, setPinnedRepos] = useState<string[]>([]) // fullNames de repos pinneados
  const [settings, setSettings] = useState<RepoOrderSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [creatingConfig, setCreatingConfig] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showDisclaimer, setShowDisclaimer] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    fetchRepos()
  }, [])

  // Repos filtrados por privacidad
  const filteredRepos = useMemo(() => {
    if (!settings) return repos
    if (settings.includePrivate) return repos
    return repos.filter(r => !r.isPrivate)
  }, [repos, settings?.includePrivate])

  // Repos en la zona top (pinneados) y en el pool
  const topRepos = useMemo(() => {
    return pinnedRepos
      .map(fullName => filteredRepos.find(r => r.fullName === fullName))
      .filter((r): r is Repo => r !== undefined)
  }, [pinnedRepos, filteredRepos])

  const poolRepos = useMemo(() => {
    return filteredRepos.filter(r => !pinnedRepos.includes(r.fullName))
  }, [filteredRepos, pinnedRepos])

  const activeRepo = useMemo(() => {
    if (!activeId) return null
    return filteredRepos.find(r => r.fullName === activeId) || null
  }, [activeId, filteredRepos])

  async function fetchRepos() {
    setLoading(true)
    try {
      const response = await fetch('/api/repos')
      const data = await response.json()
      setRepos(data.repos)

      const loadedSettings = data.settings || {
        topN: 10,
        includePrivate: true,
        syncFrequency: 6,
        autoEnabled: true,
        commitStrategy: 'revert',
        autoCleanup: false,
        configRepoName: 'gitpins-config',
        configRepoCreated: false,
      }
      setSettings(loadedSettings)

      // Cargar repos pinneados del orden guardado
      if (data.savedOrder && data.savedOrder.length > 0) {
        const topN = loadedSettings.topN || 10
        setPinnedRepos(data.savedOrder.slice(0, topN))
      }
    } catch (error) {
      console.error('Error fetching repos:', error)
    } finally {
      setLoading(false)
    }
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const activeFullName = active.id as string
    const overFullName = over.id as string
    const isActiveInTop = pinnedRepos.includes(activeFullName)
    const isOverInTop = pinnedRepos.includes(overFullName) || overFullName === 'top-zone'
    const isOverPool = overFullName === 'pool-zone'

    // Mover de pool a top
    if (!isActiveInTop && isOverInTop) {
      const maxTop = settings?.topN || 10

      // Si ya está lleno, auto-incrementar el límite
      if (pinnedRepos.length >= maxTop) {
        setSettings(prev => prev ? { ...prev, topN: maxTop + 1 } : null)
      }

      if (overFullName === 'top-zone') {
        // Soltar en la zona vacía - añadir al final
        setPinnedRepos(prev => [...prev, activeFullName])
      } else {
        // Soltar sobre un repo específico - insertar en esa posición
        const overIndex = pinnedRepos.indexOf(overFullName)
        setPinnedRepos(prev => {
          const newPinned = [...prev]
          newPinned.splice(overIndex, 0, activeFullName)
          return newPinned
        })
      }
      setHasChanges(true)
      return
    }

    // Mover de top a pool (despin)
    if (isActiveInTop && isOverPool) {
      setPinnedRepos(prev => prev.filter(name => name !== activeFullName))
      setHasChanges(true)
      return
    }

    // Reordenar dentro del top
    if (isActiveInTop && isOverInTop && activeFullName !== overFullName && overFullName !== 'top-zone') {
      const oldIndex = pinnedRepos.indexOf(activeFullName)
      const newIndex = pinnedRepos.indexOf(overFullName)
      setPinnedRepos(prev => arrayMove(prev, oldIndex, newIndex))
      setHasChanges(true)
    }
  }

  function handleRemoveFromPinned(repoFullName: string) {
    setPinnedRepos(prev => prev.filter(name => name !== repoFullName))
    setHasChanges(true)
  }

  async function saveOrder() {
    setSaving(true)
    try {
      // Solo guardar los repos pinneados
      // El resto permanecerá en su orden natural de GitHub
      const response = await fetch('/api/repos/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reposOrder: pinnedRepos,
          topN: pinnedRepos.length,
          ...settings,
        }),
      })

      if (response.ok) {
        setHasChanges(false)
        // Actualizar settings con el nuevo topN
        setSettings(prev => prev ? { ...prev, topN: pinnedRepos.length } : null)
      }
    } catch (error) {
      console.error('Error saving order:', error)
    } finally {
      setSaving(false)
    }
  }

  function handleSettingsChange(newSettings: Partial<RepoOrderSettings>) {
    setSettings((prev) => (prev ? { ...prev, ...newSettings } : null))

    // Si cambió topN, ajustar los pinneados
    if (newSettings.topN !== undefined) {
      if (newSettings.topN < pinnedRepos.length) {
        setPinnedRepos(prev => prev.slice(0, newSettings.topN))
      }
    }

    setHasChanges(true)
  }

  function handleCreateRepoClick() {
    // Mostrar el popup de disclaimer primero
    setShowDisclaimer(true)
  }

  async function createConfigRepo() {
    setShowDisclaimer(false)

    // Si hay cambios sin guardar, preguntar al usuario
    if (hasChanges) {
      const confirmSave = window.confirm(t('dashboard.confirmUnsavedChanges'))
      if (confirmSave) {
        await saveOrder()
      }
    }

    setCreatingConfig(true)
    try {
      const response = await fetch('/api/config/create', {
        method: 'POST',
      })

      if (response.ok) {
        const data = await response.json()
        setSettings((prev) => (prev ? { ...prev, configRepoCreated: true } : null))
        window.open(data.repoUrl, '_blank')
      }
    } catch (error) {
      console.error('Error creating config repo:', error)
    } finally {
      setCreatingConfig(false)
    }
  }

  async function handleSyncNow() {
    if (!settings?.syncSecret) {
      setSyncMessage({ type: 'error', text: t('dashboard.syncNow.noSecret') })
      return
    }

    setSyncing(true)
    setSyncMessage(null)

    try {
      const response = await fetch(`/api/sync/${settings.syncSecret}`, {
        method: 'POST',
      })

      const data = await response.json()

      if (response.ok) {
        if (data.skipped) {
          setSyncMessage({ type: 'info', text: t('dashboard.syncNow.alreadyOrdered') })
        } else {
          setSyncMessage({
            type: 'success',
            text: t('dashboard.syncNow.success', {
              synced: data.synced || 0,
              failed: data.failed || 0
            })
          })
        }
      } else {
        setSyncMessage({ type: 'error', text: data.error || t('dashboard.syncNow.error') })
      }
    } catch (error) {
      console.error('Sync error:', error)
      setSyncMessage({ type: 'error', text: t('dashboard.syncNow.error') })
    } finally {
      setSyncing(false)
      // Limpiar mensaje después de 5 segundos
      setTimeout(() => setSyncMessage(null), 5000)
    }
  }

  const maxPinned = settings?.topN || 10
  const slotsRemaining = maxPinned - pinnedRepos.length

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-background border-b border-border sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <a href="/" className="text-xl font-bold flex items-center gap-2">
              <PinIcon className="w-5 h-5" />
              GitPins
            </a>

          <div className="flex items-center gap-3">
            <LanguageToggle />
            <ThemeToggle />
            <a href="/how-it-works">
              <Button variant="ghost" size="sm">
                <HelpCircleIcon className="w-4 h-4" />
              </Button>
            </a>
            <Button variant="ghost" size="sm" onClick={() => setShowSettings(true)}>
              <SettingsIcon className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={fetchRepos}>
              <RefreshIcon className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2 pl-3 border-l border-border">
              {user.avatarUrl && (
                <img
                  src={user.avatarUrl}
                  alt={user.username}
                  className="w-8 h-8 rounded-full"
                />
              )}
              <span className="text-sm font-medium">{user.username}</span>
            </div>
            <a href="/api/auth/logout">
              <Button variant="ghost" size="sm">
                <LogOutIcon className="w-4 h-4" />
              </Button>
            </a>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <LoaderIcon className="w-8 h-8 text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Save bar */}
            {hasChanges && (
              <div className="bg-foreground text-background rounded-lg p-4 mb-6 flex items-center justify-between">
                <span className="text-sm">{t('dashboard.unsavedChanges')}</span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={saveOrder}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <LoaderIcon className="w-4 h-4 mr-2" />
                      {t('dashboard.saving')}
                    </>
                  ) : (
                    t('dashboard.saveOrder')
                  )}
                </Button>
              </div>
            )}

            {/* Config repo banner */}
            {settings && !settings.configRepoCreated && pinnedRepos.length > 0 && (
              <Card className="mb-6 bg-muted/50">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium mb-1">{t('dashboard.activateSync.title')}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t('dashboard.activateSync.desc')}
                    </p>
                  </div>
                  <Button onClick={handleCreateRepoClick} disabled={creatingConfig}>
                    {creatingConfig ? (
                      <>
                        <LoaderIcon className="w-4 h-4 mr-2" />
                        {t('dashboard.creating')}
                      </>
                    ) : (
                      t('dashboard.createRepo')
                    )}
                  </Button>
                </div>
              </Card>
            )}

            {settings?.configRepoCreated && (
              <>
                {/* Sync Status */}
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckIcon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{t('dashboard.syncActive')}</span>
                    <a
                      href={`https://github.com/${user.username}/${settings.configRepoName}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground underline"
                    >
                      {t('dashboard.viewRepo')}
                    </a>
                  </div>
                  <button
                    onClick={handleSyncNow}
                    disabled={syncing}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {syncing ? (
                      <>
                        <LoaderIcon className="w-4 h-4" />
                        <span>{t('dashboard.syncNow.syncing')}</span>
                      </>
                    ) : (
                      <>
                        <RefreshIcon className="w-4 h-4" />
                        <span>{t('dashboard.syncNow.button')}</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Sync Message */}
                {syncMessage && (
                  <div className={`mb-6 p-3 rounded-lg border text-sm ${
                    syncMessage.type === 'success' ? 'bg-muted/50 border-border text-foreground' :
                    syncMessage.type === 'error' ? 'bg-muted/50 border-border text-foreground' :
                    'bg-muted/50 border-border text-muted-foreground'
                  }`}>
                    {syncMessage.text}
                  </div>
                )}
              </>
            )}

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              {/* Top Zone - Pinned repos */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <PinIcon className="w-5 h-5" />
                    <h2 className="text-lg font-semibold">
                      {t('dashboard.pinnedRepos.title')}
                    </h2>
                    <span className="text-sm text-muted-foreground">
                      ({pinnedRepos.length}/{maxPinned})
                    </span>
                  </div>
                  <button
                    onClick={() => setShowSettings(true)}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    {t('dashboard.pinnedRepos.changeLimit')} ({maxPinned})
                  </button>
                </div>

                <DroppableZone id="top-zone" className="rounded-xl transition-all">
                  <Card className="p-0 overflow-hidden min-h-[120px]">
                    {topRepos.length === 0 ? (
                      <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                        <div className="text-center">
                          <PinIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p>{t('dashboard.pinnedRepos.emptyTitle')}</p>
                          <p className="text-xs mt-1">{t('dashboard.pinnedRepos.emptyDesc', { max: maxPinned })}</p>
                        </div>
                      </div>
                    ) : (
                      <SortableContext
                        items={topRepos.map((r) => r.fullName)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="divide-y divide-border">
                          {topRepos.map((repo, index) => (
                            <SortableRepoItem
                              key={repo.fullName}
                              repo={repo}
                              index={index}
                              isTop
                              onRemove={() => handleRemoveFromPinned(repo.fullName)}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    )}

                    {slotsRemaining > 0 && topRepos.length > 0 && (
                      <div className="px-4 py-3 bg-muted/30 text-center text-sm text-muted-foreground border-t border-border">
                        {t('dashboard.pinnedRepos.slotsAvailable', { count: slotsRemaining })}
                      </div>
                    )}
                  </Card>
                </DroppableZone>
              </div>

              {/* Pool Zone - All other repos */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-muted-foreground">
                    {t('dashboard.allRepos.title')} ({poolRepos.length})
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    {t('dashboard.allRepos.dragHint')}
                  </span>
                </div>

                <DroppableZone id="pool-zone" className="rounded-xl transition-all">
                  <Card className="p-0 overflow-hidden">
                    <SortableContext
                      items={poolRepos.map((r) => r.fullName)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="divide-y divide-border">
                        {poolRepos.map((repo, index) => (
                          <SortableRepoItem
                            key={repo.fullName}
                            repo={repo}
                            index={index}
                            isTop={false}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </Card>
                </DroppableZone>
              </div>

              {/* Drag Overlay */}
              <DragOverlay>
                {activeRepo ? (
                  <div className="bg-background border border-border rounded-lg shadow-lg p-4 opacity-90">
                    <div className="font-medium">{activeRepo.name}</div>
                    <div className="text-sm text-muted-foreground">{activeRepo.fullName}</div>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </>
        )}
      </main>

      {/* Footer */}
      <Footer />

      {/* Settings Modal */}
      {showSettings && settings && (
        <SettingsModal
          settings={settings}
          totalRepos={filteredRepos.length}
          onClose={() => setShowSettings(false)}
          onChange={handleSettingsChange}
        />
      )}

      {/* Disclaimer Modal */}
      {showDisclaimer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background border border-border rounded-xl max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-semibold mb-4">
              {t('dashboard.disclaimerPopup.title')}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t('dashboard.disclaimerPopup.text')}
            </p>
            <ul className="text-sm text-muted-foreground space-y-2 mb-6">
              {[1, 2, 3, 4].map((i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-foreground mt-1">•</span>
                  <span>{t(`dashboard.disclaimerPopup.item${i}`)}</span>
                </li>
              ))}
            </ul>
            <div className="flex gap-3 justify-end">
              <Button
                variant="ghost"
                onClick={() => setShowDisclaimer(false)}
              >
                {t('dashboard.disclaimerPopup.cancel')}
              </Button>
              <Button onClick={createConfigRepo}>
                {t('dashboard.disclaimerPopup.accept')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
