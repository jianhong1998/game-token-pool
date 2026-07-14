# Task 1 FAILED: baseline is RED

## Summary

`anchor build` (and therefore `make test`, which invokes `anchor test`) fails before
any of the 5 specs in `anchor/tests/specs/` can run. This is a pre-existing failure on
the toolchain the repo currently declares (`Anchor.toml` → `anchor_version = "0.30.1"`,
`Cargo.toml` → `solana-program 1.18.17`), reproduced after pinning `anchor-cli` to
`0.30.1` via `avm` as instructed. No files were modified; no fix was attempted, per
task instructions.

## What was expected

1. `avm use 0.30.1` → `anchor --version` reports `anchor-cli 0.30.1`. **Passed.**
2. `cd anchor && anchor build` succeeds, OR fails specifically on a
   `solana-program 1.18.17` vs. installed-Solana-CLI mismatch (in which case: install
   Solana `v1.18.17` and rebuild). **Failed — but not with the anticipated failure
   mode.**
3. `make test` → all 5 specs (add-user, deposit, init, transfer, user-end-game) pass.
   **Not reached** — build fails first.

## What actually happened

`anchor build` fails during its "Building IDL" step with a Rust compiler error inside
the `proc-macro2 v1.0.93` crate (a transitive dependency, pinned by `anchor/Cargo.lock`,
which is already committed and clean — not something this session altered):

```
error[E0412]: cannot find type `SourceFile` in crate `proc_macro`
   --> proc-macro2-1.0.93/src/wrapper.rs:366:26
366 |     Compiler(proc_macro::SourceFile),

error[E0412]: cannot find type `SourceFile` in crate `proc_macro`
   --> proc-macro2-1.0.93/src/wrapper.rs:372:32
372 |     fn nightly(sf: proc_macro::SourceFile) -> Self {

error[E0599]: no method named `source_file` found for reference `&proc_macro::Span`
   --> proc-macro2-1.0.93/src/wrapper.rs:462:56
462 |             Span::Compiler(s) => SourceFile::nightly(s.source_file()),

error: could not compile `proc-macro2` (lib) due to 3 previous errors
Error: Building IDL failed
```

Reproduced identically across two independent `anchor build` invocations, and again via
`make test` (which fails at the same build step before reaching `--skip-deploy`/spec
execution), exit code 2.

This is **not** the `solana-program 1.18.17` / installed-Solana-CLI mismatch the plan
anticipated and gave a sanctioned fix for (install Solana `v1.18.17` via the anza
install script). It is a rustc/proc-macro2 API-surface incompatibility: the currently
active `rustc 1.85.0` (stable, `aarch64-apple-darwin`) no longer exposes
`proc_macro::SourceFile` / `Span::source_file()` in the way `proc-macro2 1.0.93`'s
nightly-detection code path expects, when anchor's IDL-build step invokes it.

## Environment at time of failure

```
anchor-cli 0.30.1          (pinned via `avm use 0.30.1`, matches Anchor.toml)
solana-cli 2.1.21 (src:8a085eeb; feat:1416569292, client:Agave)   (unchanged)
rustc 1.85.0 (4d91de4e4 2025-02-17)
cargo 1.85.0 (d73d2caf9 2024-12-31)
```

`rustup toolchain list` shows several other toolchains installed on the machine
(`nightly-2024-11-19`, `nightly-2025-04-01`, `1.79.0`, a `solana`-labeled toolchain)
but `1.85.0-aarch64-apple-darwin` is active/default and was not changed by this task.

`anchor/Cargo.lock` pins `proc-macro2 = 1.0.93` and is clean (`git status --porcelain`
shows no diff) — this is the repo's actual, committed dependency state, not an artifact
of this session.

## Why no fix was attempted

Task 1's instructions are explicit: do not fix anything, do not modify any files: if a
spec (or the build) fails, stop and report exactly what failed. The one contingency the
plan pre-authorized (installing Solana v1.18.17 to resolve a `solana-program` version
mismatch) does not apply here — the observed failure is a proc-macro2/rustc
incompatibility, not a solana-program ABI/version mismatch. Attempting an unauthorized
fix (e.g., editing Cargo.lock, switching the active rustc toolchain, patching
proc-macro2's version) would contaminate the baseline this task exists to establish
honestly.

## Spec results

All 5 specs in `anchor/tests/specs/` — **did not run** (build failure blocks test
execution entirely):

- add-user: did not run
- deposit: did not run
- init: did not run
- transfer: did not run
- user-end-game: did not run

## Recommendation (not acted on)

This needs a human/architect decision before Task 2 can proceed on "the old (working)
toolchain" as the design spec assumes — the old toolchain does not currently build on
this machine's rustc 1.85.0. Options to consider (out of scope for this task):
rustc-toolchain-pin the anchor build to an older rustc (e.g. via `rust-toolchain.toml`
or `+<version>`) known compatible with `proc-macro2 1.0.93`'s nightly-detection logic,
or bump `proc-macro2` in the lock file to a version that supports rustc 1.85 while
staying on anchor 0.30.1/solana-program 1.18.17.
