/**
 * GitPins - Control the order of your GitHub repositories
 * @author 686f6c61
 * @repository https://github.com/686f6c61/gitpins
 * @created 2025
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
import { consumeOAuthReturnTo, createSession, verifyOAuthState } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { encrypt } from '@/lib/crypto'
import { consumeSudoIntent, setSudoCookie } from '@/lib/sudo'
import { syncAdminAccountUserLink } from '@/lib/admin'

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

    // Encrypt tokens before storing
    const encryptedToken = encrypt(tokenData.access_token)
    const encryptedRefreshToken = tokenData.refresh_token ? encrypt(tokenData.refresh_token) : null

    // Calculate token expiration date if expires_in is provided
    const tokenExpiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000)
      : null

    // Check if user is banned before allowing login
    const existingUser = await prisma.user.findUnique({
      where: { githubId: githubUser.id },
      select: { isBanned: true }
    })

    if (existingUser?.isBanned) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/banned`)
    }

    // Crear o actualizar usuario en la base de datos (sin tokens - van a UserToken)
    const user = await prisma.user.upsert({
      where: { githubId: githubUser.id },
      update: {
        username: githubUser.username,
        email: githubUser.email,
        avatarUrl: githubUser.avatarUrl,
        installationId,
        lastLoginAt: new Date(),
      },
      create: {
        githubId: githubUser.id,
        username: githubUser.username,
        email: githubUser.email,
        avatarUrl: githubUser.avatarUrl,
        installationId,
      },
    })

    try {
      await syncAdminAccountUserLink({
        userId: user.id,
        githubId: user.githubId,
      })
    } catch (error) {
      // Non-fatal: login should still succeed even if allowlist linkage update fails.
      console.error('Admin allowlist link warning:', error)
    }

    // Crear o actualizar token en tabla separada (UserToken)
    await prisma.userToken.upsert({
      where: { userId: user.id },
      update: {
        accessToken: encryptedToken,
        refreshToken: encryptedRefreshToken,
        expiresAt: tokenExpiresAt,
      },
      create: {
        userId: user.id,
        accessToken: encryptedToken,
        refreshToken: encryptedRefreshToken,
        expiresAt: tokenExpiresAt,
      },
    })

    // Crear sesión (sin el accessToken - ya no lo guardamos en la cookie)
    await createSession({
      userId: user.id,
      githubId: user.githubId,
      username: user.username,
    })

    const returnTo = await consumeOAuthReturnTo('/dashboard')

    // If this OAuth flow was initiated for "sudo mode", set a short-lived cookie.
    try {
      const shouldSudo = await consumeSudoIntent()
      if (shouldSudo) {
        await setSudoCookie()
      }
    } catch (error) {
      // Non-fatal: failing to set sudo cookie should not block login.
      console.error('Sudo cookie warning:', error)
    }

    // Redirigir al returnTo si tiene instalación, si no a instalar
    if (installationId) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}${returnTo}`)
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
