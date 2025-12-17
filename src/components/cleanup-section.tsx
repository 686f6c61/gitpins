/**
 * GitPins - Control the order of your GitHub repositories
 * @author 686f6c61
 * @repository https://github.com/686f6c61/gitpins
 * @created 2024
 * @license MIT
 *
 * Cleanup Section Component
 * Shows repositories with GitPins commits and allows users to clean them up.
 */

'use client'

import { useState, useEffect } from 'react'
import { CleanupModal } from './cleanup-modal'

interface RepoCommitInfo {
  repo: string
  gitpinsCommits: number
  totalCommits: number
  lastGitpinsCommit?: {
    message: string
    date: string
  }
}

interface CleanupSectionProps {
  language: 'en' | 'es'
}

export function CleanupSection({ language }: CleanupSectionProps) {
  const [repos, setRepos] = useState<RepoCommitInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedRepo, setSelectedRepo] = useState<RepoCommitInfo | null>(null)
  const [selectedRepos, setSelectedRepos] = useState<Set<string>>(new Set())

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
        // Si hay error de autenticación, redirigir a logout
        if (response.status === 401) {
          console.error('Authentication error:', data.error)
          if (data.needsReinstall) {
            // Redirigir a la página de instalación si necesita reinstalar la app
            window.location.href = '/install'
          } else {
            // Redirigir a logout si el token expiró
            window.location.href = '/api/auth/logout'
          }
          return
        }
        throw new Error(data.error || 'Failed to fetch commits')
      }

      // Solo mostrar repos que tienen commits GitPins
      const reposWithGitPins = Array.isArray(data.repos)
        ? data.repos.filter((r: RepoCommitInfo) => r.gitpinsCommits > 0)
        : []
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

  const handleCleanupAll = () => {
    if (selectedRepos.size === 0) return

    // Por ahora, mostrar el modal para el primer repo seleccionado
    const firstRepo = repos.find(r => selectedRepos.has(r.repo))
    if (firstRepo) {
      setSelectedRepo(firstRepo)
    }
  }

  const content = language === 'en' ? {
    title: '🧹 Clean Up GitPins Commits',
    description: 'GitPins creates empty commits to maintain repository order. Once your repos are ordered, you can safely remove these commits to keep your history clean.',
    warning: '⚠️ Warning: This will rewrite git history. Only use if you understand the implications.',
    noCommits: '✨ Great! You have no GitPins commits to clean up.',
    loading: 'Loading repositories...',
    error: 'Error loading data:',
    retry: 'Retry',
    commitsCount: (count: number) => `${count} GitPins commit${count !== 1 ? 's' : ''}`,
    lastCommit: 'Last:',
    cleanUp: 'Clean Up',
    selectAll: 'Select All',
    deselectAll: 'Deselect All',
    cleanupSelected: (count: number) => `Clean Up ${count} Selected`,
  } : {
    title: '🧹 Limpiar Commits de GitPins',
    description: 'GitPins crea commits vacíos para mantener el orden de los repositorios. Una vez ordenados, puedes eliminar estos commits de forma segura para mantener limpio tu historial.',
    warning: '⚠️ Advertencia: Esto reescribirá el historial de git. Solo úsalo si entiendes las implicaciones.',
    noCommits: '✨ ¡Genial! No tienes commits de GitPins para limpiar.',
    loading: 'Cargando repositorios...',
    error: 'Error al cargar datos:',
    retry: 'Reintentar',
    commitsCount: (count: number) => `${count} commit${count !== 1 ? 's' : ''} de GitPins`,
    lastCommit: 'Último:',
    cleanUp: 'Limpiar',
    selectAll: 'Seleccionar Todos',
    deselectAll: 'Deseleccionar Todos',
    cleanupSelected: (count: number) => `Limpiar ${count} Seleccionado${count !== 1 ? 's' : ''}`,
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          {content.title}
        </h3>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-400">{content.loading}</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          {content.title}
        </h3>
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
          <p className="text-red-800 dark:text-red-400">{content.error} {error}</p>
          <button
            onClick={fetchGitPinsCommits}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            {content.retry}
          </button>
        </div>
      </div>
    )
  }

  if (repos.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          {content.title}
        </h3>
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded text-center">
          <p className="text-green-800 dark:text-green-400">{content.noCommits}</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          {content.title}
        </h3>

        <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
          {content.description}
        </p>

        <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
          <p className="text-sm text-yellow-800 dark:text-yellow-400">
            {content.warning}
          </p>
        </div>

        {/* Controls */}
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
              className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              {selectedRepos.size === repos.length ? content.deselectAll : content.selectAll}
            </button>
          </div>

          {selectedRepos.size > 0 && (
            <button
              onClick={handleCleanupAll}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-medium"
            >
              {content.cleanupSelected(selectedRepos.size)}
            </button>
          )}
        </div>

        {/* Repos list */}
        <div className="space-y-2">
          {repos.map(repoInfo => (
            <div
              key={repoInfo.repo}
              className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1">
                <input
                  type="checkbox"
                  checked={selectedRepos.has(repoInfo.repo)}
                  onChange={() => toggleRepoSelection(repoInfo.repo)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />

                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {repoInfo.repo}
                  </p>
                  <div className="flex gap-4 text-sm text-gray-500 dark:text-gray-400 mt-1">
                    <span className="font-mono">
                      {content.commitsCount(repoInfo.gitpinsCommits)}
                    </span>
                    {repoInfo.lastGitpinsCommit && (
                      <span className="truncate max-w-md">
                        {content.lastCommit} {repoInfo.lastGitpinsCommit.message.substring(0, 40)}...
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedRepo(repoInfo)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium whitespace-nowrap ml-4"
              >
                {content.cleanUp}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {selectedRepo && (
        <CleanupModal
          repo={selectedRepo.repo}
          gitpinsCommits={selectedRepo.gitpinsCommits}
          onClose={() => setSelectedRepo(null)}
        />
      )}
    </>
  )
}
