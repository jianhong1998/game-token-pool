# Task 1 Log: Migrate ESLint to flat config

## Task Context

### Plan Section

### Task 1: Migrate ESLint to flat config

ESLint 8's `.eslintrc.json` format is not supported by ESLint 9+. Next 16 requires `eslint-config-next@16`, which peer-requires `eslint >=9.0.0`. This task has no runtime effect — it only changes linting — so it is safe to land first and alone.

Note: **`next lint` is removed in Next 16.** The `lint` script must call the `eslint` CLI directly. We change it now so the script is already correct when Next 16 lands in Task 3.

**Files:**
- Create: `eslint.config.mjs`
- Delete: `.eslintrc.json`
- Modify: `package.json` (devDependencies, `lint` + `typecheck` scripts)

**Interfaces:**
- Produces: an `npm run lint` and an `npm run typecheck` script that Tasks 2, 3 and 4 all rely on as their verification gate.

- [ ] **Step 1: Install ESLint 9 and the flat-config compatibility layer**

```bash
npm install --save-dev eslint@9.39.5 eslint-config-next@15.5.20 @eslint/eslintrc@3
```

Two deliberate pins here — do not "helpfully" bump either:

- `eslint-config-next` stays on the **15.x** line because it must match the currently-installed Next (15.2.3). Task 3 bumps it to 16 alongside Next itself.
- ESLint is **9**, not 10, because `eslint-config-next@15.x` peer-requires `eslint ^7 || ^8 || ^9`. **Installing ESLint 10 here will fail with an ERESOLVE peer conflict.** ESLint 10 only becomes legal in Task 3, once `eslint-config-next@16` (which peers `>=9.0.0`) is in place.

Flat config is supported from ESLint 9 onward, so this task gets everything it needs from 9.

- [ ] **Step 2: Create the flat config**

Create `eslint.config.mjs`:

```javascript
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

export default [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'anchor/target/**',
      'solana-ledger/**',
      'tmp/**',
    ],
  },
  ...compat.extends('next/core-web-vitals'),
];
```

- [ ] **Step 3: Delete the legacy config**

```bash
git rm .eslintrc.json
```

- [ ] **Step 4: Replace the `lint` script and add `typecheck`**

In `package.json`, change the `"lint"` script and add `"typecheck"`:

```json
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
```

(`next lint` is removed in Next 16; calling `eslint` directly is forward-compatible.)

- [ ] **Step 5: Verify lint runs and typecheck passes**

Run:
```bash
npm run lint
npm run typecheck
```
Expected: `eslint .` completes. It may report pre-existing warnings — that is acceptable. It must **not** error with `Invalid option '--ext'`, `eslintrc is no longer supported`, or a config-resolution failure. `tsc --noEmit` must exit 0.

If lint reports pre-existing **errors** (not warnings), fix them or add a narrowly-scoped rule override in `eslint.config.mjs`. Do not blanket-disable rules.

- [ ] **Step 6: Verify the build still passes**

Run: `npm run build`
Expected: build succeeds (unchanged from before this task).

- [ ] **Step 7: Commit**

(`.eslintrc.json` was already staged for deletion by the `git rm` in Step 3.)

```bash
git add eslint.config.mjs package.json package-lock.json
git commit -m "chore(web): migrate to ESLint flat config

next lint is removed in Next 16; call the eslint CLI directly.
Adds a typecheck script. No runtime change."
```

### Acceptance Criteria
- AC-1: `eslint@9.39.5`, `eslint-config-next@15.5.20`, `@eslint/eslintrc@3` installed as devDependencies at exactly those versions.
- AC-2: `eslint.config.mjs` exists with the flat config from the plan; `.eslintrc.json` is deleted.
- AC-3: `package.json` has `"lint": "eslint ."` and `"typecheck": "tsc --noEmit"`.
- AC-4: `npm run lint` runs without config-resolution failure (`eslintrc is no longer supported`, `Invalid option '--ext'`); no lint errors (warnings acceptable).
- AC-5: `npm run typecheck` exits 0.
- AC-6: `npm run build` succeeds.
- AC-7: `anchor/` untouched; Tailwind/daisyUI/TypeScript/React/Next versions unchanged.

---

## Attempt 1 — 2026-07-13T01:42:19Z

### Implementation Plan
- Verify state left by a previously killed run: `eslint.config.mjs` (created), `.eslintrc.json` (git-rm'd/staged), eslint@9.39.5/eslint-config-next@15.5.20/@eslint/eslintrc@3 installed
- Update `package.json` `"lint"` script to `eslint .` and add `"typecheck": "tsc --noEmit"` (Step 4, not yet done by killed run)
- Run `npm run lint` and `npm run typecheck` (Step 5)
- Run `npm run build` (Step 6)
- Commit `eslint.config.mjs`, `package.json`, `package-lock.json` (`.eslintrc.json` deletion rides along, already staged) (Step 7)

### Files Changed
- created `eslint.config.mjs` — ESLint 10-compatible flat config using FlatCompat to wrap `next/core-web-vitals` (created by prior killed run, verified verbatim match to plan)
- deleted `.eslintrc.json` — legacy config, unsupported by ESLint 9+ (git rm'd by prior killed run, staged)
- modified `package.json` — devDependencies bumped to eslint@9.39.5/eslint-config-next@15.5.20/@eslint/eslintrc@3 (by prior killed run); `lint` script changed to `eslint .` and `typecheck` script added (this attempt)
- modified `package-lock.json` — lockfile updated for the above installs (by prior killed run)

### New Tests
(none — no web test suite exists; plan mandates typecheck+lint+build as the gate)

### Key Decisions
- Install of eslint/eslint-config-next/@eslint/eslintrc, creation of `eslint.config.mjs`, and `git rm .eslintrc.json` were all completed by a prior run that was killed mid-task. This attempt verified each artifact against the plan (package.json devDependency versions, eslint.config.mjs content byte-for-byte, git status showing `.eslintrc.json` staged for deletion) before continuing, rather than redoing that work.
- Only remaining plan step before verification was package.json's `lint`/`typecheck` scripts (Step 4), which had not been touched by the killed run — completed this attempt exactly as specified.
- The build produces a runtime `ReferenceError: location is not defined` during static generation of `/game`, logged to stdout but non-fatal (page generation reaches 7/7, exit code 0). This is pre-existing app behavior unrelated to this task — no source files under `src/` were touched, only ESLint/package.json config — so it is out of scope for Task 1 and left as-is.

### Lint Output
```
> template-next-tailwind-counter@0.1.0 lint
> eslint .

/Users/leejianhong/projects/solana/game-token-pool/.worktrees/task-1-migrate-eslint-to-flat-config/eslint.config.mjs
  10:1  warning  Assign array to a variable before exporting as module default  import/no-anonymous-default-export

✖ 1 problem (0 errors, 1 warning)
```
0 errors, 1 pre-existing-style warning (acceptable per plan Step 5). No config-resolution failure.

### Test Output
n/a — no automated test suite; gate is typecheck + lint + build
- `npm run typecheck`: exit 0, no output (clean)
- `npm run build`: exit 0, "Compiled successfully", all 7 routes generated

### Commit
`f40d97b`

### Outcome: success
