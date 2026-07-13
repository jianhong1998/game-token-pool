# Task 3 Log: Upgrade to Next.js 16

## Task Context

### Plan Section

### Task 3: Upgrade to Next.js 16

This is the task that actually closes the CVEs.

**Files:**
- Modify: `package.json` (next, eslint-config-next)

**Interfaces:**
- Consumes: ESLint flat config (Task 1), React 19 (Task 2). Both are hard prerequisites — Next 16 requires ESLint ≥9 and React 19.

- [ ] **Step 1: Install Next 16, the matching ESLint config, and ESLint 10**

```bash
npm install next@16.2.10
npm install --save-dev eslint-config-next@16.2.10 eslint@10.7.0
```

ESLint goes to 10 **here**, not in Task 1 — `eslint-config-next@16` peers `eslint >=9.0.0`, so 10 is only legal now that the config is on the 16 line. (Task 1 deliberately held ESLint at 9 for exactly this reason.)

- [ ] **Step 2: Run the official Next 16 codemod**

```bash
npx @next/codemod@canary upgrade latest
```

If the codemod offers to change React or ESLint versions, **decline** — those are already correct from Tasks 1 and 2. Accept only the Next-specific transforms. If the codemod fails or is unavailable, continue to Step 3; the changes below are the ones that matter for this codebase.

- [ ] **Step 3: Verify async request APIs**

Next 15 already made `params`, `searchParams`, `cookies()`, and `headers()` async, and this codebase is on Next 15, so it should already be compliant. Confirm:

```bash
grep -rn "params" src/app/\[username\]/page.tsx src/app/game/\[gameName\]/page.tsx | head
```

Expected: `params` is awaited or typed as a `Promise`. If any page destructures `params` synchronously, `npm run typecheck` in Step 4 will catch it — fix by awaiting.

- [ ] **Step 4: Verify typecheck, lint, and build**

Run:
```bash
npm run typecheck && npm run lint && npm run build
```
Expected: all three succeed.

If the build fails on `next.config.mjs`, note that the config is currently empty (`{}`), so any failure there is a Next 16 schema change — consult the Next 16 upgrade guide and fix minimally.

- [ ] **Step 5: Confirm the Next.js advisories are gone**

Run:
```bash
npm audit --json | python3 -c "import sys,json; a=json.load(sys.stdin)['vulnerabilities']; print('next:', a.get('next', {}).get('severity', 'CLEAN'))"
```
Expected: `next: CLEAN`

This is the pass/fail gate for the whole plan. If `next` still reports a vulnerability, the upgrade did not take.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json next.config.mjs src/
git commit -m "feat(web): upgrade to Next.js 16

