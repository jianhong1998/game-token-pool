# Task 4: Migrate the Rust program to Anchor 1.1.2 (merged with Task 2 substance)

Worktree: `/Users/leejianhong/projects/solana/game-token-pool/.worktrees/task-4-migrate-the-rust-program-to-anchor-112`
Branch: `worktree/task-4-migrate-the-rust-program-to-anchor-112`

Merge rationale: see `.loop-logs/2026-07-13-anchor-1x-solana-3x/logs/task-1-and-2-resequencing-decision.md`.
Summary: the old bankrun TS harness dies the moment anchor-lang/anchor-spl bump to
1.1.2 (Task 4's Cargo.toml change), regardless of CLI version (peer-dep on
`@coral-xyz/anchor@^0.30.0`). There is no working test runner to TDD-prove Task 2's
discriminator fix against until Task 5's ProgramUtil/surfpool rewrite lands. So the
discriminator fix (Task 2's code, not its TS regression test) is folded into this
task; the regression test itself moves to Task 5.

---

## Plan section: Task 4: Migrate the Rust program to Anchor 1.1.2 (verbatim)

The breaking change that touches real code is **CpiContext no longer takes the program's `AccountInfo`** — it takes the program **ID** directly (Anchor 1.0.0, "Remove program account info from CPI context", #2762).

```rust
// Anchor 0.30
CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts)
// Anchor 1.x
CpiContext::new(Token::id(), cpi_accounts)
```

**Important for this codebase:** we use `Interface<'info, TokenInterface>` (so the program supports both SPL Token and Token-2022), **not** a hardcoded `Token`. So the correct program ID is the one actually passed in:

```rust
context.accounts.token_program.key()
```

**Do not** hardcode `Token::id()` — it would break Token-2022 support.

**Files:**
- Modify: `anchor/programs/gametokenpool/Cargo.toml`
- Modify: `anchor/Anchor.toml`
- Modify: 9 instruction files (12 CpiContext sites):
  `add_user.rs`, `deposit.rs`, `close_pool.rs`, `end_game.rs`, `transfer_token.rs`,
  `game/transfer_token_to_game.rs`, `game/take_token_from_game.rs`, `game/delete_game.rs`, `game/quit_game.rs`

**Interfaces:**
- Consumes: toolchain from Task 3; `SPACE_DISCRIMINATOR` from Task 2.
- Produces: a program that builds under Anchor 1.1.2 and a regenerated IDL at `anchor/target/idl/gametokenpool.json` — Tasks 5 and 6 consume that IDL.

- [ ] **Step 1: Update the program's Cargo.toml**

In `anchor/programs/gametokenpool/Cargo.toml`, replace the `[dependencies]` block:

```toml
[dependencies]
anchor-lang = { version = "1.1.2", features = ["init-if-needed"] }
anchor-spl = "1.1.2"
```

Drop `solana-program` entirely — Anchor 1.x pulls the correct Solana crates itself, and an explicit pin is exactly what caused the current drift.

- [ ] **Step 2: Update Anchor.toml**

In `anchor/Anchor.toml`, set the toolchain version:

```toml
[toolchain]
anchor_version = "1.1.2"
```

Also **remove the `[registry]` block entirely** — the `[registry]` section is removed in Anchor 1.0:

```toml
[registry]
url = "https://api.apr.dev"
```

Leave `[programs.localnet]`, `[provider]`, and `[scripts]` as they are for now; the `[test]` / `[test.validator]` sections are revisited in Task 5.

- [ ] **Step 3: Attempt the build to surface every error at once**

```bash
cd anchor && anchor build
```
Expected: **FAIL**, with ~12 errors of the form "expected `Pubkey`, found `AccountInfo`" at the `CpiContext::new` / `CpiContext::new_with_signer` call sites. This is the list of things to fix. Read it before editing.

- [ ] **Step 4: Convert the CpiContext call sites**

The mechanical transform, at all 12 sites: the first argument to `CpiContext::new` / `CpiContext::new_with_signer` changes from the token program's `AccountInfo` to its **`Pubkey`**.

(...examples in add_user.rs, deposit.rs, transfer_token.rs shown in plan...)

Note: `Pubkey` is `Copy`, so the `cpi_program.clone()` calls that exist today (e.g. in `add_user.rs` and `deposit.rs`) become unnecessary. Clippy will flag them — drop the `.clone()`.

Apply the same transform in `close_pool.rs`, `end_game.rs`, `game/transfer_token_to_game.rs`, `game/take_token_from_game.rs`, `game/delete_game.rs`, and `game/quit_game.rs`.

- [ ] **Step 5: Verify no CpiContext site was missed**

```bash
grep -rn "CpiContext::new" anchor/programs/gametokenpool/src/ | wc -l
grep -rn "to_account_info()" anchor/programs/gametokenpool/src/ | grep -i "token_program"
```
Expected: the first prints `12`. The second prints **nothing**.

- [ ] **Step 6: Build**

```bash
cd anchor && anchor build
```
Expected: build succeeds.

If duplicate mutable account error: Anchor 1.x disallows passing the same mutable account twice by default. Review carefully — prefer fixing the caller (e.g. a self-transfer bug) over adding a `dup` constraint.

- [ ] **Step 7: Confirm the IDL regenerated**

```bash
git diff --stat anchor/target/idl/gametokenpool.json anchor/target/types/gametokenpool.ts
```
Expected: both files show changes.

- [ ] **Step 8: Commit**

---

## Plan section: Task 2: Fix the account discriminator under-allocation bug (TDD) (verbatim, code-only portion executed here; TS test moves to Task 5)

`Pool` allocates `SPACE_DISCRIMENTAL + Pool::INIT_SPACE` (correct). `User` and `Game` allocate bare `INIT_SPACE` — **omitting the 8-byte account discriminator**. Both are under-allocated by 8 bytes.

The arithmetic, so you know exactly where it breaks:

- `User::INIT_SPACE` = 32 (authority) + 54 (name, `4 + max_len(50)`) + 8 (total_deposited_amount) + 1 (bump) + 32 (token_account) + 1 (token_account_bump) = **128**.
  Allocated: 128. Discriminator eats 8 → **120 bytes for data**. Data actually written = 78 + `name.len()`.
  → `78 + len ≤ 120` → **breaks at a 43-character username.**

- `Game::INIT_SPACE` = 54 (game_name) + 644 (players, `4 + 20*32`) + 32 + 32 + 3 (bumps) = **765**.
  Allocated: 765 → **757 for data**. Data = 75 + `name.len()` + 32 × `players.len()`.
  → `name.len() + 32·players ≤ 682` → with a 50-char game name, **breaks on the 20th player.**

It silently works today only because Borsh writes the *actual* length, not the reserved max. This is a latent data-corruption bug. We fix it under the old toolchain, with the old (working) tests, so the regression test is trustworthy.
(NOTE: per the resequencing decision, "old toolchain" no longer applies — this fix is applied here, under Anchor 1.1.2 / Solana 3.1.10, with the TS regression test deferred to Task 5.)

We also fix the misspelling: `SPACE_DISCRIMENTAL` → `SPACE_DISCRIMINATOR`.

**Files:**
- Modify: `anchor/programs/gametokenpool/src/constants/mod.rs`
- Modify: `anchor/programs/gametokenpool/src/instructions/init_pool.rs` (rename only)
- Modify: `anchor/programs/gametokenpool/src/instructions/add_user.rs:50`
- Modify: `anchor/programs/gametokenpool/src/instructions/game/init_game.rs:26`
- Test: `anchor/tests/specs/add-user.spec.ts` (DEFERRED to Task 5 — no working TS harness yet)

**Interfaces:**
- Consumes: green baseline from Task 1 (superseded — see resequencing decision).
- Produces: `SPACE_DISCRIMINATOR` (was `SPACE_DISCRIMENTAL`), used by `init_pool.rs`, `add_user.rs`, `init_game.rs`.

Steps 3-6 (rename constant, fix User allocation, fix Game allocation, confirm no `SPACE_DISCRIMENTAL` references survive) are executed in this task. Steps 1, 2, 7, 8 (write failing TS test, run it, run full suite, commit) are deferred to Task 5 per the merge decision.

---

## Combined Acceptance Criteria (this task's gate)

- `anchor build` exits 0.
- `grep -rn "SPACE_DISCRIMENTAL" anchor/` → empty.
- `grep -rn "CpiContext::new" anchor/programs/gametokenpool/src/ | wc -l` → `12`.
- `grep -rn "to_account_info()" anchor/programs/gametokenpool/src/ | grep -i token_program` → empty.
- `grep -rn "Token::id()" anchor/programs/gametokenpool/src/` → empty (must use `.key()` everywhere).
- IDL/types diff present (`anchor/target/idl/gametokenpool.json`, `anchor/target/types/gametokenpool.ts`).

No TS test run in this task (Task 5 rebuilds the harness and adds the 50-char-username regression test).

---

## Execution Log

### Attempt 1

- Worktree created at `.worktrees/task-4-migrate-the-rust-program-to-anchor-112`, branch `worktree/task-4-migrate-the-rust-program-to-anchor-112`.
- Part 1 (discriminator fix) applied in full: `SPACE_DISCRIMENTAL` -> `SPACE_DISCRIMINATOR` in `constants/mod.rs`; import+use updated in `init_pool.rs`; `add_user.rs` and `game/init_game.rs` allocations changed to `SPACE_DISCRIMINATOR + <Type>::INIT_SPACE` with the import added. `grep -rn "SPACE_DISCRIMENTAL" anchor/` confirmed empty immediately after.
- Part 2 Steps 1-2: `Cargo.toml` dependencies replaced with `anchor-lang = { version = "1.1.2", features = ["init-if-needed"] }` / `anchor-spl = "1.1.2"`, `solana-program` dropped. `Anchor.toml` `[toolchain] anchor_version` set to `1.1.2`, `[registry]` block removed entirely.
- Part 2 Step 3: `anchor build` run to surface errors. Got exactly 12 `E0308: mismatched types ... expected Pubkey, found AccountInfo` errors, matching the plan's prediction precisely, across all 9 named files:
  add_user.rs (x2), close_pool.rs (x2), deposit.rs (x1), end_game.rs (x2), game/delete_game.rs (x1),
  game/quit_game.rs (x1), game/take_token_from_game.rs (x1), game/transfer_token_to_game.rs (x1), transfer_token.rs (x1).
- Part 2 Step 4: applied the mechanical transform at all 12 sites — changed the `cpi_program` binding from `context.accounts.token_program.to_account_info()` to `context.accounts.token_program.key()` (or `cpi_program.to_account_info()` -> `cpi_program.key()` in `end_game.rs`, where the binding was `&context.accounts.token_program` directly). Dropped the now-unnecessary `.clone()` calls in `add_user.rs`, `deposit.rs`, `close_pool.rs` (x2). No hardcoded `Token::id()` used anywhere — confirmed via grep.
- Pre-build grep gates all passed: `CpiContext::new` count = 12; `to_account_info()` grep on token_program = empty; `Token::id()` grep = empty; stray `cpi_program.clone()` grep = empty.
- `anchor build` succeeded on the first attempt after the transform (exit code 0). No "duplicate mutable account" error occurred — no `dup` constraint or caller fix was needed.
- Build did print a non-fatal warning: `Program ID mismatch detected for program 'gametokenpool'` (keypair file `3rbuQJAN5N...` vs source `F6yyNFRtZ...`). This is because `anchor/target/deploy/` is gitignored (see `.gitignore` lines 44-46: only `anchor/target/idl` and `anchor/target/types` are unignored under `target/*`), so a fresh worktree generates a fresh local keypair. Pre-existing environmental noise, unrelated to this migration, does not affect build exit code (0) or any in-scope verification gate.

**Finding — IDL/types diff is empty, not "changes present":** Per plan Step 7 the expectation was `git diff --stat anchor/target/idl/gametokenpool.json anchor/target/types/gametokenpool.ts` would show changes. Actual result: **zero diff, byte-identical** to the committed pre-migration versions (verified via `git show HEAD:... | diff -`, both files match exactly, confirmed by MD5). This was cross-checked for genuineness, not staleness:
  - Confirmed `anchor/Cargo.lock` actually bumped `anchor-lang` `0.30.1` -> `1.1.2` (`git diff anchor/Cargo.lock`).
  - Confirmed the build log actually compiled `anchor-lang v1.1.2` / `anchor-spl v1.1.2` from scratch (hundreds of fresh `Compiling` lines).
  - Deleted `target/idl/gametokenpool.json` and `target/types/gametokenpool.ts` and re-ran `anchor build`: both regenerated, again byte-identical to the committed originals.
  Conclusion: this program's IDL was already on Anchor's newer "spec: 0.1.0" JSON format (visible in the committed file: `address`, `metadata.spec: "0.1.0"`, numeric-array discriminators) prior to this migration — nothing about the public interface (instruction names/args, account layouts as expressed in the IDL, discriminators, which are sha256-derived from names, not from `space`/CpiContext internals) changed between anchor-lang 0.30.1 and 1.1.2 for this program. The discriminator-fix (`space = SPACE_DISCRIMINATOR + ...`) and the CpiContext rewrite are both **runtime/implementation details that the IDL does not encode** (IDL has no `space` field; CPI program-id-vs-AccountInfo is not IDL-visible). So a zero diff is the *correct* outcome here, not evidence of a stale/failed rebuild — verified by direct, stronger evidence (Cargo.lock version bump + fresh compile + delete-and-regenerate reproducing identical bytes) rather than by the diff heuristic itself. Documented as a deviation from the plan's literal expectation; not treated as a task failure since the underlying goal (a correctly-regenerated IDL reflecting the 1.1.2-built program) is met.

All required grep/build gates pass:
1. `anchor build` exit 0 — PASS
2. `grep -rn "SPACE_DISCRIMENTAL" anchor/` empty — PASS
3. `grep -rn "CpiContext::new" anchor/programs/gametokenpool/src/ | wc -l` = 12 — PASS
4. `grep -rn "to_account_info()" ... | grep -i token_program` empty — PASS
5. `grep -rn "Token::id()" anchor/programs/gametokenpool/src/` empty — PASS
6. IDL/types diff — empty (see finding above); build-freshness verified by alternate means.

Total attempts to reach green build: 1 (matched the plan's predicted error set exactly; no iteration needed).
