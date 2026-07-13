# Anchor 1.x + Solana 3.x Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **READ THE SPEC FIRST:** [`../specs/2026-07-13-anchor-1x-solana-3x-design.md`](../specs/2026-07-13-anchor-1x-solana-3x-design.md). It carries the requirements, the non-goals, and the reasoning behind them. This plan is only the *how*; the spec is the *what* and *why*. If a step here appears to contradict the spec, the spec wins — stop and report.
>
> Two things from the spec you must internalise before touching code, because they are the ways this migration goes silently wrong:
> 1. **`CpiContext` takes `token_program.key()`, NOT `Token::id()`.** Anchor's own migration example shows `Token::id()`. Copying it here would compile, pass tests on SPL Token, and **silently break Token-2022 support**, because this program uses `Interface<TokenInterface>`.
> 2. **This migration fixes ZERO vulnerabilities.** `@anchor-lang/core@1.1.2` still depends on `@solana/web3.js` v1. Do not expect `npm audit` to improve. If you think it should, re-read the spec.

**Spec:** [`../specs/2026-07-13-anchor-1x-solana-3x-design.md`](../specs/2026-07-13-anchor-1x-solana-3x-design.md)
**Decision record:** [`../../modernization/decisions.md`](../../modernization/decisions.md)
**Previous plan in sequence:** [`./2026-07-13-web-next16-react19.md`](./2026-07-13-web-next16-react19.md) — **must be merged before this plan starts.**

**Goal:** Migrate the `gametokenpool` Anchor program from Anchor 0.30.1 / Solana 1.18 to Anchor 1.1.2 / Solana 3.x, fix the account-discriminator under-allocation bug, replace the dead bankrun test harness with surfpool, and migrate the web client from `@coral-xyz/anchor` to `@anchor-lang/core`. Redeploy fresh.

**Architecture:** Fix the real bug **first**, under the *existing* toolchain where the *existing* tests still run — that gives a regression test that proves the fix, before the ground moves. Only then migrate the toolchain. The Rust migration and the TS-client migration are separate tasks because they fail for different reasons and a reviewer should be able to reject one without the other.

**Tech Stack:** Anchor 1.1.2 (`anchor-lang`, `anchor-spl`), Solana CLI 3.1.10 (Agave), surfpool (replaces `solana-test-validator`), `@anchor-lang/core@1.1.2` (replaces `@coral-xyz/anchor`), Jest 30.

## Global Constraints

- **PREREQUISITE: [Plan 1 (web)](./2026-07-13-web-next16-react19.md) must be merged first.** It leaves the app on Next 16 / React 19 with `anchor/` untouched. This plan is what touches `anchor/`.
- **On-chain state is disposable** (decision Q2). Account layouts may change freely. **Redeploy fresh — do not write a migration.**
- **The custodial model does not change.** PDA seeds stay `["user", username, FEE_PAYER.pubkey]`. Do not touch the seed derivation, `AccountUtil`, or the auth model.
- **Anchor 1.x fixes ZERO vulnerabilities.** `@anchor-lang/core@1.1.2` still depends on `@solana/web3.js@^1.69.1`. Do not expect `npm audit` to improve. Success here is "builds, tests pass, deploys, E2E works" — not a cleaner audit. See `docs/modernization/decisions.md` Q3a and Q5.
- **Anchor 1.x requires Solana 3.x.** Recommended: **3.1.10**. Agave 2.x will not work.
- Exactly **12 `CpiContext` call sites across 9 files** must be converted. Verified by grep. If your count differs, stop and re-grep.
- The program has exactly **one `#[error_code]` block** (`constants/error_code.rs`), so Anchor 1.x's single-error-block rule is already satisfied. No action needed.

---

## File Structure

