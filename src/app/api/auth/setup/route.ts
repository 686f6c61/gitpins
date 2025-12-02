/**
 * GitPins - Control the order of your GitHub repositories
 * @author 686f6c61
 * @repository https://github.com/686f6c61/gitpins
 * @created 2024
 * @license MIT
 *
 * Auth Setup API Route
 * Called after user installs the GitHub App.
 * Updates the user's installation ID and redirects to dashboard.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/auth/setup
 * Callback after GitHub App installation. Stores installation ID.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const installationId = searchParams.get('installation_id')

  const session = await getSession()

  if (!session) {
    // Si no hay sesión, redirigir a login
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/api/auth/login`)
  }

  if (installationId) {
    // Update the user's installation ID
    // Note: accessToken is no longer stored in session, it's already in the database
    await prisma.user.update({
      where: { id: session.userId },
      data: { installationId: parseInt(installationId) },
    })
  }

  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard`)
}
