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
import { BannedContent } from './banned-content'

export const metadata: Metadata = {
  title: 'Cuenta suspendida',
  description: 'Estado de suspensión de una cuenta de GitPins.',
  robots: {
    index: false,
    follow: false,
  },
}

export default function BannedPage() {
  return <BannedContent />
}
