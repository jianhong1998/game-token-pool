# Web Modernization: Next 16 + React 19 — Design Spec

**Date:** 2026-07-13
**Status:** Awaiting review
**Decision record:** [`docs/modernization/decisions.md`](../../modernization/decisions.md)
**Implementation plan:** [`../plans/2026-07-13-web-next16-react19.md`](../plans/2026-07-13-web-next16-react19.md)

---

## Problem

The project has been unmaintained since March 2025. `npm audit` reports 28
vulnerabilities. The user's stated motivation is specific: *"currently NextJS
version is not supported and full of vulnerabilities."*

That framing is correct, and it is the only part of the audit that matters.
Next.js is the sole internet-facing component. It runs the server actions and it
holds `FEE_PAYER` — a keypair with signing authority over **every user account
in the pool**. A remote vulnerability in Next.js is the one bug in this
repository that can actually cost money.

Two secondary problems compound it:

1. **CI cannot catch regressions.** `.github/workflows/test-web.yml` runs
   `npm run build` and nothing else — no typecheck, no lint. This is *how* the
   codebase drifted for 16 months without anyone noticing.
2. **ESLint 8 is a hard blocker.** Next 16 requires `eslint-config-next@16`,
   which peer-requires ESLint ≥9. The repo uses ESLint 8 with a legacy
   `.eslintrc.json`, a format ESLint 9+ does not support.

## Goals

1. Eliminate every Next.js security advisory.
2. Land on a Next.js/React line that stays supported for years, not months.
3. Make CI capable of catching the next drift before it accumulates.
4. Leave the app functionally **identical**. Zero user-visible change.

## Non-Goals

Explicitly out of scope. Each was considered and rejected:

| Excluded | Why |
|---|---|
| The custodial no-wallet auth model | Decision Q1 — keep it. Replacing it is a product change, not modernization. |
| Anchor / Solana / any on-chain change | Coupled but separable. This spec is the security fix; Anchor is a separate spec. Touching both makes a build failure impossible to attribute. |
| Tailwind 4 / daisyUI 5 | Decision Q6 — deferred. No vulnerabilities; purely cosmetic; no UI tests to catch a regression. |
| TypeScript 6/7 | `typescript@latest` is 7.0.2 (the native Go port), weeks old, unvalidated against `eslint-config-next@16`. Stay on 5.9.3. |
| Reaching `npm audit` zero | **Impossible.** See "Accepted Residual Risk" below. |
| Adding a web test suite | Real gap, but scope creep here. Recorded as a follow-up. |

## Requirements

### Version floors (exact, non-negotiable)

- `next` → **16.2.10**
- `react`, `react-dom` → **19.2.7**
- `@types/react`, `@types/react-dom` → **19.x**
- `typescript` → **5.9.3** (NOT 6 or 7)
- `eslint` → **9.39.5** initially, **10.7.0** only once `eslint-config-next@16` is installed
- `eslint-config-next` → 15.5.20 initially, **16.2.10** finally
- Node → **22**

The two-stage ESLint bump is a hard requirement, not a preference:
`eslint-config-next@15.x` peers `eslint ^7||^8||^9`, so installing ESLint 10
before the config reaches v16 **fails with an ERESOLVE conflict**.

### Pinned (must NOT change)

- `tailwindcss` `^3.4.1`, `daisyui` `^4.12.10`
- `@coral-xyz/anchor`, `@solana/web3.js`, `@solana/spl-token` — all untouched

### Functional

The app must behave identically. Every flow in the acceptance checklist below
must work exactly as it does today.

## Architecture

Three sequential increments, each independently shippable and each leaving
`main` green:

1. **ESLint flat config.** Zero runtime impact. Unblocks Next 16 (which needs
   ESLint ≥9) and replaces `next lint`, which Next 16 removes, with a direct
   `eslint` call.
2. **React 19, still on Next 15.** Next 15 fully supports React 19, so the React
   major lands *in isolation* — any breakage is unambiguously React's, not
   Next's.
