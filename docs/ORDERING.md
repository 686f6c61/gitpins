# Ordering Strategy (Commit + Revert)

This document explains how GitPins maintains a desired repository order and what "single-pass" means in practice.

## The Problem Model

GitHub surfaces repositories ordered by recency ("last updated"). We cannot set an explicit order directly.

GitPins approximates an explicit order by making selected repositories become "more recent" in a controlled sequence.

Key observation:
1. If repository A is updated after repository B, A will appear above B in a recency-ordered list.
2. Therefore, if we update repositories in reverse desired order, we can force the top of the list into the desired order.

## How GitPins "Touches" a Repository

Implementation: `src/app/api/sync/[secret]/route.ts`

GitPins uses a fixed strategy:
1. Create an empty commit (no file changes).
2. Create a revert commit immediately after.

This produces two commits but no code changes.

Why we keep the revert:
1. It makes the operation auditable and deterministic.
2. The repository content remains unchanged.

## Desired Order vs Global Order

Definitions:
1. `desiredTop`: the user's configured ordered list, truncated to `topN`.
2. `currentOrder`: GitHub's current global recency order for the user's repositories.

Goal:
1. Make `currentOrder[0..N)` equal `desiredTop` (exact match).

## The Naive Algorithm (Always Touch All N)

Naive approach:
1. Touch repos in reverse order of `desiredTop`.

Result:
1. Usually works.
2. Creates 2*N commits every time a reorder is needed.

Downside:
1. Expensive in API calls and GitHub Actions minutes.
2. Noisy commit history.

## Optimization: Touch Only the Minimal Prefix

Implementation: `getReposToTouch()` in `src/app/api/sync/[secret]/route.ts`

Idea:
1. If some of the desired repos are already near the top, we can sometimes avoid touching the full list.
2. Only repos that must become "newer than everything else in the top-N" need to be touched.

Algorithm sketch:
1. Try prefix lengths from 0 to N.
2. For each prefix length `k`:
1. Assume we touch only `desiredTop[0..k)`.
2. Remove those repos from `currentOrder`.
3. Construct a candidate top-N as:
1. The touched prefix (in the same order).
2. Followed by the first `N-k` items from `currentOrder` without the touched repos.
3. If the candidate equals `desiredTop`, touching only the prefix works.

We choose the smallest such `k`.

Why "prefix" and not any subset:
1. The relative order among touched repos is created by touch ordering.
2. A touched repo will become newer than all untouched repos (within the time window).
3. To achieve an exact desired top-N, only the leading segment typically needs to be newer than the untouched remainder.

## "Single-Pass"

GitPins sync is single-pass in the sense that:
1. The sync endpoint does exactly one ordering pass per invocation.
2. It does not automatically run a second global cleanup phase.

Cleanup (history rewrite) is a separate, explicit action.

## Practical Limitations

1. GitHub ordering rules are external. GitHub may consider signals beyond "commit date" for some views.
2. External activity (real commits, PR merges, releases) can reorder repositories between sync runs.
3. Private repositories require the app to be installed on them and the API query paths must include them.

## Performance Characteristics

1. Touching `k` repositories creates `2*k` commits.
2. The minimal-prefix search is O(N^2) in worst case, but N is small (user-configured topN, max 100).
3. Most time is spent on GitHub API calls and the 1s delay between repo touches (rate safety).

