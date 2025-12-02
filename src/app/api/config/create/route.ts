/**
 * GitPins - Control the order of your GitHub repositories
 * @author 686f6c61
 * @repository https://github.com/686f6c61/gitpins
 * @created 2024
 * @license MIT
 *
 * Config Create API Route
 * Creates or updates the user's gitpins-config repository.
 * - Creates the repo if it doesn't exist
 * - Adds config.json with repo order settings
 * - Adds GitHub Action workflow for automated syncing
 * - Creates GITPINS_SYNC_SECRET repository secret
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import {
  createAppOctokit,
  generateConfigJson,
  generateWorkflowYaml,
  generateReadme,
} from '@/lib/github-app'
import { createUserOctokit } from '@/lib/github'
import { decrypt } from '@/lib/crypto'
import { randomUUID } from 'crypto'
import sodium from 'libsodium-wrappers'
import { validateOrigin, checkAPIRateLimit, addSecurityHeaders } from '@/lib/security'

/**
 * POST /api/config/create
 * Creates the gitpins-config repository with all necessary files.
 */
export async function POST(request: NextRequest) {
  // Validate origin for CSRF protection
  if (!validateOrigin(request)) {
    return addSecurityHeaders(
      NextResponse.json({ error: 'Invalid request' }, { status: 403 })
    )
  }

  const session = await getSession()

  if (!session) {
    return addSecurityHeaders(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    )
  }

  // Rate limiting
  const rateLimit = checkAPIRateLimit(request, session.userId)
  if (!rateLimit.allowed) {
    return addSecurityHeaders(rateLimit.response!)
  }

  try {
    // Obtener datos del usuario
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { repoOrder: true },
    })

    if (!user || !user.installationId || !user.repoOrder || !user.accessToken) {
      return addSecurityHeaders(
        NextResponse.json({ error: 'Configuration required' }, { status: 400 })
      )
    }

    // Use user's OAuth token for creating repos (App token can't do this)
    const userAccessToken = decrypt(user.accessToken)
    const userOctokit = createUserOctokit(userAccessToken)

    // Use App token for other operations (secrets, etc.)
    const appOctokit = createAppOctokit(user.installationId)
    const repoName = user.repoOrder.configRepoName || 'gitpins-config'
    const isPrivate = user.repoOrder.configRepoPrivate ?? true

    // Generar sync secret si no existe
    let syncSecret = user.repoOrder.syncSecret
    if (!syncSecret) {
      syncSecret = randomUUID()
      await prisma.repoOrder.update({
        where: { userId: session.userId },
        data: { syncSecret },
      })
    }

    // Verificar si el repo ya existe
    let repoExists = false
    try {
      await userOctokit.rest.repos.get({
        owner: user.username,
        repo: repoName,
      })
      repoExists = true
    } catch {
      repoExists = false
    }

    // Crear repo si no existe (using user's OAuth token)
    if (!repoExists) {
      await userOctokit.rest.repos.createForAuthenticatedUser({
        name: repoName,
        description: 'GitPins configuration - Keeps your repos ordered',
        private: isPrivate,
        auto_init: true,
      })

      // Esperar un momento para que GitHub procese la creación
      await new Promise((resolve) => setTimeout(resolve, 2000))
    }

    // Habilitar GitHub Actions en el repo (requiere permiso Administration)
    try {
      await appOctokit.rest.actions.setGithubActionsPermissionsRepository({
        owner: user.username,
        repo: repoName,
        enabled: true,
        allowed_actions: 'all',
      })
    } catch (e) {
      console.log('Could not enable Actions automatically:', e)
    }

    // Crear el secret GITPINS_SYNC_SECRET en el repo (using App token)
    await createRepoSecret(appOctokit, user.username, repoName, 'GITPINS_SYNC_SECRET', syncSecret)

    // Generar contenidos
    const reposOrderArray: string[] = JSON.parse(user.repoOrder.reposOrder)
    const configJson = generateConfigJson({
      reposOrder: reposOrderArray,
      topN: user.repoOrder.topN,
      syncFrequency: user.repoOrder.syncFrequency,
      commitStrategy: user.repoOrder.commitStrategy as 'branch' | 'revert',
      username: user.username,
    })

    const workflowYaml = generateWorkflowYaml({
      syncFrequency: user.repoOrder.syncFrequency,
    })

    const readme = generateReadme(user.username)

    // Obtener el SHA del branch principal
    const { data: ref } = await appOctokit.rest.git.getRef({
      owner: user.username,
      repo: repoName,
      ref: 'heads/main',
    }).catch(() =>
      appOctokit.rest.git.getRef({
        owner: user.username,
        repo: repoName,
        ref: 'heads/master',
      })
    )

    const defaultBranch = ref.ref.replace('refs/heads/', '')
    const username = user.username

    // Crear o actualizar archivos
    async function createOrUpdateFile(
      path: string,
      content: string,
      message: string
    ) {
      let sha: string | undefined
      try {
        const { data } = await appOctokit.rest.repos.getContent({
          owner: username,
          repo: repoName,
          path,
        })
        if ('sha' in data) {
          sha = data.sha
        }
      } catch {
        // El archivo no existe
      }

      await appOctokit.rest.repos.createOrUpdateFileContents({
        owner: username,
        repo: repoName,
        path,
        message,
        content: Buffer.from(content).toString('base64'),
        sha,
        branch: defaultBranch,
      })
    }

    // Crear/actualizar archivos
    await createOrUpdateFile('config.json', configJson, '[GitPins] Update configuration')
    await createOrUpdateFile('README.md', readme, '[GitPins] Update README')
    await createOrUpdateFile(
      '.github/workflows/maintain-order.yml',
      workflowYaml,
      '[GitPins] Update workflow'
    )

    // Marcar como creado
    await prisma.repoOrder.update({
      where: { userId: session.userId },
      data: { configRepoCreated: true },
    })

    // Ejecutar el primer sync inmediatamente
    // (El workflow de GitHub Actions está desactivado por defecto en repos nuevos)
    try {
      const syncUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/sync/${syncSecret}`
      await fetch(syncUrl, { method: 'POST' })
    } catch {
      // Si falla el sync inicial, no es crítico - el usuario puede activar el workflow manualmente
      console.log('Initial sync skipped - user can trigger manually')
    }

    // Registrar en log
    await prisma.syncLog.create({
      data: {
        userId: session.userId,
        action: 'config_created',
        status: 'success',
        details: JSON.stringify({ repoName }),
      },
    })

    return addSecurityHeaders(
      NextResponse.json({
        success: true,
        repoUrl: `https://github.com/${user.username}/${repoName}`,
        message: 'Repository created. Go to Actions tab and enable workflows for automatic syncing.',
      })
    )
  } catch (error) {
    console.error('Error creating config repo:', error)

    await prisma.syncLog.create({
      data: {
        userId: session.userId,
        action: 'config_created',
        status: 'error',
        details: 'Operation failed',
      },
    })

    return addSecurityHeaders(
      NextResponse.json({ error: 'Operation failed' }, { status: 500 })
    )
  }
}

