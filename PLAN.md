# Tarology v2 Plan

Last updated: 2026-03-13 (America/Toronto)
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
- Web now has a production-shaped Reading Studio shell at `/reading` with:
  - explicit active reading selection and grouped history,
  - desktop drag-resize sidebars with persisted widths,
  - mobile drawers plus desktop-specific panel rails/toggles,
  - local adapter seams for layout preferences and reading workspace restore,
  - integrated topbar, tabbed analysis panel, and multi-mode canvas (`freeform`, `grid`).
- Profile/preferences onboarding baseline is now implemented:
  - Prisma/Postgres persists `users`, `auth_identities`, `profiles`, `user_preferences`, and `decks`
  - Google callback provisioning now creates/updates user, identity, profile, and preference shell records transactionally
  - `GET /v1/profile`, `GET /v1/preferences`, `PATCH /v1/preferences`, and `GET /v1/decks` are live behind session auth
  - `/onboarding` captures the first-run default deck and `/reading` redirects there until onboarding is complete
  - the Reading Studio history rail now renders a lightweight persisted profile shell and default deck label
- Deterministic deck selection is now semantically real for the built-in Thoth deck:
  - the API owns a code-level `ThothDeckSpec` manifest with stable ordered string card IDs
  - reading creation resolves `deckId` from explicit input or saved preferences and shuffles the selected deck spec
  - card assignments now return stable string `cardId` values instead of numeric ordinals
- Product docs explicitly require:
  - desktop sidebar drag-resize with smooth motion,
  - multi-mode canvas architecture (`freeform`, `grid`),
  - first-run default deck selection + per-reading override.
- API now has a DB-backed reading durability baseline:
  - `POST /v1/readings` persists deterministic assignments in PostgreSQL via Prisma
  - `GET /v1/readings` and `GET /v1/readings/:id` return durable history/detail state
  - `POST /v1/readings/:id/commands` supports idempotent, version-checked `archive`, `reopen`, and `delete`
  - lifecycle events and milestone snapshots support restore-from-history for reading state
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
- Hosted session-cookie proxy hardening:
  - API bootstrap now trusts the first upstream proxy before enabling production secure session cookies
  - API regression coverage now asserts production-mode bootstrap sets proxy trust for TLS-terminating deployments
- Test database precedence hardening:
  - `PrismaService` now resolves connections through the shared runtime-config precedence instead of bypassing `TEST_DATABASE_URL`
  - API regression coverage now asserts test-mode Prisma uses the isolated test connection when both DB env vars are present
- Auth callback race hardening:
  - identity provisioning now retries once on unique-constraint races so concurrent first-login callbacks converge instead of surfacing intermittent 500s
  - API regression coverage now exercises retry behavior for first-login provisioning
- Sidebar restore rebalancing:
  - restored desktop panel widths are now rebalanced jointly against the center-column minimum instead of being clamped independently against stale defaults
  - web regression coverage now protects the narrow-viewport restore case where both sidebars reopen together
- Live layout guard hardening:
  - desktop panel toggles now re-run layout coercion so reopening a saved sidebar cannot bypass the center-column guard
  - shell resize handling now re-coerces current layout state on viewport changes so desktop shrink flows stay within guarded widths
- CI contract parity fix:
  - GitHub Actions `ci-checks` now runs the root `npm run ci:checks` script after `npm ci`
  - required CI gate now covers workspace typecheck, API tests, web tests, and build in the same way as local verification
  - API Vitest now resolves `@tarology/shared` from workspace source so clean CI runners do not depend on a prebuilt `packages/shared/dist` directory
- Planning/docs alignment pass:
  - durable multi-reading restore is now the explicit MVP threshold
  - full-stack deployment is now the next gate after MVP, ahead of post-core symbolic expansion
- Reading Studio frontend scaffold branch:
  - desktop sidebar drag-resize now works with persisted widths and keyboard fallback
  - history is grouped by recency with explicit active-reading restore behavior
  - `ReadingStudioPreferenceAdapter` and `ReadingStudioDataSource` exist as web-local seams for later branch integration
  - center canvas supports `freeform` and `grid` with local drag, snap, rotate, flip, and per-mode layout memory
  - local workspace/layout restore survives refresh via adapter-backed localStorage persistence
  - web regression coverage now includes drag-resize persistence and canvas workspace restore flows
