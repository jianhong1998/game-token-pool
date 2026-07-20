# Task 5: Migrate the test suite from bankrun to surfpool
(+ absorbed: Task 2 Step 1 — write the discriminator-fix regression test)

Worktree: /Users/leejianhong/projects/solana/game-token-pool/.worktrees/task-5-migrate-the-test-suite-from-bankrun-to-surfpool
Branch: worktree/task-5-migrate-the-test-suite-from-bankrun-to-surfpool
Base commit: 9b8ec1b (feat(program): migrate to Anchor 1.1.2 and fix discriminator under-allocation)

## Plan section verbatim: Task 5

`anchor-bankrun@0.5.0` peer-depends on `@coral-xyz/anchor@^0.30.0` and has been unmaintained since Oct 2024. It cannot run against Anchor 1.x. Its successor `anchor-litesvm` only supports `^0.31.1`. **There is no maintained TS bankrun-style harness for Anchor 1.x.**

This is not a loss. Anchor 1.x makes surfpool the default validator, and `ProgramUtil` **already** has a working on-chain path behind `IS_TESTING_ON_CHAIN`. So the dual-mode branch collapses to a single path — a special case disappears.

**Files:**
- Modify: `anchor/tests/utils/program.util.ts` (delete the bankrun branch)
- Modify: `anchor/tests/specs/*.spec.ts` (imports)
- Modify: `anchor/tests/test-functions/*.ts`, `anchor/tests/utils/account.util.ts` (imports)
- Modify: `anchor/Anchor.toml` (`[test]` config)
- Modify: `package.json` (drop bankrun, add `@anchor-lang/core`)
- Modify: `makefile`

**Interfaces:**
- Consumes: the Anchor 1.1.2 IDL from Task 4.
- Produces: `ProgramUtil` with a **no-argument** constructor and the same `getProgram()` / `getProvider()` methods the specs already call. `getContext()` and `generateConstructorParams()` are **deleted** — nothing may call them.

Steps 1-8 as specified (drop bankrun/add @anchor-lang/core; rewrite ProgramUtil single-path; update construction sites & delete bankrun plumbing; repoint imports under anchor/tests/; Anchor.toml test config -> surfpool; collapse makefile targets; run suite; commit).

## Plan section verbatim: Task 2, Step 1 only (rest of Task 2 already done in prior task)

- [ ] **Step 1: Write the failing test**

Add to `anchor/tests/specs/add-user.spec.ts`, inside the existing top-level `describe` block. Match the surrounding file's existing setup helpers — it already has a working "add user" path; reuse it rather than inventing new scaffolding.

```typescript
  it('should create a user whose name fills the full 50-char max_len', async () => {
    // User::INIT_SPACE is 128. With the 8-byte discriminator omitted, only
    // 120 bytes remain for data, and data = 78 + name.len(). So any username
    // longer than 42 chars overflows the account. max_len(50) promises 50.
    const longUsername = 'a'.repeat(50);

    await addUser({ username: longUsername, amount: new BN(0) });

    const userPublicKey = getUserPublicKey(longUsername);
    const user = await program.account.user.fetch(userPublicKey);

    expect(user.name).toEqual(longUsername);
  });
```

Use whatever the file's existing helpers are actually named (`addUser` lives in `anchor/tests/test-functions/add-user.ts`; the PDA helper is in `anchor/tests/utils/account.util.ts`). Do not invent new ones.

NOTE (orchestrator instructions): the discriminator fix already landed in the prior task (commit 9b8ec1b, this repo state). This test should PASS on first run — no "watch it fail" step available. Point of the test is a permanent regression guard, confirm it passes.

## Acceptance criteria (combined, from spec + plan)

- [ ] `anchor build` succeeds on Anchor 1.1.2 / Solana 3.1.10 (already true from Task 4; not re-verified structurally here beyond `anchor test` triggering a build)
- [ ] `make test` passes all 6 specs (5 original + new regression test) against surfpool
- [ ] A user with a 50-character username can be created and fetched back
- [ ] `ProgramUtil` has a no-arg constructor; `getContext()` / `generateConstructorParams()` deleted, nothing calls them
- [ ] No `anchor-bankrun` / `solana-bankrun` / `spl-token-bankrun` in package.json
- [ ] `@anchor-lang/core` installed; used throughout `anchor/tests/`
- [ ] `@coral-xyz/anchor` left alone in `src/` and `anchor/src/` (Task 6 scope, not touched here)
- [ ] `anchor/Anchor.toml` `[test.validator]` removed
- [ ] `makefile` test targets collapsed to `test` / `test/skip-deploy`

