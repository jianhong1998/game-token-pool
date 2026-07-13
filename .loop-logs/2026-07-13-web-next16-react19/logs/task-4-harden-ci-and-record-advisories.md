# Task 4 Log: Harden CI and record the accepted residual advisories

## Task Context

### Plan Section

### Task 4: Harden CI and record the accepted residual advisories

CI currently only runs `npm run build` — it never typechecks or lints, which is how the codebase drifted. Fix that, and write down the vulnerabilities we are knowingly accepting so the next person doesn't re-litigate them.

**Files:**
- Modify: `.github/workflows/test-web.yml`
- Create: `docs/modernization/accepted-advisories.md`

**Interfaces:**
- Consumes: `npm run lint` and `npm run typecheck` from Task 1.

- [ ] **Step 1: Add typecheck and lint to the web CI workflow**

In `.github/workflows/test-web.yml`, bump Node to 22 and add the two gates before the build step:

```yaml
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

- [ ] **Step 2: Capture the residual audit state**

Run:
```bash
npm audit
```

- [ ] **Step 3: Record the accepted advisories**

Create `docs/modernization/accepted-advisories.md`, pasting the *actual* output from Step 2 into the table:

```markdown
# Accepted Residual Advisories

Reviewed 2026-07-13. See `docs/modernization/decisions.md` Q3a.

These come from the Solana dependency tree and have **no fixed version at any
release**. `@coral-xyz/anchor` (and `@anchor-lang/core@1.1.2`) both depend on
`@solana/web3.js` v1; `@solana/spl-token` depends on `bigint-buffer`, which has
never been patched.

Escaping them requires dropping the Anchor TS client for `@solana/kit` and
hand-encoding every instruction — a full rewrite of the server actions, to fix
DoS/overflow bugs in code that only ever parses responses from our own RPC node.
Not worth it. Re-evaluate if Anchor ships a `@solana/kit` client.

| Package | Severity | Reachable from production? | Why accepted |
|---|---|---|---|
| `bigint-buffer` | high | Server-side only, decodes our own RPC responses | No patched version exists |
| `ws` / `rpc-websockets` | high | Only via websocket subscriptions (we do not use them) | Pinned by `@solana/web3.js` v1 |
| `bn.js` | moderate | Server-side only | Pinned by `@solana/web3.js` v1 |

**Do not run `npm audit fix --force`.** It will attempt to downgrade or swap the
Solana packages and will break the build.

**Gate:** `next` must always report CLEAN. If it does not, that is a real
vulnerability and must be fixed immediately.
```

- [ ] **Step 4: Run the full manual E2E checklist**

There are no automated web tests, so this is the real verification. Start a local validator and the app, then walk every flow. **All of these must pass.**

```bash
make up/build
```

Then in the browser at `http://localhost:3000`:

- [ ] `/admin` — log in with `ADMIN_PASSWORD`; initialise a pool
- [ ] `/admin` — add a user; confirm the user appears with their token balance
- [ ] `/admin` — deposit to a user; confirm the balance increases
- [ ] `/` — log in as that username; confirm redirect to `/<username>`
- [ ] `/<username>` — confirm the dashboard renders the balance and other users
- [ ] `/<username>` — transfer tokens to another user; confirm both balances change
- [ ] `/game` — create a game; confirm it appears in the game list
- [ ] `/game/<gameName>` — join the game; transfer tokens into the game
- [ ] `/<username>/dealer` — take tokens from the game back to a player
- [ ] `/game/<gameName>` — quit the game; then delete the game
- [ ] `/<username>` — end game; confirm redirect back to `/`

Pay particular attention to the two redirects changed in Task 2: logging in from `/` must land on `/<username>`, and hitting `/game` while logged out must bounce to `/`. Neither may flicker or loop.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/test-web.yml docs/modernization/accepted-advisories.md
git commit -m "ci(web): add typecheck and lint gates; document accepted advisories