| File | Change | Responsible for |
|---|---|---|
| `anchor/programs/gametokenpool/src/constants/mod.rs` | Modify | Rename the misspelled `SPACE_DISCRIMENTAL` → `SPACE_DISCRIMINATOR` |
| `anchor/programs/gametokenpool/src/instructions/add_user.rs:50` | Modify | **Discriminator bug fix** + CpiContext |
| `anchor/programs/gametokenpool/src/instructions/game/init_game.rs:26` | Modify | **Discriminator bug fix** |
| `anchor/programs/gametokenpool/src/instructions/init_pool.rs` | Modify | Constant rename only |
| `anchor/programs/gametokenpool/src/instructions/{deposit,close_pool,end_game,transfer_token}.rs` | Modify | CpiContext (Anchor 1.x) |
| `anchor/programs/gametokenpool/src/instructions/game/{transfer_token_to_game,take_token_from_game,delete_game,quit_game}.rs` | Modify | CpiContext (Anchor 1.x) |
| `anchor/programs/gametokenpool/Cargo.toml` | Modify | anchor-lang/anchor-spl → 1.1.2; drop `solana-program` |
| `anchor/Anchor.toml` | Modify | `anchor_version = "1.1.2"`; surfpool test config |
| `anchor/tests/utils/program.util.ts` | Modify | **Delete the bankrun branch** — collapse dual-mode to one path |
| `anchor/tests/specs/*.spec.ts` | Modify | Import from `@anchor-lang/core` |
| `anchor/src/gametokenpool-exports.ts` | Modify | Import from `@anchor-lang/core` |
| `src/util/server/connection.ts` | Modify | Import from `@anchor-lang/core`; NodeWallet path |
| `docker-compose.yml` | Modify | surfpool replaces `solana-test-validator` |
| `makefile` | Modify | Test/deploy targets for the new toolchain |
| `.github/workflows/test-anchor.yml` | Modify | Pin Anchor 1.1.2 / Solana 3.1.10 |

---

### Task 1: Establish a green baseline on the current toolchain

Before changing anything, prove the existing tests actually pass. If they are already red, we must know that *now* — otherwise we will spend the migration chasing a failure that predates it.

**Files:** None modified.

**Interfaces:**
- Produces: a known-green test suite that Task 2 writes its regression test against.

- [ ] **Step 1: Pin the toolchain to what the repo expects**

```bash
avm install 0.30.1
avm use 0.30.1
anchor --version
```
Expected: `anchor-cli 0.30.1`

- [ ] **Step 2: Build the program**

```bash
cd anchor && anchor build
```
Expected: build succeeds.

If it fails on `solana-program 1.18.17` vs your installed Solana CLI, that IS the toolchain drift described in the decision doc. Install the matching Solana: `sh -c "$(curl -sSfL https://release.anza.xyz/v1.18.17/install)"`, then rebuild.

- [ ] **Step 3: Run the offline (bankrun) test suite**

```bash
make test
```
Expected: the 5 specs in `anchor/tests/specs/` all pass — `add-user`, `deposit`, `init`, `transfer`, `user-end-game`.

- [ ] **Step 4: Record the baseline**

If any spec fails, **stop and report before proceeding.** A pre-existing failure must be understood before the migration, not during it. Do not "fix it while you're in there".

Do not commit — this task changes no files.

---

### Task 2: Fix the account discriminator under-allocation bug (TDD)

`Pool` allocates `SPACE_DISCRIMENTAL + Pool::INIT_SPACE` (correct). `User` and `Game` allocate bare `INIT_SPACE` — **omitting the 8-byte account discriminator**. Both are under-allocated by 8 bytes.

The arithmetic, so you know exactly where it breaks:

- `User::INIT_SPACE` = 32 (authority) + 54 (name, `4 + max_len(50)`) + 8 (total_deposited_amount) + 1 (bump) + 32 (token_account) + 1 (token_account_bump) = **128**.
  Allocated: 128. Discriminator eats 8 → **120 bytes for data**. Data actually written = 78 + `name.len()`.
  → `78 + len ≤ 120` → **breaks at a 43-character username.**

- `Game::INIT_SPACE` = 54 (game_name) + 644 (players, `4 + 20*32`) + 32 + 32 + 3 (bumps) = **765**.
  Allocated: 765 → **757 for data**. Data = 75 + `name.len()` + 32 × `players.len()`.
  → `name.len() + 32·players ≤ 682` → with a 50-char game name, **breaks on the 20th player.**

It silently works today only because Borsh writes the *actual* length, not the reserved max. This is a latent data-corruption bug. We fix it under the old toolchain, with the old (working) tests, so the regression test is trustworthy.

We also fix the misspelling: `SPACE_DISCRIMENTAL` → `SPACE_DISCRIMINATOR`.

**Files:**
- Modify: `anchor/programs/gametokenpool/src/constants/mod.rs`
- Modify: `anchor/programs/gametokenpool/src/instructions/init_pool.rs` (rename only)
- Modify: `anchor/programs/gametokenpool/src/instructions/add_user.rs:50`
- Modify: `anchor/programs/gametokenpool/src/instructions/game/init_game.rs:26`
- Test: `anchor/tests/specs/add-user.spec.ts`

