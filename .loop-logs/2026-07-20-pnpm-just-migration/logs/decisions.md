# Decisions & Challenges — 2026-07-20-pnpm-just-migration

## Orchestration deviation (not a task-level decision, applies to the whole run)

The plan's Architecture section states these are "six sequential, independently-
committable tasks," and several tasks explicitly consume prior tasks' file output
(e.g. Task 2's Docker build verification needs Task 1's `pnpm-lock.yaml` physically
present). This conflicts with the pipeline's default of spawning every task's
worktree agent simultaneously from the same starting commit. Resolved by splitting
Stage 1 into 3 waves: Wave 1 = {Task 1, 3, 4, 5, 6} (no task needs another's file
output on disk to pass its own verification — Task 5's docs content is fully
spelled out verbatim in the plan, so it doesn't need Task 4's actual justfile to
exist), squash-merged, then Wave 2 = {Task 2} (needs Task 1 merged first), then
Wave 3 = {Task 7} (final verification, needs everything merged, no worktree since
it modifies no product files).

## task-1-migrate-lockfile-to-pnpm

### Key decisions
- Ran `pnpm import` (not a fresh `pnpm install`) to preserve exact already-resolved
  dependency versions per the plan's anti-drift requirement; verified all 29 direct
  deps resolved identically, with the only lockfile diff being the postcss
  `overrides`→`pnpm.overrides` resolution-metadata change anticipated by the plan.

## task-5-update-docs-pnpm-just

### Key decisions
- The plan's literal Step 3 verification grep (`grep -n "npm \|npm run\|npm ci\|make "`)
  false-positives against `pnpm` (since "npm " is a literal substring of "pnpm ").
  Used a word-boundary-aware check instead to confirm no real stray npm/make
  references remained. This same fix was carried into Task 7's repo-wide sweep.

## task-7-final-verification

### Key decisions
- Verified each of Step 1's chained verification commands individually (captured
  `$?` per command) rather than trusting one piped `&&` chain, since piping through
  `tail` or similar can mask the true exit status of an earlier command in the chain.
- Applied the same word-boundary-aware grep fix as Task 5 to the repo-wide sweep;
  classified 3 remaining hits (2 in `CLAUDE.md`/`test-anchor.yml` about the npm
  package registry, not CLI invocations) as non-defects, consistent with Task 5's
  precedent.

## Review fixes

(none — round 1 raised zero actionable (blocking/important) issues; nothing was
fixed in the review loop. See `.loop-logs/2026-07-20-pnpm-just-migration/code-review/round-1.md`
for the 4 deferred minor findings.)
