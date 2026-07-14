# Loop Summary

**Plan:** docs/superpowers/plans/2026-07-13-anchor-1x-solana-3x.md
**Spec:** docs/superpowers/specs/2026-07-13-anchor-1x-solana-3x-design.md
**Branch:** feature/anchor-1x-solana-3x
**Date:** 2026-07-14

## Sequencing deviations from the written plan (both user-approved; full detail in logs/task-1-and-2-resequencing-decision.md)

1. Task 1 (baseline on Anchor 0.30.1) could not complete — the toolchain is
   unbuildable on this machine under either solana-cli pairing tried (2.1.21:
   proc-macro2 vs rustc mismatch; 1.18.17: blake3 vs older platform-tools
   rustc), independent of the discriminator bug. Task 2 was resequenced to run
   after Task 3, under the new Anchor 1.1.2 toolchain instead.
2. Task 2 was further merged into Task 4 (same files, no working test harness
   existed between them anyway since bankrun dies the moment anchor-lang bumps
   to 1.1.2). The regression test itself moved into Task 5, the first point a
   working test runner existed.
3. The regression test's target username length changed from 50 to 32 chars.
   Solana hard-caps each PDA seed at 32 bytes, and the `user` PDA seeds
   directly on the raw username bytes — a 50-char username can never be used
   at all, regardless of the discriminator bug. `User::name`'s `#[max_len(50)]`
   was corrected to `#[max_len(32)]` to match the real, protocol-enforced
   ceiling. Verified retroactively (temporarily reverting the space fix
   reproduces `AccountDidNotSerialize`; restoring it passes) that the test
   would have caught the original bug.

## Tasks

| Task | Status | Attempts | Delivered |
|---|---|---|---|
| task-1 (baseline) | completed (deviated) | — | Old toolchain proven unbuildable on this machine; resequencing decision made |
| task-2 (discriminator fix) | completed (merged) | — | Merged into task-4 (code) and task-5 (test+proof) |
| task-3 (toolchain install) | completed | — | anchor-cli 1.1.2, solana-cli 3.1.10, surfpool 1.5.0 installed and verified |
| task-4 (Rust migration + discriminator fix) | completed | 1 | 12 CpiContext sites converted (token_program.key(), not Token::id()); SPACE_DISCRIMINATOR fix applied |
| task-5 (surfpool migration + regression test) | completed | 2 fix rounds | ProgramUtil collapsed to single path; 32-char regression test added and proven |
| task-6 (web client migration) | completed | 1 | @anchor-lang/core migrated; local NodeWallet fallback (not publicly exported) |
| task-7 (docker/CI/deploy) | completed | 2 fix rounds | surfpool/surfpool image (not txtx/surfpool); fresh deploy verified; full E2E passing |

**Completed:** 7/7
**Failed:** 0/7

## Verification

**Deploy:** program ID `F6yyNFRtZbmT6pVqjF4FoKRYi6PwegpoEJ9PS5pY4RcS` confirmed unchanged, deployed fresh to local surfpool validator.

**E2E checklist:** 10/10 items pass through the real UI (7 passed on first pass; 3 — deposit, transfer, transfer-to-game — were blocked by an unrelated pre-existing bug in `PriorityFeeUtil`, fixed and re-verified).

**Post-integration bugs found and fixed during final verification (not caught by individual task agents' own checks):**
- `npm run typecheck` failed with `@anchor-lang/core` module-not-found across 11 files — root cause: worktree agents each ran `npm install` in their own worktree's `node_modules`; the main checkout's `node_modules` was never re-synced after squash-merging their `package.json`/`package-lock.json` changes. Fixed by running `npm install` in the main checkout.
- `npm run lint` crashed (`scopeManager.addGlobals is not a function`) — a new `jest.config.js` (added for the priority-fee fix's unit test) wasn't covered by the project's existing `*.config.mjs` eslint-ignore pattern. Fixed by renaming to `jest.config.mjs`.
- `make test` silently ran only 1 of 5 suites (still exiting 0) — the new root `jest.config.mjs` shadowed `anchor test`'s own Jest invocation via upward config search, scoping `testMatch` to `src/**/*.test.ts` only. Fixed by giving `anchor/` its own `jest.config.js`.

All three were caught by independently re-running the actual verification commands myself rather than trusting agent-reported "pass" claims at face value — two of the three claims were actively wrong when checked.

## Final state

```
npm run typecheck  -> exit 0
npm run lint       -> exit 0
npm run build      -> exit 0
make test          -> 5 suites (2 passed, 3 skipped pre-existing), 6 tests (3 passed, 3 skipped), exit 0
npm audit          -> 18 vulnerabilities (1 low, 8 moderate, 9 high) -- unchanged, as expected (Anchor 1.x fixes zero vulnerabilities)
grep SPACE_DISCRIMENTAL anchor/           -> empty
grep @coral-xyz/anchor src/ anchor/       -> empty
grep Token::id() anchor/programs/.../src/ -> empty
grep token_program.to_account_info()      -> empty
```

**Deferred (out of scope, documented, not fixed):**
- `deposit.spec.ts`, `init.spec.ts`, `transfer.spec.ts` remain `describe.skip`'d — pre-existing since Jan 2025 (commit 94ebfc1), predates this migration entirely, unrelated to bankrun/surfpool/CpiContext. Root cause: shared on-chain state across spec files (same fee-payer/pool PDAs) plus `init.spec.ts` calling `createPool` unconditionally.
- ESLint's crash on any non-`.mjs` root-level config file (`scopeManager.addGlobals is not a function`) is a pre-existing ESLint 10 / eslint-config-next incompatibility, worked around per-file as encountered, not fixed at the root cause.
