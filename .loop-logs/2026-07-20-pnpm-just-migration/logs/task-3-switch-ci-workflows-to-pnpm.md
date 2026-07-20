# Task 3 Log: Switch CI workflows from npm to pnpm

## Task Context

### Plan Section
### Task 3: Switch CI workflows from npm to pnpm

**Files:**
- Modify: `.github/workflows/test-web.yml`
- Modify: `.github/workflows/test-anchor.yml`

- [ ] Step 1: Rewrite `.github/workflows/test-web.yml` to this exact content:

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

- [ ] Step 2: Rewrite `.github/workflows/test-anchor.yml` — only the "Install pnpm"/"Install Node.js"/"Install dependencies" steps and the two final `run:` lines change; every Solana/Anchor/surfpool step and its comments stay byte-identical to the current file. Read the current file first (`.github/workflows/test-anchor.yml`) to copy the untouched steps verbatim, then produce this exact structure:

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

- [ ] Step 3: Validate YAML syntax: `python3 -c "import yaml,sys; [yaml.safe_load(open(f)) for f in ['.github/workflows/test-web.yml', '.github/workflows/test-anchor.yml']]; print('ok')"`. Expected: prints `ok`.

- [ ] Step 4: Commit:
```bash
git add .github/workflows/test-web.yml .github/workflows/test-anchor.yml
git commit -m "ci: switch workflows from npm to pnpm"
```

### Acceptance Criteria
- AC-1: `.github/workflows/test-web.yml` matches the exact content specified in Step 1
- AC-2: `.github/workflows/test-anchor.yml` matches the exact structure specified in Step 2, with all Solana/Anchor/surfpool steps and comments byte-identical to the pre-existing file
- AC-3: `python3 -c "import yaml,sys; [yaml.safe_load(open(f)) for f in ['.github/workflows/test-web.yml', '.github/workflows/test-anchor.yml']]; print('ok')"` prints `ok`

---

## Attempt 1 — 2026-07-20T03:14:19Z

### Implementation Plan
- Rewrite `.github/workflows/test-web.yml` to the exact content specified in Step 1
- Rewrite `.github/workflows/test-anchor.yml`, copying the current file's Solana/Anchor/surfpool steps and comments byte-identical, changing only the pnpm-related steps and the two final `run:` lines
- Validate YAML syntax with the plan's `python3 -c "import yaml..."` command
- Diff against original to confirm only intended lines changed
- Commit

### Files Changed
- modified `.github/workflows/test-web.yml` — switched Install/Typecheck/Lint/Build steps from npm to pnpm, added pnpm/action-setup step
- modified `.github/workflows/test-anchor.yml` — switched Install steps and final anchor build/test run lines from npm to pnpm, added pnpm/action-setup step; all Solana/Anchor/surfpool steps and comments left byte-identical

### New Tests
(none — no application test applies; YAML-parse command is the verification gate per task instructions)

### Key Decisions
- Verified via `git diff` that only the npm→pnpm mechanics changed in `test-anchor.yml` (11 lines touched: pnpm install step insertion, cache key, install command, and the two final run lines) — every Solana/Anchor/surfpool step and comment remained byte-identical to the pre-existing file, satisfying AC-2

### Lint Output
n/a — no lint step applies to this task (YAML-only change)

### Test Output
PASS — `python3 -c "import yaml,sys; [yaml.safe_load(open(f)) for f in ['.github/workflows/test-web.yml', '.github/workflows/test-anchor.yml']]; print('ok')"` printed `ok`

### Commit
`3b02d74`

### Outcome: success
