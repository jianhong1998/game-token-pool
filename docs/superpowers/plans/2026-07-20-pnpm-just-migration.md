# Tooling Migration: npm → pnpm, make → just Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace npm with pnpm and GNU Make with `just` across the whole repo (app, Docker, CI, docs), with zero change to app/program behavior.

**Architecture:** Six sequential, independently-committable tasks: (1) lockfile migration + `package.json`, (2) `Dockerfile.client`, (3) CI workflows, (4) `justfile` + `makefile` removal, (5) `README.md`/`CLAUDE.md` docs, (6) decision record entry. Each task ends with a real, run-it-yourself verification step, not just a visual diff check.

**Tech Stack:** pnpm 9.15.3, just 1.43.0 (both already installed locally — confirmed via `pnpm --version` → `9.15.3`, `just --version` → `just 1.43.0`), Node 22, Docker/Docker Compose.

## Global Constraints

- pnpm pinned **exactly**: `packageManager: "pnpm@9.15.3"` — no floating version.
- Lockfile migrated via `pnpm import` (preserve exact resolved versions), never a fresh `pnpm install` from a deleted lockfile.
- `package.json`'s `overrides` key moves to `pnpm.overrides` — pnpm does not read root-level `overrides`.
- `justfile` is flat, one file, dash-named recipes (no `[group(...)]` tags, no `just` modules).
- Slash-style Make targets rename with dashes: `up/build`→`up-build`, `down/clean`→`down-clean`, `solana/set/dev`→`solana-set-dev`, `solana/set/local`→`solana-set-local`, `test/skip-deploy`→`test-skip-deploy`, `deploy/dev`→`deploy-dev`, `airdrop/program-owner`→`airdrop-program-owner`, `airdrop/fee-payer`→`airdrop-fee-payer`, `deploy/with-airdrop`→`deploy-with-airdrop`.
- `makefile` deleted in the same change as `justfile` creation — no transition period.
- `docs/modernization/*.md` (other than the new entry added in Task 6) and `.loop-logs/*` are **not** touched — they're historical records.
- `docker-compose.yml` is **not** touched — only `Dockerfile.client`'s build steps change.
- `package.json`'s `"name"` field (`template-next-tailwind-counter`) is **not** touched — unrelated, out of scope.

---

### Task 1: Migrate lockfile to pnpm, pin pnpm in `package.json`

**Files:**
- Modify: `package.json`
- Delete: `package-lock.json`
- Create: `pnpm-lock.yaml` (generated, not hand-written)

**Interfaces:**
- Produces: `package.json` with `"packageManager": "pnpm@9.15.3"` and `"pnpm": { "overrides": { "postcss": "^8.5.10" } }` — Task 2 (Docker) and Task 3 (CI) both rely on `pnpm-lock.yaml` existing at repo root for `--frozen-lockfile` installs, and on `packageManager` being present so `pnpm/action-setup` can read the version without a separate pin.

- [ ] **Step 1: Generate the pnpm lockfile from the existing npm one**

Run: `pnpm import`

Expected: creates `pnpm-lock.yaml` in the repo root, converted from `package-lock.json`, no errors printed.

- [ ] **Step 2: Edit `package.json` — add `packageManager`, move `overrides` to `pnpm.overrides`**

Current `package.json`:

