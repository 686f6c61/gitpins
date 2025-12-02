/**
 * GitPins - Control the order of your GitHub repositories
 * @author 686f6c61
 * @repository https://github.com/686f6c61/gitpins
 * @created 2024
 * @license MIT
 *
 * OAuth Callback API Route
 * Handles the OAuth callback from GitHub after user authorization.
 * - Validates state parameter (CSRF protection)
 * - Exchanges code for access token
 * - Creates/updates user in database with encrypted token
 * - Creates session and redirects to dashboard or install page
 */

import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForToken, getGitHubUser, getUserInstallation } from '@/lib/github'
import { verifyOAuthState, createSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { encrypt } from '@/lib/crypto'

/**
 * GET /api/auth/callback
 * OAuth callback handler. Processes GitHub's authorization response.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  // Si hay error de OAuth
  if (error) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/?error=${encodeURIComponent(error)}`
    )
  }

  // Validar parámetros
  if (!code || !state) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/?error=missing_params`
    )
  }

  // Verificar estado OAuth
  const isValidState = await verifyOAuthState(state)
  if (!isValidState) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/?error=invalid_state`
    )
  }

  try {
    // Intercambiar código por token
    const tokenData = await exchangeCodeForToken(code)

    // Obtener información del usuario
    const githubUser = await getGitHubUser(tokenData.access_token)

    // Obtener instalación de la app
    const installationId = await getUserInstallation(tokenData.access_token)

    // Determinar si es admin usando GitHub ID (más seguro que username)
    const adminGithubId = process.env.ADMIN_GITHUB_ID
    const isAdmin = adminGithubId ? githubUser.id === parseInt(adminGithubId, 10) : false

    // Encrypt the access token before storing
    const encryptedToken = encrypt(tokenData.access_token)

    // Crear o actualizar usuario en la base de datos
    const user = await prisma.user.upsert({
      where: { githubId: githubUser.id },
      update: {
        username: githubUser.username,
        email: githubUser.email,
        avatarUrl: githubUser.avatarUrl,
        accessToken: encryptedToken,
        installationId,
        lastLoginAt: new Date(),
        isAdmin,
      },
      create: {
        githubId: githubUser.id,
        username: githubUser.username,
        email: githubUser.email,
        avatarUrl: githubUser.avatarUrl,
        accessToken: encryptedToken,
        installationId,
        isAdmin,
      },
    })

    // Crear sesión (sin el accessToken - ya no lo guardamos en la cookie)
    await createSession({
      userId: user.id,
      githubId: user.githubId,
      username: user.username,
      isAdmin: user.isAdmin,
    })

    // Redirigir al dashboard si tiene instalación, si no a instalar
    if (installationId) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard`)
    } else {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/install`)
    }
  } catch (error) {
    console.error('Auth callback error:', error)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/?error=auth_failed`
    )
  }
}
