# Tarology Agent Instructions

This file is the session bootstrap for any new Codex agent working in this repo.

## 1) First-Read Order
1. Read `docs/product/README.md` fully.
2. Read the relevant `docs/product/prd-*.md` files for the feature area you are touching.
3. Read `CHARTER.md` fully for global tie-breaker context.
4. Read `PLAN.md` fully.
5. Read `docs/engineering-workflow.md`.
6. Use the global `$parallel-agent-worktrees` skill and read `docs/parallel-agent-worktrees.md` when doing local feature implementation or parallel agent work.
7. Read `docs/ci-cd-vercel.md`, `docs/codex-continuity-research.md`, and `docs/codex-code-review.md` when changing delivery, review, or handoff behavior.
8. If there is any conflict, follow `CHARTER.md` as tie-breaker and update `PLAN.md` to reflect the chosen implementation path.

## 2) Product Intent (Non-Negotiable)
- Tarot-reader-first deck and reading workspace.
- Card identity and reversal meaning are assigned once at reading creation.
- Cards are not sampled at click/flip time.
- Cards and symbols own extensible deck knowledge; live web research is optional future enrichment, not the V1 baseline.
- Reading state must be durable and restorable.
- Reading Studio side panels must support smooth expand/collapse animation and desktop drag-resize, with persisted user width preferences.
- Reading canvas is freeform-first, with stable world coordinates and durable semantic move/rotate/flip persistence.
- Users must be able to initialize decks from starter content or empty templates, and the default deck must be captured at first-run onboarding for new readings with per-reading override.
- Choosing the built-in starter deck should create a user-owned editable deck instance; starter-content decks should feel substantial even when V1 relies on mock knowledge and image references.
- Symbols are first-class deck entities, independently viewable, and linkable to cards.
- Deck-management UX is deck-library-first with bidirectional card/symbol linking; first-party V1 editing focuses on layered `plain_text` and `markdown` entries, with sources minimal-but-visible and images view-only.
- Full deck state should be exportable/importable for cloning or sharing.
- Interpretation flow supports large card sets, warning users for high-card runs and allowing explicit cancellation.
- Model provider access must support both credential modes behind one interface:
  - `api_key`
  - `provider_account` (capability-driven per provider/runtime; internal OpenAI hosted mode is allowlisted in V1)
- Symbolic expansion is sequenced after core reliability:
  - Visual Storytelling -> Fusion Lab -> Dialogue Mode -> Deck Creation + Moderation -> Private Sharing + Monetization.
- Persona/card voice framing is archetypal and interpretive (non-literal); outputs must never present certainty claims.
- Dual register mode (`plain`, `esoteric`) must preserve semantic parity.
- Wellness lens naming is required; no diagnosis/treatment framing.
- Engagement must be reflective progression, not addictive-by-design mechanics.

## 3) Architecture Constraints
- Keep a modular monolith:
  - `apps/web` = Next.js UI
  - `apps/api` = NestJS API
  - `packages/shared` = shared contracts/types
- Keep module boundaries explicit in NestJS (`identity`, `provider-connections`, `profile`, `reading-studio`, then `knowledge`, `workflow`, and other support modules when added).
- Design all boundaries so reading studio can be embedded into a bigger multi-page product later (notes mode/social surfaces).

## 4) Current Implementation Snapshot
- Monorepo scaffold is in place with `apps/web`, `apps/api`, and `packages/shared`.
- API now has Postgres-backed auth/profile/preferences and reading durability baselines:
  - Google session auth,
  - persisted `users`, `auth_identities`, `profiles`, `user_preferences`, and seeded `decks`,
  - `POST /v1/readings`, `GET /v1/readings`, `GET /v1/readings/:id`, and `POST /v1/readings/:id/commands`.
- Reading creation is deterministic-at-creation and DB-backed, not in-memory.
- UI now has a production-shaped Reading Studio shell with:
  - collapsible and desktop-resizable sidebars,
  - a freeform canvas with infinite-camera pan/zoom behavior,
  - durable API-backed reading history/create/restore flows,
  - durable semantic canvas mutation persistence for move, rotate, and flip,
  - local layout width + active-reading preference persistence,
  - auth gating and onboarding gating.
- Important current limitation: the deck-management surface exists, but interpretation workflows do not yet consume that deck knowledge in the Reading Studio.
- Important current limitation: the analysis sidebar is still placeholder-only; question threads, saved card groups, and interpretation workflows are not implemented yet.
- Product docs now include strategic post-core PRDs (`prd-11` through `prd-15`) and updated API/safety/roadmap guidance.
- GitHub repository, branch protection, and Vercel deployment pipeline are already configured and validated.
- Required checks on `main`: `ci-checks`, `request-codex-review`.
- Use `docs/local-dev-runbook.md` for the canonical local startup and smoke-test flow.
- See `PLAN.md` for exact next backlog.

## 5) Engineering Rules
- Keep changes modular and small.
- Preserve deterministic-at-creation semantics while keeping randomness cryptographically strong.
- Prefer command-style mutation interfaces for meaningful state changes.
- Keep shared contracts in `packages/shared` and import from there.
- Do not commit directly on `main`; use branch + PR workflow.
- For local parallel development, use one dedicated Git worktree per active feature branch under `/home/ram2c/gitclones/.worktrees/tarology/<branch-name>`.
- Coordination/docs/merge work should stay in the primary repo checkout when practical; implementation work should happen in the feature worktree.
- Before editing in a feature session, verify both `git rev-parse --show-toplevel` and `git branch --show-current`.
- Do not run multiple implementation agents against the same worktree.
- Before pushing or opening a PR, complete the `Before Push / Before PR` checklist in `docs/engineering-workflow.md`.
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
