# Code Review — Round 3

**Timestamp:** 2026-07-13T00:00:00Z
**Loop iteration:** 3 of ≤5

## Raw findings

### Reviewer A — enhanced-review

Verdict: SHIP IT. `e3d490e` cleanly resolves round-2's duplication finding (zero `hasMounted` remnants), breaking `useUsername`/`useUserPublicKey` API change fully propagated across all 8 call sites, independent re-audit of all 10 consumers found no 5th unguarded destructive/redirect mount-effect, `anchor/` untouched.

One non-blocking observation: `use-local-storage.ts:93-101`'s comment asserts a React internal-scheduling-order guarantee not part of React's public API contract — only E2E-validated, no unit test pins it. Recommends as a future follow-up (explicitly not a merge blocker): an RTL-style unit test that would fail fast if a future React version changes this internal ordering.

Round-2 deferred minors (ISSUE-4, ISSUE-6) confirmed unchanged, not regressed.

### Reviewer B — ponytail
skipped — plugin not installed

### Reviewer C — simplify

Confirms `e3d490e` resolves the duplication cleanly, no new duplication introduced. One non-blocking observation: two files AND two independent `isReady` flags together (inherent to per-key hook design, not worth extracting for 2 occurrences). Fresh full-diff pass found nothing new actionable. Round-2 deferred minors confirmed unchanged.

Verdict: "clean to merge from a simplify/quality perspective."

## Consolidated issues

| ID | Severity | Summary | Evidence (file:line) |
| --- | --- | --- | --- |
| ISSUE-4 | minor (carried over) | `setValue`'s functional-update form reads a stale closure (pre-existing, dormant) | `src/components/custom-hooks/use-local-storage.ts:103-117` |
| ISSUE-6 | minor (carried over) | Dead optional chaining + unexercised cache generality | `src/components/custom-hooks/use-local-storage.ts:41,109,121` |
| NEW-1 | minor | Hook-ordering safety comment asserts a React internal (non-contractual) guarantee, validated only by E2E, no unit test | `src/components/custom-hooks/use-local-storage.ts:93-101` |
| NEW-2 | minor | Two independent `isReady` flags ANDed at 2 call sites — inherent to per-key hook design, not worth extracting | `src/components/custom-hooks/use-user.ts:7,15` |

## Disposition

- Actionable (blocking + important) — to fix this iteration: **none**
- Deferred (minor — NOT handled yet): ISSUE-4, ISSUE-6, NEW-1 (candidate follow-up: add a unit test pinning the effect-ordering assumption in `useLocalStorage`), NEW-2

**Actionable count: 0 → loop exits.**
