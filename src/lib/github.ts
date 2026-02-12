/**
 * GitPins - Control the order of your GitHub repositories
 * @author 686f6c61
 * @repository https://github.com/686f6c61/gitpins
 * @created 2025
 * @license MIT
 *
 * GitHub OAuth Module
 * Handles OAuth authentication flow with GitHub Apps.
 * Provides functions for authorization, token exchange, and user data retrieval.
 */

import { Octokit } from 'octokit'

// GitHub OAuth endpoints
export const GITHUB_AUTH_URL = 'https://github.com/login/oauth/authorize'
export const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token'
const githubAppSlug = process.env.GITHUB_APP_SLUG || 'gitpins'
export const GITHUB_APP_INSTALL_URL = `https://github.com/apps/${githubAppSlug}/installations/new`

// Generar URL de autorización
export function getAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_APP_CLIENT_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
    state,
    // `repo` is required to list/access private repositories via the OAuth user token (dashboard).
    // `user:email` is used to read the user's email when available.
    scope: 'repo user:email',
  })
  return `${GITHUB_AUTH_URL}?${params.toString()}`
}

// Intercambiar código por token
export async function exchangeCodeForToken(code: string): Promise<{
  access_token: string
  token_type: string
  scope: string
  refresh_token?: string
  expires_in?: number
  refresh_token_expires_in?: number
}> {
  const response = await fetch(GITHUB_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: process.env.GITHUB_APP_CLIENT_ID,
      client_secret: process.env.GITHUB_APP_CLIENT_SECRET,
      code,
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to exchange code for token')
  }

  return response.json()
}

// Refresh access token using refresh token
export async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string
  token_type: string
  scope: string
  refresh_token?: string
  expires_in?: number
  refresh_token_expires_in?: number
}> {
  const response = await fetch(GITHUB_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: process.env.GITHUB_APP_CLIENT_ID,
      client_secret: process.env.GITHUB_APP_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to refresh access token')
  }

  return response.json()
}

// Crear cliente Octokit con token de usuario
export function createUserOctokit(accessToken: string): Octokit {
  return new Octokit({ auth: accessToken })
}

// Obtener información del usuario
export async function getGitHubUser(accessToken: string) {
  const octokit = createUserOctokit(accessToken)
  const { data: user } = await octokit.rest.users.getAuthenticated()

  // Obtener email si está disponible
  let email: string | null = user.email
  if (!email) {
    try {
      const { data: emails } = await octokit.rest.users.listEmailsForAuthenticatedUser()
      const primaryEmail = emails.find(e => e.primary)
      email = primaryEmail?.email || null
    } catch {
      // Si no tiene permiso para ver emails, ignorar
    }
  }

  return {
    id: user.id,
    username: user.login,
    email,
    avatarUrl: user.avatar_url,
  }
}

// Obtener instalación del usuario
export async function getUserInstallation(accessToken: string): Promise<number | null> {
  const octokit = createUserOctokit(accessToken)

  try {
    const { data } = await octokit.rest.apps.listInstallationsForAuthenticatedUser()
    // Buscar la instalación de nuestra app
    const installation = data.installations.find(
      inst => inst.app_id === parseInt(process.env.GITHUB_APP_ID!)
    )
    return installation?.id || null
  } catch {
    return null
  }
}

/**
 * Verifies that a specific installation belongs to the authenticated user.
 * @param accessToken - OAuth access token of the authenticated user
 * @param installationId - Installation ID to verify
 * @returns true if the installation belongs to the user
 */
export async function userHasInstallation(accessToken: string, installationId: number): Promise<boolean> {
  const octokit = createUserOctokit(accessToken)

  try {
    for (let page = 1; page <= 10; page++) {
      const { data } = await octokit.rest.apps.listInstallationsForAuthenticatedUser({
        per_page: 100,
        page,
      })
      const installations = (data as { installations?: Array<{ id: number }> }).installations || []
      if (installations.some((inst) => inst.id === installationId)) {
        return true
      }
      if (installations.length < 100) break
    }
    return false
  } catch {
    return false
  }
}

