/**
 * Script temporal para limpiar commits de GitPins de todos los repos
 * NO integrar en el SaaS - solo para uso manual
 */

import { PrismaClient as GeneratedPrismaClient } from './src/generated/prisma/index.js'
import { Octokit } from 'octokit'
import { createAppAuth } from '@octokit/auth-app'

const prisma = new GeneratedPrismaClient()

function createAppOctokit(installationId) {
  return new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: process.env.GITHUB_APP_ID,
      privateKey: process.env.GITHUB_APP_PRIVATE_KEY,
      installationId,
    },
  })
}

async function cleanupRepoCommits(octokit, owner, repo) {
  try {
    // Get default branch
    const { data: repoData } = await octokit.rest.repos.get({ owner, repo })
    const defaultBranch = repoData.default_branch

    // Get commits
    const { data: commits } = await octokit.rest.repos.listCommits({
      owner,
      repo,
      sha: defaultBranch,
      per_page: 100,
    })

    // Find GitPins commits
    const gitpinsCommits = commits.filter(c =>
      c.commit.message.includes('[GitPins]')
    )

    if (gitpinsCommits.length === 0) {
      return { status: 'success', removedCommits: 0, message: 'No GitPins commits found' }
    }

    // Create backup branch
    const backupBranchName = `gitpins-backup-${Date.now()}`
    await octokit.rest.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${backupBranchName}`,
      sha: commits[0].sha,
    })

    // Recreate commit chain without GitPins commits
    const commitsReversed = [...commits].reverse()
    let lastRecreatedSha = null
    const commitMapping = new Map()

    for (const commit of commitsReversed) {
      if (commit.commit.message.includes('[GitPins]')) {
        continue
      }

      const { data: fullCommit } = await octokit.rest.git.getCommit({
        owner,
        repo,
        commit_sha: commit.sha,
      })

      let newParents = []
      if (fullCommit.parents.length === 0) {
        newParents = []
      } else {
        for (const parent of fullCommit.parents) {
          const mappedParent = commitMapping.get(parent.sha)
          if (mappedParent) {
            newParents.push(mappedParent)
          } else if (!commits.find(c => c.sha === parent.sha && c.commit.message.includes('[GitPins]'))) {
            newParents.push(parent.sha)
          }
        }
        if (newParents.length === 0 && lastRecreatedSha) {
          newParents = [lastRecreatedSha]
        }
      }

      const { data: newCommit } = await octokit.rest.git.createCommit({
        owner,
        repo,
        message: fullCommit.message,
        tree: fullCommit.tree.sha,
        parents: newParents,
        author: fullCommit.author,
        committer: fullCommit.committer,
      })

      commitMapping.set(commit.sha, newCommit.sha)
      lastRecreatedSha = newCommit.sha
    }

    if (!lastRecreatedSha) {
      return { status: 'error', message: 'No non-GitPins commits found' }
    }

    // Update main branch
    await octokit.rest.git.updateRef({
      owner,
      repo,
      ref: `heads/${defaultBranch}`,
      sha: lastRecreatedSha,
      force: true,
    })

    return { status: 'success', removedCommits: gitpinsCommits.length }
  } catch (error) {
    return { status: 'error', message: error.message }
  }
}

async function cleanupAllRepos() {
  try {
    const users = await prisma.user.findMany({
      where: {
        installationId: { not: null },
        repoOrder: { isNot: null }
      },
      include: { repoOrder: true }
    })

    console.log(`Found ${users.length} users with configured repos\n`)

    for (const user of users) {
      if (!user.repoOrder || !user.installationId) continue

      console.log(`Processing user: ${user.username}`)

      const octokit = createAppOctokit(user.installationId)

      let repos = []
      try {
        repos = JSON.parse(user.repoOrder.reposOrder)
      } catch {
        console.log(`  Skipping - invalid repos order\n`)
        continue
      }

      console.log(`  Found ${repos.length} repos to clean`)

      for (const repoFullName of repos) {
        const [owner, repo] = repoFullName.split('/')

        console.log(`  Cleaning ${repoFullName}...`)

        try {
          const result = await cleanupRepoCommits(octokit, owner, repo)

          if (result.status === 'success') {
            if (result.removedCommits > 0) {
              console.log(`    ✅ Cleaned ${result.removedCommits} commits`)
            } else {
              console.log(`    ℹ️  No commits to clean`)
            }
          } else {
            console.log(`    ❌ Error: ${result.message}`)
          }
        } catch (error) {
          console.error(`    ❌ Error: ${error.message}`)
        }

        await new Promise(resolve => setTimeout(resolve, 2000))
      }

      console.log('')
    }

    console.log('✅ Cleanup completed for all repos')
  } catch (error) {
    console.error('Fatal error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

cleanupAllRepos()
