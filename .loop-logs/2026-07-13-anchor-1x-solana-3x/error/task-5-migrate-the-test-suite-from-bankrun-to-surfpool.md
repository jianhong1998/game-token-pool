# Task 5: FAILED after 3 attempts

Worktree: /Users/leejianhong/projects/solana/game-token-pool/.worktrees/task-5-migrate-the-test-suite-from-bankrun-to-surfpool
Branch: worktree/task-5-migrate-the-test-suite-from-bankrun-to-surfpool

## Summary

The mechanical migration (Parts 1-6: drop bankrun, rewrite `ProgramUtil` to a
single no-arg-constructor path, repoint imports to `@anchor-lang/core`, strip
`[test.validator]` from `Anchor.toml`, collapse the makefile test targets) and
Part 7 (add the 50-char-username regression test to `add-user.spec.ts`,
un-skipping that file's `describe` block so the new test actually executes)
were all completed and are believed correct in isolation — `anchor build`
compiles clean against the new imports and no bankrun/`IS_TESTING_ON_CHAIN`
plumbing remains anywhere under `anchor/tests/`.

However, `make test` (`anchor test`, which spins up a real surfpool validator)
**never got past the `beforeAll` airdrop step** in 3 attempts. Each attempt's
fix addressed a real, distinct bug, but the 3rd attempt still fails — this
looks like a surfpool/local-validator finalization-timing issue that is
outside the scope of what this task can safely keep patching blind. Stopping
here per the 3-attempt budget rather than trying a 4th speculative fix.

## Pre-existing condition discovered (documented in LOG_PATH, not a failure cause)

`deposit.spec.ts`, `init.spec.ts`, `transfer.spec.ts` have had their top-level
`describe` wrapped in `describe.skip(...)` since Jan 2025 (commit 94ebfc1),
long before this migration plan existed — because the spec files share
on-chain state (same fee-payer keypair, same `"test pool"` / `"test user 1"`
PDAs) and at least one (`init.spec.ts`) calls `createPool` unconditionally
with no existence check, so it would hard-fail the moment any other spec file
has already created the pool. This is unrelated to bankrun/surfpool and out of
this task's stated file scope; left untouched. Only `add-user.spec.ts` (which
needed un-skipping for the new regression test) and `user-end-game.spec.ts`
(already active) actually run.

## Attempt 1

**Changes:** the full mechanical migration described above, plus the new
50-char-username test in `add-user.spec.ts`, with `describe.skip` -> `describe`
in that file only.

**Command:** `make test`

**Result: FAILED.**

```
FAIL tests/specs/add-user.spec.ts
  ● Test add user › should create user with token
    SolanaJSONRPCError: airdrop to FPhqPEd6qKRJNaLYJ2rLimYnSHMrzPxqq1Mwe6RFMZQA failed: Airdrop amount 10 is below the rent-exempt minimum of 890880 lamports
      ...
      at Object.<anonymous> (anchor/tests/specs/add-user.spec.ts:52:7)

FAIL tests/specs/user-end-game.spec.ts
  ● Test user end game › should able to let user end game and delete user account and user token account
    SolanaJSONRPCError: airdrop to FPhqPEd6qKRJNaLYJ2rLimYnSHMrzPxqq1Mwe6RFMZQA failed: Airdrop amount 10 is below the rent-exempt minimum of 890880 lamports

Test Suites: 2 failed, 3 skipped, 2 of 5 total
Tests:       3 failed, 3 skipped, 6 total
```

**Root cause:** `airdropIfRequired(connection, feePayer.publicKey, 10, 5)` in
`add-user.spec.ts` / `deposit.spec.ts` / `transfer.spec.ts` / `user-end-game.spec.ts`
passes **raw lamports**, not SOL (`10` lamports, `5` lamports minimum) —
`@solana-developers/helpers`'s `airdropIfRequired(connection, publicKey, airdropAmount, minimumBalance)`
takes both in lamports, no unit conversion. `890880` lamports is the actual
rent-exempt minimum, so `10` fails outright. This call was previously guarded
by `if (IS_TESTING_ON_CHAIN)`, and `IS_TESTING_ON_CHAIN` defaulted to `false`
(`anchor/tests/constants/index.ts`), so under plain `make test` (offline/
bankrun mode) this line **never executed historically** — it was dead code,
pre-existing and unrelated to this migration, only now exposed because the
plan correctly collapses the dual-mode branch so surfpool (real on-chain) is
the only path.

