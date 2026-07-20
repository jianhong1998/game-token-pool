# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A custodial, wallet-less "arcade chip" token pool for in-person games (poker
night, etc.). There is no real-value asset and no client-side wallet — every
on-chain transaction is signed server-side by a single `FEE_PAYER` keypair.
User identity is just a username stored in `localStorage`; the corresponding
on-chain `User` account is a PDA derived from that username plus the
`FEE_PAYER` pubkey. **This custodial model is an intentional, settled decision
— not a gap to fix.** See `docs/modernization/decisions.md` Q1 before
suggesting wallet-adapter integration.

Two coupled subsystems live in one repo:

- `anchor/` — the Solana program (`gametokenpool`) plus its generated IDL/TS
  client and Anchor-level tests.
- `src/` — the Next.js 16 / React 19 app (Server Actions calling into the
  Anchor client).

They're coupled because `src/` imports `anchor/target/types` and the
generated IDL directly, so a program rebuild is required before the web app's
types are correct.

## Commands

### Web app

```shell
pnpm run dev         # Next dev server
pnpm run build        # Next build
pnpm run typecheck    # tsc --noEmit
pnpm run lint         # eslint .
pnpm test             # jest (src/**/*.test.ts, ts-jest, node env)
```

Run a single web test: `pnpm exec jest src/util/server/priority-fee.util.test.ts`.

### Anchor program

```shell
pnpm run anchor-build      # cd anchor && anchor build
pnpm run anchor-test       # cd anchor && anchor test
pnpm run anchor -- keys sync   # sync program ID after a build

# equivalently, from anchor/
anchor build
anchor test               # runs jest --runInBand --testTimeout=90000 over tests/specs
anchor test --skip-deploy
```

Run a single anchor spec: `cd anchor && ../node_modules/.bin/jest tests/specs/add-user.spec.ts --runInBand`.

Anchor tests spin up **surfpool** (not `solana-test-validator`) per the
`[surfpool]` block in `anchor/Anchor.toml`. Note several spec files currently
carry `describe.skip` (`init.spec.ts`, `deposit.spec.ts`, `transfer.spec.ts`)
— check whether that's still intentional before assuming a green `anchor
test` run means full coverage.

### Docker / local validator

```shell
just up-build            # docker compose up --build: surfpool + client
just up                  # docker compose up (no rebuild)
just down                # compose down + prune image
just build               # anchor build
just deploy               # build + anchor deploy (local surfpool)
just deploy-with-airdrop  # airdrop to program-owner/fee-payer, then deploy
just deploy-dev           # build + anchor deploy --provider.cluster devnet
```

The `client` container reaches the validator at `http://surfpool:8899` via
the `SOLANA_CLUSTER_PROVIDER` env var, not `localhost` — compose does not use
`network_mode: host`.

### Devnet deploy (manual)

```shell
cd anchor
anchor build
anchor keys sync
solana config set -ud -k <PATH_TO_KEYPAIR_JSON_FILE>
anchor deploy --provider.cluster devnet --provider.wallet <PATH_TO_KEYPAIR_JSON_FILE>
```

## Required environment (`.env`, see `.env.template`)

- `FEE_PAYER` — backend signer keypair, JSON number array. Signs literally
  every transaction; treat as the most sensitive secret in the repo.
- `ADMIN_PASSWORD` — gates the `/admin` dashboard.
- `SOLANA_CLUSTER_TYPE` — `localnet` | `devnet` | `testnet` | `mainnet-beta`.
- `SOLANA_CLUSTER_PROVIDER` — optional RPC URL override.

## Program architecture (`anchor/programs/gametokenpool/src`)

Three account types, all `#[account] #[derive(InitSpace)]`, all requiring
`space = SPACE_DISCRIMINATOR + <Type>::INIT_SPACE` on `init` (a prior bug
under-allocated by omitting the 8-byte discriminator — now fixed at every
call site; keep it that way when adding new `init` accounts):

- **`Pool`** (`states/pool.rs`) — one per admin/`FEE_PAYER`. PDA seeds
  `["pool", signer]`. Owns a mint (`["mint", signer]`) and a pool token
  account (`["pool_token_account", signer]`).
