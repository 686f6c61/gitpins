/**
 * GitPins - Control the order of your GitHub repositories
 * @author 686f6c61
 * @repository https://github.com/686f6c61/gitpins
 * @created 2025
 * @license MIT
 *
 * Type Definitions
 * Core TypeScript interfaces used throughout the application.
 */

/**
 * Represents a GitHub repository with its metadata.
 * Used for displaying repos in the dashboard and managing order.
 */
export interface Repo {
  id: number
  name: string
  fullName: string
  description: string | null
  stars: number
  forks: number
  language: string | null
  updatedAt: string
  isPrivate: boolean
  url: string
  owner: string
  isOrg: boolean
}

/**
 * User's repository ordering settings.
 * Stored in the database.
 */
export interface RepoOrderSettings {
  topN: number // 0 = todos
  includePrivate: boolean
  syncFrequency: number
  autoEnabled: boolean
  commitStrategy: 'branch' | 'revert'
  preferredHour?: number | null // 0-23 UTC, null = cualquier hora
  syncSecret?: string
}

/**
 * API response structure for the /api/repos endpoint.
 * Contains all data needed to render the dashboard.
 */
export interface ReposResponse {
  repos: Repo[]
  savedOrder: string[]
  settings: RepoOrderSettings | null
}
