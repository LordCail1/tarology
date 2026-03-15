# Local Dev Runbook

This is the canonical local startup and smoke-test guide for the current `main` branch.

Use this doc when you want to:
- bring the full local stack up,
- verify the merged branch state on your machine,
- run a manual smoke pass after merging to `main`,
- or hand local testing steps to another agent or human reviewer.

## Current Local Shape

The current local stack is:
- web: Next.js on `http://localhost:3000`
- api: NestJS on `http://localhost:3001`
- database: PostgreSQL

Important current behavior:
- auth, profile, preferences, deck catalog, and reading durability APIs are real and backed by Postgres
- the Reading Studio shell now loads reading history/workspace state from the API
- `New Reading` is enabled and creates durable readings through the API
- canvas mode switches and card move/rotate/flip interactions persist durably
- browser `localStorage` now only keeps layout widths and the last active reading selection

That means a good smoke pass needs to cover both:
- real API flows
- real auth/onboarding flows
- real web-shell history/create/restore behavior
- direct manual API checks for durable readings and canvas commands

## Prerequisites

- Node/npm installed
- Google OAuth credentials available locally if you want to test the real sign-in flow
- one of:
  - a local PostgreSQL instance, or
  - Prisma's embedded Postgres dev server

## Recommended Local Startup

Use 3 terminals.

### Terminal 1: database

From the repo root:

```bash
cd apps/api
npx prisma dev --name tarology-local
```

Once Prisma dev is running:
- press `t`
- copy the printed `DATABASE_URL`

### Terminal 2: API

From the repo root:

```bash
if [ -f apps/api/.env ]; then
  set -a
  source apps/api/.env
  set +a
fi

export DATABASE_URL='PASTE_THE_PRISMA_TCP_DATABASE_URL_HERE'
export TEST_DATABASE_URL="$DATABASE_URL"

npm run prisma:migrate:deploy --workspace @tarology/api
npm run prisma:seed --workspace @tarology/api
npm run dev:api
```

Notes:
- `TEST_DATABASE_URL` is needed for local `npm run ci:checks`
- if you keep local untracked API env vars in `apps/api/.env`, sourcing that file is the safest local setup for Google auth
- `npm run dev:api` is not a watch server today; if you edit backend code, rerun the command

### Terminal 3: web

From the repo root:

```bash
npm run dev:web
```

## Alternate Database Setup

If you already have a normal local Postgres instance, you can skip Prisma dev and instead export:

```bash
export DATABASE_URL='postgresql://postgres:postgres@127.0.0.1:5432/tarology?schema=public'
export TEST_DATABASE_URL="$DATABASE_URL"
```

Then run:

```bash
npm run prisma:migrate:deploy --workspace @tarology/api
npm run prisma:seed --workspace @tarology/api
```

## Browser Smoke Test

Use a desktop browser for the first pass so you can test the desktop sidebar resizing behavior.

### 1. Auth gate

Open:

```text
http://localhost:3000/reading
```

Expected:
- if logged out, you are redirected to `/login?returnTo=%2Freading`

### 2. Login

From `/login`, click Google sign-in.

Expected:
- sign-in completes against the API callback on `http://localhost:3001/v1/auth/google/callback`

### 3. First-run onboarding

If this user has no saved default deck, expected behavior is:
- `/reading` redirects to `/onboarding?returnTo=%2Freading`
- the onboarding page loads the seeded deck catalog
- selecting the Thoth deck and continuing redirects back to `/reading`

For returning users with an existing default deck, expected behavior is:
- `/reading` loads directly

### 4. Reading Studio shell

On `/reading`, verify:
- the profile shell renders
- the default deck label is shown
- the `New Reading` action is enabled
- left and right sidebars can be collapsed and expanded
- on desktop, both resize handles work
- refreshing the page preserves sidebar widths

### 5. Reading history and creation

Verify:
- clicking `New Reading` creates a new reading and places it at the top of history
- selecting different readings in the history rail swaps workspaces from the API
- refreshing restores the active reading from the API and reselects the last active reading id

### 6. Canvas behavior

Verify:
- `freeform` and `grid` modes can be toggled
- card drag/flip/rotate interactions work
 - refreshing the page restores the current workspace state from the backend
 - switching to another reading and back restores the prior reading's exact canvas state

### 7. Optional restart check

After creating and editing a reading:
- stop the API server
- start it again
- refresh `/reading`

Expected:
- the same readings still load
- the edited workspace state survives the restart

## Extra API Smoke Test

The Reading Studio UI now exercises the durable reading create/history/restore flow directly, but it is still useful to test the APIs in isolation after logging in.

The easiest path is the browser devtools console while you are already on `http://localhost:3000`, because the browser session cookie is already present.

