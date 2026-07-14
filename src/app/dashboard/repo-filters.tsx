/**
 * GitPins - Control the order of your GitHub repositories
 * @author 686f6c61
 * @repository https://github.com/686f6c61/gitpins
 * @created 2025
 * @license MIT
 *
 * Repository Filters Component
 * Provides search and filter functionality for the repository pool.
 */

'use client'

import { useMemo } from 'react'
import { XIcon, SearchIcon } from '@/components/icons'
import { useTranslation } from '@/i18n'
import type { Repo } from '@/types'

export interface FilterState {
  search: string
  language: string
  owner: string // 'all', 'personal', 'orgs', or specific owner name
  minStars: number
}

export type VisibilityFilter = 'all' | 'public' | 'private'

interface RepoFiltersProps {
  repos: Repo[]
  filters: FilterState
  visibilityFilter: VisibilityFilter
  onFiltersChange: (filters: FilterState) => void
  onVisibilityFilterChange: (filter: VisibilityFilter) => void
}

/**
 * Extracts unique languages from repos array
 */
function getUniqueLanguages(repos: Repo[]): string[] {
  const languages = new Set<string>()
  repos.forEach(repo => {
    if (repo.language) {
      languages.add(repo.language)
    }
  })
  return Array.from(languages).sort((left, right) => left.localeCompare(right))
}

/**
 * Extracts unique owners from repos array
 */
function getUniqueOwners(repos: Repo[]): { name: string; isOrg: boolean }[] {
  const owners = new Map<string, boolean>()
  repos.forEach(repo => {
    if (!owners.has(repo.owner)) {
      owners.set(repo.owner, repo.isOrg)
    }
  })
  return Array.from(owners.entries())
    .map(([name, isOrg]) => ({ name, isOrg }))
    .sort((a, b) => {
      // Personal repos first, then orgs alphabetically
      if (a.isOrg !== b.isOrg) return a.isOrg ? 1 : -1
      return a.name.localeCompare(b.name)
    })
}

/**
 * Repository filters component.
 * Allows filtering by search term, language, owner, and minimum stars.
 */
export function RepoFilters({
  repos,
  filters,
  visibilityFilter,
  onFiltersChange,
  onVisibilityFilterChange,
}: RepoFiltersProps) {
  const { t } = useTranslation()

  const languages = useMemo(() => getUniqueLanguages(repos), [repos])
  const owners = useMemo(() => getUniqueOwners(repos), [repos])
  const hasOrgs = owners.some(o => o.isOrg)

  const hasActiveFilters =
    filters.search || filters.language || filters.owner || filters.minStars > 0 || visibilityFilter !== 'all'

  const handleClear = () => {
    onFiltersChange({ search: '', language: '', owner: '', minStars: 0 })
    onVisibilityFilterChange('all')
  }

  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/50 p-1">
        <button
          type="button"
          onClick={() => onVisibilityFilterChange('all')}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            visibilityFilter === 'all'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {t('dashboard.filter.all')}
        </button>
        <button
          type="button"
          onClick={() => onVisibilityFilterChange('public')}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            visibilityFilter === 'public'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {t('dashboard.filter.public')}
        </button>
        <button
          type="button"
          onClick={() => onVisibilityFilterChange('private')}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            visibilityFilter === 'private'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {t('dashboard.filter.private')}
        </button>
      </div>

      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={filters.search}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          placeholder={t('dashboard.filters.search')}
          className="w-full pl-9 pr-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-foreground/20"
        />
      </div>

      {/* Language */}
      <select
        value={filters.language}
        onChange={(e) => onFiltersChange({ ...filters, language: e.target.value })}
        className="px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-foreground/20"
      >
        <option value="">{t('dashboard.filters.allLanguages')}</option>
        {languages.map(lang => (
          <option key={lang} value={lang}>{lang}</option>
        ))}
      </select>

      {/* Owner/Organization */}
      {hasOrgs && (
        <select
          value={filters.owner}
          onChange={(e) => onFiltersChange({ ...filters, owner: e.target.value })}
          className="px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-foreground/20"
        >
          <option value="">{t('dashboard.filters.allOwners')}</option>
          <option value="personal">{t('dashboard.filters.personal')}</option>
          <option value="orgs">{t('dashboard.filters.organizations')}</option>
          <optgroup label="─────────">
            {owners.map(owner => (
              <option key={owner.name} value={owner.name}>
                {owner.isOrg ? '🏢 ' : '👤 '}{owner.name}
              </option>
            ))}
          </optgroup>
        </select>
      )}

      {/* Min Stars */}
      <div className="flex items-center gap-2">
        <label className="text-sm text-muted-foreground">{t('dashboard.filters.minStars')}:</label>
        <input
          type="number"
          min="0"
          value={filters.minStars || ''}
          onChange={(e) => onFiltersChange({ ...filters, minStars: Number.parseInt(e.target.value, 10) || 0 })}
          className="w-20 px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-foreground/20"
          placeholder="0"
        />
      </div>

      {/* Clear filters */}
      {hasActiveFilters && (
        <button
          onClick={handleClear}
          className="flex items-center gap-1 px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <XIcon className="w-4 h-4" />
          {t('dashboard.filters.clear')}
        </button>
      )}
    </div>
  )
}

/**
 * Applies filters to a list of repos
 */
export function applyFilters(repos: Repo[], filters: FilterState): Repo[] {
  return repos.filter(repo => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      const matchesName = repo.name.toLowerCase().includes(searchLower)
      const matchesFullName = repo.fullName.toLowerCase().includes(searchLower)
      const matchesDesc = repo.description?.toLowerCase().includes(searchLower)
      if (!matchesName && !matchesFullName && !matchesDesc) {
        return false
      }
    }

    // Language filter
    if (filters.language && repo.language !== filters.language) {
      return false
    }

    // Owner filter
    if (filters.owner) {
      if (filters.owner === 'personal' && repo.isOrg) {
        return false
      }
      if (filters.owner === 'orgs' && !repo.isOrg) {
        return false
      }
      if (filters.owner !== 'personal' && filters.owner !== 'orgs' && repo.owner !== filters.owner) {
        return false
      }
    }

    // Min stars filter
    if (filters.minStars > 0 && repo.stars < filters.minStars) {
      return false
    }

    return true
  })
}
