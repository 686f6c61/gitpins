/**
 * GitPins - Control the order of your GitHub repositories
 * @author 686f6c61
 * @repository https://github.com/686f6c61/gitpins
 * @created 2024
 * @license MIT
 *
 * Home Page
 * Landing page for unauthenticated users.
 * Redirects authenticated users to the dashboard.
 */

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { LandingContent } from './landing-content'

/**
 * Home page component.
 * Checks session and redirects logged-in users to dashboard.
 */
export default async function Home() {
  const session = await getSession()

  // Si ya está logueado, redirigir al dashboard
  if (session) {
    redirect('/dashboard')
  }

  return <LandingContent />
}
