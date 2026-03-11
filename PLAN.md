# Tarology v2 Plan

Last updated: 2026-03-11 (America/Toronto)
Owner: Product + Engineering

## Goal
Ship a reliable V1 foundation for Tarology v2 that matches the charter: deterministic-at-creation card assignment, durable reading state, modular NestJS architecture, and an interpretation pipeline that can scale from small card groups to high-card runs with warning and cancellation controls.

Execution sequencing:
- Reach a durable multi-reading MVP first.
- As soon as that MVP threshold is met, make full-stack deployment and dogfooding the next delivery gate before post-core expansion work.

## Current State
- Charter is defined in `CHARTER.md` (v0.3).
- Modular PRD index and domain docs exist under `docs/product/`.
- Strategic expansion docs are now integrated:
  - `prd-11-visual-storytelling.md`
  - `prd-12-fusion-lab.md`
  - `prd-13-dialogue-mode.md`
  - `prd-14-deck-creation-and-moderation.md`
  - `prd-15-sharing-engagement-and-monetization.md`
- Existing PRDs now include expansion contract/safety/roadmap requirements:
  - `prd-04`, `prd-06`, `prd-08`, `prd-09`, `prd-10`.
- Web has minimal Reading Studio shell at `/reading` with:
  - center-first layout,
  - collapsible sidebars with desktop rails,
  - mobile slide-over drawers,
  - per-user panel open/closed persistence,
  - branded empty state + bottom composer.
- Product docs explicitly require:
  - desktop sidebar drag-resize with smooth motion,
  - multi-mode canvas architecture (`freeform`, `grid`),
  - first-run default deck selection + per-reading override.
- API still uses in-memory reading persistence and must move to DB-backed durability.
- Vercel currently deploys only the Next.js web app; the NestJS API is not yet publicly hosted.
- Current documentation now aligns on delaying full-stack hosting until the durable reading MVP is complete.

## Completed So Far
- Monorepo structure and workspace scripts.
- NestJS module skeleton:
  - `identity`
  - `provider-connections`
  - `reading-studio`
- Deterministic deck assignment on reading creation.
- Shared `CreateReading` contract package.
- CI/CD baseline and Vercel preview/production pipeline.
- Engineering workflow now includes a local post-merge branch cleanup command, with GitHub remote branch auto-delete enabled.
- Reading Studio shell redesign with persisted panel state and mobile drawers.
- Documentation modularization into PRD set with `docs/product/README.md` index.
- Strategic expansion documentation pass completed (storytelling -> fusion -> dialogue -> deck creation -> sharing/monetization).
- Google auth baseline:
  - API-owned Google OAuth endpoints (`/v1/auth/google/start`, `/v1/auth/google/callback`, `/v1/auth/session`, `/v1/auth/logout`)
  - server-side session cookies + credentialed CORS in API bootstrap
  - `/reading` auth gate with dynamic server-side session check and `/login` entry route
  - `POST /v1/readings` protected by session guard
  - API auth tests + web auth route tests
  - `ci:checks` now runs API tests and web tests before build
- Google auth follow-up hardening:
  - `/login` now builds Google auth links from the public browser API origin
  - `/reading` auth gating now happens client-side with credentialed browser requests instead of forwarding server-side cookies to the API
  - web TypeScript now resolves `@tarology/shared` from source for clean CI and preview builds
  - Vercel preview/production deploy jobs now run from repo root so monorepo workspace packages are uploaded during builds
- CI contract parity fix:
  - GitHub Actions `ci-checks` now runs the root `npm run ci:checks` script after `npm ci`
  - required CI gate now covers workspace typecheck, API tests, web tests, and build in the same way as local verification
  - API Vitest now resolves `@tarology/shared` from workspace source so clean CI runners do not depend on a prebuilt `packages/shared/dist` directory
- Planning/docs alignment pass:
  - durable multi-reading restore is now the explicit MVP threshold
  - full-stack deployment is now the next gate after MVP, ahead of post-core symbolic expansion

## Locked Product Decisions (Execution)
- Card identity and reversal are fixed at reading creation; never sampled on click.
- App auth is Google-first for V1.
- Provider connectivity supports both `api_key` and `oauth` modes where capability exists.
- Reading sidebars must support animation + desktop drag-resize with persisted widths.
- Canvas architecture is mode-capable (`freeform`, `grid`) behind one state/command model.
- User default deck is captured during onboarding and can be overridden per reading.
- MVP threshold is durable multi-reading behavior:
  - users can create multiple readings,
  - switch between readings from history,
  - safely delete/archive readings,
  - and recover each reading's exact card state/layout when reopened.
- Public full-stack deployment starts immediately after the MVP threshold is met, not before.
- Post-core expansion order is locked:
  1. Visual Storytelling
  2. Fusion Lab
  3. Dialogue Mode
  4. Deck Creation + Moderation
  5. Private Sharing + Monetization
- Card voice posture is archetypal persona (interpretive, non-literal).
- Engagement model is reflective progression, not manipulative loops.

