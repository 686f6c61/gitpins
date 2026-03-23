/**
 * GitPins - Control the order of your GitHub repositories
 * @author 686f6c61
 * @repository https://github.com/686f6c61/gitpins
 * @created 2025
 * @license MIT
 *
 * Legal Page
 * Comprehensive disclaimer and legal information page.
 */

import type { Metadata } from 'next'
import { LegalContent } from './legal-content'

export const metadata: Metadata = {
  title: 'Legal y privacidad',
  description: 'Información legal, privacidad, exportación y borrado de cuenta en GitPins.',
  alternates: {
    canonical: '/legal',
  },
}

export default function LegalPage() {
  return <LegalContent />
}