**Interfaces:**
- Consumes: green baseline from Task 1.
- Produces: `SPACE_DISCRIMINATOR` (was `SPACE_DISCRIMENTAL`), used by `init_pool.rs`, `add_user.rs`, `init_game.rs`.

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

- [ ] **Step 2: Run the test and watch it fail**

```bash
make test
```
Expected: **FAIL** on the new test, with an Anchor serialization error — `AccountDidNotSerialize`, `Failed to serialize the account`, or a "not enough space"/out-of-bounds write. The other 5 specs still pass.

If it *passes*, the arithmetic above is wrong — stop and recheck before changing anything.

- [ ] **Step 3: Rename the constant**

In `anchor/programs/gametokenpool/src/constants/mod.rs`:

```rust
mod error_code;

pub use error_code::*;

pub const SPACE_DISCRIMINATOR: usize = 8;
pub const MAX_PLAYER_PER_GAME: u8 = 20;
```

In `anchor/programs/gametokenpool/src/instructions/init_pool.rs`, update the import and the one use:

```rust
use crate::{constants::SPACE_DISCRIMINATOR, states::Pool};
```
```rust
    space = SPACE_DISCRIMINATOR + Pool::INIT_SPACE,
```

- [ ] **Step 4: Fix the User allocation**

In `anchor/programs/gametokenpool/src/instructions/add_user.rs`, add the constant to the existing `crate::states` import:

```rust
use crate::constants::SPACE_DISCRIMINATOR;
use crate::states::{Pool, User};
```

and change line 50 from `space = User::INIT_SPACE,` to:

```rust
    space = SPACE_DISCRIMINATOR + User::INIT_SPACE,
```

- [ ] **Step 5: Fix the Game allocation**

In `anchor/programs/gametokenpool/src/instructions/game/init_game.rs`, add the import:

```rust
use crate::constants::SPACE_DISCRIMINATOR;
use crate::states::{Game, Pool};
```

and change line 26 from `space = Game::INIT_SPACE,` to:

```rust
    space = SPACE_DISCRIMINATOR + Game::INIT_SPACE,
```

- [ ] **Step 6: Confirm no `SPACE_DISCRIMENTAL` references survive**

```bash
grep -rn "SPACE_DISCRIMENTAL" anchor/
```
Expected: no output.

- [ ] **Step 7: Run the tests and watch them pass**

```bash
make test
```
Expected: **all 6 specs pass**, including the new 50-char-username test.

- [ ] **Step 8: Commit**

```bash
git add anchor/programs anchor/tests
git commit -m "fix(program): allocate the 8-byte discriminator for User and Game

User and Game allocated bare INIT_SPACE, omitting the account discriminator,
under-allocating both by 8 bytes. Silently worked because Borsh writes actual
length, not max_len -- User broke past a 42-char username, Game past ~19
players with a long name. Pool was already correct.

Also fixes the SPACE_DISCRIMENTAL -> SPACE_DISCRIMINATOR misspelling."
```

---

### Task 3: Install the Anchor 1.x / Solana 3.x toolchain

**Files:** None modified — this is environment setup, verified before any code changes.

**Interfaces:**
- Produces: `anchor-cli 1.1.2`, `solana-cli 3.1.10`, and `surfpool` on PATH. Tasks 4–7 all depend on these.

- [ ] **Step 1: Install Solana 3.1.10**

```bash
sh -c "$(curl -sSfL https://release.anza.xyz/v3.1.10/install)"
solana --version
```
Expected: `solana-cli 3.1.10 (... client:Agave)`

- [ ] **Step 2: Install Anchor 1.1.2**

```bash
avm install 1.1.2
avm use 1.1.2
anchor --version
```
Expected: `anchor-cli 1.1.2`

- [ ] **Step 3: Confirm surfpool is available**

Anchor 1.x uses surfpool as the default validator for `anchor test` / `anchor localnet`.

```bash
surfpool --version
```

If it is not on PATH, install the Solana toolkit (which bundles Agave CLI, Anchor, and surfpool):

```bash
curl --proto '=https' --tlsv1.2 -sSfL https://solana-install.solana.workers.dev | bash
```

