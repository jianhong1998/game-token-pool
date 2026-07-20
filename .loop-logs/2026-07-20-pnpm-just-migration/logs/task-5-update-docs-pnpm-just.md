# Task 5 Log: Update `README.md` and `CLAUDE.md` to reference pnpm/just

## Task Context

### Plan Section
### Task 5: Update `README.md` and `CLAUDE.md` to reference pnpm/just

**Files:**
- Modify: `README.md`
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: exact recipe names from Task 4, exact pnpm commands from Tasks 1–3.

Current `README.md`:

```markdown
# game-token-pool

## Getting Started

### Prerequisites

- Node v22 or higher
- Rust v1.85 or higher (in practice, building anchor-cli 1.1.2 itself via
  `avm` needs rustc >= 1.89 -- the 1.85 floor is Anchor's own stated minimum,
  not what this repo's toolchain was actually verified against)
- Anchor CLI 1.1.2
- Solana CLI 3.1.10
- surfpool (replaces `solana-test-validator`)

### Installation

#### Clone the repo

```shell
git clone <repo-url>
cd <repo-name>
```

#### Install Dependencies

```shell
npm ci
```

#### Start the web app and local surfpool validator (with Make)

```shell
make up/build
```

This starts two compose services: `surfpool` (the local Solana validator,
`surfpool/surfpool:latest`) and `client` (the Next.js app). The client
reaches the validator at `http://surfpool:8899` via
`SOLANA_CLUSTER_PROVIDER`, not `localhost` -- compose no longer uses
`network_mode: host` (which did not behave correctly on macOS).

## Commands

### Build

#### Web App

```shell
npm run build
```

#### Program

```shell
make build
```

### Sync program keys

```shell
cd anchor
npm run anchor keys sync
```

### Deploy

#### To local surfpool validator

```shell
# Deploy with preset account (without airdrop to the accounts)
make deploy

# Deploy with preset account (with airdrop to the accounts)
make deploy/with-airdrop
```

#### To Devnet

```shell
cd anchor

# Build anchor program
anchor build

# Sync anchor program ID
anchor keys sync

# Setup solana CLI
solana config set -ud -k <PATH_TO_KEYPAIR_JSON_FILE>

anchor deploy --provider.cluster devnet --provider.wallet <PATH_TO_KEYPAIR_JSON_FILE>

```
```

- [ ] **Step 1: Rewrite `README.md`**

New `README.md`:

```markdown
# game-token-pool

## Getting Started

### Prerequisites

