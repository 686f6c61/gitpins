/**
 * GitPins - Control the order of your GitHub repositories
 * @author 686f6c61
 * @repository https://github.com/686f6c61/gitpins
 * @created 2024
 * @license MIT
 *
 * Automatic Cleanup Section Component
 * Allows users to automatically remove GitPins commits with one click.
 */

'use client'

import { useState, useEffect } from 'react'

interface RepoCommitInfo {
  repo: string
  gitpinsCommits: number
  totalCommits: number
  lastGitpinsCommit?: {
    message: string
    date: string
  }
}

interface CleanupResult {
  repo: string
  status: string
  method: string
  removedCommits?: number
  error?: string
}

interface CleanupSectionProps {
  language: 'en' | 'es'
}

export function CleanupSectionAuto({ language }: CleanupSectionProps) {
  const [repos, setRepos] = useState<RepoCommitInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedRepos, setSelectedRepos] = useState<Set<string>>(new Set())
  const [cleaningUp, setCleaningUp] = useState(false)
  const [cleanupResults, setCleanupResults] = useState<CleanupResult[] | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    fetchGitPinsCommits()
  }, [])

  const fetchGitPinsCommits = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/repos/gitpins-commits')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch commits')
      }

      const reposWithGitPins = data.repos.filter((r: RepoCommitInfo) => r.gitpinsCommits > 0)
      setRepos(reposWithGitPins)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const toggleRepoSelection = (repo: string) => {
    const newSelection = new Set(selectedRepos)
    if (newSelection.has(repo)) {
      newSelection.delete(repo)
    } else {
      newSelection.add(repo)
    }
    setSelectedRepos(newSelection)
  }

  const handleCleanup = async (reposToClean: string[]) => {
    if (reposToClean.length === 0) return

    setCleaningUp(true)
    setCleanupResults(null)
    setShowConfirm(false)

    try {
      const response = await fetch('/api/repos/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repos: reposToClean }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Cleanup failed')
      }

      setCleanupResults(data.results)

      // Refresh the list
      await fetchGitPinsCommits()
      setSelectedRepos(new Set())

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cleanup failed')
    } finally {
      setCleaningUp(false)
    }
  }

  const handleCleanupClick = (repos: string[]) => {
    setShowConfirm(true)
  }

  const confirmCleanup = () => {
    const reposToClean = Array.from(selectedRepos)
    handleCleanup(reposToClean)
  }

  const content = language === 'en' ? {
    title: 'Clean Up GitPins Commits',
    toggleButton: 'Manage Cleanup',
    description: 'GitPins creates empty commits to maintain repository order. Once your repos are ordered, you can safely remove these commits automatically.',
    warning: 'Warning: This will rewrite git history. A backup branch will be created automatically.',
    noCommits: 'You have no GitPins commits to clean up.',
    loading: 'Loading repositories...',
    error: 'Error:',
    retry: 'Retry',
    commitsCount: (count: number) => `${count} GitPins commit${count !== 1 ? 's' : ''}`,
    cleanUp: 'Clean Up',
    cleaning: 'Cleaning...',
    selectAll: 'Select All',
    deselectAll: 'Deselect All',
    cleanupSelected: (count: number) => `Clean Up ${count} Selected`,
    confirmTitle: 'Confirm Cleanup',
    confirmMessage: (count: number) => `Are you sure you want to clean up ${count} repositor${count !== 1 ? 'ies' : 'y'}? This will remove all GitPins commits and create a backup branch.`,
    confirmYes: 'Yes, Clean Up',
    confirmNo: 'Cancel',
    resultsTitle: 'Cleanup Results',
    success: 'Success',
    failed: 'Failed',
    removed: (count: number) => `Removed ${count} commits`,
  } : {
    title: 'Limpiar Commits de GitPins',
    toggleButton: 'Gestionar Limpieza',
    description: 'GitPins crea commits vacíos para mantener el orden. Una vez ordenados, puedes eliminar estos commits automáticamente.',
    warning: 'Advertencia: Esto reescribirá el historial. Se creará una rama de respaldo automáticamente.',
    noCommits: 'No tienes commits de GitPins para limpiar.',
    loading: 'Cargando repositorios...',
    error: 'Error:',
    retry: 'Reintentar',
    commitsCount: (count: number) => `${count} commit${count !== 1 ? 's' : ''} de GitPins`,
    cleanUp: 'Limpiar',
    cleaning: 'Limpiando...',
    selectAll: 'Seleccionar Todos',
    deselectAll: 'Deseleccionar Todos',
    cleanupSelected: (count: number) => `Limpiar ${count} Seleccionado${count !== 1 ? 's' : ''}`,
    confirmTitle: 'Confirmar Limpieza',
    confirmMessage: (count: number) => `¿Estás seguro de limpiar ${count} repositorio${count !== 1 ? 's' : ''}? Esto eliminará todos los commits de GitPins y creará una rama de respaldo.`,
    confirmYes: 'Sí, Limpiar',
    confirmNo: 'Cancelar',
    resultsTitle: 'Resultados de Limpieza',
    success: 'Éxito',
    failed: 'Falló',
    removed: (count: number) => `Eliminados ${count} commits`,
  }

  // Simple collapsed button initially
  if (!isExpanded) {
    return (
      <div className="mb-6 flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">{content.title}</span>
        <button
          onClick={() => setIsExpanded(true)}
          className="text-muted-foreground hover:text-foreground underline"
        >
          {content.toggleButton}
        </button>
      </div>
    )
  }

  // Loading state
  if (loading) {
    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm mb-4">
          <span className="text-muted-foreground">{content.title}</span>
          <button
            onClick={() => setIsExpanded(false)}
            className="text-muted-foreground hover:text-foreground underline"
          >
            {content.toggleButton}
          </button>
        </div>
        <div className="bg-background border border-border rounded-lg p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
            <span className="ml-3 text-muted-foreground">{content.loading}</span>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error && !cleanupResults) {
    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm mb-4">
          <span className="text-muted-foreground">{content.title}</span>
          <button
            onClick={() => setIsExpanded(false)}
            className="text-muted-foreground hover:text-foreground underline"
          >
            {content.toggleButton}
          </button>
        </div>
        <div className="bg-background border border-border rounded-lg p-6">
          <p className="text-foreground mb-4">{content.error} {error}</p>
          <button
            onClick={fetchGitPinsCommits}
            className="px-4 py-2 bg-foreground text-background rounded hover:opacity-90"
          >
            {content.retry}
          </button>
        </div>
      </div>
    )
  }

  // No commits state
  if (repos.length === 0 && !cleanupResults) {
    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm mb-4">
          <span className="text-muted-foreground">{content.title}</span>
          <button
            onClick={() => setIsExpanded(false)}
            className="text-muted-foreground hover:text-foreground underline"
          >
            {content.toggleButton}
          </button>
        </div>
        <div className="bg-background border border-border rounded-lg p-6 text-center">
          <p className="text-muted-foreground">{content.noCommits}</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm mb-4">
          <span className="text-muted-foreground">{content.title}</span>
          <button
            onClick={() => setIsExpanded(false)}
            className="text-muted-foreground hover:text-foreground underline"
          >
            {content.toggleButton}
          </button>
        </div>

        <div className="bg-background border border-border rounded-lg p-6">
          <p className="text-muted-foreground mb-4 text-sm">
            {content.description}
          </p>

          <div className="mb-4 p-3 bg-muted/30 border border-border rounded">
            <p className="text-sm text-muted-foreground">
              {content.warning}
            </p>
          </div>

          {/* Results */}
          {cleanupResults && (
            <div className="mb-4 p-4 bg-muted/30 border border-border rounded">
              <h4 className="font-bold text-foreground mb-2">
                {content.resultsTitle}
              </h4>
              <div className="space-y-2">
                {cleanupResults.map((result, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-foreground">{result.repo}</span>
                    {result.status === 'success' ? (
                      <span className="text-muted-foreground">
                        {content.success} - {content.removed(result.removedCommits || 0)}
                      </span>
                    ) : (
                      <span className="text-foreground">
                        {content.failed}: {result.error}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Controls */}
          {repos.length > 0 && (
            <>
              <div className="flex justify-between items-center mb-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (selectedRepos.size === repos.length) {
                        setSelectedRepos(new Set())
                      } else {
                        setSelectedRepos(new Set(repos.map(r => r.repo)))
                      }
                    }}
                    disabled={cleaningUp}
                    className="px-3 py-1 text-sm bg-muted text-foreground rounded hover:bg-muted/80 disabled:opacity-50"
                  >
                    {selectedRepos.size === repos.length ? content.deselectAll : content.selectAll}
                  </button>
                </div>

                {selectedRepos.size > 0 && (
                  <button
                    onClick={() => handleCleanupClick(Array.from(selectedRepos))}
                    disabled={cleaningUp}
                    className="px-4 py-2 bg-foreground text-background rounded hover:opacity-90 text-sm font-medium disabled:opacity-50 flex items-center gap-2"
                  >
                    {cleaningUp ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-background"></div>
                        {content.cleaning}
                      </>
                    ) : (
                      content.cleanupSelected(selectedRepos.size)
                    )}
                  </button>
                )}
              </div>

              {/* Repos list */}
              <div className="space-y-2">
                {repos.map(repoInfo => (
                  <div
                    key={repoInfo.repo}
                    className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <input
                        type="checkbox"
                        checked={selectedRepos.has(repoInfo.repo)}
                        onChange={() => toggleRepoSelection(repoInfo.repo)}
                        disabled={cleaningUp}
                        className="w-4 h-4 rounded disabled:opacity-50"
                      />

                      <div className="flex-1">
                        <p className="font-medium text-foreground">
                          {repoInfo.repo}
                        </p>
                        <p className="text-sm text-muted-foreground font-mono">
                          {content.commitsCount(repoInfo.gitpinsCommits)}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleCleanup([repoInfo.repo])}
                      disabled={cleaningUp}
                      className="px-4 py-2 bg-foreground text-background rounded hover:opacity-90 text-sm font-medium whitespace-nowrap ml-4 disabled:opacity-50"
                    >
                      {cleaningUp ? content.cleaning : content.cleanUp}
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border border-border rounded-lg p-6 max-w-md">
            <h3 className="text-lg font-bold text-foreground mb-4">
              {content.confirmTitle}
            </h3>
            <p className="text-muted-foreground mb-6">
              {content.confirmMessage(selectedRepos.size)}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 bg-muted text-foreground rounded hover:bg-muted/80"
              >
                {content.confirmNo}
              </button>
              <button
                onClick={confirmCleanup}
                className="px-4 py-2 bg-foreground text-background rounded hover:opacity-90"
              >
                {content.confirmYes}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