3. **Next 16.** The step that actually closes the CVEs, on top of a codebase
   already proven on React 19.
4. **CI hardening.** Add the typecheck and lint gates that would have prevented
   this situation.

**Why this order:** it isolates blame. If step 3 goes wrong, steps 1 and 2 still
stand on their own. Doing React and Next together would produce failures nobody
can attribute.

### Known code changes required by React 19

React 19 is stricter about render-phase side effects. Three exist today, and all
three are **genuine bugs already** — React 19 merely makes them visible:

- `src/app/react-query-provider.tsx:8` — `useState(new QueryClient())` passes
  the *eager* argument, constructing a fresh `QueryClient` on **every render**
  and discarding it. `setDefaultOptions` is also called during render.
- `src/app/page.tsx:19` — `router.replace()` called during the render phase.
- `src/app/game/page.tsx:39` — same.

Verified by grep that all other `router.replace`/`router.push` calls already sit
inside `useEffect` bodies or event handlers.

## Accepted Residual Risk

**`npm audit` will not reach zero. This is the expected outcome, not a failure.**

Verified against the newest published versions:

- `@coral-xyz/anchor@0.32.1` → depends on `@solana/web3.js@^1.69.0`
- `@anchor-lang/core@1.1.2` → **still** depends on `@solana/web3.js@^1.69.1`
- `@solana/spl-token@0.4.15` → `buffer-layout-utils` → `bigint-buffer`, which
  **has never had a patched release**

So `bigint-buffer`, `ws`/`rpc-websockets`, and `bn.js` are unfixable at any
version while we use the Anchor TS client. The only escape is dropping Anchor
for `@solana/kit` and hand-encoding every instruction — a full rewrite of the
server actions, to fix DoS/overflow bugs in code that parses responses **from
our own RPC node**.

Rejected. Success is defined as **"no reachable vulnerability in the production
surface"**, not a clean report.

These must be written down in `docs/modernization/accepted-advisories.md` so the
next maintainer does not re-litigate them.

## Acceptance Criteria

- [ ] `npm audit` reports **`next` as CLEAN**. This is the pass/fail gate.
- [ ] `npm run typecheck` exits 0.
- [ ] `npm run lint` exits 0.
- [ ] `npm run build` succeeds.
- [ ] CI runs typecheck **and** lint **and** build.
- [ ] `git diff main --stat -- anchor/` is **empty**.
- [ ] Residual Solana-tree advisories are documented in `accepted-advisories.md`.

### Manual E2E (no automated web tests exist — this IS the test)

Against a local validator, every flow must pass:

- [ ] Admin: log in, init pool, add user, deposit
- [ ] User: log in, view dashboard/balance, transfer to another user
- [ ] Game: create, join, transfer tokens in, take tokens out (dealer), quit, delete
- [ ] End game → redirect to `/`
- [ ] The two changed redirects specifically: login from `/` lands on
      `/<username>`; visiting `/game` logged-out bounces to `/`. Neither may
      flicker or loop.

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| React 19 type breakage across components | Medium | Isolated to increment 2; fix types properly — `any`/`@ts-expect-error` are forbidden |
| No web tests to catch a regression | **High** | Mandatory manual E2E checklist; app is functionally unchanged so a diff in behaviour is a bug |
| Next 16 codemod over-reaches (touches React/ESLint) | Medium | Decline its React/ESLint offers — those versions are already correct |
| ERESOLVE on the ESLint bump | High if done naively | Two-stage bump, specified above |

## Follow-ups (not in this spec)

- A web smoke-test suite. The absence of one is the single largest risk here and
  it will keep being the largest risk on every future upgrade.
- Tailwind 4 / daisyUI 5 → `docs/modernization/deferred-tailwind4-daisyui5.md`
- The admin password is compared in plaintext (`src/app/admin/actions/admin-login.ts`)
  and `FEE_PAYER` sits in `.env`. Out of scope by decision Q1, but it is the
  reason the Next.js CVEs matter as much as they do.