Then re-run `avm use 1.1.2` to make sure Anchor is still pinned where we want it, and re-check all three versions.

- [ ] **Step 4: Verify the toolchain is coherent**

```bash
anchor --version && solana --version && surfpool --version && rustc --version
```
Expected: anchor 1.1.2, solana 3.1.10, surfpool present, rustc ≥ 1.85.

Do not commit — this task changes no files.

---

### Task 4: Migrate the Rust program to Anchor 1.1.2

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

Wherever you see this shape:

```rust
let cpi_program = context.accounts.token_program.to_account_info();
// ...
let cpi_context = CpiContext::new(cpi_program, cpi_accounts);
```

change the binding to the key:

```rust
let cpi_program = context.accounts.token_program.key();
// ...
let cpi_context = CpiContext::new(cpi_program, cpi_accounts);
```

Concretely, in `transfer_token.rs` (`process_transfer_token_between_users`):

```rust
  let cpi_program = context.accounts.token_program.key();
  let cpi_context = CpiContext::new(cpi_program, cpi_accounts);
```

In `deposit.rs` (`process_deposit`), which uses the signer form:

```rust
  let cpi_program = context.accounts.token_program.key();
  // ...
  let mint_to_context =
    CpiContext::new_with_signer(cpi_program, mint_to_cpi_accounts, mint_to_signer_seeds);
```

Note: `Pubkey` is `Copy`, so the `cpi_program.clone()` calls that exist today (e.g. in `add_user.rs` and `deposit.rs`) become unnecessary. Clippy will flag them — drop the `.clone()`.

In `add_user.rs` (`process_add_user_to_pool`), which has two CPIs sharing one program binding:

```rust
  let cpi_program = context.accounts.token_program.key();
  // ...
  let mint_to_cpi_context =
    CpiContext::new_with_signer(cpi_program, mint_to_cpi_accounts, mint_to_signer_seeds);
  // ...
  let transfer_token_cpi_context = CpiContext::new(cpi_program, transfer_token_cpi_accounts);
```

Apply the same transform in `close_pool.rs`, `end_game.rs`, `game/transfer_token_to_game.rs`, `game/take_token_from_game.rs`, `game/delete_game.rs`, and `game/quit_game.rs`.

- [ ] **Step 5: Verify no CpiContext site was missed**

```bash
grep -rn "CpiContext::new" anchor/programs/gametokenpool/src/ | wc -l
grep -rn "to_account_info()" anchor/programs/gametokenpool/src/ | grep -i "token_program"
```
Expected: the first prints `12`. The second prints **nothing** — no `token_program.to_account_info()` may remain.

(`to_account_info()` on the *account* structs — mint, token accounts, authority — is still correct and must stay. Only the **program** argument changed.)

- [ ] **Step 6: Build**

```bash
cd anchor && anchor build
```
Expected: build succeeds.

If you now get a **duplicate mutable account** error: Anchor 1.x disallows passing the same mutable account twice by default. Add the `dup` constraint to the account that is intentionally duplicated. Review carefully — in this program a genuine duplicate would most likely be a bug (e.g. a self-transfer in `transfer_token.rs` where `from_user_name == to_user_name`), so prefer fixing the caller over adding `dup`.

- [ ] **Step 7: Confirm the IDL regenerated**

```bash
git diff --stat anchor/target/idl/gametokenpool.json anchor/target/types/gametokenpool.ts
```
Expected: both files show changes. They are tracked (see `.gitignore` — `anchor/target/*` is ignored *except* `idl` and `types`), and Tasks 5 and 6 depend on them.

- [ ] **Step 8: Commit**

```bash
git add anchor/programs anchor/Anchor.toml anchor/Cargo.lock anchor/target/idl anchor/target/types
git commit -m "feat(program): migrate to Anchor 1.1.2

CpiContext now takes the program Pubkey, not its AccountInfo (12 sites).
Uses token_program.key() rather than Token::id() to preserve Token-2022
support via Interface<TokenInterface>. Drops the explicit solana-program
pin (Anchor 1.x supplies it) and the removed [registry] section."
```

---

### Task 5: Migrate the test suite from bankrun to surfpool

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

- [ ] **Step 1: Drop bankrun and add the new Anchor client**

```bash
npm uninstall anchor-bankrun solana-bankrun spl-token-bankrun
npm install @anchor-lang/core@1.1.2
```