```js
const api = "http://localhost:3001";

const created = await fetch(`${api}/v1/readings`, {
  method: "POST",
  credentials: "include",
  headers: {
    "Content-Type": "application/json",
    "Idempotency-Key": crypto.randomUUID(),
  },
  body: JSON.stringify({
    rootQuestion: "What should I focus on next?",
    deckId: "thoth",
    deckSpecVersion: "thoth-v1",
    canvasMode: "freeform",
  }),
}).then((response) => response.json());

const list = await fetch(`${api}/v1/readings`, {
  credentials: "include",
}).then((response) => response.json());

const detail = await fetch(`${api}/v1/readings/${created.readingId}`, {
  credentials: "include",
}).then((response) => response.json());

const switched = await fetch(`${api}/v1/readings/${created.readingId}/commands`, {
  method: "POST",
  credentials: "include",
  headers: {
    "Content-Type": "application/json",
    "Idempotency-Key": crypto.randomUUID(),
  },
  body: JSON.stringify({
    commandId: crypto.randomUUID(),
    expectedVersion: 1,
    type: "switch_canvas_mode",
    payload: {
      canvasMode: "grid",
    },
  }),
}).then((response) => response.json());

const moved = await fetch(`${api}/v1/readings/${created.readingId}/commands`, {
  method: "POST",
  credentials: "include",
  headers: {
    "Content-Type": "application/json",
    "Idempotency-Key": crypto.randomUUID(),
  },
  body: JSON.stringify({
    commandId: crypto.randomUUID(),
    expectedVersion: 2,
    type: "move_card",
    payload: {
      cardId: created.canvas.cards[0].cardId,
      grid: { column: 7, row: 5 },
    },
  }),
}).then((response) => response.json());

const rotated = await fetch(`${api}/v1/readings/${created.readingId}/commands`, {
  method: "POST",
  credentials: "include",
  headers: {
    "Content-Type": "application/json",
    "Idempotency-Key": crypto.randomUUID(),
  },
  body: JSON.stringify({
    commandId: crypto.randomUUID(),
    expectedVersion: 3,
    type: "rotate_card",
    payload: {
      cardId: created.canvas.cards[0].cardId,
      deltaDeg: 47,
    },
  }),
}).then((response) => response.json());

const flipped = await fetch(`${api}/v1/readings/${created.readingId}/commands`, {
  method: "POST",
  credentials: "include",
  headers: {
    "Content-Type": "application/json",
    "Idempotency-Key": crypto.randomUUID(),
  },
  body: JSON.stringify({
    commandId: crypto.randomUUID(),
    expectedVersion: 4,
    type: "flip_card",
    payload: {
      cardId: created.canvas.cards[0].cardId,
    },
  }),
}).then((response) => response.json());

const archived = await fetch(`${api}/v1/readings/${created.readingId}/commands`, {
  method: "POST",
  credentials: "include",
  headers: {
    "Content-Type": "application/json",
    "Idempotency-Key": crypto.randomUUID(),
  },
  body: JSON.stringify({
    commandId: crypto.randomUUID(),
    expectedVersion: 1,
    type: "archive_reading",
    payload: {},
  }),
}).then((response) => response.json());

const reopened = await fetch(`${api}/v1/readings/${created.readingId}/commands`, {
  method: "POST",
  credentials: "include",
  headers: {
    "Content-Type": "application/json",
    "Idempotency-Key": crypto.randomUUID(),
  },
  body: JSON.stringify({
    commandId: crypto.randomUUID(),
    expectedVersion: 2,
    type: "reopen_reading",
    payload: {},
  }),
}).then((response) => response.json());

const deleted = await fetch(`${api}/v1/readings/${created.readingId}/commands`, {
  method: "POST",
  credentials: "include",
  headers: {
    "Content-Type": "application/json",
    "Idempotency-Key": crypto.randomUUID(),
  },
  body: JSON.stringify({
    commandId: crypto.randomUUID(),
    expectedVersion: 3,
    type: "delete_reading",
    payload: {},
  }),
}).then((response) => response.json());
```

Expected API results:
- create returns a UUID reading with 78 fixed card assignments
- list includes the new reading
- detail matches the created reading
- switch/move/rotate/flip update the `canvas` projection and increment `version`
- archive changes the reading to `archived`
- reopen changes it back to `active`
- delete changes it to `deleted`
- after delete, `GET /v1/readings/:id` returns `404`

## Local Verification Command

If you want the full local CI-equivalent pass after setup:

```bash
npm run ci:checks
```

This expects:
- `DATABASE_URL` to be set
- `TEST_DATABASE_URL` to be set or to fall back to `DATABASE_URL`

## Shutdown

- stop the web server with `Ctrl+C`
- stop the API server with `Ctrl+C`
- stop Prisma dev with `q`

## When Smoke Tests Fail

Common failure modes:
- login fails immediately:
  - Google OAuth env vars are missing from the API shell
- API boot fails:
  - `DATABASE_URL` is missing or points to a dead database
- `npm run ci:checks` fails locally:
  - `TEST_DATABASE_URL` / `DATABASE_URL` are not exported in the shell running the command
- `/reading` loops through onboarding:
  - preferences/default deck was not saved successfully
- studio history looks "fake":
  - that is currently expected; the web shell has not yet been wired to the durable reading endpoints
