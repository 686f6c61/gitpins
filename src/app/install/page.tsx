/**
 * GitPins - Control the order of your GitHub repositories
 * @author 686f6c61
 * @repository https://github.com/686f6c61/gitpins
 * @created 2024
 * @license MIT
 *
 * Install Page
 * Guides authenticated users through the GitHub App installation process.
 * Redirects unauthenticated users to the home page.
 */

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { Button } from '@/components/ui'
import { GitHubIcon } from '@/components/icons'
import { GITHUB_APP_INSTALL_URL } from '@/lib/github'

/**
 * Install page component.
 * Shows installation instructions and link to GitHub App install.
 */
export default async function InstallPage() {
  const session = await getSession()

  if (!session) {
    redirect('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <div className="max-w-md w-full mx-4">
        <div className="bg-background border border-border rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
            <GitHubIcon className="w-8 h-8" />
          </div>

          <h1 className="text-2xl font-bold mb-2">Instala GitPins</h1>
          <p className="text-muted-foreground mb-6">
            Para ordenar tus repositorios, necesitamos que instales la aplicación de GitHub en tu cuenta.
          </p>

          <div className="space-y-4 text-left mb-6">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-foreground text-background flex items-center justify-center text-sm font-medium shrink-0">
                1
              </div>
              <p className="text-sm text-muted-foreground">
                Selecciona los repositorios que quieres gestionar (o todos)
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-foreground text-background flex items-center justify-center text-sm font-medium shrink-0">
                2
              </div>
              <p className="text-sm text-muted-foreground">
                GitPins solo necesita permisos para hacer commits vacíos y crear el archivo de configuración
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-foreground text-background flex items-center justify-center text-sm font-medium shrink-0">
                3
              </div>
              <p className="text-sm text-muted-foreground">
                Podrás desinstalar en cualquier momento desde GitHub
              </p>
            </div>
          </div>

          <a href={GITHUB_APP_INSTALL_URL}>
            <Button className="w-full" size="lg">
              <GitHubIcon className="w-5 h-5 mr-2" />
              Instalar en GitHub
            </Button>
          </a>

          <p className="text-xs text-muted-foreground mt-4">
            Serás redirigido a GitHub para completar la instalación
          </p>
        </div>
      </div>
    </div>
  )
}
