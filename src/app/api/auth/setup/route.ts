/**
 * GitPins - Control the order of your GitHub repositories
 * @author 686f6c61
 * @repository https://github.com/686f6c61/gitpins
 * @created 2025
 * @license MIT
 *
 * Auth Setup API Route
 * Called after user installs the GitHub App.
 * Updates the user's installation ID and redirects to dashboard.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { ensureValidToken, userHasInstallation } from '@/lib/github'

/**
 * GET /api/auth/setup
 * Callback after GitHub App installation. Stores installation ID.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const installationId = searchParams.get('installation_id')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin

  const session = await getSession()

  if (!session) {
    // Si no hay sesión, redirigir a login
    return NextResponse.redirect(`${appUrl}/api/auth/login?returnTo=/install`)
  }

  if (installationId) {
    // Validate installationId is a positive integer
    const parsedId = parseInt(installationId, 10)
    if (Number.isNaN(parsedId) || parsedId <= 0 || parsedId > Number.MAX_SAFE_INTEGER) {
      return NextResponse.redirect(`${appUrl}/install?error=invalid_installation`)
    }

    // Verify that the installation belongs to the authenticated user
    try {
      const { accessToken } = await ensureValidToken(session.userId)
      const hasInstallation = await userHasInstallation(accessToken, parsedId)

      if (!hasInstallation) {
        return NextResponse.redirect(`${appUrl}/install?error=invalid_installation`)
      }
    } catch {
      return NextResponse.redirect(`${appUrl}/api/auth/login?returnTo=/install`)
    }

    await prisma.user.update({
      where: { id: session.userId },
      data: { installationId: parsedId },
    })
  }

  return NextResponse.redirect(`${appUrl}/dashboard`)
}
