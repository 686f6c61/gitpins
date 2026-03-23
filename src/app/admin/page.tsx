/**
 * GitPins - Admin Dashboard
 * @author 686f6c61
 * @repository https://github.com/686f6c61/gitpins
 * @license MIT
 *
 * Administrative dashboard for managing users and viewing statistics.
 * Only accessible to users in the admin allowlist.
 */

import { redirect } from 'next/navigation'
import { verifyAdmin } from '@/lib/admin'
import { getSession } from '@/lib/session'
import { AdminClient } from './admin-client'
import { AdminShell } from './admin-shell'

export default async function AdminPage() {
  const session = await getSession()
  if (!session) {
    redirect('/api/auth/login?returnTo=/admin')
  }

  const isAdmin = await verifyAdmin(session)

  if (!isAdmin) {
    return <AdminShell denied />
  }

  return (
    <AdminShell>
      <AdminClient />
    </AdminShell>
  )
}
