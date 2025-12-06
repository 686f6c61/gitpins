/**
 * GitPins - Control the order of your GitHub repositories
 * @author 686f6c61
 * @repository https://github.com/686f6c61/gitpins
 * @created 2024
 * @license MIT
 *
 * Cleanup Helper
 * Removes GitPins commits from repositories automatically using GitHub API.
 *
 * IMPORTANT: Due to GitHub API limitations, this uses a "soft cleanup" approach:
 * - Creates a new branch without GitPins commits
 * - Updates main to point to the cleaned branch
 * - This is safer and works in serverless environments
 */

import { createAppOctokit } from '@/lib/github-app'

/**
 * Automatic cleanup using GitHub API only (works in serverless)
 * Strategy: Recreate commit history skipping GitPins commits
 */
export async function cleanupRepoCommitsAutomatic(
  octokit: ReturnType<typeof createAppOctokit>,
  owner: string,
  repo: string
): Promise<{
  status: string
  method: string
  removedCommits?: number
  newHead?: string
  error?: string
}> {

  try {
    // 1. Obtener default branch
    const { data: repoData } = await octokit.rest.repos.get({ owner, repo })
    const defaultBranch = repoData.default_branch

    // 2. Obtener commits (últimos 100)
    const { data: commits } = await octokit.rest.repos.listCommits({
      owner,
      repo,
      sha: defaultBranch,
      per_page: 100,
    })

    // 3. Separar commits GitPins y normales
    const gitpinsCommits = commits.filter(c =>
      c.commit.message.includes('[GitPins]')
    )

    if (gitpinsCommits.length === 0) {
      return {
        status: 'success',
        method: 'none',
        removedCommits: 0,
        error: 'No GitPins commits found'
      }
    }

    // 4. Crear backup branch apuntando al commit actual
    const backupBranchName = `gitpins-backup-${Date.now()}`

    try {
      await octokit.rest.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${backupBranchName}`,
        sha: commits[0].sha,
      })
    } catch (e) {
      // Si falla crear backup, no continuar
      return {
        status: 'error',
        method: 'none',
        error: 'Failed to create backup branch'
      }
    }

    // 5. Recorrer commits en orden inverso (del más antiguo al más nuevo)
    // y recrear solo los que NO son GitPins
    const commitsReversed = [...commits].reverse()
    let lastRecreatedSha: string | null = null
    const commitMapping = new Map<string, string>() // original SHA -> nuevo SHA

    for (const commit of commitsReversed) {
      // Si es un commit de GitPins, saltarlo
      if (commit.commit.message.includes('[GitPins]')) {
        continue
      }

      // Obtener detalles completos del commit
      const { data: fullCommit } = await octokit.rest.git.getCommit({
        owner,
        repo,
        commit_sha: commit.sha,
      })

      // Determinar los parents del nuevo commit
      let newParents: string[] = []

      if (fullCommit.parents.length === 0) {
        // Es un root commit, no tiene parents
        newParents = []
      } else {
        // Mapear los parents al nuevo historial (saltando GitPins)
        for (const parent of fullCommit.parents) {
          const mappedParent = commitMapping.get(parent.sha)
          if (mappedParent) {
            newParents.push(mappedParent)
          } else if (!commits.find(c => c.sha === parent.sha && c.commit.message.includes('[GitPins]'))) {
            // Si el parent no está en nuestra lista o no es GitPins, incluirlo
            newParents.push(parent.sha)
          }
        }

        // Si todos los parents eran GitPins y tenemos un último commit recreado, usar ese
        if (newParents.length === 0 && lastRecreatedSha) {
          newParents = [lastRecreatedSha]
        }
      }

      // Crear el nuevo commit con el mismo contenido pero nueva cadena de parents
      const { data: newCommit } = await octokit.rest.git.createCommit({
        owner,
        repo,
        message: fullCommit.message,
        tree: fullCommit.tree.sha,
        parents: newParents,
        author: fullCommit.author,
        committer: fullCommit.committer,
      })

      // Guardar el mapeo
      commitMapping.set(commit.sha, newCommit.sha)
      lastRecreatedSha = newCommit.sha
    }

    if (!lastRecreatedSha) {
      return {
        status: 'error',
        method: 'none',
        error: 'No non-GitPins commits found to recreate'
      }
    }

    // 6. Actualizar main branch al último commit recreado (force update)
    await octokit.rest.git.updateRef({
      owner,
      repo,
      ref: `heads/${defaultBranch}`,
      sha: lastRecreatedSha,
      force: true,
    })

    // 7. Success
    return {
      status: 'success',
      method: 'rewrite',
      removedCommits: gitpinsCommits.length,
      newHead: lastRecreatedSha,
    }

  } catch (error: any) {
    return {
      status: 'error',
      method: 'none',
      error: error.message || 'Unknown error',
    }
  }
}
