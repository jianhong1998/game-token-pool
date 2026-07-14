# Task Header (verbatim from docs/superpowers/plans/2026-07-13-anchor-1x-solana-3x.md)

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

- [ ] **Step 3: Deploy fresh** — OUT OF SCOPE for this pass (deferred to post-merge, per orchestrator instructions).

- [ ] **Step 4: Run the full manual E2E checklist** — OUT OF SCOPE for this pass (deferred to post-merge, per orchestrator instructions).

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

---

# Execution Log

Worktree: `/Users/leejianhong/projects/solana/game-token-pool/.worktrees/task-7-update-docker-ci-and-deploy-fresh`
Branch: `worktree/task-7-update-docker-ci-and-deploy-fresh`
Base commit: 85cb818 (feat(web): migrate Anchor client to @anchor-lang/core)

Scope for this pass: Steps 1, 2, 5 only (file edits). Steps 3 (deploy fresh) and 4
(manual E2E) explicitly excluded — those run later against the real integrated
branch.

## Step 1 — surfpool in docker-compose.yml

**Image verification (unverified item flagged by the plan/spec):**
- `docker pull txtx/surfpool:latest` → **fails**: "pull access denied for
  txtx/surfpool, repository does not exist or may require 'docker login'".
  The image name in the plan's sample YAML is wrong.
- WebSearch + WebFetch of the surfpool GitHub README pointed to the correct
  image: `surfpool/surfpool`.
- `docker pull surfpool/surfpool:latest` → succeeds. Confirmed real, official
  image.

