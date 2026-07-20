# Modernization — Decision Record

**Date:** 2026-07-13
**Participants:** Jian Hong, Claude (Linus role)
**Status:** Agreed; plans written

---

## Context

The project has been unmaintained for ~16 months (last substantive commit
2025-03-24). `npm audit` reports **28 vulnerabilities** (1 critical, 15 high,
11 moderate, 1 low). The toolchain has drifted: `Anchor.toml` pins 0.30.1 while
the installed CLI is 0.31.1; the program declares `solana-program 1.18.17`
while the installed CLI is Agave 2.1.21. Nothing builds reproducibly.

---

## Q1: Does the custodial, no-wallet model stay?

**Answer:** Yes. Keep it.

**Decision:** Out of scope for modernization. Identity remains a username in
`localStorage`; all transactions are signed server-side by the single
`FEE_PAYER` keypair; user PDAs stay derived from
`["user", username, FEE_PAYER.pubkey]`.

**Reason:** This is an arcade-chip system with no real-value assets. Replacing
it with wallet-adapter signing would rewrite every server action, the auth
model, and the program's seed derivation. That is a product change, not a
modernization, and it would orphan all existing accounts.

---

## Q2: Is on-chain state live?

**Answer:** No. On-chain state is disposable.

**Decision:** We may freely change account layouts and redeploy fresh. No
migration needs to be designed.

**Reason:** Directly unblocks the discriminator bug fix (see Q5) — it becomes a
one-line change per site instead of a state migration.

---

## Q3: What does "modernize" actually mean here?

**Answer:** Upgrade dependencies to current, supported, non-vulnerable versions.
Explicitly motivated by "NextJS version is not supported and full of
vulnerabilities."

**Decision:** Scope is dependency/toolchain modernization. No new features.

### Q3a: Can `npm audit` reach zero?

**Answer: No — and we are not going to chase it.**

The 28 advisories fall into three groups:

| Group          | Packages                                                        | Reachable?                                                        | Fixable?                          |
| -------------- | --------------------------------------------------------------- | ----------------------------------------------------------------- | --------------------------------- |
| 1. Next.js     | `next`                                                          | **Yes** — internet-facing, runs server actions, holds `FEE_PAYER` | **Yes**                           |
| 2. Solana tree | `bigint-buffer`, `ws`/`rpc-websockets`, `bn.js`, `jayson`       | Server-side only, parses responses from our own RPC               | **No**                            |
| 3. Dev tooling | `@babel/*`, `glob`, `flatted`, `ajv`, `yaml`, `brace-expansion` | Never ships to production                                         | Yes (free, via jest/eslint bumps) |

**Group 2 is unfixable at any version.** Verified:

- `@coral-xyz/anchor@0.32.1` (newest 0.x) → depends on `@solana/web3.js@^1.69.0`
- `@anchor-lang/core@1.1.2` (newest, Anchor 1.x) → **still** depends on `@solana/web3.js@^1.69.1`
- `@solana/spl-token@0.4.15` (newest) → `buffer-layout-utils` → `bigint-buffer`, which **has no patched release at all**

The only escape is abandoning the Anchor TS client for `@solana/kit` and
hand-encoding instructions — a full rewrite of every server action, to fix
DoS/overflow bugs in code that parses responses from _our own RPC node_.

**Decision:** Accept Group 2 as documented residual risk. Success is defined as
**"no reachable vulnerability in the production surface,"** not a clean audit
report. Group 1 is the real fix; Group 3 falls out for free.

---

## Q4: How far on Next.js / React?

**Answer:** Next 16 + React 19.

**Decision:** `next@16.2.10`, `react@19`, `react-dom@19`, `eslint@10` with flat
config, `eslint-config-next@16`.

**Reason:** Puts us on a supported line for years rather than months. The
15.5.x patch option would have fixed the same CVEs with less work, but we'd be
repeating this exercise within the year.

**Sub-decision — TypeScript stays on 5.9.3, NOT 7.x.**
`typescript@latest` is now 7.0.2 (the native Go port). It is weeks old and not
yet validated against `eslint-config-next@16` or the Next 16 TS plugin. Taking
the newest TS in the same pass as Next 16 + React 19 would make a build failure
impossible to attribute. TS 7 is a separate, later task.

---

## Q5: How far on the Anchor program?

**Answer:** Anchor 1.1.2 + Solana 3.x. **User overrode the recommendation.**

**Recommendation given:** Anchor **0.31.1** — matches the already-installed CLI,
keeps Agave 2.x, is exactly what the maintained `anchor-litesvm` supports, and
avoids the package rename, the CPI rewrite, Solana 3.x, and surfpool.