## Immediate Queue (Gate -1 and Gate 0 MVP)
Gate 0 is only complete when the app can create multiple readings, preserve card layout/state durably, and restore exact prior readings when users switch back to them.

1. Implement profile shell baseline.
- Acceptance: authenticated users have a persisted profile shell record and can load profile basics.

2. Add default deck preference onboarding baseline.
- Acceptance: first authenticated session captures and persists a default deck preference.

3. Add persistent storage baseline (PostgreSQL + migrations + local dev setup).
- Acceptance: readings survive API restart; in-memory map removed from canonical path.

4. Introduce command mutation envelope for reading changes.
- Acceptance: command ID, idempotency key, expected version checks, append-only event write, projection update.

5. Persist semantic card/layout mutations.
- Acceptance: draw/flip/drag/rotate/group actions persist as semantic events and survive refresh/reopen without corrupting deterministic assignment.

6. Build read-model restore path.
- Acceptance: `GET /v1/readings/:id` returns current projection including layout state; snapshots/events replay strategy is in place.

7. Implement readings history query + reopen/delete baseline.
- Acceptance: users can create multiple readings, reopen any prior reading, and safely delete/archive a reading without affecting other readings.

8. Implement question tree and saved card groups.
- Acceptance: root/sub-questions and named groups persist with relationships.

9. Start provider-connections domain with capability model.
- Acceptance: schema/API support provider type, credential mode (`api_key` or `oauth`), status, and default selection.

10. Add interpretation request job model with cancellable state machine.
- Acceptance: queued/running/completed/failed/`cancelled_by_user` states with idempotent cancellation.

11. Implement high-card warning plumbing.
- Acceptance: server returns estimate metadata and warning threshold signal for large card sets.

12. Implement desktop sidebar resize handles + smooth motion polish.
- Acceptance: left/right panels resize by drag on desktop and persist per user widths.

13. Introduce multi-mode canvas architecture.
- Acceptance: reading state tracks `canvasMode`; placement model supports both freeform and grid snap.

14. Extend deck preference flow with per-reading deck override.
- Acceptance: reading creation can override persisted default deck before assignment.

## Next Gate After MVP (Gate 0.5 - Dogfooding Deployment Baseline)
1. Public API deployment baseline.
- Acceptance: NestJS API is reachable on a stable public domain with production envs configured.

2. Managed Postgres and durable hosted session storage.
- Acceptance: hosted readings survive API restart and session storage is safe for multi-instance deployment.

3. Docker baseline for local/full-stack packaging.
- Acceptance: Dockerfiles exist for web and API; local compose workflow can run web + API + Postgres together.

4. Full-stack CD on merge to `main`.
- Acceptance: `main` deploys web + API; post-deploy smoke checks cover auth/session and reading health.

5. Production env hardening.
- Acceptance: production startup fails when required public URLs/secrets are missing; localhost fallbacks are not allowed in production.

## Post-Core Strategic Queue (Unlock after Gate 0.5 deployment baseline)
1. Release A (V1.5): Visual Storytelling.
- Acceptance: 3-4 panel storyboard with abstraction levels, provenance map, cancellation.

2. Release B (V1.6): Fusion Lab.
- Acceptance: stable two-card fusion persona with context lenses and evidence-backed tabs.

3. Release C (V1.7): Dialogue Mode.
- Acceptance: provider-agnostic persona dialogue with boundary pass and dual-register parity.

4. Release D (V2): Deck Creation + Moderation.
- Acceptance: template-led custom deck drafts, rights attestation, moderation-gated publish/share.

5. Release E (V2): Private Sharing + Monetization.
- Acceptance: revocable expiring private share links + subscription/usage-pack entitlement enforcement.

## Deferred Until Core Is Stable
- Public social feed and open creator marketplace.
- Realtime collaborative readings.
- Open-ended agentic roleplay modes.

## Open Product Questions
- Durable workflow engine selection for V1 infrastructure.
- API hosting target for post-MVP dogfooding deployment.
- Onboarding register choice (`plain` only vs optional `esoteric` picker).
- Pricing/package shape for subscription and usage packs.
- Data retention windows for generated artifacts and dialogue logs.

## Known Risks
- Provider OAuth delegation capability varies by provider.
- Auth can fail in hosted environments if web/API public URLs drift or production envs silently fall back to localhost defaults.
- High-card and visual generation flows can cause cost drift.
- Provenance quality can regress if not contract-tested.
- Persona features can create anthropomorphic misunderstanding without clear framing.
- Deck creation introduces moderation/IP policy burden.

## Next Agent Start Commands
```bash
cd /home/ram2c/gitclones/tarology
git fetch origin main
git status --short
npm run ci:checks
sed -n '1,220p' docs/product/README.md
sed -n '1,260p' PLAN.md
```

## Codex Continuity Note
`AGENTS.md` is the bootstrap file for session behavior. `PLAN.md` tracks execution state and queue. Keep both updated before handoff.