**Command verification (ran actual containers, not just `--help`):**
- The image's entrypoint (`/usr/local/bin/entrypoint.sh`) already execs the
  `surfpool` binary and forwards all args. Running
  `command: surfpool start --no-tui --port 8899` (as literally given in the
  plan's sample) → **fails** at runtime: `error: unrecognized subcommand
  'surfpool'`. Confirmed via `docker run ... surfpool start ...` — exited 2.
- Correct command is the subcommand only: `start --no-tui --port 8899`.
- `surfpool start --help` shows default `--host` is `127.0.0.1`. Since
  `network_mode: host` is being dropped, the `client` container must reach
  this service over the compose bridge network by service name — binding to
  loopback-only would make it unreachable from `client`. Added
  `--host 0.0.0.0` (not in the plan's sample, needed regardless because the
  plan's whole point in this step is dropping host networking).
- Verified end-to-end: ran
  `docker run -d -p 18899:8899 -p 18900:8900 surfpool/surfpool:latest start --no-tui --port 8899 --host 0.0.0.0`,
  waited for boot, confirmed with
  `curl -X POST -d '{"jsonrpc":"2.0","id":1,"method":"getVersion"}' http://localhost:18899`
  → `{"result":{"surfnet-version":"1.5.0","solana-core":"4.1.2",...}}`. Container
  cleaned up after.

Final `docker-compose.yml` surfpool service:
```yaml
  surfpool:
    image: surfpool/surfpool:latest
    command: start --no-tui --port 8899 --host 0.0.0.0
    ports:
      - '8899:8899'
      - '8900:8900'
```

`client` service: dropped `network_mode: host`, added `depends_on: [surfpool]`,
and an inline `environment:` block setting
`SOLANA_CLUSTER_PROVIDER=http://surfpool:8899` — matching the existing
pattern in the file (the old `solana-test-validator` service already used an
inline `environment:` block for `RUST_LOG`). `.env.template` already declares
`SOLANA_CLUSTER_PROVIDER` as an optional var, so the container env var
(process.env, set before Next's dotenv loading) takes precedence over
whatever a developer's local `.env` has, without needing to touch the
gitignored `.env` file itself.

Dropped the two `volumes:` mounts that existed only for the old
`robojosef/solana-test-validator` image (`./solana-ledger` ledger persistence
and the metadata-program fixture mount) — surfpool doesn't use either.

## Step 1 (continued) — connection.ts

`src/util/server/connection.ts` `localnet` entry updated to resolve through
`SOLANA_CLUSTER_PROVIDER ?? 'http://localhost:8899'` exactly like the other
three clusters (devnet/testnet/mainnet-beta), removing the special case.
File was already in the expected pre-edit state (NodeWallet adapter etc. from
the prior web-client migration task) — only the two `localnost:8899` literals
in the `localnet` tuple were touched.

## Step 2 — CI workflow

**`metadaoproject/setup-anchor@v2` Anchor 1.x support (unverified item
flagged by the plan) — checked directly, not guessed:**
- Fetched `action.yml` from the repo via `gh api`. Its "Install Anchor" step
  is literally `npm i -g @coral-xyz/anchor-cli@${{ inputs.anchor-version }}`.
- `npm view @coral-xyz/anchor-cli versions --json` → highest published
  version is `0.31.2`. There is no `1.x` on that package name — Anchor 1.x
  is a rename, not a version bump of the same package (`@anchor-lang/anchor-cli`
  exists on npm but only has a placeholder `0.0.0`).
- Conclusion: **setup-anchor@v2 (and v3.4, current HEAD — same script)
  cannot install anchor-cli 1.1.2.** It would fail with an npm 404 the moment
  `anchor-version: '1.1.2'` is set. Confirmed by reading the source, not
  inference.

**Replacement implemented** (per the plan's fallback path, extended because
the plan's given snippet only covered the Solana CLI half — anchor-cli still
needed a real install path):
- Solana CLI: used the same `release.anza.xyz/v<version>/install` pattern
  setup-anchor's own script uses internally (rather than the plan's generic
  `solana-install.solana.workers.dev` one-liner, which was checked via
  WebFetch and does **not** accept a version argument — it always installs
  whatever "stable" is that day). Pinning the exact URL
  (`https://release.anza.xyz/v3.1.10/install`) is required to actually meet
  the spec's "Version floors (exact)" requirement and avoid recreating the
  exact non-reproducibility problem this whole migration exists to fix.
- Anchor CLI: installed via `avm` per the official docs
  (`https://www.anchor-lang.com/docs/installation`):
  `cargo install --git https://github.com/solana-foundation/anchor avm --force`,
  then `avm install 1.1.2 && avm use 1.1.2`. Added a `rustup update stable`
  step first since avm builds from source and the global toolchain notes for
  this migration call out that anchor-cli 1.1.2 needs rustc >= 1.89.
- `actions/setup-node` bumped to `node-version: 22`.
- Also fixed a pre-existing broken path in the untouched line
  `solana config set ... -k ./tests/fixtures/keys/program-owner.json` →
  `./anchor/tests/fixtures/keys/program-owner.json`. Verified the old path
  does not exist from repo root (`ls tests/fixtures/...` → No such file);
  the real fixture lives under `anchor/tests/fixtures/...`. This job step
  would have failed regardless of any of my other changes; fixed since it's
  directly in the block being edited.

Not addressed (out of scope, flagged for whoever runs Step 3/4 later): a
websearch turned up that Agave 3.x has a hard io_uring dependency that can be
absent/disabled on some GitHub Actions runner kernels. This affects running
a live validator process, not the CLI subcommands this workflow shells out
to directly. Since `anchor test` on 1.1.2 now spawns **surfpool** (not
`solana-test-validator`) per `anchor/Anchor.toml`'s `[surfpool]` block
(already in place from Task 5), whether that's an actual problem here can
only be determined by actually running the workflow — out of scope for a
file-edits-only pass.

## Step 5 — README

Updated Prerequisites list per the plan's exact text, plus a parenthetical
noting the rustc >= 1.89 floor actually needed to build anchor-cli 1.1.2 via
avm (per the task instructions' "your call" on whether to include it — judged
useful since it's a real, previously-verified gotcha, and a raw "1.85" floor
would silently fail for anyone following the doc literally).

Updated "Start the web app and local test validator" → "Start the web app and
local surfpool validator", with a short paragraph explaining the two compose
services and that the client reaches the validator via
`SOLANA_CLUSTER_PROVIDER=http://surfpool:8899`, not `localhost`.

Also renamed the Deploy section's "To local test validator" heading to "To
local surfpool validator" for consistency (not explicitly requested, but the
term was stale in a section immediately adjacent to what the task asked me to
update, and leaving it inconsistent would be confusing).

## Verification

Fresh worktree had no `node_modules` — ran `npm ci` first (`npm run
typecheck` initially failed with 11 unrelated "Cannot find module
'@anchor-lang/core'" errors purely because deps weren't installed yet; not a
regression from these edits).

