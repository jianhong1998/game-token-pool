# Task 2 Log: Switch `Dockerfile.client` from npm to pnpm

## Task Context

### Plan Section
### Task 2: Switch `Dockerfile.client` from npm to pnpm

**Files:**
- Modify: `Dockerfile.client`

**Interfaces:**
- Consumes: `pnpm-lock.yaml` and `packageManager` from Task 1.
- Produces: a `client` image built with pnpm — nothing downstream depends on this beyond the running container itself.

Current `Dockerfile.client`:

```dockerfile
FROM node:22-slim

# ENV PNPM_HOME="/pnpm"
# ENV PATH="$PNPM_HOME:$PATH"
# RUN corepack enable

RUN apt update \
    && apt install --assume-yes --no-install-recommends \
        build-essential \
        python3

WORKDIR /apps/crud-dapp

# ==================================================
# PNPM
# ==================================================
# COPY ./package.json ./
# COPY ./pnpm-lock.yaml ./
# RUN pnpm install --frozen-lockfile

# COPY . .
# CMD [ "pn", "run", "dev" ]

# ==================================================
# NPM
# ==================================================
COPY ./package*.json ./
RUN npm ci

COPY . .
CMD [ "npm", "run", "dev" ]
```

- [ ] **Step 1: Replace the npm block with the pnpm block, uncommented**

New `Dockerfile.client`:

```dockerfile
FROM node:22-slim

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

RUN apt update \
    && apt install --assume-yes --no-install-recommends \
        build-essential \
        python3

WORKDIR /apps/crud-dapp

COPY ./package.json ./
COPY ./pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
CMD [ "pnpm", "run", "dev" ]
```

Note: the original commented-out sketch had `CMD [ "pn", "run", "dev" ]` (typo for `pnpm`) — corrected to `pnpm` here.

- [ ] **Step 2: Build the image to verify**

Run: `docker compose build client`

Expected: build succeeds (image layers for `corepack enable` and `pnpm install --frozen-lockfile` complete without error). This will take a few minutes on first run (base image pull + `apt install`).

- [ ] **Step 3: Commit**

```bash
git add Dockerfile.client
git commit -m "build: switch Dockerfile.client from npm to pnpm"
```

### Acceptance Criteria
- AC-1: `Dockerfile.client` contains the uncommented pnpm block (corepack enable, COPY package.json + pnpm-lock.yaml, `pnpm install --frozen-lockfile`, `CMD [ "pnpm", "run", "dev" ]`), no npm block remains.
- AC-2: `docker compose build client` succeeds — layers for `corepack enable` and `pnpm install --frozen-lockfile` complete without error.
- AC-3: Change committed as `build: switch Dockerfile.client from npm to pnpm`.

---

## Attempt 1 — 2026-07-20T03:22:06Z

### Implementation Plan
- Confirm worktree branched from current tip already has `pnpm-lock.yaml` at repo root (Wave 1 landed)
- Replace `Dockerfile.client`'s commented pnpm block + active npm block with the uncommented pnpm block per plan (verbatim)
- Run `docker compose build client` to verify the image builds cleanly with `corepack enable` + `pnpm install --frozen-lockfile`
- Commit `Dockerfile.client` only

### Files Changed
- modified `Dockerfile.client` — replaced npm install block (`COPY package*.json`, `npm ci`, `CMD ["npm","run","dev"]`) with uncommented pnpm block (`corepack enable`, `COPY package.json`/`pnpm-lock.yaml`, `pnpm install --frozen-lockfile`, `CMD ["pnpm","run","dev"]`); typo `"pn"` from the original commented sketch corrected to `"pnpm"`

### New Tests
(none — no application test applies; acceptance gate is `docker compose build client` per plan Step 2)

### Key Decisions
- Re-ran `docker compose build client --progress=plain` a second time after the first build to capture a clean, non-interleaved log (the first run's TTY progress output collapsed into garbled single-line output when piped through `tee`/`tail` due to carriage-return-based progress redraws). Second run hit Docker's build cache for all 8 layers and confirmed exit code 0 — same successful build, just a cleaner log capture, not a second independent build.

### Lint Output
n/a — no lint step in this task's plan (Dockerfile-only change, no app source touched)

### Test Output
PASS — `docker compose build client` exit code 0 both times.

First run (raw progress, garbled by TTY redraw but completed, image `task-2-switch-dockerfile-to-pnpm-client:latest` confirmed present via `docker images` afterward: 2.02GB).

Second run (`--progress=plain`, full log at /tmp/docker-build-task2-attempt1-plain.log), key lines:
```
#7 [3/8] RUN apt update     && apt install --assume-yes --no-install-recommends         build-essential         python3
#7 CACHED

#9 [2/8] RUN corepack enable
#9 CACHED

#11 [7/8] RUN pnpm install --frozen-lockfile
#11 CACHED

#14 exporting to image
#14 exporting layers done
#14 writing image sha256:eeedcfe79d9a24d8a5ffbbbfd340cba9597fe9a06ac348fb83174f53edcd4ee4 done
#14 naming to docker.io/library/task-2-switch-dockerfile-to-pnpm-client done
 Image task-2-switch-dockerfile-to-pnpm-client Built
```
No errors, no `failed to solve`, all 8 layers completed (cached on rerun, built fresh on first run), image exported and named successfully.

### Commit
`e77d9b7`

### Outcome: success