- Reading durability/history backend branch:
  - Prisma/Postgres now replaces the in-memory reading map for the canonical create/read path
  - shared reading contracts now include lifecycle status, summaries/details, history filters, and command envelopes
  - reading lifecycle commands are append-only, idempotent, and guarded by expected-version checks
  - lifecycle events (`reading.created`, `reading.archived`, `reading.reopened`, `reading.deleted`) and milestone snapshots are persisted
  - restore-from-history is implemented as snapshot plus tail-event replay inside `ReadingsService`
  - API regression coverage now includes persistence across app restarts, owner-scoped history, lifecycle commands, idempotency conflicts, and restore correctness
- Profile/default-deck onboarding branch:
  - Prisma/Postgres now also persists identity-adjacent user state (`users`, `auth_identities`, `profiles`, `user_preferences`, `decks`)
  - the seeded `thoth` deck is available through the authenticated deck catalog and is backed by a real API deck spec manifest (`thoth-v1`)
  - Google auth callback now provisions internal UUID-backed users before saving the session
  - `/reading` now gates on both auth and saved default deck, while `/onboarding` completes first-run deck selection
  - web regression coverage now includes onboarding redirects, onboarding completion, and profile/default-deck shell rendering

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

## Immediate Queue (Remaining Gate -1 and Gate 0 MVP Work)
Gate 0 is only complete when the app can create multiple readings, preserve card layout/state durably, and restore exact prior readings when users switch back to them.

Status note:
- Queue items 1 and 2 are complete with persisted profile shell and first-run default deck onboarding.
- Queue items 3, 4, 6, and 7 are complete for DB-backed reading durability, lifecycle commands, restore projection, and multi-reading history.
- Queue items 12 and 13 are complete in the web shell, and `canvasMode` now round-trips through the API read model.
- Remaining work is to persist semantic workspace mutations and connect the existing UI seams to the durable backend without regressing current interaction behavior.

1. Implement profile shell baseline.
- Acceptance: authenticated users have a persisted profile shell record and can load profile basics.
  Status: complete.

2. Add default deck preference onboarding baseline.
- Acceptance: first authenticated session captures and persists a default deck preference.
  Status: complete for the seeded Thoth deck.

3. Add persistent storage baseline (PostgreSQL + migrations + local dev setup).
- Acceptance: readings survive API restart; in-memory map removed from canonical path.
  Status: complete.

4. Introduce command mutation envelope for reading changes.
- Acceptance: command ID, idempotency key, expected version checks, append-only event write, projection update.
  Status: complete for reading lifecycle commands.

5. Persist semantic card/layout mutations.
- Acceptance: draw/flip/drag/rotate/group actions persist as semantic events and survive refresh/reopen without corrupting deterministic assignment.

6. Build read-model restore path.
- Acceptance: `GET /v1/readings/:id` returns current projection including layout state; snapshots/events replay strategy is in place.
  Status: complete for current reading lifecycle and immutable assignment state.

7. Implement readings history query + reopen/delete baseline.
- Acceptance: users can create multiple readings, reopen any prior reading, and safely delete/archive a reading without affecting other readings.
  Status: complete.

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
  Status: complete as web-shell scaffolding.

13. Introduce multi-mode canvas architecture.
- Acceptance: reading state tracks `canvasMode`; placement model supports both freeform and grid snap.
  Status: complete in the web shell and persisted in the reading detail projection.

14. Extend deck preference flow with per-reading deck override.
- Acceptance: reading creation can override persisted default deck before assignment.
  Status note: API-side `deckId` override is already supported on create; UI override remains pending.

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
- The Reading Studio currently restores from web-local persistence; swapping to durable backend restore must preserve mode memory, selection behavior, and sidebar preference semantics.
- The durable backend currently covers reading lifecycle and immutable card assignment state; canvas/question mutation durability still needs to be added without breaking restore compatibility.
- The current deck catalog is intentionally narrow: only the built-in Thoth deck is selectable, and card-image filename normalization is still deferred.
- Deck assets are temporarily sourced from `tarology_old` with project-owner approval; broader licensing policy still needs a durable product decision.

## Next Agent Start Commands
```bash
cd /home/ram2c/gitclones/tarology
git status --short
cd apps/api && npx prisma dev --name tarology-local
# press "t" in the Prisma dev terminal, then export the printed DATABASE_URL in a second shell
cd /home/ram2c/gitclones/tarology
export DATABASE_URL='postgres://...'
export TEST_DATABASE_URL="$DATABASE_URL"
npm run prisma:seed --workspace @tarology/api
npm run ci:checks
sed -n '1,220p' docs/product/README.md
sed -n '1,260p' PLAN.md
```

## Codex Continuity Note
`AGENTS.md` is the bootstrap file for session behavior. `PLAN.md` tracks execution state and queue. Keep both updated before handoff.