**Leave `@coral-xyz/anchor` installed for now.** `src/` and `anchor/src/` still import it until Task 6; removing it here would break `npm run build` and leave this commit red. Task 6 removes it once nothing imports it. Both packages coexisting for one commit is fine.

- [ ] **Step 2: Rewrite ProgramUtil as a single path**

Replace `anchor/tests/utils/program.util.ts` entirely. The bankrun branch, the constructor params, and the whole `IProgramUtilConstructorParams` union go away:

```typescript
import * as anchor from '@anchor-lang/core';
import { APP_NAME } from '../constants';

export class ProgramUtil<T extends anchor.Idl> {
  private provider: anchor.AnchorProvider | undefined;
  private program: anchor.Program<T> | undefined;

  private init(): void {
    this.provider = anchor.AnchorProvider.env();
    anchor.setProvider(this.provider);
    this.program = anchor.workspace[APP_NAME] as anchor.Program<T>;
  }

  public async getProvider(): Promise<anchor.Provider> {
    if (!this.provider) this.init();
    if (!this.provider) throw new Error('Failed to get provider');
    return this.provider;
  }

  public async getProgram(): Promise<anchor.Program<T>> {
    if (!this.program) this.init();
    if (!this.program) throw new Error('Failed to init program');
    return this.program;
  }
}
```

`getProvider()` / `getProgram()` stay `async` so the specs that `await` them keep working unchanged.

- [ ] **Step 3: Update every construction site and delete the bankrun plumbing**

```bash
grep -rn "ProgramUtil\|generateConstructorParams\|getContext\|isTestingOnChain\|bankrun\|IS_TESTING_ON_CHAIN" anchor/tests/
```

For each hit: `new ProgramUtil(...)` becomes `new ProgramUtil()`. Delete any `generateConstructorParams`, `getContext`, `addedAccounts`, `addedPrograms`, and `anchorRootPath` usage — those existed only to feed bankrun. Any test that used a bankrun `ProgramTestContext` (e.g. to warp time or poke accounts directly) must go through the program's own instructions instead.

- [ ] **Step 4: Repoint every Anchor import**

```bash
grep -rln "@coral-xyz/anchor" anchor/ src/
```

In every file under `anchor/tests/`, replace `@coral-xyz/anchor` with `@anchor-lang/core`. (Files under `src/` and `anchor/src/` are Task 6 — leave them for now.)

- [ ] **Step 5: Point Anchor.toml's test config at surfpool**

In `anchor/Anchor.toml`, remove the `[test.validator]` block (surfpool replaces `solana-test-validator`, and that block configures the old one). Keep the jest script:

```toml
[scripts]
test = "../node_modules/.bin/jest --preset ts-jest"
```

- [ ] **Step 6: Collapse the makefile's test targets**

The `IS_TESTING_ON_CHAIN` split no longer exists — there is only one mode now. In `makefile`, replace the three test targets (`test`, `test/onchain`, `test/onchain/skip-deploy`) with:

```makefile
test:
	@cd anchor && \
		anchor test

test/skip-deploy:
	@cd anchor && \
		anchor test --skip-deploy
```

- [ ] **Step 7: Run the suite**

```bash
make test
```
Expected: **all 6 specs pass** (the original 5, plus the 50-char-username regression test from Task 2), now against surfpool.

- [ ] **Step 8: Commit**

```bash
git add anchor/tests anchor/Anchor.toml makefile package.json package-lock.json
git commit -m "test(program): replace bankrun with surfpool

anchor-bankrun is unmaintained and pinned to Anchor 0.30. Anchor 1.x makes
surfpool the default validator, so the IS_TESTING_ON_CHAIN dual-mode branch
in ProgramUtil collapses to a single path."
```

---

### Task 6: Migrate the web client to `@anchor-lang/core`

The web app talks to the program through `@coral-xyz/anchor`, which no longer exists in this project after Task 5.

**Files:**
- Modify: `anchor/src/gametokenpool-exports.ts`
- Modify: `src/util/server/connection.ts`

**Interfaces:**
- Consumes: the Anchor 1.1.2 IDL/types from Task 4; `@anchor-lang/core` from Task 5.
- Produces: `getGametokenpoolProgram(provider, address?)` and `getGametokenpoolProgramId(cluster)` with **unchanged signatures** — `ConnectionUtil` keeps calling them exactly as it does today.

- [ ] **Step 1: Repoint the anchor exports**

