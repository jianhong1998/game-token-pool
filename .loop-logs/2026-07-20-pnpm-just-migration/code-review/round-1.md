# Code Review — Round 1

**Timestamp:** 2026-07-20
**Loop iteration:** 1 of ≤5

## Raw findings

### Reviewer A — enhanced-review

Overall: no blocking or important findings. Every commit's diff matches the plan's prescribed diff byte-for-byte. Verified clean: dependency drift (all 29 direct deps byte-identical resolved versions, only the documented postcss-override lockfile diff), stray npm/make references (only substring false-positives / 2 pre-existing unrelated comments), non-goals honored (docker-compose.yml, package.json name, decisions.md placement), CI/Dockerfile internal consistency, verification actually executed with exit codes checked individually.

Minor observations:
1. `anchor test` never re-run locally under pnpm post-migration (only `anchor-build` was, per the plan/spec's own documented scope). CI's `test-anchor.yml` does run `pnpm run anchor test`.
2. A worktree-local "multiple lockfiles" Next.js warning during Task 1's isolated build — artifact of the worktree setup, not the merged repo.

### Reviewer B — ponytail

skipped — plugin not installed

### Reviewer C — simplify

Overall: no blocking or important findings. Mechanical, low-risk tooling swap.

Minor/informational notes:
1. `test-anchor.yml`/`test-web.yml` duplicate an identical 4-step pnpm setup block — pre-existing pattern (existed under npm too), not worth extracting for 2 call sites.
2. `justfile`'s `down-clean` double-invokes `clean-image` (via `down` then again explicitly) — byte-for-byte carryover from the original `makefile`'s `down/clean` target, consistent with decisions.md Q7's documented 1:1-mirror intent.

## Consolidated issues

| ID | Severity | Summary | Evidence (file:line) |
| --- | --- | --- | --- |
| F1 | minor | `anchor test` (surfpool jest suite) not re-run locally under pnpm post-migration; only `anchor-build` verified. CI is correctly wired to run it, but no CI run has occurred yet on this branch (no PR open) — recommend triggering CI before merging. | `package.json:7-10`; `.loop-logs/2026-07-20-pnpm-just-migration/logs/task-7-final-verification.md:8,53`; `.github/workflows/test-anchor.yml:71` |
| F2 | minor (informational, no action) | Worktree-local Next.js "multiple lockfiles" warning during Task 1's isolated build — caused by a stale sibling `package-lock.json` outside the worktree; not present in merged repo; build exit 0. | `.loop-logs/2026-07-20-pnpm-just-migration/logs/task-1-migrate-lockfile-to-pnpm.md:56` |
| F3 | minor | `test-anchor.yml` and `test-web.yml` duplicate an identical 4-step pnpm/Node setup block. Pre-existing pattern; not worth extracting for 2 call sites. | `.github/workflows/test-anchor.yml:16-26`; `.github/workflows/test-web.yml:16-26` |
| F4 | minor | `justfile` `down-clean` calls `just down` (which already runs `clean-image`) then explicitly re-runs `clean-image` — double invocation. Verified as a byte-for-byte carryover from the original `makefile`'s `down/clean` target. | `justfile:17-26`; pre-migration `makefile` via `git show c379028:makefile:14-23` |

## Disposition

- Actionable (blocking + important) — to fix this iteration: none
- Deferred (minor — NOT handled yet): F1 (anchor test not re-run locally; CI wired but unrun), F2 (informational worktree-build-warning noise), F3 (pre-existing CI step duplication), F4 (pre-existing justfile double-invocation, intentional 1:1 mirror)
