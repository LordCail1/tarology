# Tarology v2 Plan

Last updated: 2026-03-08 (America/Toronto)
Owner: Product + Engineering

## Goal
Ship a reliable V1 foundation for Tarology v2 that matches the charter: deterministic-at-creation card assignment, durable reading state, modular NestJS architecture, and AI interpretation pipeline that can scale from small card groups to high-card runs with warning and cancel controls.

## Current State
- Charter is defined in `CHARTER.md` (v0.2).
- Monorepo scaffold exists with `apps/web`, `apps/api`, `packages/shared`.
- API includes `POST /v1/readings` with seeded Fisher-Yates assignment + reversal bits.
- Shared contracts exist for reading creation.
- UI is still minimal placeholder.
- Reading persistence is currently in-memory and must be replaced with database-backed state.
- Repository is live on GitHub: `https://github.com/LordCail1/tarology`.
- `main` branch protection is active:
  - pull request required,
  - required checks: `ci-checks`, `request-codex-review`,
  - conversation resolution required,
  - force-push and delete disabled.
- CI/CD workflow is active in `.github/workflows/ci-cd.yml`:
  - PR: `ci-checks` + preview deployment,
  - `main`: `ci-checks` + production deployment.
- Vercel repository secrets are configured in GitHub:
  - `VERCEL_TOKEN`,
  - `VERCEL_ORG_ID`,
  - `VERCEL_PROJECT_ID_WEB`.

## Completed So Far
- Created greenfield repo structure and workspace scripts.
- Added NestJS app module skeleton with domain modules:
  - `identity`
  - `provider-connections`
  - `reading-studio`
- Implemented deterministic deck assignment at reading creation (random seed + fixed order mapping).
- Added request validation for reading creation DTO.
- Added shared `CreateReading` contracts package.
- Confirmed workspace compiles with `npm run typecheck`.
- Added repository handoff docs (`AGENTS.md`, this file).
- Initialized Git repository in `tarology`.
- Added CI/CD automation skeleton (GitHub Actions + Vercel deploy jobs).
- Added delivery documentation (`docs/engineering-workflow.md`, `docs/ci-cd-vercel.md`).
- Added Codex continuity research notes (`docs/codex-continuity-research.md`).
- Added Codex review automation and documentation (`.github/workflows/codex-review-trigger.yml`, `docs/codex-code-review.md`).
- Completed end-to-end pipeline smoke test via PR #1.
- Fixed CI workflow parse issue (removed invalid `secrets.*` usage in job-level `if` expressions).
- Fixed Vercel preview build path issue by making `apps/web/tsconfig.json` self-contained.
- Verified production deployment on `main` succeeded.

## Key Product Decisions Already Locked
- Card identity is random but fixed at reading creation; never sampled on click.
- Reversal meaning is fixed at reading creation and separate from visual rotation.
- App auth remains Google-first for V1.
- LLM provider connectivity must support both `api_key` and `oauth` modes where provider capability exists.
- Interpretation requests on very large card selections must show warning and permit user cancellation.

## High-Priority Next Implementation Queue
1. Add persistent storage baseline (PostgreSQL + migration tooling + local dev setup).
- Acceptance: readings survive API restart; in-memory map removed for canonical state.

2. Introduce command mutation envelope for reading changes.
- Acceptance: command ID, idempotency key, expected version checks, append-only event write, projection update.

3. Build read model restore path.
- Acceptance: `GET /v1/readings/:id` returns current projection; snapshots/events schema exists for replay strategy.

4. Implement question tree and saved card groups.
- Acceptance: create root/sub-questions, save named group with member cards, persist relationship.

5. Start provider-connections domain with capability model.
- Acceptance: schema and API support provider type, credential mode (`api_key` or `oauth`), status, and default selection.

6. Add interpretation request job model with cancellable state machine.
- Acceptance: request can be queued/running/completed/failed/cancelled_by_user; cancel endpoint stops active run.

7. Implement high-card warning policy plumbing.
- Acceptance: server returns estimated cost/runtime metadata and warning threshold signal for large card sets.

8. Build UI shell matching product IA.
- Acceptance: left history rail, center canvas, right thread/interpretation panel scaffold with placeholder data.

## Deferred Until Core Is Stable
- Full social feed.
- Obsidian-like full notes mode implementation.
- Public randomness proof page.
- Deep multi-agent experimentation beyond bounded specialist passes.

## Open Product Questions For Founder
- Secular vs spiritual brand posture, or explicit mixed posture.
- V1 web-enrichment defaults vs staged rollout.
- Data retention and deletion guarantees for sensitive readings/notes.
- Launch deck/art licensing strategy.

## Known Risks
- Provider OAuth delegation for consumer subscriptions is capability-dependent and may vary by provider.
- Large-card interpretation can become expensive without staged retrieval and cancellation working correctly.
- Event-sourcing complexity can overrun timeline if implemented too broadly too early.

## Repo/Environment Notes
- Current directory is a Git repository with synced `main` (`origin/main`).
- Node dependencies are installed.
- Current local Codex config (`~/.codex/config.toml`) only sets model and reasoning effort.
- Git identity is configured and commits are working.

## Next Agent Start Commands
```bash
cd /home/rami/Gitclones/tarology
npm run ci:checks
git checkout -b feature/persistence-postgres-baseline
npm run dev:api
npm run dev:web
```

## Codex Continuity Note
Codex officially uses `AGENTS.md` as project instructions. `PLAN.md` is a repo convention for handoff state. Keep both updated at session end.
