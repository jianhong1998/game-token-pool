# Task 7 — Deploy Fresh + Manual E2E — Blocking Issue

**Deploy itself: SUCCESS.** Program ID confirmed
`F6yyNFRtZbmT6pVqjF4FoKRYi6PwegpoEJ9PS5pY4RcS` via
`solana program show ... --url http://127.0.0.1:8899`.

**Why this task is marked `failed` rather than `completed`:** the task's own
success criterion is "deploy + all E2E items pass" through the actual web UI.
3 of the 10 checklist items — #3 (deposit), #5 (transfer between users), #7's
"transfer tokens into game" half — fail in the real web UI with a 500 error.

## Root cause

`src/util/server/priority-fee.util.ts`, `PriorityFeeUtil.getPriorityFee`:

```ts
case 'max':
  lamports = Math.max(...recentPriorityFees);
  break;
```

`recentPriorityFees` comes from `connection.getRecentPrioritizationFees()`.
On a genuinely fresh chain (zero cluster-wide prioritization-fee history —
exactly what a fresh `anchor deploy` + fresh surfpool produces), that RPC
returns `[]`. `Math.max()` on an empty spread is `-Infinity`. Every caller in
`src/app/actions/user-fund.ts` (`deposit`, `transfer`, `bulkTransfer`,
`transferToGame`) does:

```ts
const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
  microLamports: minFeeInLamport + 1,
});
```

`setComputeUnitPrice` converts `microLamports` to a `BigInt` internally, and
`BigInt(-Infinity)` throws `RangeError: The number -Infinity cannot be
converted to a BigInt because it is not an integer`. Confirmed via container
logs (`docker compose -p game-token-pool logs client`):

```
⨯ RangeError: The number -Infinity cannot be converted to a BigInt because it is not an integer
    at BigInt (<anonymous>)
    at deposit (src/app/actions/user-fund.ts:30:47)
```

## Why this is NOT treated as an in-scope migration bug

`git blame src/util/server/priority-fee.util.ts` shows the file was added
2025-03-08 (commit `9349c67`), months before this migration, and it is not in
the list of files touched by Tasks 4-7 (Anchor 1.x CpiContext migration,
Anchor.toml, docker-compose, CI, README). It has nothing to do with
`CpiContext`, `anchor-lang`/`anchor-spl` versions, or Token-2022. It is a
pre-existing latent bug that only surfaces because Task 7 mandates a
genuinely fresh deploy with zero prior cluster transaction history — on
devnet/mainnet this would essentially never happen (cluster-wide fee history
is never empty there), so it wasn't caught before.

Per the task's own instruction — "If it's small and clearly in-scope for this
migration ... you may fix it and re-verify; if it's ambiguous or looks
unrelated to this migration, stop and report rather than guessing" — this was
reported, not silently patched.

## What was independently verified anyway

To confirm the actual migration deliverable (the 12-site CpiContext rewrite)
is not at fault, ran the same program methods directly (bypassing only the
buggy priority-fee wrapper, via `@anchor-lang/core`, signed with the same
`fee-payer.json` key the app itself uses) from inside the running `client`
container. All three succeeded and the resulting on-chain balances were
confirmed correct via the real web UI afterward:

- `deposit` -> `mint_to` CPI: user balance 0.00 -> 100.00. Tx
  `4KUMnFqXJ1mbZou9Fo6gMcZSsX5dEbxe6ax88GWwcCP7od9UKnQCxsREhqvma4yUM9uNZTh1knGMYBcDjZQqchMA`
- `transferTokenBetweenUsers` -> `transfer_checked` CPI: a 100->80, b 0->20.
  Tx `62gKWLA45m99EkKuEtY1QK3r6TwE9pDadMBSRaz9jQuG4TgUfW6wAt3dMA7gSh4TSUVRHfXAKax68MiuxwA741oW`
- `userTransferTokenToGame` CPI: game 0->5.00, user b 20->15.00. Tx
  `59eKGkfj4rxPBkQrxeqP5JFgnM3ancJSqh2UXkdJvWMgmGtcgZAWCK94iVaCmrWRtjEnwGYspVCqURikdHFkffi5`

So: **the migration's actual deliverable (CpiContext rewrite) works
correctly**; the E2E-checklist failure is entirely attributable to this one
unrelated, pre-existing bug in the web app's fee-estimation helper.

## Recommended follow-up (separate task, out of this migration's scope)

Guard both `Math.min(...fees)` and `Math.max(...fees)` in
`PriorityFeeUtil.getPriorityFee` against an empty `fees` array (e.g. default
to `0` lamports when there is no recent fee history), so `deposit`,
`transfer`, `bulkTransfer`, and `transferToGame` don't crash on a freshly
bootstrapped chain (local dev, or any newly-launched cluster).

## Other findings (informational, not blockers)

- `/admin` does not have an "add user" control in the actual app — users
  self-register via the root `/` "Register" button, and a separate "Add
  User" button exists only inside `/[username]/dealer`. The checklist's
  `/admin — add a user` wording doesn't match the shipped UI; adapted
  navigation accordingly. Pre-existing, unrelated to this migration.
- "take tokens from game" lives on `/game/[gameName]`, not on
  `/[username]/dealer` as the checklist assumed. Same as above.