In `anchor/src/gametokenpool-exports.ts`, change the import (only the package name changes; the rest of the file is unchanged):

```typescript
import { AnchorProvider, Program } from '@anchor-lang/core';
```

- [ ] **Step 2: Repoint the server connection util**

In `src/util/server/connection.ts`, change:

```typescript
import { AnchorProvider, Program, setProvider } from '@anchor-lang/core';
```

The `NodeWallet` import is the one likely to break — it currently reaches into a deep CJS path:

```typescript
import NodeWallet from '@coral-xyz/anchor/dist/cjs/nodewallet';
```

Try the public export first:

```typescript
import { NodeWallet } from '@anchor-lang/core';
```

- [ ] **Step 3: Typecheck to find out whether NodeWallet is exported**

```bash
npm run typecheck
```

If `NodeWallet` is **not** exported from `@anchor-lang/core`, do not go hunting for another deep path — that is what got us here. `NodeWallet` is a trivial adapter; define it locally in `src/util/server/connection.ts` instead:

```typescript
import { Keypair, Transaction, VersionedTransaction } from '@solana/web3.js';

class NodeWallet {
  constructor(readonly payer: Keypair) {}

  get publicKey() {
    return this.payer.publicKey;
  }

  async signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T> {
    if (tx instanceof VersionedTransaction) tx.sign([this.payer]);
    else tx.partialSign(this.payer);
    return tx;
  }

  async signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]> {
    return Promise.all(txs.map((tx) => this.signTransaction(tx)));
  }
}
```

- [ ] **Step 4: Remove `@coral-xyz/anchor` and confirm nothing still imports it**

Nothing should reference it now, so it can finally come out (Task 5 deliberately left it installed):

```bash
npm uninstall @coral-xyz/anchor
grep -rn "@coral-xyz/anchor" src/ anchor/src/ anchor/tests/ package.json
```
Expected: `grep` produces **no output**. If it prints anything, that file was missed — fix it before uninstalling.

- [ ] **Step 5: Verify typecheck, lint, and build**

```bash
npm run typecheck && npm run lint && npm run build
```
Expected: all three succeed.

- [ ] **Step 6: Commit**

```bash
git add anchor/src src package.json package-lock.json
git commit -m "feat(web): migrate Anchor client to @anchor-lang/core

Anchor 1.x renames @coral-xyz/anchor to @anchor-lang/core. Replaces the
deep CJS NodeWallet import, which was reaching into dist/cjs internals."
```

---

### Task 7: Update Docker, CI, and deploy fresh

**Files:**
- Modify: `docker-compose.yml`
- Modify: `.github/workflows/test-anchor.yml`
- Modify: `README.md`

**Interfaces:**
- Consumes: everything from Tasks 4–6.

- [ ] **Step 1: Replace the validator service with surfpool**

`docker-compose.yml` currently runs a third-party `robojosef/solana-test-validator` image with `network_mode: host` (which does not behave correctly on macOS). `solana-test-validator` is superseded by surfpool.

Replace the `solana-test-validator` service with a surfpool service, and **drop `network_mode: host`** — map ports explicitly so it works on macOS and Linux alike:

```yaml
services:
  surfpool:
    image: txtx/surfpool:latest
    command: surfpool start --no-tui --port 8899
    ports:
      - '8899:8899'
      - '8900:8900'
  client:
    ports:
      - '3000:3000'
    build:
      dockerfile: Dockerfile.client
    depends_on:
      - surfpool
    develop:
      watch:
        - path: ./src
          target: /apps/crud-dapp/src
          action: sync
        - path: ./package.json
          action: rebuild
```

Verify the image name and flags against `surfpool --help` before committing — if no official image exists, run surfpool on the host and keep only the `client` service in compose.

Removing `network_mode: host` means the client container must reach the validator by service name, not `localhost`. The `localnet` entry in `ConnectionUtil.connectionMap` (`src/util/server/connection.ts`) hardcodes `http://localhost:8899`. Set `SOLANA_CLUSTER_PROVIDER=http://surfpool:8899` in the client service's environment, and make the `localnet` map entry honour `SOLANA_CLUSTER_PROVIDER` the same way the other three clusters already do:

```typescript
    [
      'localnet',
      {
        connection: new Connection(
          SOLANA_CLUSTER_PROVIDER ?? 'http://localhost:8899',
          'confirmed'
        ),
        endpoint: SOLANA_CLUSTER_PROVIDER ?? 'http://localhost:8899',
      },
    ],
```

