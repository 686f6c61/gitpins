/**
 * GitPins - Banned User Page
 * @author 686f6c61
 * @repository https://github.com/686f6c61/gitpins
 * @license MIT
 *
 * Page displayed to users who have been banned from the application.
 * Shows ban message and contact information.
 */

import { Metadata } from 'next'
import { PinIcon, AlertTriangleIcon, GitHubIcon } from '@/components/icons'

export const metadata: Metadata = {
  title: 'Account Suspended - GitPins',
  description: 'Your GitPins account has been suspended',
}

export default function BannedPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <PinIcon className="w-8 h-8" />
          <span className="text-2xl font-bold">GitPins</span>
        </div>

        {/* Warning Icon */}
        <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangleIcon className="w-10 h-10 text-destructive" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold mb-4">
          Account Suspended
        </h1>

        {/* Message */}
        <p className="text-muted-foreground mb-6">
          Your account has been suspended due to a violation of our terms of service.
          If you believe this is a mistake, please contact the administrator.
        </p>

        {/* Contact */}
        <div className="bg-muted/30 border border-border rounded-xl p-6 mb-6">
          <p className="text-sm text-muted-foreground mb-4">
            To appeal this decision or get more information, please open an issue on our GitHub repository:
          </p>
          <a
            href="https://github.com/686f6c61/gitpins/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-foreground text-background px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
          >
            <GitHubIcon className="w-5 h-5" />
            Open an Issue
          </a>
        </div>

        {/* Back to home */}
        <a
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground underline"
        >
          Back to home
        </a>
      </div>
    </div>
  )
}
