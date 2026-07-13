# Task 2 Log: Upgrade to React 19 and fix render-phase side effects

## Task Context

### Plan Section

### Task 2: Upgrade to React 19 and fix render-phase side effects

Next 15 fully supports React 19, so the React major can land on its own. React 19 is stricter about side effects during render — the two `router.replace()` calls below run **during the render phase**, which React 18 tolerated but React 19 warns on / can loop on. They are genuine bugs today (they fire on every render until the navigation commits); React 19 just makes them visible.

**Files:**
- Modify: `package.json` (react, react-dom, @types/react, @types/react-dom)
- Modify: `src/app/react-query-provider.tsx:8`
- Modify: `src/app/page.tsx:19`
- Modify: `src/app/game/page.tsx:39`

**Interfaces:**
- Consumes: `npm run lint`, `npm run typecheck` from Task 1.
- Produces: a React 19 codebase that Task 3 upgrades Next on top of.

- [ ] **Step 1: Install React 19 and its types**

```bash
npm install react@19.2.7 react-dom@19.2.7
npm install --save-dev @types/react@19 @types/react-dom@19
```

- [ ] **Step 2: Run typecheck to surface the React 19 type breakage**

Run: `npm run typecheck`
Expected: **FAIL** is possible and fine at this step. The most common React 19 type break is that `ReactNode` no longer implicitly includes `{}`, and that children props must be declared explicitly. Note every error; they are fixed in Step 3 and Step 5.

If it passes clean, that's fine too — go straight to Step 3.

- [ ] **Step 3: Fix the QueryClient being reconstructed on every render**

`src/app/react-query-provider.tsx` currently calls `useState(new QueryClient())`, which **constructs a fresh QueryClient on every single render** and throws it away — `useState` only keeps the first, but the constructor still runs each time. It also calls `setDefaultOptions` during render. Both are render-phase side effects.

Replace the whole file with:

```tsx
'use client';

import React, { ReactNode, useState } from 'react';
import { ReactQueryStreamedHydration } from '@tanstack/react-query-next-experimental';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';

const makeQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnMount: true,
        refetchOnReconnect: true,
        refetchOnWindowFocus: true,
        refetchIntervalInBackground: true,
        retry: 0,
        staleTime: 5000,
      },
      mutations: {
        retry: 0,
      },
    },
  });

export function ReactQueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(makeQueryClient);

  return (
    <QueryClientProvider client={client}>
      <ReactQueryStreamedHydration>{children}</ReactQueryStreamedHydration>
    </QueryClientProvider>
  );
}
```

Note `useState(makeQueryClient)` — passing the **function**, not calling it. That is the lazy-initializer form; the constructor now runs exactly once.

- [ ] **Step 4: Move the two render-phase redirects into effects**

Replace `src/app/page.tsx` entirely with:

```tsx
'use client';

import { useEffect } from 'react';
import { useLocalStorage } from '@/components/custom-hooks/use-local-storage';
import GameLoginForm from '@/components/forms/game-login-form';
import { LocalStorageKey } from '@/enums/local-storage-key.enum';
import { NextPage } from 'next';
import { useRouter } from 'next/navigation';

const GamePage: NextPage = () => {
  const { value: username } = useLocalStorage(LocalStorageKey.USER, '');
  const { value: userPublicKey } = useLocalStorage(
    LocalStorageKey.USER_PUBLIC_KEY,
    ''
  );

  const router = useRouter();

  const isLoggedIn = username.length > 0 && userPublicKey.length > 0;

  useEffect(() => {
    if (isLoggedIn) {
      router.replace(`/${encodeURI(username)}`);
    }
  }, [isLoggedIn, username, router]);

  if (isLoggedIn) return null;

  return <GameLoginForm />;
};

export default GamePage;
```

In `src/app/game/page.tsx`, find this block (around line 38):

```tsx
  if (!userPublicKey || !username) {
    router.replace('/');
  }
```

Replace it with an effect. Add `useEffect` to the existing `react` import, then put this with the other hooks (**above** any early `return`, since hooks may not run conditionally):

```tsx
  const isLoggedOut = !userPublicKey || !username;

  useEffect(() => {
    if (isLoggedOut) {
      router.replace('/');
    }
  }, [isLoggedOut, router]);
```

and then, where the old `if` block was, return nothing while the redirect is in flight:

```tsx
  if (isLoggedOut) return null;
```

- [ ] **Step 5: Fix any remaining React 19 type errors**

Run: `npm run typecheck`

Fix each reported error. Do **not** silence them with `any` or `@ts-expect-error`. The expected class of error is components that take children without declaring the prop — give them an explicit `{ children }: { children: ReactNode }`.

Repeat until `npm run typecheck` exits 0.

- [ ] **Step 6: Confirm no other render-phase navigation was missed**

Run:
```bash
grep -rn "router.replace\|router.push" src/
```

