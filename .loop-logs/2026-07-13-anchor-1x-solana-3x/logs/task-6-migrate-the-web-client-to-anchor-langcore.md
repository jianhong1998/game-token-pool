# Task 6: Migrate the web client to `@anchor-lang/core`

## Task Header (verbatim from plan)

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

If `NodeWallet` is **not** exported from `@anchor-lang/core`, do not go hunting for another deep path — that is what got us here. `NodeWallet` is a trivial adapter; define it locally in `src/util/server/connection.ts` instead (see plan for the class body).

- [ ] **Step 4: Remove `@coral-xyz/anchor` and confirm nothing still imports it**

```bash
npm uninstall @coral-xyz/anchor
grep -rn "@coral-xyz/anchor" src/ anchor/src/ anchor/tests/ package.json
```
Expected: `grep` produces **no output**.

- [ ] **Step 5: Verify typecheck, lint, and build**

```bash
npm run typecheck && npm run lint && npm run build
```
Expected: all three succeed.

- [ ] **Step 6: Commit**

## Acceptance Criteria (from spec, relevant to this task)

- `grep -rn "@coral-xyz/anchor" src/ anchor/` → no output.
- `npm run typecheck && npm run lint && npm run build` all pass.
- `getGametokenpoolProgram(provider, address?)` and `getGametokenpoolProgramId(cluster)` signatures unchanged; `ConnectionUtil` needs no changes to how it calls them.

## Worktree

`/Users/leejianhong/projects/solana/game-token-pool/.worktrees/task-6-migrate-the-web-client-to-anchor-langcore`
Branch: `worktree/task-6-migrate-the-web-client-to-anchor-langcore`

---

## Execution Log

Attempt 1 starting.

Worktree was freshly created (`git worktree add`), so `node_modules` was absent — ran `npm ci` before typecheck to get real module resolution (avoids false "Cannot find module '@anchor-lang/core'" errors that were actually just "not installed yet").

Step 1: `anchor/src/gametokenpool-exports.ts` — import repointed to `@anchor-lang/core`. On typecheck, hit an additional error not mentioned in the plan: `Program<Idl>` not assignable to `Program<Gametokenpool>`. Root cause: `@anchor-lang/core`'s `Program` constructor types the `idl` param as `idl: any` (unlike `@coral-xyz/anchor` where it was typed `idl: IDL`), so TS can no longer infer the generic from the argument — it silently falls back to the `Idl` default. Fixed by adding an explicit generic: `new Program<Gametokenpool>(...)`. This is a one-line addition beyond "only the package name changes," required because the upstream package's own type signature changed, not by choice.

Step 2: `src/util/server/connection.ts` — imports for `AnchorProvider, Program, setProvider` repointed to `@anchor-lang/core`. Tried `import { NodeWallet } from '@anchor-lang/core'` first per plan.

Step 3: `npm run typecheck` → `TS2459: Module '@anchor-lang/core' declares 'NodeWallet' locally, but it is not exported.` Confirms the plan's prediction (spec risk table: "NodeWallet not exported from @anchor-lang/core" — Medium likelihood, materialized). Per plan fallback, defined the local `NodeWallet` adapter class directly in `connection.ts` (constructor(payer), publicKey getter, signTransaction, signAllTransactions) instead of hunting for another deep import path.

Step 4: `grep -rn "@coral-xyz/anchor" src/ anchor/src/ anchor/tests/ package.json` → only `package.json`'s dependency line remained. Ran `npm uninstall @coral-xyz/anchor`. Re-grep → no output (clean).

npm audit vulnerability count: 18 both before and after uninstall — matches spec's "Anchor 1.x fixes ZERO vulnerabilities" expectation.

Step 5: `npm run typecheck && npm run lint && npm run build` — all three pass clean (typecheck: no errors; lint: no errors; build: `next build` compiled successfully, all routes generated).

Step 6: committing.

Result: SUCCESS on attempt 1. NodeWallet required the local-class fallback (public export did not exist). Additionally required one generic-type annotation (`Program<Gametokenpool>`) not anticipated by the plan's literal wording, due to an upstream constructor signature change (`idl: any` vs `idl: IDL`).
