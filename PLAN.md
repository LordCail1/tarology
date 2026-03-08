# Tarology v2 Plan

Last updated: 2026-03-08 (America/Toronto)
Owner: Product + Engineering

## Goal
Ship a reliable V1 foundation for Tarology v2 that matches the charter: deterministic-at-creation card assignment, durable reading state, modular NestJS architecture, and AI interpretation pipeline that can scale from small card groups to high-card runs with warning and cancel controls.

## Current State
- Charter is defined in `CHARTER.md` (v0.3).
- Modular PRD index and split requirements docs now exist under `docs/product/`.
- Monorepo scaffold exists with `apps/web`, `apps/api`, `packages/shared`.
- API includes `POST /v1/readings` with seeded Fisher-Yates assignment + reversal bits.
- Shared contracts exist for reading creation.
- Web now has a minimal Reading Studio shell at `/reading` with:
  - ChatGPT-like center-first layout,
  - left and right sidebars that both expand/collapse (desktop rails at collapsed width),
  - mobile slide-over drawers for left/right panels,
  - per-user sidebar open/closed persistence via localStorage keys:
    - `tarology.ui.leftPanelOpen`
    - `tarology.ui.rightPanelOpen`
  - branded empty center state using `apps/web/public/magician-logo.png`,
  - bottom composer and reduced-contrast dark neutral visual system.
- Product documentation now explicitly requires:
  - desktop sidebar drag-resize with smooth motion for expand/collapse,
  - multi-mode reading canvas architecture (`freeform` + `grid`),
  - first-run default tarot deck selection and per-reading deck override before creation.
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
- Implemented Reading Studio shell route and component scaffold in `apps/web`.
- Added static typed placeholder data model for history, threads, and interpretation panels.
- Added web test tooling (Vitest + Testing Library) with initial tests for root redirect and shell tab behavior.
- Added Reading History filtering controls (search + status chips) and corresponding web test coverage.
- Replaced the prior dense Reading Studio scaffold with a minimalist ChatGPT-like shell direction.
- Added shared UI shell state helper (`apps/web/lib/ui-shell-state.ts`) for persisted left/right panel state.
- Updated web tests for default sidebar state, persistence restore, expand/collapse parity, and drawer close behavior (backdrop + Escape).
- Confirmed redesigned shell passes `npm run ci:checks`.
- Introduced modular product documentation structure:
  - `docs/product/README.md` as primary PRD index.
  - domain-split PRDs (`docs/product/prd-*.md`) extracted from charter sections.
  - updated `AGENTS.md` first-read order to route through the PRD index.

## Key Product Decisions Already Locked
- Card identity is random but fixed at reading creation; never sampled on click.
- Reversal meaning is fixed at reading creation and separate from visual rotation.
- App auth remains Google-first for V1.
- LLM provider connectivity must support both `api_key` and `oauth` modes where provider capability exists.
- Interpretation requests on very large card selections must show warning and permit user cancellation.
- Reading sidebars must support animated collapse/expand and desktop drag-resize with persisted widths.
- Reading canvas must be mode-capable (`freeform` and `grid`) behind one state/command model.
- User default tarot deck is captured at first-run onboarding and can be overridden when creating any new reading.

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

8. Implement desktop sidebar resize handles + smooth motion polish.
- Acceptance: left/right panels resize by drag on desktop, widths persist per user, and expand/collapse motion is smooth.

9. Introduce multi-mode canvas architecture.
- Acceptance: reading state tracks `canvasMode`; card placement model supports both freeform and grid snap without schema redesign.

10. Add deck preference onboarding + per-reading deck override.
- Acceptance: first login prompts for default deck saved in preferences; `POST /v1/readings` can override deck selection before assignment.

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
- Multi-mode canvas interactions (freeform + grid) can introduce UX/state complexity if mode boundaries are not explicit.
- Deck onboarding and override flows can increase reading-start friction if deck selection UX is not streamlined.

## Repo/Environment Notes
- Current directory is a Git repository with synced `main` (`origin/main`).
- Node dependencies are installed.
- Current local Codex config (`~/.codex/config.toml`) only sets model and reasoning effort.
- Git identity is configured and commits are working.
- Ensure `apps/web/public/magician-logo.png` is committed in the working branch (UI now references the logo file directly).

## Next Agent Start Commands
```bash
cd /home/ram2c/gitclones/tarology
npm run ci:checks
sed -n '1,220p' docs/product/README.md
git checkout -b feature/persistence-postgres-baseline
npm run dev:api
npm run dev:web
```

## Codex Continuity Note
Codex officially uses `AGENTS.md` as project instructions. `PLAN.md` is a repo convention for handoff state. Keep both updated at session end.
