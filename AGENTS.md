# Tarology Agent Instructions

This file is the session bootstrap for any new Codex agent working in this repo.

## 1) First-Read Order
1. Read `CHARTER.md` fully.
2. Read `PLAN.md` fully.
3. Read `docs/engineering-workflow.md`.
4. Read `docs/ci-cd-vercel.md`, `docs/codex-continuity-research.md`, and `docs/codex-code-review.md` when changing delivery, review, or handoff behavior.
5. If there is any conflict, follow `CHARTER.md` for product intent and update `PLAN.md` to reflect the chosen implementation path.

## 2) Product Intent (Non-Negotiable)
- Beginner-first tarot reading experience.
- Card identity and reversal meaning are assigned once at reading creation.
- Cards are not sampled at click/flip time.
- Reading state must be durable and restorable.
- Interpretation flow supports large card sets, warning users for high-card runs and allowing explicit cancellation.
- Model provider access must support both credential modes behind one interface:
  - `api_key`
  - `oauth` (capability-driven per provider)

## 3) Architecture Constraints
- Keep a modular monolith:
  - `apps/web` = Next.js UI
  - `apps/api` = NestJS API
  - `packages/shared` = shared contracts/types
- Keep module boundaries explicit in NestJS (`identity`, `provider-connections`, `reading-studio`, then `knowledge`, `profile`, `workflow` when added).
- Design all boundaries so reading studio can be embedded into a bigger multi-page product later (notes mode/social surfaces).

## 4) Current Implementation Snapshot
- Monorepo scaffold is in place.
- API has a bootstrap `POST /v1/readings` path with seeded shuffle assignment and response contract.
- UI is still a shell page.
- Persistence is currently in-memory for readings (not production-safe yet).
- See `PLAN.md` for exact next backlog.

## 5) Engineering Rules
- Keep changes modular and small.
- Preserve deterministic-at-creation semantics while keeping randomness cryptographically strong.
- Prefer command-style mutation interfaces for meaningful state changes.
- Keep shared contracts in `packages/shared` and import from there.
- Do not commit directly on `main`; use branch + PR workflow.
- Every PR must include a Codex review trigger comment using `@codex review` (manual or auto workflow).
- Run `npm run ci:checks` before ending a working session.

## Review guidelines
When performing code review, prioritize:
- P0/P1 behavioral regressions before style concerns.
- Data-loss and persistence regressions in reading state.
- Violations of deterministic-at-creation card assignment.
- Security issues in auth/provider credentials/secrets handling.
- Cost/latency regressions in interpretation pipelines.
- Missing tests or verification for risk-heavy changes.

## 7) End-of-Session Handoff Protocol
Before ending a session:
1. Update `PLAN.md` with completed work and remaining tasks.
2. Record any new decisions and risks.
3. Include exact next commands for the next agent.