- **`User`** (`states/user.rs`) — PDA seeds `["user", username, signer]`.
  Holds `total_deposited_amount` and its own token account.
- **`Game`** (`states/game.rs`) — a bounded-lifetime session. PDA seeds
  `["game", signer, pool, game_name]`. Holds a `Vec<Pubkey>` of players
  (capped at `MAX_PLAYER_PER_GAME`) and its own game token account.

Instructions live under `instructions/`, one file per concern
(`init_pool.rs`, `add_user.rs`, `deposit.rs`, `transfer_token.rs`,
`close_pool.rs`, `end_game.rs`), plus a nested `instructions/game/` submodule
for the game lifecycle (`init_game.rs`, `join_game.rs`, `quit_game.rs`,
`transfer_token_to_game.rs`, `take_token_from_game.rs`, `delete_game.rs`).
`lib.rs` only wires `#[program]` entrypoints to `process_*` functions defined
in each instruction file — put logic in the instruction module, not `lib.rs`.

Money flow through a game: user deposits into their own token account
(`deposit`) → transfers into a game's token account
(`user_transfer_token_to_game`) → can be moved back out
(`take_token_from_game`) or reconciled at `user_end_game`.

## Web app architecture (`src/`)

- **`util/server/connection.ts`** — `ConnectionUtil`, a lazy singleton that
  builds the `AnchorProvider`/`Program` from `FEE_PAYER` and
  `SOLANA_CLUSTER_TYPE`. Defines a local `NodeWallet` adapter because
  `@anchor-lang/core` doesn't export one publicly. All server code gets its
  program/connection/signer through this class's static accessors — don't
  construct a `Connection` or `Program` directly elsewhere.
- **`util/server/account.util.ts`** (`AccountUtil`) — derives `User`/`Game`
  PDAs client-side-of-the-server (must match the Rust seed derivation
  exactly).
- **`app/**/actions/\*.ts`** — `'use server'` Server Actions, one file per
operation (`create-game.ts`, `user-login.ts`, `user-fund.ts`, etc.). These
build instructions via the Anchor `program.methods`builder, sometimes
batching several instructions into one`VersionedTransaction`(see`create-game.ts`for the two-instruction pool-init pattern), sign with the`FEE_PAYER` signer, and send/confirm directly — no client wallet signing
  step anywhere in this flow.
- **`components/queries/`** — React Query hooks wrapping the server actions
  by domain (`game/`, `pool/`, `user/`), consumed by `components/dashboard`,
  `components/forms`, `components/lists`.
- **`app/admin`** vs **`app/[username]`** — two distinct surfaces: the admin
  dashboard (password-gated, pool/game administration) and the per-user
  dashboard (deposits, transfers, joining games), plus a `dealer` sub-route
  under `[username]`.
- Anchor-generated client lives at `anchor/src/gametokenpool-exports.ts` +
  `anchor/target/types/gametokenpool` — imported directly by `src/`, so it
  must exist (i.e. `anchor build` must have run) before the web app
  typechecks or builds.

## Toolchain versions (pinned, don't casually bump)

Anchor CLI 1.1.2, Solana CLI 3.1.10 (Agave), surfpool (replaces
`solana-test-validator`), Node 22, TypeScript 5.9.x (deliberately not on TS
7's Go port yet), Tailwind 3 + daisyUI 4 (Tailwind 4/daisyUI 5 upgrade is
deferred — see `docs/modernization/deferred-tailwind4-daisyui5.md`).

CI (`.github/workflows/test-anchor.yml`) installs Anchor 1.1.2 via `avm`
from source rather than `metadaoproject/setup-anchor`, because
`@coral-xyz/anchor-cli` was never published past 0.31.2 on npm — Anchor 1.x
isn't installable through that action.

## Where decisions are recorded

`docs/modernization/decisions.md` is a Q&A decision record from the last
modernization pass (custodial model kept, on-chain state treated as
disposable/no-migration-needed, dependency-upgrade scope, why Anchor 1.x was
chosen over the recommended 0.31.1, etc.) — read it before proposing
architecture changes to the areas it covers, and add to it (or a similar
record) after any future architecture discussion so the reasoning isn't
lost.
