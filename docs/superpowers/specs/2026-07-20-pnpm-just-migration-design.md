# Tooling Migration: npm → pnpm, make → just — Design Spec

**Date:** 2026-07-20
**Status:** Approved
**Decision record:** [`docs/modernization/decisions.md`](../../modernization/decisions.md)
**Implementation plan:** TBD (written by writing-plans skill next)

---

## Problem

The repo currently uses npm (`package-lock.json`) as its package manager and
GNU Make (`makefile`) as its task runner. The user wants both replaced: npm →
pnpm, make → just. This is a direct tooling-preference instruction, not a
response to a defect — npm and make both work today.

## Goals

1. Every install/build/test/lint/typecheck path uses pnpm instead of npm —
   locally, in Docker, and in CI.
2. Every task currently reachable via `make <target>` is reachable via
   `just <recipe>`, with equivalent behavior.
3. No silent dependency version drift introduced by the lockfile migration.
4. All docs (`README.md`, `CLAUDE.md`) describe the new commands, not the old
   ones.
5. The reasoning is recorded in `docs/modernization/decisions.md` so a future
   reader knows this was a tooling swap, not a debated architecture change.

## Non-Goals

| Excluded | Why |
| --- | --- |
| npm workspaces / monorepo restructuring | Repo scan confirmed this is a single-package project — `anchor/` has no own `package.json`; its Jest run (`Anchor.toml`'s `[scripts] test`) already resolves `../node_modules/.bin/jest` from the root. No workspace config needed. |
| Rewriting `docs/modernization/*.md` (other than the new entry) and `.loop-logs/*` | Historical records of past sessions. Not rewritten to match new tooling. |
| Changing `docker-compose.yml` service definitions | Unaffected by package manager/task runner choice — only `Dockerfile.client`'s build steps change. |
| `package.json` `"name"` field (`template-next-tailwind-counter`) | Unrelated leftover, out of scope for this change. |
| Keeping `makefile` around during a transition period | Hard cutover — user confirmed delete immediately. |

## Requirements

### Package manager

- pnpm pinned via `"packageManager": "pnpm@9.15.3"` in `package.json` (exact
  version, matching this repo's existing convention of pinning toolchain
  versions exactly — Anchor 1.1.2, Solana CLI 3.1.10, surfpool 1.5.0).
- Lockfile migrated via `pnpm import` (reads `package-lock.json`, writes
  `pnpm-lock.yaml` preserving the exact already-resolved versions), then
  `pnpm install` to verify, then `package-lock.json` deleted. A fresh
  `pnpm install` was rejected because pnpm's resolver could pick different
  transitive dependency versions within the same semver ranges — silent
  drift this repo's toolchain-pinning philosophy explicitly avoids.
- `package.json`'s `"overrides": { "postcss": "^8.5.10" }` moves to
  `"pnpm": { "overrides": { "postcss": "^8.5.10" } }` — pnpm does not read a
  root-level `overrides` key, so leaving it in place would silently stop
  pinning postcss.
- `Dockerfile.client` already has a commented-out corepack+pnpm block
  (`ENV PNPM_HOME`, `RUN corepack enable`, `COPY pnpm-lock.yaml`,
  `RUN pnpm install --frozen-lockfile`) from a prior sketch of this exact
  migration. That block becomes the live one; the npm block is removed.
- `.github/workflows/test-web.yml` and `.github/workflows/test-anchor.yml`:
  add `pnpm/action-setup@v4` (no separate version pin — reads
  `packageManager` from `package.json` as the single source of truth),
  `cache: 'pnpm'` on `actions/setup-node`, `pnpm install --frozen-lockfile`
  replacing `npm ci`, `pnpm run <script>` replacing `npm run <script>`.

### Task runner

- New root `justfile`. One recipe per current `makefile` target, same
  behavior. `just` recipe names cannot contain `/`, so the Makefile's
  slash-style targets are renamed with dashes:

  | Makefile target | justfile recipe |
  | --- | --- |
  | `up/build` | `up-build` |
  | `up` | `up` |
  | `down` | `down` |
  | `down/clean` | `down-clean` |
  | `clean` | `clean` |
  | `clean-image` | `clean-image` |
  | `solana/set/dev` | `solana-set-dev` |
  | `solana/set/local` | `solana-set-local` |
  | `build` | `build` |
  | `test` | `test` |
  | `test/skip-deploy` | `test-skip-deploy` |
  | `deploy` | `deploy` |
  | `deploy/dev` | `deploy-dev` |
  | `airdrop/program-owner` | `airdrop-program-owner` |
  | `airdrop/fee-payer` | `airdrop-fee-payer` |
  | `deploy/with-airdrop` | `deploy-with-airdrop` |

  Flat single-file structure, matching the Makefile's own shape 1:1 (no
  `[group(...)]` tags, no `just` modules — rejected as unnecessary structure
  for 16 recipes that already read fine alphabetically).
- Recursive `$(MAKE) target` calls in the Makefile (`down/clean`,
  `deploy`, `deploy/dev`, `deploy/with-airdrop`) become `just target` calls
  in the justfile — `just` supports recipes invoking other recipes natively.
- `makefile` deleted in the same change.

### Documentation

- `README.md`, `CLAUDE.md`: every `npm ci` / `npm run x` → `pnpm install
  --frozen-lockfile` / `pnpm run x`; every `make x` / `make x/y` → `just x` /
  `just x-y`.
- `docs/modernization/decisions.md`: new Q&A entry, following the file's
  existing format, covering why pnpm over npm, why just over make, and the
  `pnpm import`-based lockfile migration approach.

## Architecture

Single increment — both halves (package manager, task runner) land together
since they share the same doc files (`README.md`, `CLAUDE.md`) and splitting
them would mean editing those docs twice.

Order of operations (also the implementation plan's step order):

1. Lockfile migration (`pnpm import` → verify → delete `package-lock.json`).
2. `package.json` edits (`packageManager`, `pnpm.overrides`).
3. `Dockerfile.client` swap.
4. CI workflow edits (both files).
5. `justfile` creation, `makefile` deletion.
6. Doc updates (`README.md`, `CLAUDE.md`).
7. `docs/modernization/decisions.md` entry.
8. Verification pass (see below).

## Testing / Verification

- `pnpm install --frozen-lockfile` succeeds.
- `pnpm run typecheck`, `pnpm run lint`, `pnpm run build`, `pnpm test`,
  `pnpm run anchor-build` all pass.
- `just --list` shows all 16 recipes.
- Spot-check at least one no-side-effect recipe runs correctly (e.g.
  `just solana-set-local` or equivalent that doesn't touch Docker/network
  state).
- `docker compose build client` succeeds against the new `Dockerfile.client`.
- Final repo-wide grep for `npm` / `make` references, excluding
  `docs/modernization/` and `.loop-logs/`, comes back empty (aside from
  incidental matches like "make" as an English word, or `anchor` toolchain
  references unrelated to GNU Make).

## Acceptance Checklist

- [ ] `pnpm-lock.yaml` exists, `package-lock.json` deleted.
- [ ] `package.json` has `packageManager` and `pnpm.overrides`.
- [ ] `Dockerfile.client` uses pnpm, no npm block remains.
- [ ] Both CI workflows use pnpm.
- [ ] `justfile` exists with all 16 recipes, `makefile` deleted.
- [ ] `README.md` and `CLAUDE.md` reference only pnpm/just.
- [ ] `docs/modernization/decisions.md` has the new entry.
- [ ] All verification steps above pass.