/**
 * Checks if a user's access token is expired or about to expire.
 * Returns the user with a refreshed token if needed.
 * @param userId - The user's database ID
 * @returns Object with the current valid access token and whether it was refreshed
 */
export async function ensureValidToken(userId: string, forceRefresh: boolean = false): Promise<{
  accessToken: string
  wasRefreshed: boolean
}> {
  const { prisma } = await import('./prisma')
  const { decrypt, encrypt } = await import('./crypto')

  // Get token from UserToken table instead of User
  const userToken = await prisma.userToken.findUnique({
    where: { userId },
  })

  if (!userToken?.accessToken) {
    throw new Error('User has no access token')
  }

  // If no expiration date is set, token doesn't expire (old GitHub OAuth behavior)
  if (!userToken.expiresAt) {
    return {
      accessToken: decrypt(userToken.accessToken),
      wasRefreshed: false,
    }
  }

  // Check if token is expired or will expire in the next 5 minutes
  const expiresIn = userToken.expiresAt.getTime() - Date.now()
  const fiveMinutes = 5 * 60 * 1000

  if (expiresIn > fiveMinutes && !forceRefresh) {
    // Token is still valid
    return {
      accessToken: decrypt(userToken.accessToken),
      wasRefreshed: false,
    }
  }

  // Token is expired or about to expire, refresh it
  if (!userToken.refreshToken) {
    throw new Error('Token expired and no refresh token available')
  }

  const decryptedRefreshToken = decrypt(userToken.refreshToken)
  const newTokenData = await refreshAccessToken(decryptedRefreshToken)

  // Encrypt and save the new tokens
  const encryptedToken = encrypt(newTokenData.access_token)
  const encryptedRefreshToken = newTokenData.refresh_token
    ? encrypt(newTokenData.refresh_token)
    : userToken.refreshToken // Keep old refresh token if new one not provided

  const expiresAt = newTokenData.expires_in
    ? new Date(Date.now() + newTokenData.expires_in * 1000)
    : null

  // Update token in UserToken table
  await prisma.userToken.update({
    where: { userId },
    data: {
      accessToken: encryptedToken,
      refreshToken: encryptedRefreshToken,
      expiresAt,
    },
  })

  return {
    accessToken: newTokenData.access_token,
    wasRefreshed: true,
  }
}

// Obtener organizaciones del usuario
export async function getUserOrgs(accessToken: string): Promise<Array<{
  login: string
  avatarUrl: string
}>> {
  const octokit = createUserOctokit(accessToken)
  const orgs: Array<{ login: string; avatarUrl: string }> = []

  try {
    for await (const response of octokit.paginate.iterator(
      octokit.rest.orgs.listForAuthenticatedUser,
      { per_page: 100 }
    )) {
      for (const org of response.data) {
        orgs.push({
          login: org.login,
          avatarUrl: org.avatar_url,
        })
      }
    }
  } catch {
    // Si no tiene permiso para ver orgs, devolver array vacío
  }

  return orgs
}

// Obtener repos del usuario
export async function getUserRepos(accessToken: string) {
  const octokit = createUserOctokit(accessToken)

  const repos: Array<{
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
  }> = []

  // Obtener todos los repos (paginado)
  for await (const response of octokit.paginate.iterator(
    octokit.rest.repos.listForAuthenticatedUser,
    { per_page: 100, sort: 'updated', direction: 'desc' }
  )) {
    for (const repo of response.data) {
      repos.push({
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        language: repo.language,
        updatedAt: repo.updated_at || '',
        isPrivate: repo.private,
        url: repo.html_url,
        owner: repo.owner.login,
        isOrg: repo.owner.type === 'Organization',
      })
    }
  }

  return repos
}