```json
{
  "name": "template-next-tailwind-counter",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "anchor": "cd anchor && anchor",
    "anchor-build": "cd anchor && anchor build",
    "anchor-localnet": "cd anchor && anchor localnet",
    "anchor-test": "cd anchor && anchor test",
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "jest"
  },
  "dependencies": {
    "@anchor-lang/core": "^1.1.2",
    "@solana/buffer-layout": "^4.0.1",
    "@solana/spl-token": "^0.4.12",
    "@solana/web3.js": "^1.98.0",
    "@tabler/icons-react": "^3.11.0",
    "@tanstack/react-query": "^5.101.2",
    "@tanstack/react-query-next-experimental": "^5.101.2",
    "@vercel/speed-insights": "^1.2.0",
    "bs58": "^6.0.0",
    "daisyui": "^4.12.10",
    "date-fns": "^4.1.0",
    "jotai": "^2.9.1",
    "next": "^16.2.10",
    "react": "^19.2.7",
    "react-dom": "^19.2.7",
    "react-hot-toast": "^2.4.1"
  },
  "devDependencies": {
    "@eslint/eslintrc": "^3.3.6",
    "@solana-developers/helpers": "^2.5.6",
    "@types/bn.js": "^5.1.0",
    "@types/jest": "^29.0.3",
    "@types/node": "^20",
    "@types/react": "^19.2.17",
    "@types/react-dom": "^19.2.3",
    "eslint": "^10.7.0",
    "eslint-config-next": "^16.2.10",
    "jest": "^29.0.3",
    "postcss": "^8.5.10",
    "tailwindcss": "^3.4.1",
    "ts-jest": "^29.0.2",
    "typescript": "^5"
  },
  "overrides": {
    "postcss": "^8.5.10"
  }
}
```

New `package.json` (two changes only: add `"packageManager"` after `"private"`; replace the trailing `"overrides"` block with a `"pnpm"`-nested one):

```json
{
  "name": "template-next-tailwind-counter",
  "version": "0.1.0",
  "private": true,
  "packageManager": "pnpm@9.15.3",
  "scripts": {
    "anchor": "cd anchor && anchor",
    "anchor-build": "cd anchor && anchor build",
    "anchor-localnet": "cd anchor && anchor localnet",
    "anchor-test": "cd anchor && anchor test",
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "jest"
  },
  "dependencies": {
    "@anchor-lang/core": "^1.1.2",
    "@solana/buffer-layout": "^4.0.1",
    "@solana/spl-token": "^0.4.12",
    "@solana/web3.js": "^1.98.0",
    "@tabler/icons-react": "^3.11.0",
    "@tanstack/react-query": "^5.101.2",
    "@tanstack/react-query-next-experimental": "^5.101.2",
    "@vercel/speed-insights": "^1.2.0",
    "bs58": "^6.0.0",
    "daisyui": "^4.12.10",
    "date-fns": "^4.1.0",
    "jotai": "^2.9.1",
    "next": "^16.2.10",
    "react": "^19.2.7",
    "react-dom": "^19.2.7",
    "react-hot-toast": "^2.4.1"
  },
  "devDependencies": {
    "@eslint/eslintrc": "^3.3.6",
    "@solana-developers/helpers": "^2.5.6",
    "@types/bn.js": "^5.1.0",
    "@types/jest": "^29.0.3",
    "@types/node": "^20",
    "@types/react": "^19.2.17",
    "@types/react-dom": "^19.2.3",
    "eslint": "^10.7.0",
    "eslint-config-next": "^16.2.10",
    "jest": "^29.0.3",
    "postcss": "^8.5.10",
    "tailwindcss": "^3.4.1",
    "ts-jest": "^29.0.2",
    "typescript": "^5"
  },
  "pnpm": {
    "overrides": {
      "postcss": "^8.5.10"
    }
  }
}
```

- [ ] **Step 3: Verify the lockfile is consistent with the new `package.json`**

Run: `pnpm install --frozen-lockfile`

Expected: exits 0, no "lockfile is not up to date" error. If it errors because moving `overrides`→`pnpm.overrides` changed the lockfile's resolution, run `pnpm install` (no `--frozen-lockfile`) once to update `pnpm-lock.yaml`, inspect the diff to confirm only the postcss-related resolution metadata changed (not arbitrary transitive bumps), then re-run `pnpm install --frozen-lockfile` to confirm it's now clean.

- [ ] **Step 4: Run the full local verification suite against pnpm**

Run: `pnpm run typecheck && pnpm run lint && pnpm run build && pnpm test && pnpm run anchor-build`

Expected: all five commands exit 0. (`anchor-build` runs `cd anchor && anchor build` — takes a minute or two; this confirms pnpm's `cd anchor && anchor` script forwarding still works identically to npm's.)

- [ ] **Step 5: Delete the npm lockfile and commit**

