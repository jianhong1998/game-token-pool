# Code Review — Round 2

**Timestamp:** 2026-07-13T00:00:00Z
**Loop iteration:** 2 of ≤5

## Raw findings

### Reviewer A — enhanced-review

1. [important] `hasMounted` false-logout fix (`3d5fb99`) duplicated verbatim across 3 files; root cause is `useLocalStorage`/`useUsername`/`useUserPublicKey`'s API has no way to express "value is trustworthy now" — recommends hoisting an `isReady` flag into the hook itself.
2. [important] `CreateGamePopup` (`create-game-popup.tsx:38-43`) has the identical unguarded pattern, currently safe only via an unenforced/undocumented invariant (only ever mounts below `game/page.tsx`'s own gate) — a future refactor could silently reintroduce the bug.
3. [verified clean] `hasMounted` gates in the 3 fixed files are structurally correct; `src/app/page.tsx`'s unguarded redirect is intentional/safe (non-destructive).
4. [minor, pre-existing, dormant] `setValue`'s functional-update form reads a stale closure; no current call site exercises it.
5. [important, process] No automated regression test exists for the false-logout race found/fixed manually in rounds 3-4.

### Reviewer B — ponytail
skipped — plugin not installed

### Reviewer C — simplify

1. Same duplication as Reviewer A's #1 — recommends `useHasMounted()` extraction; also flags real comment-wording drift already present between the 3 copies.
2. [verified clean] No dead code/orphaned imports from the multi-round fix history; lint/typecheck clean.
3. [minor] `{raw,parsed}` cache in `use-local-storage.ts` is unexercised generality (all call sites store plain strings); `window?.` optional chaining in `getSnapshot` is dead defensively.

## Consolidated issues

| ID | Severity | Summary | Evidence (file:line) |
| --- | --- | --- | --- |
| ISSUE-1 | important | `hasMounted` boilerplate duplicated 3x with drifted comments | `src/app/game/page.tsx:25,41-50`; `src/app/[username]/page.tsx:21,36-44`; `src/app/[username]/dealer/page.tsx:19,32-40` |
| ISSUE-2 | important | `CreateGamePopup` has the same unguarded pattern, safe only via an unenforced invariant | `src/components/forms/create-game-popup/create-game-popup.tsx:38-43` |
| ISSUE-4 | minor | `setValue`'s functional-update form reads a stale closure (pre-existing, dormant) | `src/components/custom-hooks/use-local-storage.ts:89` |
| ISSUE-5 | important (process) — **deferred, not actionable this loop** | No automated Playwright regression test for the false-logout race | n/a |
| ISSUE-6 | minor | Unexercised cache generality + dead defensive optional chaining | `src/components/custom-hooks/use-local-storage.ts:12-15,25,34,40-43` |

## Disposition

- Actionable (blocking + important) — to fix this iteration: **ISSUE-1 + ISSUE-2 combined** via the consolidator's recommended fix shape — hoist an `isReady` flag into `useLocalStorage`'s (and `useUsername`/`useUserPublicKey`'s) return value, so consumers write `isReady && <condition>` instead of maintaining their own `hasMounted` trio, and `CreateGamePopup` gets the guard by using the same primitive. This closes both duplication (ISSUE-1) and the unenforced-invariant landmine (ISSUE-2) in one change.
- **ISSUE-5 explicitly deferred, not fixed in-loop:** it directly contradicts the spec's own stated non-goal — `docs/superpowers/specs/2026-07-13-web-next16-react19-design.md` "Follow-ups" section: *"A web smoke-test suite. The absence of one is the single largest risk here and it will keep being the largest risk on every future upgrade... Recorded as a follow-up."* Per the plan's own precedence rule ("if a step here appears to contradict the spec, the spec wins"), adding Playwright test infra mid-fix-loop is scope creep the spec authors already deliberately excluded. Recorded here for the next maintainer, not implemented.
- Deferred (minor — NOT handled yet): ISSUE-4 (dormant stale-closure risk in `setValue`'s functional form), ISSUE-6 (unexercised cache generality, dead optional chaining)