## Attempt 2

**Changes on top of attempt 1:** in all four spec files (`add-user`, `deposit`,
`transfer`, `user-end-game`), re-added the `LAMPORTS_PER_SOL` import and
changed the airdrop call to `airdropIfRequired(connection, feePayer.publicKey,
10 * LAMPORTS_PER_SOL, 5 * LAMPORTS_PER_SOL)`.

**Command:** `make test`

**Result: FAILED**, different symptom.

```
FAIL tests/specs/add-user.spec.ts
  ● Test add user › should create user with token
  (blank -- no error captured)
  ● Test add user › should create a user whose name fills the full 50-char max_len
  (blank -- no error captured)

FAIL tests/specs/user-end-game.spec.ts (31.947 s)
  ● Test user end game › should able to let user end game and delete user account and user token account
    thrown: "Exceeded timeout of 30000 ms for a hook.
    Add a timeout value to this test to increase the timeout, if this is a long-running test."
      at anchor/tests/specs/user-end-game.spec.ts:36:3 (beforeAll)

A worker process has failed to exit gracefully and has been force exited.
Test Suites: 2 failed, 3 skipped, 2 of 5 total
Tests:       3 failed, 3 skipped, 6 total
```

**Root cause (assessed):** Jest's default runner executes spec files in
**parallel worker processes**. `add-user.spec.ts` and `user-end-game.spec.ts`
both use the *same* fee-payer keypair and the *same* `"test pool"` PDA. Run
concurrently against one surfpool instance, `user-end-game`'s `beforeAll`
(airdrop + pool-fetch-or-create) hit Jest's 30000ms hook timeout; when Jest
aborted that hook it force-killed the sibling worker (`add-user`) mid-flight,
which is why `add-user`'s failures show **no captured error text at all** —
the process was killed before it could report one, consistent with the
logged `"A worker process has failed to exit gracefully"` message.

## Attempt 3

**Changes on top of attempt 2:** in `anchor/Anchor.toml`, changed the test
script from `jest --preset ts-jest` to `jest --preset ts-jest --runInBand`, to
force serial (single-process) execution and eliminate the parallel-worker
race identified in attempt 2.

**Command:** `make test`

**Result: FAILED again**, same core symptom as attempt 2, now serial.

```
FAIL tests/specs/user-end-game.spec.ts (31.621 s)
  ● Test user end game › should able to let user end game and delete user account and user token account
    thrown: "Exceeded timeout of 30000 ms for a hook.
    Add a timeout value to this test to increase the timeout, if this is a long-running test."
      at anchor/tests/specs/user-end-game.spec.ts:36:3 (beforeAll)

FAIL tests/specs/add-user.spec.ts
  ● Test add user › should create user with token
  (blank -- no error captured)
  ● Test add user › should create a user whose name fills the full 50-char max_len
  (blank -- no error captured)

Test Suites: 2 failed, 3 skipped, 2 of 5 total
Tests:       3 failed, 3 skipped, 6 total
Time:        32.706 s, estimated 35 s
Ran all test suites.
Jest did not exit one second after the test run has completed.
'This usually means that there are asynchronous operations that weren't stopped in your tests.
```