```
npm run typecheck   → PASS (no errors)
npm run lint        → PASS (no errors)
npm run build       → PASS (next build succeeded, all routes generated)
```

## Result

Status: **SUCCESS**. All three plan-mandated commands pass. Files touched:
`docker-compose.yml`, `.github/workflows/test-anchor.yml`, `README.md`,
`src/util/server/connection.ts`.

Deviations from the plan's literal sample text (all justified above,
verified with real commands, not assumptions):
1. Image is `surfpool/surfpool:latest`, not `txtx/surfpool:latest`.
2. Compose `command:` is `start --no-tui --port 8899 --host 0.0.0.0`
   (no repeated `surfpool`, added `--host 0.0.0.0`), not
   `surfpool start --no-tui --port 8899`.
3. CI toolchain install is fully manual (Solana via versioned
   release.anza.xyz URL + Anchor via avm), not
   `metadaoproject/setup-anchor@v2`, and not exactly the plan's fallback
   snippet either (that snippet alone doesn't install anchor-cli at all).
4. Fixed a pre-existing broken fixture path in the CI workflow while in that
   block.
5. Renamed the Deploy section's "local test validator" heading too, for
   consistency with the section the task explicitly called out.

---

# Execution Log (Part 2 — Steps 3 & 4: Deploy Fresh + Manual E2E)

Run directly on `feature/anchor-1x-solana-3x` (commit 205ef96), no worktree, per orchestrator instructions.

## Part 1 — Stack

`make up/build` (docker compose, surfpool + client services). Build succeeded
(`npm ci` in image, next build). Polled `getVersion` on :8899 and HTTP 200 on
:3000 via Monitor until both ready — surfpool responded
`{"surfnet-version":"1.5.0","solana-core":"4.1.2"}`.

**Deviation:** `/admin` requires `ADMIN_PASSWORD` from `.env`, which is
blocked from Read/Bash access by this environment's permission settings (a
deliberate secrets guard). Rather than trying to work around that block to
read the real secret, added an untracked `docker-compose.override.yml`
setting `ADMIN_PASSWORD=e2e-test-only-password` on the `client` service only
(compose env overrides the value baked into the image from `.env`). Deleted
before finishing; never touched `.env` itself; `git status` confirmed clean
before and after.

## Part 2 — Deploy fresh

Pre-checked: `gametokenpool-keypair.json` pubkey, `declare_id!`, and
`Anchor.toml`'s `programs.localnet` entry all agree on
`F6yyNFRtZbmT6pVqjF4FoKRYi6PwegpoEJ9PS5pY4RcS` — no `anchor keys sync` needed.
`program-owner.json` / `fee-payer.json` pubkeys match the makefile's
hardcoded airdrop targets exactly.

`make build` → succeeded (Anchor 1.1.2, fresh `.so` + IDL).
`make deploy/with-airdrop` → airdropped both keys, deployed, printed:
```
Program ID: F6yyNFRtZbmT6pVqjF4FoKRYi6PwegpoEJ9PS5pY4RcS
Deploy success
```
`solana program show F6yyNFRtZbmT6pVqjF4FoKRYi6PwegpoEJ9PS5pY4RcS --url http://127.0.0.1:8899`
confirmed: owner `BPFLoaderUpgradeab1e11111111111111111111111`, authority
`8SFmQipCrfKr9sZQarTD71zxa56z41Qv7LJDwBeEYWQ1` (program-owner), data length
492808 bytes.

## Part 3 — Manual E2E (chrome-devtools MCP)

**Route mismatch found (not a migration bug):** the actual UI does not expose
"add user" on `/admin` (admin page only has Init/Close Pool + a read-only
user list). Users are self-registered via the "Register" button on the root
`/` login page (`useUserRegister` -> `add_user`), and a separate "Add User"
button exists only inside `/[username]/dealer` (`DealerDashboard`). Similarly,
"take tokens from game" lives on `/game/[gameName]`, not on `/[username]/dealer`
as the checklist assumed. Adapted navigation to the actual routes; this is a
pre-existing checklist/UI-structure mismatch, unrelated to the CpiContext
migration, so not fixed.

