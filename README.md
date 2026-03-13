# Tarology v2

Greenfield rewrite with a modular monorepo foundation.

Start here:
- [docs/product/README.md](./docs/product/README.md) - modular product requirements index (PRD set)
- [CHARTER.md](./CHARTER.md) - canonical product and engineering spec
- [PLAN.md](./PLAN.md) - current implementation status and next queue
- [AGENTS.md](./AGENTS.md) - Codex/new-session bootstrap instructions
- [docs/local-dev-runbook.md](./docs/local-dev-runbook.md) - canonical local startup + smoke-test guide

Current workspace layout:
- `apps/web` - Next.js UI shell
- `apps/api` - NestJS API foundation
- `packages/shared` - shared contracts/types

Current deployment status:
- Vercel deploys the Next.js web shell today.
- Public API hosting and full-stack CD are intentionally scheduled for the first gate after the durable multi-reading MVP (create/switch/delete/restore reading state).
- Gate -1 profile/preferences onboarding is now part of the local repo baseline:
  - persisted Google-backed user/profile/preferences records in Postgres,
  - seeded Thoth deck catalog entry + API deck spec manifest,
  - `/onboarding` first-run default deck selection,
  - `/reading` gating on authenticated session plus saved default deck.

Root scripts:
- `npm run dev:web`
- `npm run dev:api`
- `npm run typecheck`
- `npm run ci:checks`

Recommended local startup path:
- use [docs/local-dev-runbook.md](./docs/local-dev-runbook.md)
- it covers database bring-up, API/web startup, auth prerequisites, current mock-vs-real behavior, and manual smoke tests

Database local setup:
- API requires `DATABASE_URL` in production and for local test/CI execution.
- Tests use `TEST_DATABASE_URL` when set; otherwise they fall back to `DATABASE_URL`.
- One local option is Prisma's embedded Postgres:
  - run `cd apps/api && npx prisma dev --name tarology-local`
  - press `t` in the Prisma dev terminal to print the TCP connection strings
  - export `DATABASE_URL` to the printed main database URL
  - optionally export `TEST_DATABASE_URL="$DATABASE_URL"`
  - run `npm run prisma:migrate:dev --workspace @tarology/api`
  - run `npm run prisma:seed --workspace @tarology/api`
- Repo-level `npm run ci:checks` now expects those database env vars to be present locally.

Google auth local setup:
- API env vars:
  - `DATABASE_URL`
  - `SESSION_SECRET`
  - `WEB_APP_URL` (default `http://localhost:3000`)
  - `API_BASE_URL` (default `http://localhost:3001`)
  - `GOOGLE_OAUTH_CLIENT_ID`
  - `GOOGLE_OAUTH_CLIENT_SECRET`
  - `GOOGLE_OAUTH_CALLBACK_URL` (default `http://localhost:3001/v1/auth/google/callback`)
  - `TEST_DATABASE_URL` (optional; falls back to `DATABASE_URL` for tests)
- Web env vars:
  - `NEXT_PUBLIC_API_BASE_URL`
  - `NEXT_PUBLIC_API_BASE_URL` must be browser-reachable; the login link and reading auth check use this public origin
- First-run UX notes:
  - authenticated users without a saved `defaultDeckId` are redirected from `/reading` to `/onboarding`
  - `/onboarding` currently offers the seeded Thoth deck only
- Google OAuth callback URI for local development:
  - `http://localhost:3001/v1/auth/google/callback`

Deck assets:
- The repo currently vendors the Thoth deck media from `/home/ram2c/gitclones/tarology_old/public/images/cards/thoth`.
- This branch assumes that reuse is authorized by the project owner for this repo.
- Broader long-term deck art/licensing strategy remains an open product decision.

Delivery docs:
- [docs/engineering-workflow.md](./docs/engineering-workflow.md)
- [docs/ci-cd-vercel.md](./docs/ci-cd-vercel.md)
- [docs/codex-continuity-research.md](./docs/codex-continuity-research.md)
- [docs/codex-code-review.md](./docs/codex-code-review.md)

Rule:
- all implementation work must map back to the charter
