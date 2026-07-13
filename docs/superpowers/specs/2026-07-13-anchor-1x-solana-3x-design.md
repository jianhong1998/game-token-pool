# Anchor 1.x + Solana 3.x Migration — Design Spec

**Date:** 2026-07-13
**Status:** Approved
**Decision record:** [`docs/modernization/decisions.md`](../../modernization/decisions.md)
**Implementation plan:** [`../plans/2026-07-13-anchor-1x-solana-3x.md`](../plans/2026-07-13-anchor-1x-solana-3x.md)
**Depends on:** [Web spec](./2026-07-13-web-next16-react19-design.md) must ship first.

---

## Problem

Two distinct problems, one of which is real and one of which is chosen.

### 1. The toolchain does not build reproducibly (real)

| Declared                                    | Installed                   |
| ------------------------------------------- | --------------------------- |
| `Anchor.toml` → `anchor_version = "0.30.1"` | `anchor-cli 0.31.1`         |
| `Cargo.toml` → `solana-program 1.18.17`     | `solana-cli 2.1.21 (Agave)` |

Nothing agrees with anything. The last commit on the repo is literally
`f227105 "fix version upgrade issue"` — this drift has already cost time.

### 2. A latent on-chain data-corruption bug (real, and found during mapping)

`Pool` correctly allocates `SPACE_DISCRIMENTAL + Pool::INIT_SPACE`. But:

- `add_user.rs:50` → `space = User::INIT_SPACE`
- `game/init_game.rs:26` → `space = Game::INIT_SPACE`

Both **omit the 8-byte account discriminator**, under-allocating by 8 bytes.

It silently works today only because Borsh serializes the _actual_ length, not
the `max_len` reservation. The exact failure thresholds:

- `User::INIT_SPACE` = 128. Minus the 8-byte discriminator → 120 bytes for data.
  Data written = `78 + name.len()`. → **breaks at a 43-character username**,
  despite `#[max_len(50)]` promising 50.
- `Game::INIT_SPACE` = 765 → 757 for data. Data = `75 + name.len() + 32 × players`.
  → with a 50-char game name, **breaks on the 20th player**, despite
  `MAX_PLAYER_PER_GAME = 20`.

Both accounts silently promise capacity they do not have. This is a real bug
that will corrupt state under load.

### 3. Anchor 1.x (chosen, not required)

**The user was recommended Anchor 0.31.1 and chose 1.1.2 instead.** This spec
implements the user's choice, but records the tradeoff honestly, because the
implementer must not be misled about what they are buying:

- **Anchor 1.x fixes ZERO vulnerabilities.** `@anchor-lang/core@1.1.2` still
  depends on `@solana/web3.js@^1.69.1`. The entire Solana advisory tree is
  unchanged. Verified.
- It costs: a package rename, a Solana 3.x migration, a CPI rewrite across 12
  sites, a Docker rewrite, and the death of the existing test harness.

**Reason for the choice:** avoid repeating this migration within a year.
That is a legitimate goal. It is simply not a _security_ goal, and nobody should
execute this plan believing it is.

## Goals

1. One coherent, reproducible toolchain: Anchor 1.1.2, Solana 3.1.10, surfpool.
2. Fix the discriminator under-allocation bug, with a regression test proving it.
3. Keep the test suite alive despite `anchor-bankrun` dying.
4. Migrate the web client to the renamed Anchor package without changing behaviour.
5. Deploy fresh.

## Non-Goals

| Excluded                          | Why                                                                                                       |
| --------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Any change to the custodial model | Decision Q1. PDA seeds stay `["user", username, FEE_PAYER.pubkey]`. Do not touch `AccountUtil`.           |
| An on-chain state migration       | Decision Q2 — on-chain state is **disposable**. Redeploy fresh. Writing a migration would be wasted work. |
| Any vulnerability reduction       | Not achievable here. See above.                                                                           |
| New program features              | None. Instruction surface is unchanged.                                                                   |

## Requirements

### Version floors (exact)

- `anchor-lang`, `anchor-spl` → **1.1.2**
- `anchor-cli` → **1.1.2** (via `avm`)
- Solana CLI → **3.1.10** (Agave). Anchor 1.x requires Solana 3.x; Agave 2.x will not work.
- `@anchor-lang/core` → **1.1.2** (replaces `@coral-xyz/anchor` entirely)
- `solana-program` → **removed from Cargo.toml**. The explicit pin is precisely
  what caused the drift; Anchor 1.x supplies the correct Solana crates itself.

### Invariants