`--runInBand` eliminated the parallel-worker race (files now genuinely run one
at a time, in the same process), but `user-end-game.spec.ts` (which happened
to run *first* under `--runInBand`'s own file-ordering heuristic) **still**
timed out at 30000ms on the identical `beforeAll` step. Since the hook timeout
does not cancel the in-flight `airdropIfRequired` promise (Jest's hook timeout
only stops *waiting* on it, not the underlying async work), that orphaned
airdrop-confirmation call kept running in the background inside the same
single (`--runInBand`) process and most plausibly collided with `add-user`'s
own airdrop call when Jest moved on to the next file — consistent with
`add-user` again producing blank/uncaptured errors, and with the final
`"Jest did not exit ... asynchronous operations that weren't stopped"` warning.

**Assessed underlying cause (not fixed):** the process list captured while
attempt 3 was running showed surfpool started as:

```
surfpool start --offline --block-production-mode transaction --log-level none
  --no-tui --disable-instruction-profiling --max-profiles 1 --no-studio
  --legacy-anchor-compatibility --anchor-test-config-path .../anchor/Anchor.toml
```

`--block-production-mode transaction` means blocks are only produced when a
transaction is submitted, not on a fixed slot cadence. `airdropIfRequired`
confirms with Solana's default `"finalized"` commitment
(`@solana-developers/helpers`'s `requestAndConfirmAirdrop`), which normally
requires roughly 32 subsequent confirmed slots after the target transaction.
In an on-demand block-production validator with no other transaction traffic
to advance slots, that confirmation may simply never complete within Jest's
30-second hook window — this looks like a surfpool startup/config mismatch
with the `"finalized"`-commitment airdrop helper, not a code defect in the
migrated TS. It was not chased further because it is a genuinely new class of
problem (validator block-production semantics) outside safe blind-fix territory
at attempt 3/3.

## Suggested next steps (not attempted — outside the 3-attempt budget)

1. Confirm whether surfpool's `--block-production-mode` can be set to a
   continuous/interval mode via `Anchor.toml`/CLI flags, so `"finalized"`
   commitment can actually be reached.
2. Alternatively, change `airdropIfRequired`'s commitment expectations — e.g.
   request the airdrop directly with `"confirmed"` commitment instead of
   relying on the helper's hardcoded `"finalized"`, since local-validator
   tests do not need finalized-level guarantees.
3. Increase the Jest hook timeout well past 30s (e.g. 60-90s) as a cheap probe
   to see whether finalization is merely *slow* rather than actually stuck —
   attempts 2 and 3 both hit exactly the 30000ms Jest default, which is
   consistent with either theory and wasn't disambiguated.
4. Once the airdrop path is fixed, re-verify whether `--runInBand` is still
   needed (attempt 3's fix was correct in principle — shared on-chain state
   across parallel workers is a real hazard — but was never proven because
   the airdrop issue masked it).

## State of the worktree at stop

All the mechanical Part 1-6 changes and the Part 7 regression test are in the
working tree, uncommitted (`git status` shows 16 modified files, no new
files). `anchor build` / TypeScript compiles cleanly against the new
`@anchor-lang/core` imports — the migration code itself is not suspected of
being wrong. The failure is entirely in getting `make test` to complete
against the real surfpool validator. A `wip:` commit capturing this state
follows in the same worktree/branch.

---

## Fresh fix round (post-report, separate 3-attempt budget)

Coordinator authorized a focused fresh round using the suggested next steps.
Result: **the surfpool-timing issue is fully root-caused and fixed.** A
different, pre-existing, unrelated architectural bug was then discovered
blocking only the new 50-char regression test specifically. Reported here
rather than silently worked around, since fixing it would require violating
an explicit plan constraint.

### Root cause of the timing hang (found and fixed)

`anchor test` spawns surfpool with `--legacy-anchor-compatibility`, which
defaults to `--block-production-mode transaction` (blocks only produced when
a transaction is submitted). `airdropIfRequired`'s hardcoded `"finalized"`
commitment confirmation needs ~32 confirmations/slots after the airdrop tx;
with no further transaction traffic, block production stalls and finalization
never arrives, hanging past Jest's hook timeout.

**Fix:** `anchor/Anchor.toml` supports a `[surfpool]` config section (found by
extracting readable strings from the anchor-cli binary, which contains error
messages referencing `[surfpool] rpc_port` / `[surfpool.startup_wait]` and a
`_SurfpoolConfig` struct with a `block_production_mode` field). Added:

```toml
[surfpool]
block_production_mode = "clock"
slot_time = 50
```

Verified via `ps` that this is honored (`surfpool start ... --block-production-mode
clock --slot-time 50 ...`), and via a direct manual `solana airdrop ... --commitment
finalized` against the live instance, which now finalizes in ~2s (previously hung
indefinitely). Kept `--runInBand` (correct fix from the original 3 attempts,
for the parallel-worker shared-state race) and added `--testTimeout=90000` to
the jest script as cheap insurance regardless.

### Second bug found once the hang was fixed (found and fixed)

With the airdrop no longer hanging, `beforeAll` progressed further and hit:
`SendTransactionError: ... Attempt to debit an account but found no record of
a prior credit.` on `createPool`. Root cause: Anchor's `MethodsBuilder.rpc()`
uses the **provider wallet** (`program-owner.json`, per `[provider] wallet` in
Anchor.toml) as the transaction fee payer by default -- not the `feePayer`
keypair the test code was airdropping. Surfpool only funds the provider
wallet with just enough to cover the program deploy itself, leaving it at
`0 SOL` by the time tests run. **Fix:** added a second `airdropIfRequired`
call for `programOwner.publicKey` alongside the existing one for
`feePayer.publicKey`, in all four spec files that create the pool
(`add-user`, `deposit`, `transfer`, `user-end-game.spec.ts`).

### Confirmed via a clean `make test` run after both fixes

```
PASS tests/specs/user-end-game.spec.ts (5.534 s)
FAIL tests/specs/add-user.spec.ts
  should create user with token -- PASS
  should create a user whose name fills the full 50-char max_len -- FAIL

Test Suites: 1 failed, 3 skipped, 1 passed, 2 of 5 total
Tests:       1 failed, 3 skipped, 2 passed, 6 total
```

Both timing/funding issues are conclusively resolved. `user-end-game.spec.ts`
is fully green. `add-user.spec.ts`'s original test passes. Only the new
50-char regression test still fails -- for a completely different,
pre-existing reason, unrelated to surfpool/timing/funding.

### New, unrelated blocker: the 50-char username can never derive a PDA

`add_user.rs`'s `AddUserToPool` accounts struct derives the `user` PDA as:

```rust
seeds = [b"user", user_name.as_bytes().as_ref(), signer.key().as_ref()]
```

Solana's runtime hard-caps each individual PDA seed at 32 bytes
(`MAX_SEED_LEN`). Verified empirically:

```
node -e "... PublicKey.findProgramAddressSync([Buffer.from('user'), Buffer.from('a'.repeat(N)), programId.toBuffer()], programId) ..."
32  -> OK
33  -> FAIL Max seed length exceeded
40  -> FAIL Max seed length exceeded
50  -> FAIL Max seed length exceeded
```

A 50-character (or any 33+ character) username can **never** derive its
`user`/`user_token_account` PDAs -- client-side (confirmed above) or
on-chain (Anchor's `seeds = [...]` constraint uses the identical
`find_program_address` under the hood, subject to the same cap). This is a
hard Solana protocol constant, completely independent of the account-space
discriminator fix, and was not introduced by this migration.

This also means the *original* bug analysis in the plan/spec is itself
unreachable in practice: the discriminator-space bug for `User` was
calculated to break at 43+ characters, but the seed-length wall fires first,
at 33+ characters -- **10 characters before** the space bug could ever be
exercised. There is no username length that is simultaneously (a) long
enough to have triggered the old space bug and (b) short enough to survive
PDA derivation. The space fix (`SPACE_DISCRIMINATOR + User::INIT_SPACE`) is
still correct and worth keeping (correctness hygiene, and it's shared
reasoning with `Game`'s allocation, which has a different, still-reachable
failure mode via player count rather than name length), but **no TS test can
prove the User-account discriminator bug via username length**, because the
class of input that would prove it is rejected earlier by an unrelated,
unfixable-in-scope constraint.

Fixing the underlying seed design (e.g., hashing the username before use as a
seed) is explicitly out of scope: the plan's own Global Constraints say "Do
not touch the seed derivation, AccountUtil, or the auth model" (PDA seeds
must stay `["user", username, FEE_PAYER.pubkey]`). Silently shrinking the
regression test's username length without disclosure would misrepresent what
is being verified against the plan's explicit acceptance criterion ("A user
with a 50-character username can be created and fetched back"). Surfacing
this for a coordinator decision rather than deciding unilaterally.

**Not spending a 3rd `make test` attempt on this** -- the failure is a
deterministic protocol-level constant (32-byte seed cap), not a flaky/timing
condition; rerunning would not produce new information.
