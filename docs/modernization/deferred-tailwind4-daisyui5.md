# Deferred: Tailwind 3 → 4 and daisyUI 4 → 5

**Status:** Deferred by explicit decision on 2026-07-13. Not started.
**Blocked by:** [Plan 1 (web)](../superpowers/plans/2026-07-13-web-next16-react19.md) must be merged first.
**Decision record:** [`decisions.md`](./decisions.md) Q6.

---

## Why this was deferred, not skipped

Tailwind and daisyUI carry **no vulnerabilities**. This is purely cosmetic
modernization, whereas the Next.js work was a genuine security fix.

Tailwind 4 is a **CSS-first config rewrite** — `tailwind.config.ts` disappears
entirely and its contents move into `globals.css` as `@theme` / `@plugin`
directives. That touches every styling entry point at once.

The decisive factor: **this repo has zero UI tests.** A visual regression here
would be caught only by a human clicking through the app. Bundling that risk
into the same pull request as the security fix would mean a broken button could
block a CVE patch. They are separated on purpose.

---

## Current state (as of 2026-07-13)

| Package       | Installed  | Latest   |
| ------------- | ---------- | -------- |
| `tailwindcss` | `^3.4.1`   | `4.3.2`  |
| `daisyui`     | `^4.12.10` | `5.6.18` |
| `postcss`     | `^8`       | `8.x`    |

Relevant files:

- `tailwind.config.ts` — content globs + `plugins: [require('daisyui')]`. **Deleted in Tailwind 4.**
- `postcss.config.mjs` — currently `plugins: { tailwindcss: {} }`. **The PostCSS plugin moved to its own package in Tailwind 4.**
- `src/app/globals.css` — currently the `@tailwind` directives. **Becomes the config.**
- All `src/components/**` — daisyUI class names (`btn`, `card`, `modal`, `input`, …).

---

## Scope of the work

### 1. Tailwind 4 migration

Tailwind ships an official codemod — start there, do not hand-migrate:

```bash
npx @tailwindcss/upgrade@latest
```

Then, by hand:

- **PostCSS plugin moved.** Install `@tailwindcss/postcss` and change
  `postcss.config.mjs` from `tailwindcss: {}` to `'@tailwindcss/postcss': {}`.
- **`tailwind.config.ts` is deleted.** Content globs are now auto-detected;
  theme customisation moves into `globals.css` under `@theme`. This repo's
  config only sets content globs and the daisyUI plugin, so there is very
  little to port — the file is nearly empty.
- **`@tailwind base/components/utilities` → a single `@import "tailwindcss";`**
  in `globals.css`.
- **Renamed/removed utilities.** The codemod handles most. Watch for
  `shadow-sm` → `shadow-xs`, `outline-none` → `outline-hidden`, and the
  removal of deprecated opacity utilities (`bg-opacity-*`).
- **Browser support floor rises** (Safari 16.4+, Chrome 111+). Confirm this is
  acceptable — it almost certainly is for this app.

### 2. daisyUI 5 migration

daisyUI 5 requires Tailwind 4 — the two **must** be done together, which is
part of why this is one deferred task and not two.

- Installed as a CSS plugin now, not a JS plugin:
  `@plugin "daisyui";` in `globals.css` (no more `require('daisyui')`).
- Theme configuration moves to `@plugin "daisyui" { themes: ... }`.
- Several component class names and modifiers changed between v4 and v5.
  The components most used in this repo, and therefore most at risk:
  `btn`, `card`, `modal`, `input`, `table`, `divider`, `navbar`.
- Check every file under `src/components/ui/`, `src/components/forms/`, and
  `src/components/popup/` — those are where the daisyUI classes are concentrated.

---

## Verification

There are no automated UI tests, so verification is **manual and mandatory**.
Take before/after screenshots of every screen.

Walk the full app with a local validator running (`make up/build`):

- [ ] `/` — game login form
- [ ] `/admin` — admin login form; init-pool form and popup
- [ ] `/admin` — admin dashboard: user list, add-user popup, deposit popup
- [ ] `/<username>` — user dashboard: self card, other-user list, transfer popup, multi-transfer popup + summary table
- [ ] `/<username>/dealer` — dealer dashboard, take-token popup
- [ ] `/game` — game list, create-game popup
- [ ] `/game/<gameName>` — game details card, join/quit popups, transfer-to-game popup
- [ ] End-game popups (both user and admin variants)
- [ ] Toast notifications (`react-hot-toast`) still render correctly
- [ ] Responsive: check at mobile width — the dashboards and tables are the likely breakages

Also confirm the build output did not balloon:

```bash
npm run build
```

---

## Recommendation for whoever picks this up

Do it as **one pull request, on its own, with screenshots in the description.**
Do not bundle it with any functional change. The whole reason it was carved out
is so that a reviewer can evaluate it purely on "does the app still look right",
with no correctness question mixed in.

If the codemod output looks large or confusing, it is entirely reasonable to
stop and report rather than push through — nothing depends on this work.