- The program ID stays `F6yyNFRtZbmT6pVqjF4FoKRYi6PwegpoEJ9PS5pY4RcS`.
- The 13-instruction surface is unchanged.
- Token-2022 support via `Interface<'info, TokenInterface>` is **preserved**.

## Architecture

### Sequencing: fix the bug before moving the ground

The discriminator fix lands **first**, under the _existing_ Anchor 0.30.1
toolchain, where the _existing_ bankrun tests still run. This yields a
regression test that is trustworthy _before_ the toolchain changes underneath it.

Doing the migration first and the bug fix after would mean the fix's test runs on
an unproven harness — if it failed, we could not tell whether the bug or the
migration broke it.

### The one breaking change that touches real code

Anchor 1.0 removes the program `AccountInfo` from CPI context (#2762):

```rust
// Anchor 0.30
CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts)
// Anchor 1.x — takes the program ID
CpiContext::new(program_id, cpi_accounts)
```

**Critical for this codebase:** the program uses `Interface<TokenInterface>`, not
a hardcoded `Token`. So the program ID must be `token_program.key()` — the one
actually passed in. Hardcoding `Token::id()` would **silently break Token-2022
support**. This is the single most likely way to get this migration subtly wrong.

Scope, verified by grep: **12 call sites across 9 files.**

### The test harness: a special case disappears

`anchor-bankrun@0.5.0` peer-depends on `@coral-xyz/anchor@^0.30.0` and has been
unmaintained since Oct 2024. Its successor `anchor-litesvm` only supports
`^0.31.1`. **No maintained TS bankrun-style harness exists for Anchor 1.x.**

This is not a loss. Anchor 1.x makes **surfpool** the default validator, and
`ProgramUtil` _already_ has a working on-chain path behind `IS_TESTING_ON_CHAIN`.
So the dual-mode branch collapses to a single path. `getContext()`,
`generateConstructorParams()`, and the whole `IProgramUtilConstructorParams`
union are deleted.

A special case is eliminated rather than patched. That is the right outcome.

### Not affected

The program already has exactly **one** `#[error_code]` block, so Anchor 1.x's
"single error code block" restriction is a no-op here. Verified.

## Acceptance Criteria

- [ ] `anchor build` succeeds on Anchor 1.1.2 / Solana 3.1.10.
- [ ] `make test` passes **all 6 specs** (the original 5 + the new regression test) against surfpool.
- [ ] A user with a **50-character username** can be created and fetched back. _(This is the bug this spec exists to fix.)_
- [ ] `grep -rn "@coral-xyz/anchor" src/ anchor/` → no output.
- [ ] `grep -rn "SPACE_DISCRIMENTAL" anchor/` → no output.
- [ ] `grep -rn "token_program.to_account_info()" anchor/programs/` → no output.
- [ ] `npm run typecheck && npm run lint && npm run build` all pass.
- [ ] Program deploys fresh; program ID unchanged.
- [ ] `npm audit` is **unchanged** from the end of the web plan. An improvement here would be surprising and should be investigated, not celebrated.

### Manual E2E

Every listed flow performs a **token CPI**, so this checklist is the real test of
the CpiContext rewrite:

- [ ] Admin: init pool, add user **with a 50-character username**, deposit
- [ ] User: log in, transfer to another user
- [ ] Game: create, join, transfer tokens in, take tokens out (dealer), quit, delete
- [ ] End game

## Risks

| Risk                                                                                  | Likelihood                                                 | Mitigation                                                                                                         |
| ------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `Token::id()` hardcoded instead of `token_program.key()`, silently killing Token-2022 | **High** — it is what the official migration example shows | Called out explicitly in spec + plan; grep gate in acceptance criteria                                             |
| Anchor 1.x has further breaking changes not in the changelog                          | Medium                                                     | Build early (plan Task 4 Step 3) to surface every error at once before editing                                     |
| Duplicate-mutable-account errors (new in 1.x)                                         | Low                                                        | If hit, prefer fixing the caller over adding `dup` — a genuine duplicate here (e.g. self-transfer) is likely a bug |
| No official surfpool Docker image                                                     | Medium                                                     | **Unverified.** Plan provides a host-side fallback. The only unverified external artifact in this work.            |
| `NodeWallet` not exported from `@anchor-lang/core`                                    | Medium                                                     | Define the adapter locally (~15 lines) rather than reaching into `dist/cjs` again — that deep import is what broke |
| Existing tests are already red before we start                                        | Unknown                                                    | Plan Task 1 establishes a green baseline first and **stops** if it is not green                                    |

## Follow-ups

- Reconsider `@solana/kit` if Anchor ever ships a client for it — that is the
  only path to a clean `npm audit`, and it is not worth taking today.
