# Task 4 Log: Replace `makefile` with `justfile`

## Task Context

### Plan Section

### Task 4: Replace `makefile` with `justfile`

**Files:**
- Create: `justfile`
- Delete: `makefile`

Note: `PROJECT_DEPLOY_KEY` quirk preserved deliberately — the original Makefile embeds literal double-quote characters in the variable, which end up in the expanded shell command, so the shell does NOT tilde-expand it. This looks like an oversight but is out of scope to fix — reproduce the same literal, non-expanding behavior.

- [ ] Step 1: Create `justfile` with this exact content:

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

(Use real tab or space indentation matching `just`'s syntax requirements — recipe bodies must be indented consistently.)

- [ ] Step 2: Verify all recipes registered: `just --list`. Expected exactly these 16 names (order may vary): airdrop-fee-payer, airdrop-program-owner, build, clean, clean-image, deploy, deploy-dev, deploy-with-airdrop, down, down-clean, solana-set-dev, solana-set-local, test, test-skip-deploy, up, up-build.

- [ ] Step 3: Dry-run the most complex chain: `just --dry-run deploy-with-airdrop`. Expected: prints resolved shell commands for airdrop-program-owner, airdrop-fee-payer, and deploy (which resolves build then anchor deploy) in order, without executing anything.

- [ ] Step 4: Real-execute the safe, non-destructive `build` recipe: `just build`. Expected: exits 0, equivalent to `cd anchor && anchor build`.

- [ ] Step 5: Delete makefile and commit:
```bash
git rm makefile
git add justfile
git commit -m "build: replace makefile with justfile"
```

### Acceptance Criteria
- AC-1: `just --list` shows exactly 16 recipes: airdrop-fee-payer, airdrop-program-owner, build, clean, clean-image, deploy, deploy-dev, deploy-with-airdrop, down, down-clean, solana-set-dev, solana-set-local, test, test-skip-deploy, up, up-build.
- AC-2: `just --dry-run deploy-with-airdrop` prints resolved shell commands for airdrop-program-owner, airdrop-fee-payer, and deploy (which resolves build then anchor deploy) in order, without executing anything.
- AC-3: `just build` exits 0 and is equivalent to `cd anchor && anchor build`.
- AC-4: `makefile` deleted and `justfile` created, committed as `build: replace makefile with justfile`.

---

## Attempt 1 — 2026-07-20T03:16:31Z

### Implementation Plan
- Create worktree `.worktrees/task-4-replace-makefile-with-justfile` off branch `worktree/task-4-replace-makefile-with-justfile`
- Write `justfile` with the exact content specified in the plan (16 recipes, `project_name`/`project_deploy_key` variables, quoted `--provider.wallet` preserving the original Makefile's non-tilde-expanding quirk)
- Run `just --list`, `just --dry-run deploy-with-airdrop`, `just build` as the verification gate
- Delete `makefile`, stage `justfile`, commit

### Files Changed
- created `justfile` — just recipes mirroring the original makefile's 16 targets (slash-named targets renamed to hyphen-named per just convention, e.g. `up/build` → `up-build`)
- deleted `makefile` — replaced by `justfile`

### New Tests
(none — this is a tooling-config swap, not application code; plan's own Step 2/3/4 verification commands served as the acceptance gate per task instructions)

### Key Decisions
- Preserved the literal, non-tilde-expanding `project_deploy_key` quoting exactly as instructed — the original Makefile's `PROJECT_DEPLOY_KEY="~/.config/solana/devnet-id.json"` embeds literal double-quotes in the expanded shell command, and `deploy-dev`'s `--provider.wallet "{{project_deploy_key}}"` reproduces that same non-expansion rather than "fixing" it, since the plan explicitly calls this out as intentionally out of scope to fix.
- Recipe bodies invoke `just <recipe>` as literal shell commands (mirroring the original `$(MAKE) <target>` recursive-make pattern) rather than using just's native dependency syntax (`recipe: dep1 dep2`) — this matches the plan's exact specified content and preserves the original ordering/chaining semantics (e.g. `down` running `clean-image` only after `docker compose down` succeeds via `&&`).
- `just --dry-run deploy-with-airdrop` printed the single resolved line `just airdrop-program-owner && just airdrop-fee-payer && just deploy` rather than recursively expanding into each sub-recipe's own shell commands — this is correct `just` behavior since the sub-invocations are shell-level `just` calls (not dependency-graph entries), so dry-run only resolves one level; nothing was executed (no docker/solana calls ran), satisfying the "without executing anything" requirement.

### Lint Output
PASS (no linter applies to justfile; `just --list` and `just --dry-run` both parsed the file without syntax errors)

### Test Output
PASS
- `just --list` → exactly the 16 expected recipe names: airdrop-fee-payer, airdrop-program-owner, build, clean, clean-image, deploy, deploy-dev, deploy-with-airdrop, down, down-clean, solana-set-dev, solana-set-local, test, test-skip-deploy, up, up-build
- `just --dry-run deploy-with-airdrop` → printed `just airdrop-program-owner && just airdrop-fee-payer && just deploy` without executing anything
- `just build` → ran `cd anchor && anchor build`, compiled successfully, exit 0

### Commit
`ca61030`

### Outcome: success
