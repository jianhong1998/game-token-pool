# Decision: Resequence Task 1/2 after Task 3

**Date:** 2026-07-14
**Made by:** user, via orchestrator AskUserQuestion

## What happened

Task 1 (establish a green baseline on Anchor 0.30.1 / Solana 1.18.17) could not be
completed. `anchor build` fails under every toolchain pairing tried on this machine:

1. **solana-cli 2.1.21 (Agave)** — the committed `anchor/Cargo.lock` pins
   `proc-macro2 1.0.93`. Anchor's IDL-build step forces `RUSTUP_TOOLCHAIN=solana`,
   which resolves to Solana's bundled platform-tools rustc (v1.43, reports
   `1.79.0-dev`). That specific rustc build mis-triggers proc-macro2's
   nightly-detection heuristic, causing `E0412`/`E0599` (`SourceFile`/`source_file`
   not found). Neither a directory-scoped `rust-toolchain.toml` nor a global
   `rustup default` change has any effect, because the `RUSTUP_TOOLCHAIN=solana`
   env var Anchor sets overrides both.
2. Tried pinning `proc-macro2` down to `1.0.92`, then `1.0.91` (the floor allowed
   by `syn v2.0.96`'s `^1.0.91` requirement, itself pulled in via
   `solana-program v1.18.19` → `num-derive v0.4.2`) — both fail identically. Going
   lower requires also touching `syn`, out of scope for a lockfile-only fix.
3. **solana-cli 1.18.17 (Agave)** — the plan's own pre-authorized Task 1
   contingency for a `solana-program`/installed-Solana-CLI mismatch. Installed
   successfully via the anza install script (Cargo.lock reverted first, clean
   slate). This pulls a different, older platform-tools bundle (v1.41,
   `rustc 1.75.0-dev`) — but that rustc is now too *old* for the committed
   `Cargo.lock`'s `blake3 1.5.5`, failing with 73 `E0463`/macro-resolution errors
   (`can't find crate` for `arrayref`, `digest`, `arrayvec`, `cfg_if`).

Six attempts total (2 rustc-toolchain approaches × investigation, 2 proc-macro2
pins, 1 solana-cli reinstall) all failed. This is itself first-hand confirmation
of the migration's own stated premise (spec: "Nothing agrees with anything").

## Decision

Skip enforcing "fix the bug under the untouched old toolchain" as a literal
prerequisite. Reorder execution:

**Original:** Task 1 → Task 2 (old toolchain) → Task 3 → Task 4 (new toolchain) → 5 → 6 → 7
**New:** Task 3 (install new toolchain) → Task 2 (discriminator fix, TDD, **under the new
toolchain**) → Task 4 (CpiContext migration, still consumes `SPACE_DISCRIMINATOR`
from Task 2, per the plan's own declared Interfaces) → Task 5 → Task 6 → Task 7.

## Reason

The plan/spec's sequencing rationale ("fix the bug first so the regression test
is trustworthy before the toolchain moves") assumed the old toolchain builds at
all. It doesn't, on this machine, for reasons entirely unrelated to the
discriminator bug (a rustc/platform-tools/dependency-graph incompatibility). There
is no way to get a "trustworthy old-toolchain regression test" from a toolchain
that cannot compile the program in the first place. Anchor 1.1.2 / Solana 3.1.10
is the actively-maintained, coherent pairing this whole migration exists to reach
— doing the TDD fix there is not a weaker guarantee, just a different one.

## What does NOT change

- The discriminator fix itself (rename `SPACE_DISCRIMENTAL` → `SPACE_DISCRIMINATOR`,
  allocate `SPACE_DISCRIMINATOR + User::INIT_SPACE` / `+ Game::INIT_SPACE`) is
  unchanged in substance — only which toolchain proves it.
- The 50-char-username regression test is unchanged in substance.
- Task 4's CpiContext rewrite still consumes `SPACE_DISCRIMINATOR` from Task 2, per
  the plan's original Interfaces declarations — Task 2 still runs before Task 4.
- No product code was touched by this investigation. `anchor/Cargo.lock` was
  reverted to its original committed state; the machine's global `solana-cli` is
  now 1.18.17 (down from 2.1.21) and will be replaced again by Task 3's Solana
  3.1.10 install.

## Second resequencing decision (after Task 3 completed)

Task 3 confirmed toolchain-coherent: anchor-cli 1.1.2, solana-cli 3.1.10, surfpool
1.5.0, rustc 1.97.0 (note: installing anchor-cli 1.1.2 itself required rustc
>=1.89 in practice — several transitive crates, e.g. solana-pubkey 4.2.0, now
require it — higher than the plan's stated ">=1.85" floor. Updated rustup stable
to 1.97.0 globally to satisfy this).

Further merging Task 2 into Task 4: the old bankrun TS test harness is dead the
moment anchor-lang/anchor-spl bump to 1.1.2 (Task 4's Cargo.toml change) — it
peer-depends on `@coral-xyz/anchor@^0.30.0` regardless of CLI version. There is no
working test runner to TDD-prove Task 2's discriminator fix against until Task
5's ProgramUtil/surfpool rewrite lands. Proving it under the transiently-broken
old harness, then re-proving it again under surfpool moments later, is wasted
work.

**New task boundaries:**
- **Task 4** (merged): Cargo.toml/Anchor.toml -> 1.1.2, all 12 CpiContext call-site
  conversions, AND the discriminator fix (SPACE_DISCRIMENTAL -> SPACE_DISCRIMINATOR
  rename, `SPACE_DISCRIMINATOR + User::INIT_SPACE` / `+ Game::INIT_SPACE`
  allocation). Verified via `anchor build` succeeding and the IDL/types
  regenerating — no TS test run yet possible.
- **Task 5** (expanded): surfpool ProgramUtil rewrite, import migration, AND adds
  the 50-char-username regression test (originally Task 2 Step 1). This is the
  first point a working test runner exists post-migration. `make test` must pass
  all 6 specs (5 original + the new one) here.

Task 2 is retired as a standalone execution unit; its substance now lives inside
Task 4 (the code fix) and Task 5 (the regression test + proof).
