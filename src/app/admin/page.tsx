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
import { PinIcon } from '@/components/icons'
import { AdminClient } from './admin-client'

export default async function AdminPage() {
  const session = await getSession()
  if (!session) {
    redirect('/api/auth/login?returnTo=/admin')
  }

  const isAdmin = await verifyAdmin(session)

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <div className="max-w-md w-full bg-background border border-border rounded-2xl p-8 text-center">
          <h1 className="text-2xl font-bold mb-3">403 - Admin Access Required</h1>
          <p className="text-muted-foreground mb-6">
            Your account is authenticated but does not have admin privileges.
          </p>
          <a href="/dashboard" className="text-sm underline text-muted-foreground hover:text-foreground">
            Back to dashboard
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-background border-b border-border">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <PinIcon className="w-6 h-6" />
            <h1 className="text-xl font-bold">GitPins Admin</h1>
          </div>
          <a
            href="/dashboard"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Back to dashboard
          </a>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <AdminClient />
      </main>
    </div>
  )
}