## Pre-existing condition discovered during investigation

`anchor/tests/specs/{add-user,deposit,init,transfer}.spec.ts` all have their top-level
`describe` wrapped in `describe.skip(...)` — and have been since Jan 2025 (commit
94ebfc1, well before this migration plan existed). Only `user-end-game.spec.ts` has
an active `describe(...)`. This means the plan's stated Task-1 baseline ("the 5
specs ... all pass") was never actually true as "5 files with active tests run
together" — it was always effectively 1 active file.

Root cause (verified by reading all 5 files): the spec files share on-chain state
across a single `anchor test` run (same fee-payer keypair, same PDA seeds, e.g.
`"test pool"` / `"test user 1"` reused across deposit/transfer/user-end-game). At
least one file (`init.spec.ts`) calls `createPool` unconditionally with no
try/catch existence-check (unlike the others), so it would hard-fail with an
"already in use" account error the moment any earlier spec file has already
created the pool. This is a pre-existing test-design defect, unrelated to
bankrun→surfpool or the discriminator fix, and out of this task's stated file
scope (only `add-user.spec.ts` is listed for the new test).

Decision: un-skip only `add-user.spec.ts`'s describe block (required — otherwise
the new regression test would itself be skipped and "confirm it passes" would be
impossible). Leave `deposit.spec.ts`, `init.spec.ts`, `transfer.spec.ts` untouched
(`describe.skip` as-is) — fixing their cross-file state coupling is out of scope
here and risks introducing new failures under time pressure. Flagging this
explicitly rather than silently claiming "all 6 specs pass" when 3 files remain
skipped for pre-existing, unrelated reasons.

## Outcome: FAILED after 3 attempts

Parts 1-7 (mechanical bankrun->@anchor-lang/core migration + the 50-char
regression test) were completed. `make test` never got a green run in 3
attempts against the real surfpool validator -- see
`.loop-logs/2026-07-13-anchor-1x-solana-3x/error/task-5-migrate-the-test-suite-from-bankrun-to-surfpool.md`
for the full attempt-by-attempt breakdown (lamports-unit bug -> fixed;
parallel-worker race -> fixed with --runInBand; remaining: airdrop
"finalized"-commitment confirmation appears to never complete under
surfpool's `--block-production-mode transaction`, exceeding Jest's 30s hook
timeout). Stopped per the 3-attempt budget rather than guessing further.

## Final resolution: max_len(50) -> max_len(32)

User decision (relayed by coordinator): change `User::name`'s `#[max_len(50)]`
to `#[max_len(32)]` (space-reservation annotation only, does not touch PDA
seed derivation/AccountUtil/auth model) and retarget the regression test at
a 32-char username, matching the real ceiling imposed by Solana's 32-byte
max PDA seed length.

Sanity-checked the regression test is meaningful before finalizing:
1. Temporarily reverted `space = SPACE_DISCRIMINATOR + User::INIT_SPACE` back
   to `space = User::INIT_SPACE` in add_user.rs, rebuilt, ran `make test`:
   the new 32-char test **failed** with `AnchorError caused by account: user.
   Error Code: AccountDidNotSerialize. Error Number: 3004.` -- exactly the
   expected overflow signature. `should create user with token` ('asv') and
   `user-end-game.spec.ts` still passed (short names don't hit the overflow).
2. Reverted back to `space = SPACE_DISCRIMINATOR + User::INIT_SPACE`,
   rebuilt, ran `make test` again: **all runnable specs green** --
   `Test Suites: 3 skipped, 2 passed, 2 of 5 total; Tests: 3 skipped, 3
   passed, 6 total`, exit code 0.

Verified the IDL/types (`anchor/target/idl/gametokenpool.json`,
`anchor/target/types/gametokenpool.ts`) are byte-identical before/after the
max_len change -- `max_len` is a Rust-side `InitSpace` space-calculation
annotation only, not represented in the IDL, so nothing else needed
regenerating/committing there.

Squashed history: `git reset --soft 9b8ec1b` (the Task 4 base commit) then
one clean final commit, folding the prior `wip: failed task-5 after 3
attempts` and the intermediate `fix(test): resolve surfpool...` commits so
no stray wip commit remains in the branch's history.

**Final commit: `14d439d`** on branch
`worktree/task-5-migrate-the-test-suite-from-bankrun-to-surfpool`.

**Outcome: Task 5 (as expanded) COMPLETE.**