CI was build-only, which is how the toolchain drifted unnoticed."
```

**NOTE (pipeline scope override, applied by the calling orchestrator, not a deviation by this agent):** This agent's assignment is Steps 1, 2, 3, and 5 only. **Step 4 (the manual E2E checklist against `make up/build`) is deliberately SKIPPED** — it is handled separately by this pipeline's own Stage 2 verification step (Playwright-driven, runs automatically after this task merges). No docker boot, no `make up/build`, no browser verification was attempted in this task by design.

### Acceptance Criteria
- AC-1: `.github/workflows/test-web.yml` runs checkout -> setup-node(22, npm cache) -> npm ci -> typecheck -> lint -> build.
- AC-2: `docs/modernization/accepted-advisories.md` created, accurately reflecting the actual `npm audit` output captured in this worktree (not the plan's illustrative subset), same structure/tone/warnings as the plan's template.
- AC-3: `npm run typecheck && npm run lint && npm run build` all pass, unaffected by the CI/doc-only changes.
- AC-4: `anchor/`, `@coral-xyz/anchor`, `@solana/web3.js`, `@solana/spl-token`, Tailwind, daisyUI, TypeScript version untouched.
- AC-5: No `npm audit fix --force` run.
- AC-6: Commit made with the specified message.

## Attempt 1 — 2026-07-13T02:59:39Z

### Implementation Plan
- Step 1: bump `.github/workflows/test-web.yml` node-version 20 -> 22, add `cache: 'npm'`, insert Typecheck + Lint steps before Build.
- Step 2: run `npm ci` (node_modules was absent in the worktree) then `npm audit` to capture the real residual advisory state.
- Step 3: create `docs/modernization/accepted-advisories.md`, using `npm ls <pkg> --all` and `npm audit --json` to trace each flagged package to its actual parent (production Solana/Anchor tree vs. dev-only ESLint/Jest/Tailwind tooling) rather than copying the plan's illustrative 3-row table verbatim.
- Step 5 (plan's numbering): re-verify typecheck+lint+build all pass, confirm `next` still CLEAN, confirm scope constraints (anchor/ untouched, no restricted package touched, no `npm audit fix --force` run), then commit.
- Deliberately skipped plan's Step 4 (manual E2E checklist / `make up/build`) per this agent's explicit SCOPE OVERRIDE — handled by pipeline Stage 2.

### Files Changed
- modified `.github/workflows/test-web.yml` — node-version 20 -> 22, added `cache: 'npm'`, inserted `Typecheck` (`npm run typecheck`) and `Lint` (`npm run lint`) steps before `Build project`
- created `docs/modernization/accepted-advisories.md` — records the actual `npm audit` output (20 vulnerabilities: 1 low, 9 moderate, 10 high across 13 packages; `next` CLEAN), split into Group 1 (Solana/Anchor dependency tree — `bigint-buffer`, `@solana/buffer-layout-utils`, `@solana/spl-token`, `spl-token-bankrun`, `@solana-developers/helpers`, `bn.js`, `ws`, `rpc-websockets`, `jayson`, `uuid`, `@babel/runtime` — no usable fix without touching restricted packages or dropping the Anchor TS client) and Group 2 (dev-only ESLint/Jest/Tailwind tooling — `glob`, `minimatch`, `brace-expansion`, `picomatch`, `js-yaml`, `yaml`, `@babel/core`, `@babel/helpers` — fix exists via `npm audit fix` but hits `ERESOLVE` peer conflicts against the Task 1/3-pinned `eslint-config-next@16.2.10` toolchain, verified via `npm audit fix --dry-run`, out of this task's scope)

### New Tests
(none — no web test suite exists; this task is CI config + documentation)

### Key Decisions
- **Ran `npm ci` before auditing/verifying:** the worktree had no `node_modules` (this task's setup only carried the git history, not an installed tree). `npm ci` was required to run `npm ls`, `npm run typecheck`, `npm run lint`, and `npm run build` at all. This is environment setup, not a scope violation — no `package.json`/`package-lock.json` edits resulted (confirmed via `git status --short`, `git diff` shows no unstaged changes to either file after `npm ci`).
- **Diverged from the plan's illustrative Group-1 table (bigint-buffer/ws/bn.js only):** the actual audit in this worktree (post Tasks 1-3) surfaces 13 flagged packages, not 3. Traced each with `npm ls <pkg> --all` and cross-checked `@solana/web3.js@1.98.0`'s own `package.json` (confirmed it directly pins `bigint-buffer@^1.1.5`, `bn.js@^5.2.1`, `jayson@^4.1.1`, `rpc-websockets@^9.0.2`, `@babel/runtime@^7.25.0`) to ground the "no fixed version while the Anchor TS client is in use" claim in verified fact rather than restating the plan's now-stale placeholder table. Per the task's SCOPE OVERRIDE, this was the explicitly requested behavior, not a deviation.
- **Added a Group 2 (dev-tooling) table not in the plan's template:** `npm audit`'s `fixAvailable: true` flag is technically set for several packages (including some in Group 1, e.g. `bn.js`, `ws`, `@solana/web3.js` itself), which could read as "just run `npm audit fix`". Ran `npm audit fix --dry-run` (no changes applied — confirmed via `git status --short` before/after) to check; it immediately surfaces an `ERESOLVE` peer conflict in the `eslint-config-next` toolchain. Documented this explicitly so the next reader doesn't assume `fixAvailable: true` means "safe to fix" and doesn't re-litigate it.
- **Did not run `npm audit fix` (with or without `--force`) for real** — plan explicitly forbids `--force`; a plain `npm audit fix` was evaluated only via `--dry-run` (no repo state changed) and documented as deferred, not executed, since untangling the ESLint/Jest/Tailwind peer graph is out of scope for a CI-hardening + documentation task.

### Lint Output
PASS
(0 errors, 0 warnings)

### Test Output
PASS
- `npm run typecheck`: exit 0, no errors
- `npm run lint`: exit 0, no errors/warnings
- `npm run build`: succeeded, all 6 routes compiled/generated (Turbopack)
- `npm audit --json | python3 -c "...vulnerabilities['next']..."`: `next: CLEAN`
- `git diff main --stat -- anchor/`: empty
- `git status --short` before commit: only `.github/workflows/test-web.yml` (M) and `docs/modernization/accepted-advisories.md` (??) — no restricted files (package.json, anchor/, Tailwind/daisyUI/TypeScript config) touched
- `npm audit fix --dry-run`: verified no state change (git status identical before/after)

### Commit
`4da6714`

### Outcome: success
