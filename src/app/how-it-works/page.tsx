import type { Metadata } from 'next'
import HowItWorksContent from './how-it-works-content'

export const metadata: Metadata = {
  title: 'Cómo funciona',
  description:
    'Explicación detallada de cómo GitPins reordena tus repositorios, qué permisos necesita y cómo funciona la sincronización.',
  alternates: {
    canonical: '/how-it-works',
  },
}

export default function HowItWorksPage() {
  return <HowItWorksContent />
}