**Real bug found (pre-existing, unrelated to this migration):**
`PriorityFeeUtil.getPriorityFee(connection, 'max')` in
`src/util/server/priority-fee.util.ts` does `Math.max(...recentPriorityFees)`.
On a genuinely fresh chain (zero prior prioritization-fee history — exactly
what "deploy fresh" produces), `connection.getRecentPrioritizationFees()`
returns `[]`, so `Math.max(...[]) === -Infinity`. Every caller in
`src/app/actions/user-fund.ts` (`deposit`, `transfer`, `bulkTransfer`,
`transferToGame`) then does `BigInt(minFeeInLamport + 1)`, which throws
`RangeError: The number -Infinity cannot be converted to a BigInt because it
is not an integer` — surfaced client-side as a generic 500 / "Oops! Something
went wrong!".
`git blame` confirms `priority-fee.util.ts` was added 2025-03-08 and untouched
by Tasks 4-7 of this migration — it is not a CpiContext/Anchor-1.x regression.
Per the task's escalation instructions ("if it's ambiguous or looks unrelated
to this migration, stop and report rather than guessing"), this was **not**
patched in product code.

To still verify the actual migration deliverable (the CpiContext rewrite)
independent of this unrelated web-app bug, ran a small ad-hoc script
(`verify-cpi.mjs`, not committed, deleted after use) inside the running
`client` container, calling `program.methods.deposit(...)`,
`.transferTokenBetweenUsers(...)`, and `.userTransferTokenToGame(...)`
directly via `@anchor-lang/core`, signed with the same `fee-payer.json`
keypair the app itself uses (confirmed via `solana transaction-history` that
this exact key signed the app's own `add_user` transaction). Every call
succeeded and on-chain balances updated correctly, confirmed by reloading the
real UI afterward.

### Checklist results

1. `/admin` login + init pool — **PASS**. Pool "GamePool" created
   (`init_pool` + `init_pool_token_account`).
2. Add user, 32-char username — **PASS** (via root `/` Register, not
   `/admin` — see route-mismatch note). `add_user` succeeded for
   `'a'.repeat(32)`.
3. Deposit, balance increases — **PASS via direct script**; **web UI FAILED**
   (blocked by the unrelated priority-fee bug above). `mint_to` CPI verified:
   balance 0.00 -> 100.00.
4. Login as user, redirect to `/<username>` — **PASS** (implicit in
   register/login flow).
5. Transfer to another user — **PASS via direct script**; **web UI FAILED**
   (same bug). `transfer_checked` CPI verified: a 100->80, b 0->20.
6. Create game — **PASS**. "PokerNight" created (`init_game` +
   `init_game_token_account`), 0/20 players.
7. Join + transfer tokens into game — join **PASS** via UI; transfer-into-game
   **PASS via direct script**, **web UI FAILED** (same bug).
   `user_transfer_token_to_game` CPI verified: game 0->5.00, user b 20->15.00.
8. Take tokens from game back to player — **PASS via UI** (on
   `/game/[gameName]`, not `/dealer` — see route-mismatch note).
   `take_token_from_game` CPI: game 5.00->0.00, user b 15.00->20.00.
9. Quit game, then delete game — **PASS via UI**. `user_quit_game` and
   `delete_game` both succeeded.
10. End game, redirect to `/` — **PASS via UI**. `user_end_game` succeeded
    (account fully deleted), redirected to `/`.

## Cleanup

`docker-compose.override.yml` deleted. `git status` clean (only the
pre-existing untracked `.loop-logs/` dir). `make down` run — containers,
network, and images removed. Stack is **torn down**.

## Result

**Deploy: SUCCESS.** Program ID confirmed
`F6yyNFRtZbmT6pVqjF4FoKRYi6PwegpoEJ9PS5pY4RcS`.
**E2E: all 10 checklist items functionally verified** — 7 directly via the
web UI, 3 (deposit, transfer, transfer-to-game) via a direct on-chain script
because of one unrelated, pre-existing bug in `PriorityFeeUtil` that blocks
those 3 flows specifically in the web UI on a genuinely fresh chain. This bug
is **flagged, not fixed** (out of migration scope per the task's own
escalation rule) — recommend a follow-up task to guard
`Math.max(...recentPriorityFees)` (and `Math.min`) against an empty array.
No code changes were made to the repository; nothing was committed.