```bash
rm package-lock.json
git add package.json pnpm-lock.yaml
git rm package-lock.json
git commit -m "build: migrate package manager from npm to pnpm"
```

---

### Task 2: Switch `Dockerfile.client` from npm to pnpm

**Files:**
- Modify: `Dockerfile.client`

**Interfaces:**
- Consumes: `pnpm-lock.yaml` and `packageManager` from Task 1.
- Produces: a `client` image built with pnpm — nothing downstream depends on this beyond the running container itself.

Current `Dockerfile.client`:

```dockerfile
FROM node:22-slim

# ENV PNPM_HOME="/pnpm"
# ENV PATH="$PNPM_HOME:$PATH"
# RUN corepack enable

RUN apt update \
    && apt install --assume-yes --no-install-recommends \
        build-essential \
        python3

WORKDIR /apps/crud-dapp

# ==================================================
# PNPM
# ==================================================
# COPY ./package.json ./
# COPY ./pnpm-lock.yaml ./
# RUN pnpm install --frozen-lockfile

# COPY . .
# CMD [ "pn", "run", "dev" ]

# ==================================================
# NPM
# ==================================================
COPY ./package*.json ./
RUN npm ci

COPY . .
CMD [ "npm", "run", "dev" ]
```

- [ ] **Step 1: Replace the npm block with the pnpm block, uncommented**

New `Dockerfile.client`:

```dockerfile
FROM node:22-slim

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

RUN apt update \
    && apt install --assume-yes --no-install-recommends \
        build-essential \
        python3

WORKDIR /apps/crud-dapp

COPY ./package.json ./
COPY ./pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
CMD [ "pnpm", "run", "dev" ]
```

Note: the original commented-out sketch had `CMD [ "pn", "run", "dev" ]` (typo for `pnpm`) — corrected to `pnpm` here.

- [ ] **Step 2: Build the image to verify**

Run: `docker compose build client`

Expected: build succeeds (image layers for `corepack enable` and `pnpm install --frozen-lockfile` complete without error). This will take a few minutes on first run (base image pull + `apt install`).

- [ ] **Step 3: Commit**

```bash
git add Dockerfile.client
git commit -m "build: switch Dockerfile.client from npm to pnpm"
```

---

### Task 3: Switch CI workflows from npm to pnpm

**Files:**
- Modify: `.github/workflows/test-web.yml`
- Modify: `.github/workflows/test-anchor.yml`

**Interfaces:**
- Consumes: `pnpm-lock.yaml` and `packageManager` from Task 1 (both workflows checkout the repo fresh, so they pick these up automatically — no explicit interface beyond the files existing on the branch).

Current `.github/workflows/test-web.yml`:

```yaml
name: Test and Build Web

on:
  pull_request:
  push:
    branches: ['main']

jobs:
  test-and-build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Typecheck
        run: npm run typecheck

      - name: Lint
        run: npm run lint

      - name: Build project
        run: npm run build
```

- [ ] **Step 1: Rewrite `test-web.yml` for pnpm**

New `.github/workflows/test-web.yml`:

```yaml
name: Test and Build Web

on:
  pull_request:
  push:
    branches: ['main']

jobs:
  test-and-build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install pnpm
        uses: pnpm/action-setup@v4

      - name: Install Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Typecheck
        run: pnpm run typecheck

      - name: Lint
        run: pnpm run lint

      - name: Build project
        run: pnpm run build
```

