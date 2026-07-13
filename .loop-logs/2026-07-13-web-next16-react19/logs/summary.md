# Loop Summary

**Plan:** docs/superpowers/plans/2026-07-13-web-next16-react19.md
**Spec:** docs/superpowers/specs/2026-07-13-web-next16-react19-design.md
**Branch:** refactor/modernization-tech-stack
**Date:** 2026-07-13

## Tasks

| Task | Status | Attempts | Delivered |
| --- | --- | --- | --- |
| task-1-migrate-eslint-to-flat-config | completed | 1 (resumed after a mid-run interruption) | Migrate ESLint to flat config |
| task-2-upgrade-to-react-19 | completed | 1 | Upgrade to React 19 and fix render-phase side effects |
| task-3-upgrade-to-nextjs-16 | completed | 1 | Upgrade to Next.js 16 |
| task-4-harden-ci-and-record-accepted-advisories | completed | 1 | Harden CI and record the accepted residual advisories |

**Completed:** 4/4
**Failed:** 0/4

**Note on execution order:** tasks were run sequentially (not the skill's default parallel-worktree Stage 1), per explicit user decision — the plan's own tasks have hard dependencies (shared `package-lock.json`, ESLint 9→10 ERESOLVE ordering) that make parallel worktrees unsafe for this specific plan.

## Verification

**Rounds:** 5 (see `.loop-logs/2026-07-13-web-next16-react19/tasks/verification-state.json`)

- Round 1: FAIL — hydration mismatch on `/` and `/game` for already-logged-in users (React 19's new render-phase-redirect fix diverged SSR vs. client's first render).
- Round 2: PASS — full E2E after point-fix.
- Round 3: FAIL — a deeper root-cause fix (moving hydration-safety into `useLocalStorage` via `useSyncExternalStore`) unexpectedly introduced a real, empirically-reproduced destructive false-logout race on `/<username>`, `/<username>/dealer`, and a wrong redirect on `/game`, when hard-navigating while logged in. Caught only by live Playwright testing — two independent static code reviews had reasoned (incorrectly) that this couldn't happen.
- Round 4: PASS — fixed via `hasMounted`-gated destructive effects, grounded in React's commit-boundary contract; re-verified the exact failing scenario, including a deliberate repeat to rule out flakiness.
- Round 5: PASS — after consolidating the `hasMounted` fix into a hoisted `isReady` flag inside `useLocalStorage` itself (closing both a duplication issue and an unguarded 4th consumer, `CreateGamePopup`), re-verified with extra stress on the one file with two independent `isReady` instances.

Manual E2E checklist (plan Task 4 Step 4) was deliberately executed here, via Playwright, rather than inside Task 4's own worktree — avoiding a duplicate docker boot.

## Review

**Loop iterations:** 3 of ≤5
**Actionable issues found:** 3 (ISSUE-1 round 1: hydration-mismatch root-cause scoped too narrowly; ISSUE-1+ISSUE-2 round 2: duplicated hasMounted fix + unguarded 4th consumer, fixed together)
**Actionable issues fixed:** 3
**Minor issues deferred (NOT handled yet):**
- ISSUE-4: `useLocalStorage.setValue`'s functional-update form reads a stale closure — pre-existing, dormant, no current caller exercises it (`src/components/custom-hooks/use-local-storage.ts:103-117`)
- ISSUE-6: dead defensive optional chaining + unexercised generic-cache machinery in `useLocalStorage` (`src/components/custom-hooks/use-local-storage.ts:41,109,121`)
- NEW-1: the hook-ordering safety comment in `useLocalStorage` documents a React internal (non-contractual) scheduling guarantee, validated only by E2E — recommended follow-up: add a unit test pinning this assumption so a future React version bump fails fast in CI instead of silently reintroducing the false-logout race (`src/components/custom-hooks/use-local-storage.ts:93-101`)
- NEW-2: two independent `isReady` flags ANDed at 2 call sites — inherent to per-key hook design, not worth extracting for 2 occurrences (`src/components/custom-hooks/use-user.ts:7,15`)
- **ISSUE-5 (explicitly out of scope, not just deferred):** adding a Playwright/automated web test suite was recommended by review round 2 but directly contradicts the spec's own stated non-goal (`docs/superpowers/specs/2026-07-13-web-next16-react19-design.md` "Follow-ups" section explicitly defers this). Not implemented per the plan's stated precedence that the spec wins.

## Final state

- `npm run typecheck`, `npm run lint`, `npm run build` — all pass.
- `npm audit` — `next: CLEAN`.
- `git diff dff2cee..HEAD --stat -- anchor/` — empty.
- 9 commits landed on `refactor/modernization-tech-stack`, linear history, no merge commits.