**Decision taken:** Anchor **1.1.2** anyway.

**Reason for override:** Optimizing for not repeating this migration in a year.

**The cost is accepted with eyes open:**

- Anchor 1.x delivers **zero** vulnerability reduction (still `@solana/web3.js` v1 — see Q3a).
- TS package renamed `@coral-xyz/anchor` → `@anchor-lang/core`.
- Requires **Solana 3.x** (recommended 3.1.10); we are on Agave 2.1.21.
- **CpiContext rewrite** across **12 call sites in 9 files**.
- **Surfpool replaces solana-test-validator** → `docker-compose.yml` validator service is rewritten.
- Existing test framework dies: `anchor-bankrun@0.5.0` peer-depends on
  `@coral-xyz/anchor@^0.30.0` and is unmaintained since Oct 2024.

**Silver lining (good taste):** Because bankrun dies regardless, the
`IS_TESTING_ON_CHAIN` dual-mode branch in `ProgramUtil` collapses to a single
path against surfpool. A special case disappears. That is a net simplification,
not a loss.

**Not affected:** the program already has exactly one `#[error_code]` block, so
Anchor 1.x's "single error code block" restriction is a no-op for us.

---

## Q6: Tailwind 3 → 4 and daisyUI 4 → 5?

**Answer:** Defer. Write a handoff doc.

**Decision:** Keep Tailwind 3 + daisyUI 4. Deferred to
[`deferred-tailwind4-daisyui5.md`](./deferred-tailwind4-daisyui5.md).

**Reason:** Neither carries a vulnerability — this is purely cosmetic
modernization. Tailwind 4 is a CSS-first config rewrite that touches every
component. Bundling it with the security work means a visual regression could
block the fix that actually matters. There are **no UI tests** to catch such a
regression.

---

## Bug found during mapping (not a decision, a finding)

`Pool` correctly allocates `SPACE_DISCRIMENTAL + Pool::INIT_SPACE`, but:

- `add_user.rs:50` → `space = User::INIT_SPACE`
- `game/init_game.rs:26` → `space = Game::INIT_SPACE`

Both **omit the 8-byte account discriminator**. The accounts are under-allocated
by 8 bytes. It silently works today because Borsh serializes actual string/vec
length, not the reserved max — so a `User` only breaks once the username exceeds
~42 chars, and a `Game` breaks as its player list approaches the 20-player cap.

Latent data-corruption bug. Fixed as part of the Anchor plan (cheap, because of
Q2).

---

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

## Sequencing

The web app imports `@coral-xyz/anchor` and `anchor/target/types`, so the two
subsystems are **coupled** — Anchor 1.x's package rename and IDL regeneration
break the web build. They cannot run in parallel. Ordered so the security fix
lands before the risky rewrite:

1. **Web** — Next 16 + React 19 + ESLint flat config. Anchor untouched.
   **Fixes the CVEs that actually matter.** Independently shippable.
   - Spec: [`2026-07-13-web-next16-react19-design.md`](../superpowers/specs/2026-07-13-web-next16-react19-design.md)
   - Plan: [`2026-07-13-web-next16-react19.md`](../superpowers/plans/2026-07-13-web-next16-react19.md)
2. **Program** — Anchor 1.1.2 + Solana 3.x + discriminator fix + surfpool, then
   migrate the web client to `@anchor-lang/core`. Independently shippable.
   - Spec: [`2026-07-13-anchor-1x-solana-3x-design.md`](../superpowers/specs/2026-07-13-anchor-1x-solana-3x-design.md)
   - Plan: [`2026-07-13-anchor-1x-solana-3x.md`](../superpowers/plans/2026-07-13-anchor-1x-solana-3x.md)

**Read the spec before the plan.** The plans are the *how*; the specs are the
*what* and *why*, and they hold the non-goals that keep scope from creeping.

## Document map

| Document | Purpose |
|---|---|
| [`decisions.md`](./decisions.md) | This file. Q&A record — what was decided and why. |
| `accepted-advisories.md` | Vulnerabilities we knowingly accept. *(Does not exist yet — created by web Plan, Task 4.)* |
| [`deferred-tailwind4-daisyui5.md`](./deferred-tailwind4-daisyui5.md) | Deferred cosmetic work, handed off. |
| [`../superpowers/specs/`](../superpowers/specs/) | Requirements, non-goals, acceptance criteria. |
| [`../superpowers/plans/`](../superpowers/plans/) | Task-by-task implementation steps. |