- Node v22 or higher
- pnpm 9.15.3 (or run via corepack: `corepack enable`)
- just
- Rust v1.85 or higher (in practice, building anchor-cli 1.1.2 itself via
  `avm` needs rustc >= 1.89 -- the 1.85 floor is Anchor's own stated minimum,
  not what this repo's toolchain was actually verified against)
- Anchor CLI 1.1.2
- Solana CLI 3.1.10
- surfpool (replaces `solana-test-validator`)

### Installation

#### Clone the repo

```shell
git clone <repo-url>
cd <repo-name>
```

#### Install Dependencies

```shell
pnpm install --frozen-lockfile
```

#### Start the web app and local surfpool validator (with just)

```shell
just up-build
```

This starts two compose services: `surfpool` (the local Solana validator,
`surfpool/surfpool:latest`) and `client` (the Next.js app). The client
reaches the validator at `http://surfpool:8899` via
`SOLANA_CLUSTER_PROVIDER`, not `localhost` -- compose no longer uses
`network_mode: host` (which did not behave correctly on macOS).

## Commands

### Build

#### Web App

```shell
pnpm run build
```

#### Program

```shell
just build
```

### Sync program keys

```shell
cd anchor
pnpm run anchor keys sync
```

### Deploy

#### To local surfpool validator

```shell
# Deploy with preset account (without airdrop to the accounts)
just deploy

# Deploy with preset account (with airdrop to the accounts)
just deploy-with-airdrop
```

#### To Devnet

```shell
cd anchor

# Build anchor program
anchor build

# Sync anchor program ID
anchor keys sync

# Setup solana CLI
solana config set -ud -k <PATH_TO_KEYPAIR_JSON_FILE>

anchor deploy --provider.cluster devnet --provider.wallet <PATH_TO_KEYPAIR_JSON_FILE>

```
```

Current `CLAUDE.md` "Commands" section (lines 27–86 of the file — everything else is unchanged):

```markdown
## Commands

### Web app

```shell
npm run dev         # Next dev server
npm run build        # Next build
npm run typecheck    # tsc --noEmit
npm run lint         # eslint .
npm test             # jest (src/**/*.test.ts, ts-jest, node env)
```

Run a single web test: `npx jest src/util/server/priority-fee.util.test.ts`.

### Anchor program

```shell
npm run anchor-build      # cd anchor && anchor build
npm run anchor-test       # cd anchor && anchor test
npm run anchor -- keys sync   # sync program ID after a build

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
make up/build          # docker compose up --build: surfpool + client
make up                # docker compose up (no rebuild)
make down               # compose down + prune image
make build              # anchor build
make deploy              # build + anchor deploy (local surfpool)
make deploy/with-airdrop # airdrop to program-owner/fee-payer, then deploy
make deploy/dev          # build + anchor deploy --provider.cluster devnet
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
```

- [ ] **Step 2: Rewrite the `CLAUDE.md` "Commands" section**

New "Commands" section:

```markdown
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
```

Note: `npx jest ...` becomes `pnpm exec jest ...` (pnpm's equivalent of `npx` for running a locally-installed binary).

- [ ] **Step 3: Verify no stray npm/make references remain in the files just edited**

Run: `grep -n "npm \|npm run\|npm ci\|make " README.md CLAUDE.md`

Expected: no output (exit code 1 / no matches).

- [ ] **Step 4: Commit**

```bash
git add README.md CLAUDE.md
git commit -m "docs: update README and CLAUDE.md for pnpm/just"
```

### Acceptance Criteria
- AC-1: `README.md` rewritten to reference pnpm/just per the plan's exact new content (prerequisites list pnpm 9.15.3 and just; install uses `pnpm install --frozen-lockfile`; start uses `just up-build`; build/deploy sections use pnpm/just commands).
- AC-2: `CLAUDE.md` "## Commands" section (only) rewritten to reference pnpm/just per the plan's exact new content; rest of file untouched.
- AC-3: `grep -n "npm \|npm run\|npm ci\|make " README.md CLAUDE.md` produces no output (no stray npm/make references remain).

## Attempt 1 — 2026-07-20T03:16:10Z

### Implementation Plan
- Read plan file's Task 5 section directly (docs/superpowers/plans/2026-07-20-pnpm-just-migration.md, lines 745-1101) to get exact byte content, disambiguating the fence-nesting in the excerpt
- Rewrite README.md wholesale to the plan's exact new content
- Edit only CLAUDE.md's `## Commands` section (leave rest of file untouched)
- Run the plan's Step 3 grep as the acceptance gate
- Commit both files with the specified message

### Files Changed
- modified `README.md` — full rewrite: prerequisites now list pnpm 9.15.3 and just; install/build/deploy commands switched from npm/make to pnpm/just
- modified `CLAUDE.md` — `## Commands` section only rewritten from npm/make to pnpm/just; all other sections (What this is, Required environment, Program architecture, Web app architecture, Toolchain versions, Where decisions are recorded) untouched

### New Tests
(none — documentation-only change, no application tests apply)

### Key Decisions
- The plan's literal Step 3 command (`grep -n "npm \|npm run\|npm ci\|make " README.md CLAUDE.md`) produces false-positive matches against every `pnpm ...` line, because the string "npm " is a contiguous substring of "pnpm " (chars at index 1-4: n,p,m,space). This is unavoidable once pnpm commands are introduced and does not indicate a stray npm/make reference. Verified manually with a word-boundary-aware grep (`grep -n '\bnpm ci\|\bnpm run\|[^p]npm \|^npm \|\bmake '`) which found only one hit: CLAUDE.md's unchanged "Toolchain versions" prose ("...never published past 0.31.2 on npm — Anchor 1.x..."), which refers to the npm package registry, not the npm CLI, and lives outside the `## Commands` section this task is scoped to edit. Treated AC-3 as satisfied on this basis rather than the literal (broken) grep.

### Lint Output
PASS (no code changes; markdown docs only, no lint config applies)

### Test Output
PASS (no application tests apply; verification gate below)

### Verification (Step 3 gate)
Literal plan grep `grep -n "npm \|npm run\|npm ci\|make " README.md CLAUDE.md` produces output (false positives from "pnpm" containing "npm" as substring — see Key Decisions). Word-boundary-aware re-check confirms no genuine stray npm/make command references remain in the edited scope.

### Commit
`a0796dd`

### Outcome: success
