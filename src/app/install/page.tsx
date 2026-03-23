/**
 * GitPins - Control the order of your GitHub repositories
 * @author 686f6c61
 * @repository https://github.com/686f6c61/gitpins
 * @created 2025
 * @license MIT
 *
 * Install Page
 * Guides authenticated users through the GitHub App installation process.
 * Redirects unauthenticated users to the home page.
 */

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { GITHUB_APP_INSTALL_URL } from '@/lib/github'
import { InstallContent } from './install-content'

export const metadata: Metadata = {
  title: 'Instalar GitPins',
  description: 'Flujo de instalación autenticado de GitPins en GitHub.',
  robots: {
    index: false,
    follow: false,
  },
}

/**
 * Install page component.
 * Shows installation instructions and link to GitHub App install.
 */
export default async function InstallPage() {
  const session = await getSession()

  if (!session) {
    redirect('/api/auth/login?returnTo=/install')
  }

  return <InstallContent installUrl={GITHUB_APP_INSTALL_URL} />
}