Expected: every hit is inside a `useEffect(...)` body or an event handler (e.g. an `onClick`/`onSubmit`). The known-good ones already inside effects are in `src/app/[username]/page.tsx`, `src/app/[username]/dealer/page.tsx`, `src/app/game/[gameName]/page.tsx`, and `src/components/queries/user/user-end-game-queries.ts`. If any hit sits bare in a component body, move it into a `useEffect` using the same pattern as Step 4.

- [ ] **Step 7: Verify lint, typecheck, and build**

Run:
```bash
npm run typecheck && npm run lint && npm run build
```
Expected: all three succeed.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json src/
git commit -m "feat(web): upgrade to React 19

Fixes render-phase side effects that React 19 surfaces:
- QueryClient was reconstructed on every render (useState eager arg)
- router.replace() called during render in page.tsx and game/page.tsx"
```

### Acceptance Criteria
- AC-1: `npm run typecheck` exits 0.
- AC-2: `npm run lint` exits 0.
- AC-3: `npm run build` succeeds.
- AC-4: `react` and `react-dom` are exactly `19.2.7`; `@types/react` and `@types/react-dom` are `19.x`.
- AC-5: No render-phase `router.replace`/`router.push` calls remain — every hit is inside a `useEffect` body or an event handler.
- AC-6: No `any` or `@ts-expect-error` used to silence type errors.
- AC-7: `anchor/`, `@coral-xyz/anchor`, `@solana/web3.js`, `@solana/spl-token` untouched; Tailwind, daisyUI, TypeScript, Next versions untouched.

---

## Attempt 1 — 2026-07-13T01:47:03Z

### Implementation Plan
- Install `react@19.2.7`, `react-dom@19.2.7`, `@types/react@19`, `@types/react-dom@19` exactly as specified.
- Run typecheck first to see if React 19 types break anything before touching code (plan Step 2).
- Apply the plan's exact replacement files for `react-query-provider.tsx` and `page.tsx`, and the exact diff for `game/page.tsx`.
- Grep for all `router.replace`/`router.push` call sites and verify every one is inside a `useEffect` or event handler; fix any that aren't using the same pattern as Step 4.
- Run typecheck + lint + build as the final gate before committing.

### Files Changed
- modified `package.json` — react/react-dom/@types bumped to 19
- modified `package-lock.json` — lockfile update for the above
- modified `src/app/react-query-provider.tsx` — lazy `useState(makeQueryClient)` initializer, QueryClient built once with `defaultOptions` in the constructor instead of `setDefaultOptions` during render
- modified `src/app/page.tsx` — moved `router.replace` into `useEffect`, hooks run unconditionally, early `return null` while redirect is in flight
- modified `src/app/game/page.tsx` — added `useEffect` import; moved `router.replace('/')` into `useEffect` keyed on `isLoggedOut`, added `if (isLoggedOut) return null;` above the pending-data early return
- modified `src/components/forms/create-game-popup/create-game-popup.tsx` — found during the Step 6 grep sweep: `router.replace('/')` sat bare in a render-phase `if (!username) {...}` block, same bug class as the plan's two call-outs but not itself named in the plan. Moved to `useEffect` keyed on `[username, router]`, added `if (!username) return null;` above the `isPopupOpen` early return, added `useEffect` to the `react` import.

### New Tests
(none — no web test suite exists; plan mandates typecheck+lint+build as the gate)

### Key Decisions
- Fixed `create-game-popup.tsx`'s render-phase `router.replace` even though the plan's Step 6 "known-good" list didn't mention it and didn't explicitly call it out as a File to modify. The grep sweep in Step 6 explicitly instructs "If any hit sits bare in a component body, move it into a useEffect using the same pattern as Step 4" — this hit met that criterion, so I fixed it rather than leaving a known render-phase bug in place. Applied the identical pattern (guard hook above early return, `return null` instead of `return;`) for consistency.
- Did not gate the create-game-popup effect on `isPopupOpen` — preserved the original (already slightly redundant, since `game/page.tsx` has its own logged-out redirect) behavior as closely as possible rather than introducing a new behavioral change beyond moving the side effect out of render.
- `npm install react@19.2.7` produces `"^19.2.7"` in package.json (npm's default caret behavior for an explicit version argument) rather than an exact `"19.2.7"` pin — this matches running the plan's literal install command; the lockfile pins the exact resolved version (verified: react 19.2.7, react-dom 19.2.7, @types/react 19.2.17, @types/react-dom 19.2.3).
- `npm run typecheck` was clean both before and after the React 19 upgrade — no type errors surfaced, so Step 5 (fixing children-prop types) had nothing to do.

### Lint Output
PASS
(1 pre-existing warning in eslint.config.mjs: `import/no-anonymous-default-export` — unrelated to this task, 0 errors)

### Test Output
PASS
- `npm run typecheck`: exit 0, no errors
- `npm run lint`: exit 0, 0 errors (1 pre-existing warning)
- `npm run build`: succeeded, all 7 routes compiled/generated

### Commit
`2d12f24`

### Outcome: success