/**
 * Creates an encrypted repository secret using libsodium.
 * GitHub requires secrets to be encrypted with the repo's public key.
 * @param octokit - Authenticated Octokit client
 * @param owner - Repository owner username
 * @param repo - Repository name
 * @param secretName - Name of the secret to create
 * @param secretValue - Plain text secret value
 */
async function createRepoSecret(
  octokit: ReturnType<typeof createAppOctokit>,
  owner: string,
  repo: string,
  secretName: string,
  secretValue: string
) {
  // Obtener la clave pública del repositorio para encriptar el secret
  const { data: publicKey } = await octokit.rest.actions.getRepoPublicKey({
    owner,
    repo,
  })

  // Encriptar el secret usando libsodium
  await sodium.ready
  const binkey = sodium.from_base64(publicKey.key, sodium.base64_variants.ORIGINAL)
  const binsec = sodium.from_string(secretValue)
  const encBytes = sodium.crypto_box_seal(binsec, binkey)
  const encryptedValue = sodium.to_base64(encBytes, sodium.base64_variants.ORIGINAL)

  // Crear o actualizar el secret
  await octokit.rest.actions.createOrUpdateRepoSecret({
    owner,
    repo,
    secret_name: secretName,
    encrypted_value: encryptedValue,
    key_id: publicKey.key_id,
  })
}