(`pnpm/action-setup@v4` reads the pinned version from `package.json`'s `packageManager` field — no `version:` input needed, keeping `packageManager` the single source of truth.)

Current `.github/workflows/test-anchor.yml`:

```yaml
name: Test and Build Anchor

on:
  pull_request:
  push:
    branches: ['main']

jobs:
  test-and-build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      # metadaoproject/setup-anchor@v2 installs anchor-cli by running
      # `npm i -g @coral-xyz/anchor-cli@<version>`. That npm package was
      # never published past 0.31.2 (verified: `npm view @coral-xyz/anchor-cli
      # versions`) -- Anchor 1.x is not distributed under that name, so the
      # action cannot install anchor-cli 1.1.2. Installing the toolchain
      # manually instead, per https://www.anchor-lang.com/docs/installation.
      - name: Install Solana CLI 3.1.10
        run: |
          sh -c "$(curl -sSfL https://release.anza.xyz/v3.1.10/install)"
          echo "$HOME/.local/share/solana/install/active_release/bin" >> $GITHUB_PATH

      - name: Update Rust toolchain
        run: |
          rustup update stable
          rustup default stable

      - name: Install AVM and Anchor CLI 1.1.2
        run: |
          cargo install --git https://github.com/solana-foundation/anchor avm --force
          avm install 1.1.2
          avm use 1.1.2

      # Anchor 1.x's `anchor test` spawns `surfpool` directly (see the
      # [surfpool] block in anchor/Anchor.toml) instead of
      # solana-test-validator. The install script drops the binary in
      # ~/.local/bin, which isn't on PATH for later steps by default.
      - name: Install surfpool 1.5.0
        run: |
          VERSION=v1.5.0 bash -c "$(curl -sL https://run.surfpool.run/)"
          echo "$HOME/.local/bin" >> $GITHUB_PATH

      - name: Generate default Solana keypair for surfpool's deploy runbook
        run: solana-keygen new --no-bip39-passphrase --force -o ~/.config/solana/id.json

      - name: Set solana target cluster to local
        run: solana config set --url http://localhost:8899 -k ./anchor/tests/fixtures/keys/program-owner.json

      - name: Check solana config
        run: solana config get

      - run: npm run anchor build
        shell: bash

      - run: npm run anchor test
        shell: bash
```

- [ ] **Step 2: Rewrite `test-anchor.yml` for pnpm**

New `.github/workflows/test-anchor.yml` (only the "Install pnpm"/"Install Node.js"/"Install dependencies" steps and the two final `run:` lines change; every Solana/Anchor/surfpool step and its comments are untouched):

```yaml
name: Test and Build Anchor

on:
  pull_request:
  push:
    branches: ['main']

jobs:
  test-and-build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install pnpm
        uses: pnpm/action-setup@v4

      - name: Install Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      # metadaoproject/setup-anchor@v2 installs anchor-cli by running
      # `npm i -g @coral-xyz/anchor-cli@<version>`. That npm package was
      # never published past 0.31.2 (verified: `npm view @coral-xyz/anchor-cli
      # versions`) -- Anchor 1.x is not distributed under that name, so the
      # action cannot install anchor-cli 1.1.2. Installing the toolchain
      # manually instead, per https://www.anchor-lang.com/docs/installation.
      - name: Install Solana CLI 3.1.10
        run: |
          sh -c "$(curl -sSfL https://release.anza.xyz/v3.1.10/install)"
          echo "$HOME/.local/share/solana/install/active_release/bin" >> $GITHUB_PATH

      - name: Update Rust toolchain
        run: |
          rustup update stable
          rustup default stable

      - name: Install AVM and Anchor CLI 1.1.2
        run: |
          cargo install --git https://github.com/solana-foundation/anchor avm --force
          avm install 1.1.2
          avm use 1.1.2

      # Anchor 1.x's `anchor test` spawns `surfpool` directly (see the
      # [surfpool] block in anchor/Anchor.toml) instead of
      # solana-test-validator. The install script drops the binary in
      # ~/.local/bin, which isn't on PATH for later steps by default.
      - name: Install surfpool 1.5.0
        run: |
          VERSION=v1.5.0 bash -c "$(curl -sL https://run.surfpool.run/)"
          echo "$HOME/.local/bin" >> $GITHUB_PATH

      - name: Generate default Solana keypair for surfpool's deploy runbook
        run: solana-keygen new --no-bip39-passphrase --force -o ~/.config/solana/id.json

      - name: Set solana target cluster to local
        run: solana config set --url http://localhost:8899 -k ./anchor/tests/fixtures/keys/program-owner.json

      - name: Check solana config
        run: solana config get

      - run: pnpm run anchor build
        shell: bash

      - run: pnpm run anchor test
        shell: bash
```

- [ ] **Step 3: Validate YAML syntax for both workflows**

Run: `python3 -c "import yaml,sys; [yaml.safe_load(open(f)) for f in ['.github/workflows/test-web.yml', '.github/workflows/test-anchor.yml']]; print('ok')"`

Expected: prints `ok`. (This only checks the files parse as valid YAML — it does not execute the workflow. There's no local GitHub Actions runner in this environment, so full CI behavior is confirmed on the next push/PR, not here.)

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/test-web.yml .github/workflows/test-anchor.yml
git commit -m "ci: switch workflows from npm to pnpm"
```

---

### Task 4: Replace `makefile` with `justfile`

**Files:**
- Create: `justfile`
- Delete: `makefile`

**Interfaces:**
- Produces: 16 `just` recipes (`up-build`, `up`, `down`, `down-clean`, `clean`, `clean-image`, `solana-set-dev`, `solana-set-local`, `build`, `test`, `test-skip-deploy`, `deploy`, `deploy-dev`, `airdrop-program-owner`, `airdrop-fee-payer`, `deploy-with-airdrop`) — Task 5 references these exact names when updating `README.md`/`CLAUDE.md`.

Current `makefile`:

```makefile
PROJECT_NAME = "game-token-pool"
PROJECT_DEPLOY_KEY="~/.config/solana/devnet-id.json"

up/build:
	@docker compose \
		-p ${PROJECT_NAME} \
		up --build -w --remove-orphans

up:
	@docker compose \
		-p ${PROJECT_NAME} \
		up -w

down:
	@docker compose \
		-p ${PROJECT_NAME} \
		down && \
		$(MAKE) clean-image

down/clean:
	@$(MAKE) down && \
		$(MAKE) clean && \
		$(MAKE) clean-image

clean:
	@rm -rf ./solana-ledger && \
		rm -rf ./.next

clean-image:
	@docker image prune -f

solana/set/dev:
	@solana config set -ud -k ~/.config/solana/devnet-id.json

solana/set/local:
	@solana config set -ul -k ~/.config/solana/local-id.json

build:
	@cd ./anchor && \
		anchor build

test:
	@cd anchor && \
		anchor test

test/skip-deploy:
	@cd anchor && \
		anchor test --skip-deploy

deploy:
	@$(MAKE) build
	@cd ./anchor && \
		anchor deploy

deploy/dev: 
	@$(MAKE) build
	@cd ./anchor && \
		anchor deploy --provider.cluster devnet --provider.wallet ${PROJECT_DEPLOY_KEY}

airdrop/program-owner:
	@solana airdrop 10 8SFmQipCrfKr9sZQarTD71zxa56z41Qv7LJDwBeEYWQ1

airdrop/fee-payer:
	@solana airdrop 10 FPhqPEd6qKRJNaLYJ2rLimYnSHMrzPxqq1Mwe6RFMZQA

deploy/with-airdrop:
	@$(MAKE) airdrop/program-owner && \
		$(MAKE) airdrop/fee-payer && \
		$(MAKE) deploy
```

Note the `PROJECT_DEPLOY_KEY` quirk being preserved deliberately in Step 1 below: the Make variable is defined with embedded double-quote characters (`PROJECT_DEPLOY_KEY="~/.config/solana/devnet-id.json"`), and those literal quote characters end up in the expanded shell command (`--provider.wallet "~/.config/solana/devnet-id.json"`), which means the shell does **not** tilde-expand it (tilde expansion doesn't happen inside quotes). This looks like an oversight but changing it is out of scope for a tooling migration — the `just` translation reproduces the same literal, non-expanding behavior so `deploy-dev` behaves identically to `deploy/dev` today.

- [ ] **Step 1: Write the justfile**

Create `justfile`:

```just
project_name := "game-token-pool"
# Quoted deliberately: reproduces the original Makefile's literal
# (non-tilde-expanding) behavior for --provider.wallet, since
# PROJECT_DEPLOY_KEY was itself a quoted Make variable.
project_deploy_key := "~/.config/solana/devnet-id.json"

up-build:
    @docker compose \
        -p {{project_name}} \
        up --build -w --remove-orphans

up:
    @docker compose \
        -p {{project_name}} \
        up -w

down:
    @docker compose \
        -p {{project_name}} \
        down && \
        just clean-image

down-clean:
    @just down && \
        just clean && \
        just clean-image

clean:
    @rm -rf ./solana-ledger && \
        rm -rf ./.next

clean-image:
    @docker image prune -f

solana-set-dev:
    @solana config set -ud -k ~/.config/solana/devnet-id.json

solana-set-local:
    @solana config set -ul -k ~/.config/solana/local-id.json

build:
    @cd anchor && \
        anchor build

test:
    @cd anchor && \
        anchor test

test-skip-deploy:
    @cd anchor && \
        anchor test --skip-deploy

deploy:
    @just build
    @cd anchor && \
        anchor deploy

deploy-dev:
    @just build
    @cd anchor && \
        anchor deploy --provider.cluster devnet --provider.wallet "{{project_deploy_key}}"

airdrop-program-owner:
    @solana airdrop 10 8SFmQipCrfKr9sZQarTD71zxa56z41Qv7LJDwBeEYWQ1

airdrop-fee-payer:
    @solana airdrop 10 FPhqPEd6qKRJNaLYJ2rLimYnSHMrzPxqq1Mwe6RFMZQA

deploy-with-airdrop:
    @just airdrop-program-owner && \
        just airdrop-fee-payer && \
        just deploy
```

- [ ] **Step 2: Verify all recipes are registered**

Run: `just --list`

Expected output (order may vary alphabetically, but exactly these 16 names must appear, no others):

```
Available recipes:
    airdrop-fee-payer
    airdrop-program-owner
    build
    clean
    clean-image
    deploy
    deploy-dev
    deploy-with-airdrop
    down
    down-clean
    solana-set-dev
    solana-set-local
    test
    test-skip-deploy
    up
    up-build
```

- [ ] **Step 3: Dry-run the most complex recipe chain to verify command resolution**

Run: `just --dry-run deploy-with-airdrop`

Expected: prints the resolved shell commands for `airdrop-program-owner`, `airdrop-fee-payer`, and `deploy` (which itself resolves `build` then `anchor deploy`) in order, without executing anything (no real airdrop or deploy happens). Confirms the `just <recipe>` cross-references inside recipe bodies resolve correctly.

- [ ] **Step 4: Real-execute the safe, non-destructive `build` recipe**

Run: `just build`

Expected: exits 0, equivalent output to `cd anchor && anchor build` (this recipe has no Docker/network/wallet dependency, safe to actually run).

- [ ] **Step 5: Delete the makefile and commit**

```bash
git rm makefile
git add justfile
git commit -m "build: replace makefile with justfile"
```

---

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

---

### Task 6: Record the decision in `docs/modernization/decisions.md`

**Files:**
- Modify: `docs/modernization/decisions.md`

**Interfaces:** None — this is a documentation-only leaf task.

- [ ] **Step 1: Insert a new `Q7` entry before the `## Sequencing` heading**

The file currently has these top-level sections in order: `Context`, `Q1`–`Q6`, `Bug found during mapping (not a decision, a finding)`, `Sequencing`, `Document map`. Insert the new section immediately before `## Sequencing` (i.e. right after the `---` that follows the "Bug found during mapping" section), matching the existing `Q1`/`Q2` style (`**Answer:**` / `**Decision:**` / `**Reason:**`):

```markdown
## Q7: Why swap npm → pnpm and make → just?

**Answer:** Tooling preference, not a defect fix — both npm and make worked
fine. Executed as a straight swap with no behavior change to the app or
program.

**Decision:**

- **npm → pnpm.** `pnpm-lock.yaml` generated via `pnpm import` from the
  existing `package-lock.json` (not a fresh `pnpm install`) to preserve the
  exact already-resolved dependency versions — consistent with this repo's
  policy of pinning toolchain versions exactly rather than letting a
  migration silently bump transitive deps. `packageManager: "pnpm@9.15.3"`
  pinned exactly for the same reason. `package.json`'s `overrides` moved to
  `pnpm.overrides` (pnpm does not read a root-level `overrides` key).
- **make → just.** One `justfile` at the repo root, flat structure mirroring
  the old `makefile` 1:1 (no `just` modules, no `[group(...)]` tags — 16
  recipes read fine as a flat list). `just` recipe names can't contain `/`,
  so the old slash-style targets (`up/build`, `solana/set/dev`, etc.) were
  renamed with dashes (`up-build`, `solana-set-dev`, etc.). `makefile`
  deleted in the same change — hard cutover, no transition period.

**Reason:** Direct instruction, not a debated architectural trade-off.
Recorded here per this repo's convention of logging the reasoning behind
toolchain changes so a future reader isn't left guessing why the lockfile
strategy or recipe names look the way they do.

---
```

- [ ] **Step 2: Verify the file still parses as valid Markdown structure (headings in order)**

Run: `grep -n "^## " docs/modernization/decisions.md`

Expected: `Q7` appears immediately after the "Bug found during mapping" entry and immediately before `Sequencing`, e.g.:

```
9:## Context
19:## Q1: Does the custodial, no-wallet model stay?
35:## Q2: Is on-chain state live?
47:## Q3: What does "modernize" actually mean here?
83:## Q4: How far on Next.js / React?
102:## Q5: How far on the Anchor program?
134:## Q6: Tailwind 3 → 4 and daisyUI 4 → 5?
149:## Bug found during mapping (not a decision, a finding)
166:## Q7: Why swap npm → pnpm and make → just?
183:## Sequencing
202:## Document map
```

(Exact line numbers will shift slightly based on final wording — what matters is the ordering: Q7 between the bug-finding section and Sequencing.)

- [ ] **Step 3: Commit**

```bash
git add docs/modernization/decisions.md
git commit -m "docs: record npm-to-pnpm and make-to-just decision"
```

---

### Task 7: Final end-to-end verification pass

**Files:** None modified — this task only runs checks across everything landed in Tasks 1–6.

**Interfaces:** Consumes the final state of every file touched above.

- [ ] **Step 1: Full pnpm verification**

Run: `pnpm install --frozen-lockfile && pnpm run typecheck && pnpm run lint && pnpm run build && pnpm test && pnpm run anchor-build`

Expected: all exit 0.

- [ ] **Step 2: Full just verification**

Run: `just --list`

Expected: the same 16 recipes listed in Task 4, Step 2.

- [ ] **Step 3: Docker build verification**

Run: `docker compose build client`

Expected: succeeds (should be fast now — layers cached from Task 2).

- [ ] **Step 4: Repo-wide sweep for stray references**

Run: `grep -rIn "npm \|npm ci\|npm run\| make " --include="*.md" --include="*.yml" --include="*.yaml" --include="Dockerfile*" . | grep -v -e node_modules -e "\.git/" -e /target/ -e docs/modernization -e .loop-logs -e docs/superpowers/specs -e docs/superpowers/plans`

Expected: no output. (Historical docs under `docs/modernization/`, `.loop-logs/`, and the spec/plan files for *this* migration are excluded on purpose — they intentionally describe the pre-migration state or reference commands as history/plan-of-record, not current instructions.)

- [ ] **Step 5: Confirm git history is linear**

Run: `git log --oneline -8`

Expected: 6 new commits from Tasks 1–6 (lockfile/package.json, Dockerfile, CI, justfile, docs, decision record), each a plain commit — no merge commits.

---

## Acceptance Checklist (from spec)

- [x] `pnpm-lock.yaml` exists, `package-lock.json` deleted. — Task 1
- [x] `package.json` has `packageManager` and `pnpm.overrides`. — Task 1
- [x] `Dockerfile.client` uses pnpm, no npm block remains. — Task 2
- [x] Both CI workflows use pnpm. — Task 3
- [x] `justfile` exists with all 16 recipes, `makefile` deleted. — Task 4
- [x] `README.md` and `CLAUDE.md` reference only pnpm/just. — Task 5
- [x] `docs/modernization/decisions.md` has the new entry. — Task 6
- [x] All verification steps pass. — Task 7
