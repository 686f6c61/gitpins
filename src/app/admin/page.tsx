/**
 * GitPins - Admin Dashboard
 * @author 686f6c61
 * @repository https://github.com/686f6c61/gitpins
 * @license MIT
 *
 * Administrative dashboard for managing users and viewing statistics.
 * Only accessible to the admin user defined in ADMIN_GITHUB_ID.
 */

import { redirect } from 'next/navigation'
import { verifyAdmin } from '@/lib/admin'
import { PinIcon } from '@/components/icons'
import { AdminClient } from './admin-client'

export default async function AdminPage() {
  const isAdmin = await verifyAdmin()

  if (!isAdmin) {
    redirect('/')
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