This removes a special case: all four clusters now resolve their endpoint identically.

- [ ] **Step 2: Update the Anchor CI workflow**

In `.github/workflows/test-anchor.yml`, bump the pinned toolchain:

```yaml
      - uses: metadaoproject/setup-anchor@v2
        with:
          anchor-version: '1.1.2'
          node-version: '22'
          solana-cli-version: '3.1.10'
```

Also bump `actions/setup-node` to `node-version: 22`.

If `metadaoproject/setup-anchor@v2` does not yet support Anchor 1.x, replace it with the official install script:

```yaml
      - name: Install Solana toolkit
        run: |
          curl --proto '=https' --tlsv1.2 -sSfL https://solana-install.solana.workers.dev | bash
          echo "$HOME/.local/share/solana/install/active_release/bin" >> $GITHUB_PATH
```

- [ ] **Step 3: Deploy fresh**

On-chain state is disposable (decision Q2), and the `User`/`Game` layouts changed in Task 2, so **old accounts are incompatible**. Deploy a clean program.

```bash
make build
make deploy/with-airdrop
```
Expected: deploy succeeds and prints the program ID `F6yyNFRtZbmT6pVqjF4FoKRYi6PwegpoEJ9PS5pY4RcS`.

If the program ID changed, run `anchor keys sync` and rebuild so `declare_id!` and `Anchor.toml` agree.

- [ ] **Step 4: Run the full manual E2E checklist**

Start the stack and walk every flow against the freshly-deployed program. This exercises the CpiContext rewrite — **every one of these paths performs a token CPI**, so this is the real test of Task 4.

```bash
make up/build
```

At `http://localhost:3000`:

- [ ] `/admin` — log in; initialise a pool (`init_pool` + `init_pool_token_account`)
- [ ] `/admin` — add a user with a **50-character username** (the Task 2 fix, end to end)
- [ ] `/admin` — deposit to a user; balance increases (`deposit` → `mint_to` CPI)
- [ ] `/` — log in as that user; redirect to `/<username>`
- [ ] `/<username>` — transfer to another user (`transfer_token_between_users` → `transfer_checked` CPI)
- [ ] `/game` — create a game (`init_game` + `init_game_token_account`)
- [ ] `/game/<gameName>` — join, then transfer tokens into the game (`user_transfer_token_to_game` CPI)
- [ ] `/<username>/dealer` — take tokens from the game back to a player (`take_token_from_game` CPI)
- [ ] `/game/<gameName>` — quit the game (`user_quit_game` CPI), then delete it (`delete_game` CPI)
- [ ] `/<username>` — end game (`user_end_game` CPI); redirect to `/`

- [ ] **Step 5: Update the README prerequisites**

`README.md` still claims Anchor 0.30.1 / Solana 1.18.17 / Rust 1.77.2. Update the Prerequisites section:

```markdown
- Node v22 or higher
- Rust v1.85 or higher
- Anchor CLI 1.1.2
- Solana CLI 3.1.10
- surfpool (replaces solana-test-validator)
```

Also update the "Start the web app and local test validator" section if the compose service name changed.

- [ ] **Step 6: Commit**

```bash
git add docker-compose.yml .github/workflows/test-anchor.yml README.md src/util/server/connection.ts
git commit -m "chore: move local stack to surfpool; pin CI to Anchor 1.1.2 / Solana 3.1.10

Drops network_mode: host (broken on macOS) and resolves the localnet
endpoint through SOLANA_CLUSTER_PROVIDER like the other three clusters."
```

---

## Done When

- `anchor build` succeeds on Anchor 1.1.2 / Solana 3.1.10.
- `make test` passes all 6 specs against surfpool.
- `npm run typecheck && npm run lint && npm run build` all pass.
- `grep -rn "@coral-xyz/anchor" src/ anchor/` returns nothing.
- `grep -rn "SPACE_DISCRIMENTAL" anchor/` returns nothing.
- A user with a **50-character username** can be created and fetched (the bug this plan fixes).
- The program is deployed fresh and every item in the Task 7 E2E checklist passes.
- `npm audit` is **unchanged** from the end of Plan 1. Anchor 1.x fixes no vulnerabilities — if you expected otherwise, re-read `docs/modernization/decisions.md` Q3a.
