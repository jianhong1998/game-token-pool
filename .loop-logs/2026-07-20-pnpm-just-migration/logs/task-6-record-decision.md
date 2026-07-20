# Task 6 Log: Record the decision in `docs/modernization/decisions.md`

## Task Context

### Plan Section
### Task 6: Record the decision in `docs/modernization/decisions.md`

**Files:** Modify `docs/modernization/decisions.md`

- [ ] Step 1: Insert a new `## Q7` section immediately before the `## Sequencing` heading (i.e. right after the `---` that follows the "Bug found during mapping" section). First read `docs/modernization/decisions.md` in full to find the exact insertion point (top-level sections in order: `Context`, `Q1`–`Q6`, `Bug found during mapping (not a decision, a finding)`, `Sequencing`, `Document map`). Insert this exact text, matching the existing `Q1`/`Q2` style:

```markdown
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
```

- [ ] Step 2: Verify heading structure/ordering: `grep -n "^## " docs/modernization/decisions.md`. Expected: `Q7` appears immediately after the "Bug found during mapping" entry and immediately before `Sequencing`.

- [ ] Step 3: Commit:
```bash
git add docs/modernization/decisions.md
git commit -m "docs: record npm-to-pnpm and make-to-just decision"
```

### Acceptance Criteria
- AC-1: `## Q7` section inserted verbatim (matching the plan's exact text) immediately after the "Bug found during mapping" section's trailing `---` and immediately before `## Sequencing`.
- AC-2: `grep -n "^## " docs/modernization/decisions.md` shows `Q7` directly between the "Bug found during mapping" heading and the "Sequencing" heading.
- AC-3: Change committed with message `docs: record npm-to-pnpm and make-to-just decision`.

---

## Attempt 1 — 2026-07-20T03:15:01Z

### Implementation Plan
- Read `docs/modernization/decisions.md` in full to locate the exact insertion point
- Insert the `## Q7` section verbatim, right after the "Bug found during mapping" section's trailing `---` and before `## Sequencing`
- Verify heading order with `grep -n "^## " docs/modernization/decisions.md`
- Commit the change with the specified message

### Files Changed
- modified `docs/modernization/decisions.md` — added `## Q7: Why swap npm → pnpm and make → just?` decision record section

### New Tests
(none — documentation-only change, no application test applies; plan's Step 2 grep/heading-order check used as the acceptance gate per task instructions)

### Key Decisions
- None — text inserted verbatim as specified in the plan, no deviations

### Lint Output
n/a — documentation-only change, no lint applies

### Test Output
PASS — `grep -n "^## " docs/modernization/decisions.md` confirms `## Q7: Why swap npm → pnpm and make → just?` (line 166) appears immediately after `## Bug found during mapping (not a decision, a finding)` (line 149) and immediately before `## Sequencing` (line 195)

### Commit
`1e25674`

### Outcome: success
