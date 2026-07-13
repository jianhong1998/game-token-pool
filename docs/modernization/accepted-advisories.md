# Accepted Residual Advisories

Reviewed 2026-07-13. See `docs/modernization/decisions.md` Q3a.

`npm audit` on this worktree (after Tasks 1–3: ESLint flat config, React 19,
Next.js 16) reports **20 vulnerabilities (1 low, 9 moderate, 10 high)** across
13 flagged packages. **`next` itself is CLEAN** — that was the pass/fail gate
for the whole modernization effort (see Task 3) and remains the only gate
this table does not relax.

The 20 residual advisories split into two groups.

## Group 1: Solana / Anchor dependency tree — no usable fix

`@coral-xyz/anchor`, `@solana/web3.js`, and `@solana/spl-token` (production
dependencies), plus the bankrun test-tooling stack (`anchor-bankrun`,
`solana-bankrun`, `spl-token-bankrun`, `@solana-developers/helpers` — all
dev-only) pin the same `@solana/web3.js` v1 client lineage. Checked directly:
`@solana/web3.js@1.98.0`'s own `package.json` hard-pins `bigint-buffer@^1.1.5`,
`bn.js@^5.2.1`, `jayson@^4.1.1`, and `rpc-websockets@^9.0.2` as its own
dependencies — these are not resolvable from our `package.json` without
either an `npm overrides` hack that forces different wire-protocol code into
Solana's RPC/websocket client (materially riskier than the `postcss` override
used in Task 3, which touched no Solana package) or dropping the Anchor TS
client entirely.

`npm audit`'s `fixAvailable` flag says "true" for several of these
(`bn.js`, `ws`, `uuid`, `jayson`, `rpc-websockets`, `@solana/web3.js` itself),
but that reflects npm's dependency-graph solver finding *some* nested
resolution — it does not mean a fix ships from the packages that actually
declare these versions. `bigint-buffer` has no patched release at any version,
full stop (`fixAvailable: false`).

| Package(s) | Severity | Pinned by | Reachable from production? | Why accepted |
|---|---|---|---|---|
| `bigint-buffer`, `@solana/buffer-layout-utils`, `@solana/spl-token`, `spl-token-bankrun` | high | `@solana/web3.js` (direct); `@solana/spl-token` → `buffer-layout-utils`; also via `spl-token-bankrun`/`@solana-developers/helpers` (dev) | Server-side only, decodes our own RPC responses | `bigint-buffer` has **no patched version at any release** |
| `@solana-developers/helpers` | high | dev-only, test tooling | Never ships to production | Fix requires a semver-major bump; still resolves to the same vulnerable `@solana/spl-token`/`bigint-buffer` chain |
| `bn.js` | moderate | `@solana/web3.js` (direct + via `borsh`); `@coral-xyz/anchor` (direct + via `@coral-xyz/borsh`) | Server-side only | Pinned by `@solana/web3.js` v1's own `package.json` and Anchor 0.30.x |
| `ws`, `rpc-websockets`, `jayson`, `uuid` | high / moderate | `@solana/web3.js` → `rpc-websockets` (websockets), `jayson` (RPC transport) → `uuid` | Only via websocket subscriptions (we do not use them) and RPC request IDs | All pinned transitively by `@solana/web3.js` v1's own dependency declarations |
| `@babel/runtime` | moderate | `@solana/web3.js` (direct) | Server-side only, build-time helper bundled into the client | Pinned by `@solana/web3.js` v1's own `package.json` (`^7.25.0`, resolves below the patched `7.26.10`) |

Escaping this group requires dropping the Anchor TS client for `@solana/kit`
and hand-encoding every instruction — a full rewrite of the server actions,
to fix DoS/overflow bugs in code that only ever parses responses from our own
RPC node. Not worth it. Re-evaluate if Anchor ships a `@solana/kit` client.

## Group 2: General JS dev tooling — fixable, deferred (out of this task's scope)

`eslint`/`eslint-config-next`'s own transitive resolvers, `jest`/`ts-jest`,
and `tailwindcss` (all devDependencies, never ship to production) pull in
older `glob`, `minimatch`, `brace-expansion`, `picomatch`, `js-yaml`, `yaml`,
and `@babel/core`/`@babel/helpers`. `npm audit` reports a fix available for
all of these, but a real `npm audit fix` dry-run in this worktree hits
`ERESOLVE` peer conflicts inside the `eslint-config-next` toolchain (e.g.
`eslint-plugin-import@2.32.0` vs. `eslint@10.7.0`) — untangling that means
bumping ESLint/Jest/Tailwind plugin versions, which is out of scope for a
CI-hardening + documentation task and risks reopening Tasks 1–3's already-
verified lint/build state.

| Package(s) | Severity | Pulled in by | Reachable from production? | Why deferred |
|---|---|---|---|---|
| `glob`, `minimatch`, `brace-expansion`, `picomatch` | high / moderate | `eslint`/`eslint-config-next`, `jest`/`ts-jest`, `tailwindcss` (all dev) | Never ships to production | Fix exists but triggers `ERESOLVE` peer conflicts with the pinned `eslint-config-next@16.2.10` toolchain from Task 3; needs its own follow-up, not folded into CI hardening |
| `js-yaml`, `yaml` | moderate | `@eslint/eslintrc`/`ts-jest` (`js-yaml`); `tailwindcss` → `postcss-load-config` (`yaml`) | Never ships to production | Same as above |
| `@babel/core`, `@babel/helpers` | low / moderate | `ts-jest`, `jest`, `eslint-config-next` (dev only) | Never ships to production | Same as above |

**Do not run `npm audit fix --force`.** It will attempt to downgrade or swap
the Solana packages and will break the build. Even a plain `npm audit fix`
(no `--force`) is not risk-free here — the dry-run above shows it walks
straight into peer-dependency conflicts in the ESLint toolchain this repo
just finished pinning in Task 1/3.

**Gate:** `next` must always report CLEAN. If it does not, that is a real
vulnerability and must be fixed immediately.