Closes all outstanding Next.js advisories. Requires React 19 (Task 2)
and ESLint flat config (Task 1)."
```

### Acceptance Criteria
- AC-1: `next` is installed at exactly `16.2.10`.
- AC-2: `eslint-config-next` is `16.2.10`, `eslint` is `10.7.0`.
- AC-3: `npm run typecheck` exits 0.
- AC-4: `npm run lint` exits 0.
- AC-5: `npm run build` succeeds.
- AC-6: `npm audit` reports `next` as CLEAN — this is the pass/fail gate for the whole plan.
- AC-7: `anchor/`, `@coral-xyz/anchor`, `@solana/web3.js`, `@solana/spl-token` untouched; Tailwind, daisyUI, TypeScript versions untouched.
- AC-8: No `npm audit fix --force` run.

## Attempt 1 — 2026-07-13T02:07:08Z

### Implementation Plan
- Install `next@16.2.10`, then devDeps `eslint-config-next@16.2.10` + `eslint@10.7.0` exactly as pinned.
- Run `npx @next/codemod@canary upgrade latest` (Step 2), verify async `params` usage (Step 3), then gate on typecheck+lint+build (Step 4).
- Confirm `npm audit`'s `next` entry is CLEAN (Step 5) — the pass/fail gate — and commit (Step 6).
- Work any real blockers encountered during install/lint/build to resolution rather than suppressing them, per the plan's "fix minimally, do not blanket-disable" guidance.

### Files Changed
- modified `package.json` — `next` 15.2.3 -> 16.2.10; `eslint` 9.39.5 -> 10.7.0; `eslint-config-next` 15.5.20 -> 16.2.10; `@tanstack/react-query` and `@tanstack/react-query-next-experimental` 5.51.11 -> 5.101.2 (unplanned but required — see Key Decisions); `postcss` devDependency `^8` -> `^8.5.10`; added top-level `overrides.postcss: ^8.5.10` (unplanned but required — see Key Decisions)
- modified `package-lock.json` — lockfile update for the above
- modified `eslint.config.mjs` — rewritten from the `@eslint/eslintrc` `FlatCompat.extends('next/core-web-vitals')` shim (Task 1's pattern, correct for eslint-config-next@15) to a direct `import nextVitals from 'eslint-config-next/core-web-vitals'` + `defineConfig([...nextVitals, ...])` (required for eslint-config-next@16, which now ships native flat config — see Key Decisions); added `settings.react.version: '19.2.7'` override; changed `anchor/target/**` ignore to `anchor/**`; added `*.config.mjs` to ignores
- modified `tsconfig.json` — `jsx: preserve` -> `jsx: react-jsx`, added `.next/dev/types/**/*.ts` to `include`. Both changes were applied automatically by `next build` itself (Next 16 mandates the react-jsx transform); not hand-edited.
- modified `src/components/custom-hooks/use-local-storage.ts` — narrowly-scoped `eslint-disable-next-line react-hooks/set-state-in-effect` with justification comment on the post-hydration localStorage sync effect (genuine external-system-sync use case, not a bug)
- modified `src/components/dashboard/user-dashboard.tsx` — two narrowly-scoped `eslint-disable-next-line react-hooks/refs` with justification comments (`transferFrom.current`, `transferTo.current` read during render; both are intentionally non-reactive mutable boxes set synchronously before the triggering state update, not stale-read bugs)
- modified `src/components/forms/transfer-popup/multi-transfer-popup.tsx` — fixed a genuine bug: the sync effect listed `transferData` in its own dependency array while also calling `setTransferData(newArr)` with a freshly-constructed array every run, so it re-triggered itself on every commit (unbounded effect/render loop, surfaced as `react-hooks/set-state-in-effect` but was a real correctness bug, not just a lint nit). Fixed via the setState updater-function form, dropping `transferData` from the dependency array so it only re-runs on `currentPlayers` changes. Left a narrow disable for the remaining (structural, not a bug) `react-hooks/set-state-in-effect` flag with justification.

### New Tests
(none — no web test suite exists; plan mandates typecheck+lint+build+audit-gate as verification)

### Key Decisions
- **`@tanstack/react-query`/`-next-experimental` bump (5.51.11 -> 5.101.2), not in the plan's file list:** `npm install --save-dev eslint-config-next@16.2.10 eslint@10.7.0` failed with a hard ERESOLVE — `@tanstack/react-query-next-experimental@5.65.1` (the version the plan's Task 2 state left installed) peers `next: ^13 || ^14 || ^15`, conflicting with `next@16.2.10`. Checked the npm registry: `@tanstack/react-query-next-experimental@latest` (5.101.2) peers `next: ^13 || ^14 || ^15 || ^16` and requires `@tanstack/react-query@^5.101.2`. Bumped both to 5.101.2 (kept in lockstep, as they were before) to unblock the resolution. Did not use `--legacy-peer-deps`/`--force`, which the task forbids in spirit (masking rather than fixing the underlying incompatibility) — the actual fix is that a compatible release exists.
- **`eslint.config.mjs` rewritten off `FlatCompat`:** `eslint-config-next@16.2.10` no longer publishes a legacy shareable config — `require('eslint-config-next/core-web-vitals')` now resolves to a plain `Linter.Config[]` array (confirmed via its `dist/index.d.ts`: `declare const config: Linter.Config[]; export = config;`). Passing that array through `FlatCompat.extends('next/core-web-vitals')` (Task 1's necessary approach for the v15 config) throws `TypeError: Converting circular structure to JSON` inside `@eslint/eslintrc`'s legacy config validator. Fetched the official Next 16 ESLint doc (`https://nextjs.org/docs/app/api-reference/config/eslint`, version 16.2.10) via WebFetch and matched its documented flat-config setup: `import nextVitals from 'eslint-config-next/core-web-vitals'` + `defineConfig([...nextVitals, ...])`, using ESLint core's own `eslint/config` helpers (`defineConfig`, `globalIgnores`) instead of `@eslint/eslintrc`.
- **`settings.react.version` pinned to `'19.2.7'` instead of `'detect'`:** `eslint-plugin-react@7.37.5` (bundled inside `eslint-config-next@16.2.10`'s own `node_modules`, confirmed via `npm ls`: `invalid: "...^9.7" from .../eslint-plugin-react`) has not been updated for ESLint 10 — `settings.react.version: 'detect'` triggers `detectReactVersion()` -> `resolveBasedir()` -> `context.getFilename()`, a method ESLint 10 fully removed (deprecated since v9, replaced by `context.filename`). This crashed every rule that reads prop/component usage (`react/display-name` and others) on every `.tsx`/`.ts` file. No newer `eslint-plugin-react` release exists (7.37.5 is latest on npm; checked `next` dist-tag too — still 7.8.0-rc.0, unrelated). No newer `eslint-config-next` (checked `16.3.0-preview.5`, the newest available prerelease) changes this dependency range either. Pinning the version explicitly (matching this repo's actual installed React, `19.2.7`) skips the `detect` code path entirely — a documented, standard `eslint-plugin-react` setting, not a hack. Left a TODO to revert to `'detect'` once upstream ships ESLint 10 support.
- **`*.config.mjs` and `anchor/**` added to lint ignores:** Two more ESLint-10-vs-bundled-tooling crashes, both isolated to files that don't need Next's React-aware linting at all. (1) `anchor/migrations/deploy.ts` and other anchor/ files were being linted for the first time under `eslint .` (Task 1's scope, vs. the old `next lint`'s implicit directory scoping) and hit the same `eslint-plugin-react` crash pre-fix; excluding `anchor/**` is consistent with the plan's "do not touch anchor/" constraint — this doesn't touch anchor's contents, just keeps the web app's lint config from reaching into a separate program's source tree it was never meant to cover. (2) `eslint.config.mjs`/`next.config.mjs`/`postcss.config.mjs` are plain Node ESM with no JSX; `eslint-config-next`'s "next" flat-config block routes all `.mjs` files through `next/dist/compiled/babel/eslint-parser` (bundled inside `next@16.2.10` itself), whose scope-manager output lacks the `addGlobals` method ESLint 10's `SourceCode.finalize()` now calls (`TypeError: scopeManager.addGlobals is not a function`). These three files gain nothing from the React-aware parser, so excluding them is strictly narrower than disabling a rule.
- **`postcss` override, not in the plan:** after all lint/typecheck/build fixes, `npm audit`'s `next` entry still reported `moderate` (`fixAvailable: false`), via `postcss` (GHSA-qx2v-qp2m-jg93, XSS in CSS stringify output, fixed in postcss >=8.5.10). Root cause: `next@16.2.10`'s own `package.json` hard-pins an exact, unrelated-to-project-config `"postcss": "8.4.31"` as a direct dependency (`node_modules/next/node_modules/postcss`) — this is Next's internal vendored copy, not something our own `postcss.config.mjs`/Tailwind pipeline controls. Checked every published Next 16.x version's `dependencies.postcss` (`16.0.11` through `16.2.10`, all stable): all pinned at `8.4.31`. The fix only ships in the still-prerelease `16.3.0-preview.5` (bumps to `8.5.10`) — no stable release exists yet. Since the plan hard-pins `next@16.2.10` exactly and forbids `npm audit fix --force`, used npm's standard `overrides` field (a different, non-destructive mechanism — not `--force`, doesn't touch Solana packages, doesn't change next's declared version) to force `postcss` to `^8.5.10` everywhere in the tree, including inside next's own `node_modules`. Also had to bump the project's own direct `postcss` devDependency from `^8` to `^8.5.10` in lockstep — npm's `overrides` rejects (`EOVERRIDE`) an override that conflicts with a direct dependency's own range. Re-verified typecheck/lint/build all still pass after the override. This is the same "not reachable in production, root-caused, and documented" standard the plan already applies to the Solana-tree advisories, applied here because the advisory is transitively attributed to `next` by npm's audit graph even though the vulnerable code (CSS-string escaping) has no attacker-reachable path in this app (no endpoint stringifies/reflects attacker-controlled CSS at runtime).
- Verified `git diff main --stat -- anchor/` is empty and `@coral-xyz/anchor`/`@solana/web3.js`/`@solana/spl-token`/Tailwind/daisyUI/TypeScript versions are unchanged (TypeScript remains `5.7.3` as resolved by the pre-existing `^5` range — task explicitly forbids touching it, so left as-is despite the plan's Tech Stack line describing `5.9.3`, which was apparently never actually pinned in Tasks 1–2).

### Lint Output
PASS
(0 errors, 0 warnings)

### Test Output
PASS
- `npm run typecheck`: exit 0, no errors
- `npm run lint`: exit 0, no errors/warnings
- `npm run build`: succeeded, all 7 routes compiled/generated (Turbopack)
- `npm audit --json | python3 -c "...vulnerabilities['next']..."`: `next: CLEAN` (confirmed twice — immediately after the postcss override, and again after the final combined typecheck+lint+build re-run)
- `npm ls next eslint eslint-config-next`: confirms exact resolved versions `next@16.2.10`, `eslint@10.7.0`, `eslint-config-next@16.2.10`
- `git diff --stat -- anchor/`: empty

### Commit
`c5f5a0a`

### Outcome: success
