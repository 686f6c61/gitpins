/**
 * GitPins - Control the order of your GitHub repositories
 * @author 686f6c61
 * @repository https://github.com/686f6c61/gitpins
 * @created 2025
 * @license MIT
 *
 * Help Page
 * Comprehensive help center explaining how GitPins works.
 */

import type { Metadata } from "next";
import { HelpContent } from './help-content'

export const metadata: Metadata = {
  title: "Ayuda",
  description:
    "Centro de ayuda de GitPins con preguntas frecuentes, seguridad, permisos y flujo de sincronización.",
  alternates: {
    canonical: "/help",
  },
}

export default function HelpPage() {
  return <HelpContent />
}
