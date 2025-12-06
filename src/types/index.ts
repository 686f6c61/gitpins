/**
 * GitPins - Control the order of your GitHub repositories
 * @author 686f6c61
 * @repository https://github.com/686f6c61/gitpins
 * @created 2024
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
}

/**
 * User's repository ordering settings.
 * Stored in the database and synced to their gitpins-config repo.
 */
export interface RepoOrderSettings {
  topN: number // 0 = todos
  includePrivate: boolean
  syncFrequency: number
  autoEnabled: boolean
  commitStrategy: 'branch' | 'revert'
  configRepoName: string
  configRepoCreated: boolean
  configRepoPrivate: boolean
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
