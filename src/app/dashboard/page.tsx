/**
 * GitPins - Control the order of your GitHub repositories
 * @author 686f6c61
 * @repository https://github.com/686f6c61/gitpins
 * @created 2024
 * @license MIT
 *
 * Dashboard Page
 * Server component that checks authentication and GitHub App installation.
 * Redirects to appropriate pages if not authenticated or app not installed.
 */

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { getUserInstallation } from '@/lib/github'
import { DashboardClient } from './dashboard-client'
import { decrypt } from '@/lib/crypto'

/**
 * Dashboard page server component.
 * Validates user session and GitHub App installation before rendering.
 */
export default async function DashboardPage() {
  const session = await getSession()

  if (!session) {
    redirect('/')
  }

  // Verificar si el usuario existe en DB
  let user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { repoOrder: true, token: true },
  })

  // Si el usuario no existe en DB, redirigir a login
  // (user should be created during OAuth callback)
  if (!user) {
    redirect('/api/auth/login')
  }

  // Si no tiene installationId en DB, intentar obtenerlo de GitHub
  if (!user.installationId && user.token?.accessToken) {
    try {
      const accessToken = decrypt(user.token.accessToken)
      const installationId = await getUserInstallation(accessToken)

      if (installationId) {
        // Actualizar en DB
        user = await prisma.user.update({
          where: { id: session.userId },
          data: { installationId },
          include: { repoOrder: true, token: true },
        })
      } else {
        // No tiene instalación, redirigir a instalar
        redirect('/install')
      }
    } catch {
      // Token error, redirect to login
      redirect('/api/auth/login')
    }
  }

  if (!user.installationId) {
    redirect('/install')
  }

  return <DashboardClient user={{ username: user.username, avatarUrl: user.avatarUrl }} />
}
