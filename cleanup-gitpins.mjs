import pg from 'pg'
import { Octokit } from 'octokit'
import { createAppAuth } from '@octokit/auth-app'
import dotenv from 'dotenv'

dotenv.config()

const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

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
    const { data: repoData } = await octokit.rest.repos.get({ owner, repo })
    const defaultBranch = repoData.default_branch

    const { data: commits } = await octokit.rest.repos.listCommits({
      owner,
      repo,
      sha: defaultBranch,
      per_page: 100,
    })

    const gitpinsCommits = commits.filter(c =>
      c.commit.message.includes('[GitPins]')
    )

    if (gitpinsCommits.length === 0) {
      return { status: 'success', removedCommits: 0 }
    }

    const backupBranchName = 'gitpins-backup-' + Date.now()
    await octokit.rest.git.createRef({
      owner,
      repo,
      ref: 'refs/heads/' + backupBranchName,
      sha: commits[0].sha,
    })

    const commitsReversed = [...commits].reverse()
    let lastRecreatedSha = null
    const commitMapping = new Map()

    for (const commit of commitsReversed) {
      if (commit.commit.message.includes('[GitPins]')) continue

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
      return { status: 'error', message: 'No non-GitPins commits' }
    }

    await octokit.rest.git.updateRef({
      owner,
      repo,
      ref: 'heads/' + defaultBranch,
      sha: lastRecreatedSha,
      force: true,
    })

    return { status: 'success', removedCommits: gitpinsCommits.length }
  } catch (error) {
    return { status: 'error', message: error.message }
  }
}

async function main() {
  try {
    const result = await pool.query(`
      SELECT u.username, u."installationId", ro."reposOrder"
      FROM users u
      JOIN repo_orders ro ON u.id = ro."userId"
      WHERE u."installationId" IS NOT NULL
    `)

    console.log(`Found ${result.rows.length} users\n`)

    for (const user of result.rows) {
      console.log(`Processing: ${user.username}`)

      const octokit = createAppOctokit(user.installationId)
      let repos = []

      try {
        repos = JSON.parse(user.reposOrder)
      } catch {
        console.log('  Skipping - invalid order\n')
        continue
      }

      console.log(`  ${repos.length} repos to clean`)

      for (const repoFullName of repos) {
        const [owner, repo] = repoFullName.split('/')
        console.log(`  ${repoFullName}...`)

        try {
          const result = await cleanupRepoCommits(octokit, owner, repo)
          if (result.removedCommits > 0) {
            console.log(`    ✅ ${result.removedCommits} commits`)
          } else {
            console.log(`    ℹ️  Already clean`)
          }
        } catch (error) {
          console.error(`    ❌ ${error.message}`)
        }

        await new Promise(r => setTimeout(r, 2000))
      }
      console.log('')
    }

    console.log('✅ Done')
  } catch (error) {
    console.error('Fatal:', error)
  } finally {
    await pool.end()
  }
}

main()
