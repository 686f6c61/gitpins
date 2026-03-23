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
  title: 'Account Suspended - GitPins',
  description: 'Your GitPins account has been suspended',
}

export default function BannedPage() {
  return <BannedContent />
}
