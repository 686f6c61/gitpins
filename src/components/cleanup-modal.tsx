/**
 * GitPins - Control the order of your GitHub repositories
 * @author 686f6c61
 * @repository https://github.com/686f6c61/gitpins
 * @created 2024
 * @license MIT
 *
 * Cleanup Instructions Modal Component
 * Shows instructions for safely removing GitPins commits from a repository.
 */

'use client'

import { useState } from 'react'

interface CleanupModalProps {
  repo: string
  gitpinsCommits: number
  onClose: () => void
}

export function CleanupModal({ repo, gitpinsCommits, onClose }: CleanupModalProps) {
  const [copied, setCopied] = useState(false)
  const [language, setLanguage] = useState<'en' | 'es'>('en')

  const repoName = repo.split('/')[1]

  const cleanupScript = `#!/bin/bash
# GitPins Cleanup Script for ${repo}
# This script removes all GitPins commits while keeping your real commits intact

set -e  # Exit on error

echo "🧹 GitPins Cleanup Script"
echo "Repository: ${repo}"
echo "GitPins commits to remove: ${gitpinsCommits}"
echo ""

# Step 1: Clone repository
echo "📥 Step 1: Cloning repository..."
git clone https://github.com/${repo}.git
cd ${repoName}

# Step 2: Create backup branch
echo "💾 Step 2: Creating backup branch..."
git branch backup-before-gitpins-cleanup

# Step 3: Remove GitPins commits
echo "🗑️  Step 3: Removing GitPins commits..."
git filter-branch --force --commit-filter '
  if git log -1 --format=%B $GIT_COMMIT | grep -q "\\[GitPins\\]"; then
    skip_commit "$@"
  else
    git commit-tree "$@"
  fi
' HEAD

# Step 4: Show result
echo ""
echo "✅ Cleanup complete! Verifying..."
echo ""
echo "Commits before cleanup:"
git rev-list --count backup-before-gitpins-cleanup
echo ""
echo "Commits after cleanup:"
git rev-list --count HEAD
echo ""
echo "Recent commits (should NOT contain [GitPins]):"
git log --oneline -10
echo ""

# Step 5: Confirm before pushing
read -p "Does the history look correct? Push to GitHub? (yes/no): " confirm

if [ "$confirm" = "yes" ]; then
  echo "📤 Pushing cleaned history to GitHub..."
  git push --force-with-lease origin main || git push --force-with-lease origin master
  echo ""
  echo "✅ Done! Your repository is clean."
  echo ""
  echo "Optional: Delete backup branch with:"
  echo "  git branch -D backup-before-gitpins-cleanup"
else
  echo "❌ Push cancelled. You can review the changes."
  echo "To restore original state: git checkout backup-before-gitpins-cleanup"
fi
`

  const content = language === 'en' ? {
    title: 'Clean Up GitPins Commits',
    warnings: {
      title: '⚠️ Important Warnings',
      items: [
        'This will rewrite git history',
        'Anyone who has cloned this repo will need to re-clone or reset',
        'Forks will be out of sync',
        'A backup branch will be created automatically',
        'Only GitPins commits will be removed - your real commits are safe',
      ],
    },
    method: {
      title: 'Automated Cleanup Script',
      description: 'Run this script in your terminal. It will:',
      steps: [
        'Clone your repository locally',
        'Create a backup branch (safety first!)',
        'Remove all commits with "[GitPins]" in the message',
        'Keep all your real commits intact',
        'Ask for confirmation before pushing',
        'Force push the cleaned history to GitHub',
      ],
    },
    whatItDoes: {
      title: 'ℹ️ What This Does',
      description: 'This script uses git filter-branch to remove commits by message pattern. It only removes commits that contain "[GitPins]" in the commit message. Your actual code and real commits are completely safe.',
    },
    afterCleanup: {
      title: '✅ After Cleanup',
      description: `Your repository will be clean with ${gitpinsCommits} fewer commits. GitPins will continue working normally and will only create new commits if the order changes.`,
    },
    buttons: {
      close: 'Close',
      copy: 'Copy Script',
      copied: '✓ Copied!',
    },
  } : {
    title: 'Limpiar Commits de GitPins',
    warnings: {
      title: '⚠️ Advertencias Importantes',
      items: [
        'Esto reescribirá el historial de git',
        'Cualquiera que haya clonado este repo necesitará re-clonar o resetear',
        'Los forks quedarán desincronizados',
        'Se creará automáticamente una rama de respaldo',
        'Solo se eliminarán commits de GitPins - tus commits reales están seguros',
      ],
    },
    method: {
      title: 'Script de Limpieza Automatizado',
      description: 'Ejecuta este script en tu terminal. Lo que hace:',
      steps: [
        'Clona tu repositorio localmente',
        'Crea una rama de respaldo (¡seguridad primero!)',
        'Elimina todos los commits con "[GitPins]" en el mensaje',
        'Mantiene todos tus commits reales intactos',
        'Pide confirmación antes de hacer push',
        'Hace force push del historial limpio a GitHub',
      ],
    },
    whatItDoes: {
      title: 'ℹ️ Qué Hace Esto',
      description: 'Este script usa git filter-branch para eliminar commits por patrón de mensaje. Solo elimina commits que contienen "[GitPins]" en el mensaje. Tu código real y commits están completamente seguros.',
    },
    afterCleanup: {
      title: '✅ Después de la Limpieza',
      description: `Tu repositorio estará limpio con ${gitpinsCommits} commits menos. GitPins seguirá funcionando normalmente y solo creará commits nuevos si el orden cambia.`,
    },
    buttons: {
      close: 'Cerrar',
      copy: 'Copiar Script',
      copied: '✓ Copiado!',
    },
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(cleanupScript)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {content.title}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {repo} • {gitpinsCommits} commits
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setLanguage(language === 'en' ? 'es' : 'en')}
                className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                {language === 'en' ? 'ES' : 'EN'}
              </button>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Warnings */}
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded">
            <h3 className="font-bold text-red-800 dark:text-red-400 mb-2">
              {content.warnings.title}
            </h3>
            <ul className="list-disc list-inside text-sm text-red-700 dark:text-red-300 space-y-1">
              {content.warnings.items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>

          {/* Method */}
          <div className="mb-6">
            <h3 className="font-bold text-gray-900 dark:text-white mb-2">
              {content.method.title}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {content.method.description}
            </p>

            {/* Script */}
            <div className="relative">
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs">
                <code>{cleanupScript}</code>
              </pre>
              <button
                onClick={handleCopy}
                className="absolute top-2 right-2 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
              >
                {copied ? content.buttons.copied : content.buttons.copy}
              </button>
            </div>
          </div>

          {/* What it does */}
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded">
            <h3 className="font-bold text-blue-800 dark:text-blue-400 mb-2">
              {content.whatItDoes.title}
            </h3>
            <ol className="list-decimal list-inside text-sm text-blue-700 dark:text-blue-300 space-y-1">
              {content.method.steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </div>

          {/* Info */}
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900/50 border-l-4 border-gray-400 rounded">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {content.whatItDoes.description}
            </p>
          </div>

          {/* After cleanup */}
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 rounded">
            <h3 className="font-bold text-green-800 dark:text-green-400 mb-2">
              {content.afterCleanup.title}
            </h3>
            <p className="text-sm text-green-700 dark:text-green-300">
              {content.afterCleanup.description}
            </p>
          </div>

          {/* Footer */}
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              {content.buttons.close}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
