# Task 1 Log: Migrate lockfile to pnpm, pin pnpm in `package.json`

## Task Context

### Plan Section
### Task 1: Migrate lockfile to pnpm, pin pnpm in `package.json`

**Files:**
- Modify: `package.json`
- Delete: `package-lock.json`
- Create: `pnpm-lock.yaml` (generated, not hand-written)

- [ ] Step 1: Run `pnpm import` in the worktree root. Expected: creates `pnpm-lock.yaml`, converted from `package-lock.json`, no errors.

- [ ] Step 2: Edit `package.json` — add `"packageManager": "pnpm@9.15.3"` immediately after `"private": true,`, and replace the trailing `"overrides": { "postcss": "^8.5.10" }` block with a nested `"pnpm": { "overrides": { "postcss": "^8.5.10" } }` block at the end of the file (after `devDependencies`). No other keys change. `"name"` stays `"template-next-tailwind-counter"` — do not touch it.

- [ ] Step 3: Verify lockfile consistency: run `pnpm install --frozen-lockfile`. Expected: exits 0. If it errors because moving `overrides`→`pnpm.overrides` changed lockfile resolution, run `pnpm install` (no `--frozen-lockfile`) once to update `pnpm-lock.yaml`, inspect the diff to confirm only postcss-related resolution metadata changed (not arbitrary transitive bumps), then re-run `pnpm install --frozen-lockfile` to confirm clean.

- [ ] Step 4: Run the full local verification suite: `pnpm run typecheck && pnpm run lint && pnpm run build && pnpm test && pnpm run anchor-build`. All five must exit 0. (`anchor-build` runs `cd anchor && anchor build` — takes a minute or two.)

- [ ] Step 5: Delete the npm lockfile and commit:
```bash
rm package-lock.json
git add package.json pnpm-lock.yaml
git rm package-lock.json
git commit -m "build: migrate package manager from npm to pnpm"
```

### Acceptance Criteria
- AC-1: `pnpm import` produces a `pnpm-lock.yaml` converted from `package-lock.json` with no errors.
- AC-2: `package.json` has `"packageManager": "pnpm@9.15.3"` immediately after `"private": true,`, and the trailing `"overrides": { "postcss": "^8.5.10" }` is replaced with a nested `"pnpm": { "overrides": { "postcss": "^8.5.10" } }` block at the end of the file; `"name"` remains `"template-next-tailwind-counter"`.
- AC-3: `pnpm install --frozen-lockfile` exits 0 (after at most one `pnpm install` refresh whose diff is postcss-resolution-only).
- AC-4: `pnpm run typecheck && pnpm run lint && pnpm run build && pnpm test && pnpm run anchor-build` all exit 0.
- AC-5: `package-lock.json` deleted, `package.json` + `pnpm-lock.yaml` staged, committed as `build: migrate package manager from npm to pnpm`.

## Attempt 1 — 2026-07-20T03:17:46Z

### Implementation Plan
- Run `pnpm import` to convert `package-lock.json` to `pnpm-lock.yaml`
- Edit `package.json`: add `packageManager` pin after `private`, move `overrides` into nested `pnpm.overrides`
- Run `pnpm install --frozen-lockfile`; expected mismatch since moving `overrides` changes lockfile config hash — refresh with plain `pnpm install`, diff-check the lockfile change is postcss-only, then re-verify frozen
- Run full verification suite: typecheck, lint, build, test, anchor-build
- Delete `package-lock.json`, stage, commit

### Files Changed
- created `pnpm-lock.yaml` — generated via `pnpm import` then refreshed via `pnpm install` (lockfileVersion 9.0)
- modified `package.json` — added `"packageManager": "pnpm@9.15.3"` after `"private": true,`; replaced trailing `"overrides": { "postcss": "^8.5.10" }` with nested `"pnpm": { "overrides": { "postcss": "^8.5.10" } }`
- deleted `package-lock.json`

### New Tests
(none — mechanical tooling migration, no application test to write per task instructions)

### Key Decisions
- `pnpm install --frozen-lockfile` failed on the first attempt with `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH` because moving `overrides` → `pnpm.overrides` changes the lockfile's recorded config. This was the expected/anticipated failure mode called out in plan Step 3, not a bug. Resolved by running one plain `pnpm install`, then diffing `pnpm-lock.yaml` before/after: diff was exactly 36 lines — a new top-level `overrides: { postcss: ^8.5.10 }` block, all `postcss` peer/transitive specifiers pinned to resolve to `8.5.18` (previously a mix of `^8.0.0`/`^8.4.21`/`>=8.0.9`/`^8.2.14`), and removal of the now-unreferenced `postcss@8.4.31` package entry. No unrelated transitive version bumps. Re-ran `pnpm install --frozen-lockfile` after and it reported "Lockfile is up to date" with exit 0.
- `pnpm run typecheck` and `build` succeeded without needing a prior `anchor build` in this fresh worktree because `anchor/target/idl` and `anchor/target/types` are deliberately carved out of `.gitignore` (`!anchor/target/idl`, `!anchor/target/types`) and tracked in git — so the generated types were already present via checkout, consistent with CLAUDE.md's note that a program rebuild is normally required before web app types are correct (it was already up to date here).
- `next build` printed a benign warning about multiple lockfiles (it detected the main repo's `package-lock.json` in the parent directory `/Users/leejianhong/projects/solana/game-token-pool/`, outside this worktree) — this is Next.js's workspace-root heuristic picking up a sibling directory tree, not an error in this worktree; exit code was 0 and the build completed successfully. Not fixed since Task 1's scope is this worktree only and `next.config` changes (`turbopack.root`) aren't part of this plan step.

### Lint Output
PASS

### Test Output
PASS (3 passed, 0 new — pre-existing `priority-fee.util.test.ts` suite; no new tests added per task scope)

### Commit
`f4b314c`

### Outcome: success
