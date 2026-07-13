# Code Review — Round 1

**Timestamp:** 2026-07-13T00:00:00Z
**Loop iteration:** 1 of ≤5

## Raw findings

### Reviewer A — enhanced-review

1. [IMPORTANT] Hydration-mismatch fix (`043451f`, `82d9cc7`) patched the two render branches E2E happened to click through (`src/app/page.tsx`, `src/app/game/page.tsx`), not `useLocalStorage`'s lazy initializer (`src/components/custom-hooks/use-local-storage.ts:19-30`), which is the actual source of the SSR/client divergence (pre-existing in base `dff2cee`, unchanged by this branch). Other consumers (e.g. `src/components/forms/create-game-popup/create-game-popup.tsx:45`) still branch render output on the same divergent value with no guard — currently harmless only because both branches happen to render zero DOM nodes today.
2. [MINOR] `typecheck` script/CI gate has no `anchor/**` exclusion, unlike `eslint.config.mjs`. Pre-existing coupling, not a new regression, but now an explicit named CI gate alongside an "anchor/ untouched" invariant.
3-7. Observations, verified correct, no action: multi-transfer-popup.tsx loop fix, react-query-provider.tsx fix, eslint-disable annotations, eslint.config.mjs documented workarounds, postcss override, package-lock.json supply-chain check.

### Reviewer B — ponytail
skipped — plugin not installed

### Reviewer C — simplify

1. [minor/important, reviewer's own framing] Duplicated `useSyncExternalStore` hasMounted boilerplate between `src/app/page.tsx` (`subscribeNoop`) and `src/app/game/page.tsx` (`emptySubscribe`) — byte-identical mechanism, different names, written independently across the two fix commits. Recommends extracting `useHasMounted()` into `src/components/custom-hooks/`.
2. No other reuse/simplification/efficiency/altitude issues found.

## Consolidated issues

| ID | Severity | Summary | Evidence (file:line) |
| --- | --- | --- | --- |
| ISSUE-1 | important | `useLocalStorage`'s lazy initializer is the actual root cause of the hydration divergence; the fix gated only 2 of its call sites, other consumers remain exposed to the same crash class | `src/components/custom-hooks/use-local-storage.ts:19-30`; `src/components/forms/create-game-popup/create-game-popup.tsx:45` |
| ISSUE-2 | minor | Duplicated `useSyncExternalStore`/hasMounted boilerplate across `src/app/page.tsx` and `src/app/game/page.tsx` | `src/app/page.tsx:9-28`; `src/app/game/page.tsx:14-30` |
| ISSUE-3 | minor | `typecheck` gate has no `anchor/**` scope exclusion (pre-existing coupling, newly a named CI gate) | `tsconfig.json:40-50`; `.github/workflows/test-web.yml:26` |

## Disposition

- Actionable (blocking + important) — to fix this iteration: ISSUE-1
- Deferred (minor — NOT handled yet): ISSUE-2 (duplicated hasMounted boilerplate — likely resolved as a side effect of ISSUE-1's fix), ISSUE-3 (typecheck lacks anchor/ scope exclusion)
