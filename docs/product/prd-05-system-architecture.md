# PRD 05 - System Architecture

Source: `CHARTER.md` (v0.3 extraction)
Coverage: section 8

## 8) System Architecture
### 8.1 Repository Shape
Monorepo:
- `apps/web` (Next.js frontend)
- `apps/api` (NestJS backend)
- `apps/worker` (workflow workers)
- `packages/shared` (types/contracts)
- `packages/prompt-skills` (versioned AI skills)

NestJS module boundaries (required):
- `identity` (app auth/session/user)
- `provider-connections` (LLM credentials + capability matrix)
- `reading-studio` (readings, cards, threads, interpretations)
- `knowledge` (retrieval caches, source metadata, citation policy)
- `profile` (stats and progression)
- `integration` (event publishing, webhooks, external ports)

Rule:
- Modules communicate through explicit service interfaces and event contracts.
- No cross-module direct database access.
- Cross-module writes must go through application services, not repositories.

### 8.2 Runtime Components
- Frontend: Next.js (App Router) for UI only.
- Backend: NestJS modular monolith for domain APIs.
- Database: PostgreSQL (source of truth).
- ORM: Prisma.
- Workflow layer: durable workflows for AI jobs.
- Secret vault layer: encryption and token lifecycle for provider credentials.
- Realtime: SSE (default) with optional WebSocket extension.

Frontend composition rules:
- Build an App Shell that hosts feature “studios” as isolated route groups.
- V1 ships `Reading Studio`.
- Future studios (`Notes Studio`, `Social Studio`) plug into the same shell with independent state slices and APIs.
- Shared UI primitives live in a neutral package; studio-specific components stay inside studio modules.

### 8.3 Why Separate NestJS Backend
This satisfies scale/readiness goals and keeps domain logic centralized:
- clear service boundaries,
- easier worker integration,
- easier horizontal API scaling,
- avoids frontend framework lock-in for core backend behavior.

