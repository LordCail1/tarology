# Tarology v2

Greenfield rewrite with a modular monorepo foundation.

Start here:
- [docs/product/README.md](./docs/product/README.md) - modular product requirements index (PRD set)
- [CHARTER.md](./CHARTER.md) - canonical product and engineering spec
- [PLAN.md](./PLAN.md) - current implementation status and next queue
- [AGENTS.md](./AGENTS.md) - Codex/new-session bootstrap instructions

Current workspace layout:
- `apps/web` - Next.js UI shell
- `apps/api` - NestJS API foundation
- `packages/shared` - shared contracts/types

Root scripts:
- `npm run dev:web`
- `npm run dev:api`
- `npm run typecheck`
- `npm run ci:checks`

Google auth local setup:
- API env vars:
  - `SESSION_SECRET`
  - `WEB_APP_URL` (default `http://localhost:3000`)
  - `API_BASE_URL` (default `http://localhost:3001`)
  - `GOOGLE_OAUTH_CLIENT_ID`
  - `GOOGLE_OAUTH_CLIENT_SECRET`
  - `GOOGLE_OAUTH_CALLBACK_URL` (default `http://localhost:3001/v1/auth/google/callback`)
- Web env vars:
  - `NEXT_PUBLIC_API_BASE_URL`
  - `NEXT_PUBLIC_API_BASE_URL` must be browser-reachable; the login link and reading auth check use this public origin
- Google OAuth callback URI for local development:
  - `http://localhost:3001/v1/auth/google/callback`

Delivery docs:
- [docs/engineering-workflow.md](./docs/engineering-workflow.md)
- [docs/ci-cd-vercel.md](./docs/ci-cd-vercel.md)
- [docs/codex-continuity-research.md](./docs/codex-continuity-research.md)
- [docs/codex-code-review.md](./docs/codex-code-review.md)

Rule:
- all implementation work must map back to the charter
