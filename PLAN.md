# Tarology v2 Plan

Last updated: 2026-03-22 (America/Toronto)
Owner: Product + Engineering

## Goal
Ship a reliable V1 foundation for Tarology v2 that matches the charter: deterministic-at-creation card assignment, deck-owned knowledge, durable reading state, modular NestJS architecture, and an interpretation pipeline that can scale from small card groups to high-card runs with warning and cancellation controls.

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
  - durable API-backed reading history/create/restore flows,
  - semantic canvas command persistence for move, rotate, and flip,
  - local adapter seams limited to layout preferences and active-reading selection,
  - integrated topbar, tabbed analysis panel, and a freeform canvas workspace,
  - a freeform world/viewport split so sidebar or browser resizing no longer rewrites saved card positions,
  - an infinite freeform camera layer with background drag, middle-mouse, `Space + drag`, and wheel-based panning plus `Ctrl/Cmd + wheel` zoom,
  - freeform layout changes now stabilize around the viewport center point rather than left-edge anchoring, and `Fit Spread` is the explicit recovery tool when cards move off-screen.
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
  - a durable freeform canvas with stable world coordinates,
  - first-run default deck selection + per-reading override.
- Deck knowledge backend baseline is now implemented in this branch:
  - decks are user-owned instances rather than shared editable catalog rows,
  - cards, symbols, card-symbol links, knowledge entries, knowledge sources, and deck exports/imports all have API/storage contracts,
  - profile bootstrap now provisions a personal starter Thoth deck so onboarding/default-deck flows keep working during the pivot,
  - reading creation now resolves owned deck instances and shuffles their stable ordered card IDs.
- API now has a DB-backed reading durability baseline:
  - `POST /v1/readings` persists deterministic assignments in PostgreSQL via Prisma
  - `GET /v1/readings` and `GET /v1/readings/:id` return durable history/detail state
  - `POST /v1/readings/:id/commands` supports idempotent, version-checked `archive`, `reopen`, and `delete`
  - lifecycle events and milestone snapshots support restore-from-history for reading state
- API now has an OpenAI-first provider-connections baseline:
  - Prisma/Postgres persists `provider_connections` and encrypted `provider_credentials`
  - `GET /v1/provider-connections`, `POST /v1/provider-connections/api-key`, `POST /v1/provider-connections/provider-account/start`, `POST /v1/provider-connections/provider-account/complete`, `PATCH /v1/provider-connections/:id`, and `DELETE /v1/provider-connections/:id` are live behind session auth
  - provider capability metadata is resolved server-side
  - public OpenAI `api_key` mode is live, and internal OpenAI `provider_account` mode is gated by an allowlist
- Product docs now align on a tarot-reader-first, deck-knowledge-first direction:
  - cards and symbols own extensible knowledge,
  - decks may start from starter content or empty templates,
  - symbols are first-class and independently viewable,
  - live web research is no longer a baseline V1 interpretation requirement
- Web now also has a deck-management surface at `/decks`:
  - auth-gated deck library route linked from the Reading Studio topbar,
  - local adapter-backed deck snapshot seeded from the real deck summary API,
  - deck-library-first cards/symbols browsing with bidirectional linking,
  - layered `plain_text` / `markdown` entry editing plus minimal visible sources,
  - basic local import/export controls and view-only starter images.
- Vercel currently deploys only the Next.js web app; the NestJS API is not yet publicly hosted.
- Current documentation now aligns on delaying full-stack hosting until the durable reading MVP is complete.

## Completed So Far
- Monorepo structure and workspace scripts.
- NestJS module skeleton:
  - `identity`
  - `provider-connections`
  - `reading-studio`
- Local runbook baseline:
  - `docs/local-dev-runbook.md` now documents the canonical local startup path for database, API, and web
  - manual smoke-test steps now cover the API-backed Reading Studio flow plus direct canvas-command API checks
- Deterministic deck assignment on reading creation.
- Shared `CreateReading` contract package.
- CI/CD baseline and Vercel preview/production pipeline.
- Engineering workflow now includes a local post-merge branch cleanup command, with GitHub remote branch auto-delete enabled.
- Reading Studio shell redesign with persisted panel state and mobile drawers.
- Reading Studio canvas viewport refinement:
  - desktop panel collapse/expand now animates through the shell layout columns rather than snapping instantly
  - freeform cards now live in stable world coordinates while the visible canvas is a local infinite-camera view with no native scrollbars
  - freeform now stabilizes around the center world point on browser/sidebar layout changes instead of preserving a left-edge anchor
  - zoom, fit, and reset controls are available in the canvas toolbar
  - selected or recently touched cards are allowed to move off-screen; `Fit Spread` is the explicit reframe tool
  - web regression coverage now includes background drag, wheel pan, zoom, fit-spread, and center-point stabilization across layout changes
- Grid-removal compatibility hardening:
  - legacy grid-mode snapshots are now normalized to their migrated freeform positions during restore
  - legacy grid-only `reading.card_moved` events now replay safely by translating their stored grid coordinates into freeform placement
  - stale cached web bundles are temporarily tolerated during rollout by accepting legacy `switch_canvas_mode` as a no-op compatibility command and translating grid-only `move_card` payloads into freeform placement
  - legacy `switch_canvas_mode` compatibility commands now advance reading version plus snapshot state so stale optimistic clients do not trip the next command on a false 409
  - detail and command reads now hydrate from restored snapshots during the rollout shim so legacy `card.grid` metadata survives even though the live persistence model is freeform-only
  - the legacy mode-switch shim now preserves the reader's saved freeform coordinates while only toggling compatibility-facing `canvasMode` / `canvas.activeMode` fields for stale clients
- rollout-only legacy grid compatibility is now marked internally in snapshots so restores can preserve newer freeform moves without exposing extra internal fields in API responses
- real freeform moves now clear rollout-only `grid` mode compatibility, while legacy grid-origin moves still preserve stale-client behavior during the brief migration window
- legacy snapshot normalization is now explicitly freeform-first for the modern client, while old `grid` fields and historical `reading.canvas_mode_switched` events remain replayable as rollout-only compatibility metadata
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
- Auth gate transient recovery hardening:
  - protected web gates now time out and retry once on transient client-side session/bootstrap fetch failures instead of hanging indefinitely on the loading screen
  - `/reading`, `/decks`, and `/onboarding` now surface a recoverable error state if session/bootstrap loading still cannot complete after the retry
  - web regression coverage now protects the first-load transient-failure path for all three gates
- Hosted session-cookie proxy hardening:
  - API bootstrap now trusts the first upstream proxy before enabling production secure session cookies
  - API regression coverage now asserts production-mode bootstrap sets proxy trust for TLS-terminating deployments
- Test database precedence hardening:
  - `PrismaService` now resolves connections through the shared runtime-config precedence instead of bypassing `TEST_DATABASE_URL`
  - API regression coverage now asserts test-mode Prisma uses the isolated test connection when both DB env vars are present
- Auth callback race hardening:
  - identity provisioning now retries once on unique-constraint races so concurrent first-login callbacks converge instead of surfacing intermittent 500s
  - API regression coverage now exercises retry behavior for first-login provisioning
- Google subject-anchor hardening:
  - unknown Google subjects no longer auto-link onto pre-existing users by email fallback; email collisions now surface as explicit conflicts instead
  - known Google subjects also surface explicit conflicts when their latest provider email is already claimed by a different internal account
  - API regression coverage now protects the managed-domain/reassigned-email collision path
- Sidebar restore rebalancing:
  - restored desktop panel widths are now rebalanced jointly against the center-column minimum instead of being clamped independently against stale defaults
  - web regression coverage now protects the narrow-viewport restore case where both sidebars reopen together
- Live layout guard hardening:
  - desktop panel toggles now re-run layout coercion so reopening a saved sidebar cannot bypass the center-column guard
  - shell resize handling now re-coerces current layout state on viewport changes so desktop shrink flows stay within guarded widths
- Command idempotency race hardening:
  - command application now re-checks persisted receipts before surfacing a lifecycle version conflict, preserving legitimate duplicate-command retries under concurrency
  - API regression coverage now exercises the “missed replay then lost update race” path
- CI contract parity fix:
  - GitHub Actions `ci-checks` now runs the root `npm run ci:checks` script after `npm ci`
  - required CI gate now covers workspace typecheck, API tests, web tests, and build in the same way as local verification
  - API Vitest now resolves `@tarology/shared` from workspace source so clean CI runners do not depend on a prebuilt `packages/shared/dist` directory
- Workflow docs now include an explicit before-push / before-PR checklist covering branch update, clean status, local verification, and PR handoff notes
- Codex review automation now emits the official standalone `@codex review` trigger format on each new PR head, instead of appending extra prose to the trigger comment
- Local parallel-agent workflow is now standardized around Git worktrees:
  - coordination work stays in the primary repo checkout
  - each implementation branch gets its own dedicated worktree under `/home/ram2c/gitclones/.worktrees/tarology/<branch-name>`
  - helper commands now exist for worktree creation/list/prune
  - the worktree helper now derives the shared Tarology root correctly even when it is invoked from an existing linked worktree, preventing nested `.worktrees` trees inside feature lanes
- Reading lifecycle vocabulary decision resolved:
  - canonical system status is `active` / `archived` / `deleted`
  - `reopen` remains an action/event, not a steady-state status
  - reader-facing states such as `completed` belong to a separate label/tag layer if introduced later
- Provider-connections decision resolved:
  - V1 is OpenAI-first
  - public hosted use centers on `api_key`
  - hosted `provider_account` mode is internal-only and limited to allowlisted Tarology accounts in V1
  - future providers stay possible behind the same provider-connection boundary
- Deck-knowledge pivot resolved:
  - product posture is tarot-reader-first rather than entry-level-first
  - interpretation is deck-knowledge-first rather than web-research-first
  - decks may be initialized from starter content or empty templates
  - symbols are first-class deck entities and independently viewable
  - full deck state should be exportable/importable for cloning and sharing
- Canonical deck-knowledge schema/export spec added:
  - `docs/product/prd-16-deck-knowledge-schema-and-export.md` now defines user-owned deck instances, card/symbol knowledge entry shape, split `deckSpecVersion` vs `knowledgeVersion`, and the V1 JSON export/import package
  - V1 UX defaults are now locked in that spec: onboarding creates a personal starter-deck copy, starter decks should feel substantial even with mock content, symbols are managed deck-library-first with bidirectional linking, entry authoring is layered, sources stay minimal-but-visible, import/export UI stays basic, and images are view-only in V1
- Planning/docs alignment pass:
  - durable multi-reading restore is now the explicit MVP threshold
  - full-stack deployment is now the next gate after MVP, ahead of post-core symbolic expansion
- Future-direction docs alignment pass:
  - `prd-01` is re-synced with the charter's full locked-decision set, including symbolic expansion, persona, sharing, and monetization constraints
  - conceptual data model docs now distinguish immutable `reading_cards` assignment from mutable workspace state persisted via semantic events/projections
  - lifecycle event docs now align with the actual reading status vocabulary (`archived`, `reopened`, `deleted`) instead of the obsolete `reading.completed` label
  - charter and governance docs now point contributors to the real repo gate, `npm run ci:checks`, and the current Gate 0.5 deployment sequence
- Reading Studio frontend scaffold branch:
  - desktop sidebar drag-resize now works with persisted widths and keyboard fallback
  - history is grouped by recency with explicit active-reading restore behavior
  - `ReadingStudioPreferenceAdapter` and `ReadingStudioDataSource` exist as web-local seams for later branch integration
  - center canvas supports freeform drag, rotate, and flip with durable layout memory
  - local workspace/layout restore survives refresh via adapter-backed localStorage persistence
  - web regression coverage now includes drag-resize persistence and canvas workspace restore flows
- Reading Studio durable wiring branch:
  - `/reading` now loads durable reading history/detail state from the API instead of seeded client-side workspaces
  - `New Reading` now creates durable readings from the Studio using the saved default deck
  - semantic canvas actions (`move_card`, `rotate_card`, `flip_card`) now persist through the reading command API and round-trip through detail/restore
  - API-backed Reading Studio state now persists exact active workspace state across refresh and API restart
  - local browser persistence is limited to layout widths and last active reading selection
  - regression coverage now includes API command round-trip/restore and API-datasource command mapping in the web layer
  - async workspace persistence is now keyed by the originating reading id so late command responses cannot overwrite a newly activated reading
  - browser fallback command/idempotency IDs now stay RFC 4122 v4-shaped when `crypto.randomUUID` is unavailable, preserving command API compatibility in older runtimes
  - the canvas-state migration now backfills pre-existing `reading_cards` from `deck_index` so legacy readings do not collapse into `(0,0)` after deploy
  - create-reading failures now surface as a recoverable in-studio alert instead of leaving unhandled promise rejections with no user feedback
  - reading activation now ignores out-of-order fetch completions so slower history loads cannot flip the UI back to a stale selection
  - queued persistence responses now skip stale lower-version commits so older server responses cannot roll back newer optimistic canvas edits
  - reading activation failures now surface as recoverable inline alerts instead of unhandled rejections when a selected reading cannot be fetched
  - workspace persistence chains now self-heal after a failed save-plus-reload path so later user actions still attempt API persistence
  - invalid canvas commands that target cards outside the reading now return `404` instead of leaking a service error as `500`
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
- Knowledge-domain baseline branch:
  - Prisma/Postgres now models owned decks, cards, symbols, card-symbol links, ordered card/symbol knowledge entries, deck knowledge sources, and export records
  - a new Nest `knowledge` module now serves deck/card/symbol CRUD plus export/import endpoints behind session auth
  - starter-vs-empty deck initialization is code-level and Thoth starter content now includes mock-but-substantial symbols, sources, and layered knowledge entries
  - profile bootstrap now provisions a personal starter Thoth deck and preferences can only target owned deck instances
  - reading creation now validates owned deck instances and shuffles deck-owned card IDs instead of relying on the legacy shared deck catalog service
  - shared contracts now include deck detail, card detail, symbol detail, source/entry write payloads, and deck export/import envelopes
- Deck-management surface branch:
  - `/decks` now exists as an authenticated deck-library route with its own gate and shell
  - the web app seeds a substantial Thoth starter deck locally from the real deck summary, including 78 cards, starter symbols, links, entries, sources, and image references
  - cards and symbols can be browsed independently, symbols can be created and linked to cards, and layered entries can be added/edited/archive-soft-deleted in the UI
  - deck exports and imports now work as basic local JSON actions using the PRD 16 package shape
  - local deck-library persistence is now scoped by authenticated `userId` so reader-authored deck knowledge cannot leak across accounts in the same browser
  - import/export hardening now derives imported `cardCount` from the cards payload and preserves `json` knowledge entries as view-only imported records
  - stale local snapshots now recover to a valid active deck when possible, empty libraries render an explicit recoverable state, and new source IDs are uniqued per deck
  - entry editing now refuses cross-subject saves, and deck export/import now preserves archived knowledge-entry state
  - deck export/import now preserves entry tags, and duplicate symbol submissions no longer churn `knowledgeVersion` or report false success
  - import now normalizes malformed entry `sourceIds`, and duplicate card-symbol link attempts no longer churn `knowledgeVersion` or report false success
  - import now rejects duplicate `cardId` / `symbolId` values so malformed shared deck files cannot create unreachable deck records
  - import now rejects malformed knowledge-source kinds so invalid shared deck files cannot crash the deck library surface on source rendering
  - local snapshot restore now falls back on structurally incomplete persisted decks, and import now rejects orphaned card/symbol references in links and knowledge entries
  - web regression coverage now includes the deck-management gate, local deck snapshot helpers, import/export helpers, and basic symbol-creation interaction
- Provider-connections baseline branch:
  - Prisma/Postgres now persists `provider_connections` and `provider_credentials`
  - provider connection contracts now expose capability metadata, connection summaries, default selection, and the OpenAI-first `api_key` / allowlisted `provider_account` split
  - API keys are encrypted at rest and never returned raw after creation
  - internal OpenAI provider-account mode uses a session-bound challenge/complete flow and only appears for allowlisted accounts
  - API Vitest now runs files sequentially to avoid shared test-database races across multiple e2e suites
  - default-selection mutations are now wrapped atomically and backed by a partial unique index so concurrent updates cannot leave multiple defaults for one user
  - API key creation now rejects whitespace-only secrets, and provider-account start/complete now preserves omitted `makeDefault` so first-connection auto-default still works

## Locked Product Decisions (Execution)
- Card identity and reversal are fixed at reading creation; never sampled on click.
- App auth is Google-first for V1.
- Product posture is tarot-reader-first with `plain` register as the default presentation mode.
- Provider connectivity is OpenAI-first in V1, with public `api_key` mode plus an allowlisted internal OpenAI `provider_account` mode.
- Interpretation is deck-knowledge-first; live web research is optional future enrichment rather than a baseline requirement.
- Cards and symbols own extensible knowledge, and symbols are first-class deck entities that are independently viewable.
- Decks may start from starter content or empty templates, and deck state must be exportable/importable for cloning or sharing.
- Choosing the built-in starter deck during onboarding should create a user-owned editable deck instance rather than leaving users on a shared template row.
- Starter-content decks should feel immediately usable, even if V1 temporarily relies on mock knowledge and image references.
- Deck-management UX is deck-library-first with bidirectional card/symbol linking.
- V1 first-party knowledge editing supports `plain_text` and `markdown`; `json` remains internal/import-facing.
- Sources are minimal but visible in V1; import/export UI is basic; deck/card images are view-only.
- Reading sidebars must support animation + desktop drag-resize with persisted widths.
- Reading canvas is freeform-first with stable world coordinates; pan/zoom camera state is local view state and must not rewrite persisted reading layout.
- User default deck is captured during onboarding and can be overridden per reading.
- Reading lifecycle status is `active` / `archived` / `deleted`; reader-facing organization labels are a separate concern.
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
- Queue items 3, 4, 5, 6, and 7 are complete for DB-backed reading durability, semantic workspace command persistence, restore projection, and multi-reading history.
- Queue item 9 is complete for the OpenAI-first provider-connections baseline.
- Queue items 12 and 13 are complete in the web shell for the freeform canvas interaction baseline and durable workspace restore.
- Product pivot note: before the interpretation workflow is treated as complete, the app now needs a deck knowledge domain and deck-management surface that match the updated charter.
- Remaining work is centered on question trees/card groups, interpretation jobs, deck-management, provider-backed workflow integration, and per-reading deck override UI.

Deck-knowledge pivot follow-ups:
- Implement deck knowledge domain baseline.
  Acceptance: decks persist card information, symbols, symbol links, starter/empty initialization metadata, and attached knowledge references.
  Status: complete for backend/domain/contracts baseline in this branch; import validation now rejects malformed deck metadata, card fields, symbol fields, malformed entry `sourceIds`, missing/blank/malformed `sourceId` values, duplicate `sourceId` values, duplicate card-symbol links, and duplicate per-parent entry IDs before DB writes, imported `sourceId` values are persisted in trimmed form, card/symbol entry writes normalize `entryId`, labels, and `sourceIds` before any destructive delete, linked card/symbol ID arrays are now validated both at DTO and service boundaries, and deck-source replacement rejects blank `sourceId` values and fails fast if existing entries still reference sourceIds that would be removed. Durable verification still needs a stable Postgres run in CI or against a real local Postgres service.
  Guardrail: implement the owned-deck onboarding path, substantial starter-content path, layered entry model, and minimal-visible source support described in `prd-16`.
- Implement deck-management surface baseline.
  Acceptance: users can browse decks/cards/symbols, edit card/symbol information, and inspect symbols independently from any specific card view.
  Guardrail: keep the UI deck-library-first, expose basic import/export controls, and do not add V1 image editing/upload.
  Status: complete as a web-local, adapter-backed surface; durable API wiring still depends on the knowledge-domain branch.
- Add deck export/import baseline.
  Acceptance: full deck state can be exported and re-imported without losing card/symbol knowledge or links.
  Status: complete as local UI/actions; backend ownership and persistence still depend on the knowledge-domain branch.

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
  Status: complete for current move, rotate, and flip commands.

6. Build read-model restore path.
- Acceptance: `GET /v1/readings/:id` returns current projection including layout state; snapshots/events replay strategy is in place.
  Status: complete for current reading lifecycle and canvas state projection.

7. Implement readings history query + reopen/delete baseline.
- Acceptance: users can create multiple readings, reopen any prior reading, and safely delete/archive a reading without affecting other readings.
  Status: complete.

8. Implement question tree and saved card groups.
- Acceptance: root/sub-questions and named groups persist with relationships.

9. Start provider-connections domain with capability model.
- Acceptance: schema/API support provider type, credential mode (`api_key` or `provider_account`), status, default selection, and allowlisted internal OpenAI provider-account handling.
  Status: complete for the OpenAI-first API baseline.

10. Add interpretation request job model with cancellable state machine.
- Acceptance: queued/running/completed/failed/`cancelled_by_user` states with idempotent cancellation.

11. Implement high-card warning plumbing.
- Acceptance: server returns estimate metadata and warning threshold signal for large card sets.

12. Implement desktop sidebar resize handles + smooth motion polish.
- Acceptance: left/right panels resize by drag on desktop and persist per user widths.
  Status: complete as web-shell scaffolding.

13. Refine the freeform canvas interaction architecture.
- Acceptance: reading state preserves durable freeform placement, rotation, and face-up state while pan/zoom remains local view state.
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
- Provider-account capability varies by provider/runtime and must remain optional behind capability flags.
- Auth can fail in hosted environments if web/API public URLs drift or production envs silently fall back to localhost defaults.
- High-card and visual generation flows can cause cost drift.
- Provenance quality can regress if not contract-tested.
- Persona features can create anthropomorphic misunderstanding without clear framing.
- Deck creation introduces moderation/IP policy burden.
- The Reading Studio now restores durable reading state from the backend; future question-tree/group persistence must preserve the same restore semantics without regressing current canvas behavior.
- The analysis panel is still placeholder-only, so question-thread and interpretation features will need contract tests when they replace the current stub content.
- The deck-management surface currently persists its knowledge graph in browser-local storage; it must be re-pointed at the knowledge-domain API without losing the deck-library-first UX or PRD 16 export shape.
- The current deck catalog is intentionally narrow: only the built-in Thoth deck is selectable, and card-image filename normalization is still deferred.
- Deck assets are temporarily sourced from `tarology_old` with project-owner approval; broader licensing policy still needs a durable product decision.
- Local WSL2 validation with `@prisma/adapter-pg` against `prisma dev` TCP URLs was unstable in this session; DB-backed API verification should be re-run against CI or a stable local Postgres service before merge.
- Canvas viewport state (zoom and pan camera position) is intentionally local view state today; if cross-device view restore becomes important, add it separately from canonical reading state.

## Next Agent Start Commands
```bash
cd /home/ram2c/gitclones/tarology
git status --short
sed -n '1,260p' docs/local-dev-runbook.md
cd apps/api && npx prisma dev --name tarology-local
# press "t" in the Prisma dev terminal, then export the printed DATABASE_URL in a second shell
cd /home/ram2c/gitclones/tarology
if [ -f apps/api/.env ]; then set -a && source apps/api/.env && set +a; fi
export DATABASE_URL='postgres://...'
export TEST_DATABASE_URL="$DATABASE_URL"
npm run prisma:migrate:deploy --workspace @tarology/api
npm run prisma:seed --workspace @tarology/api
npm run ci:checks
sed -n '1,220p' docs/product/README.md
sed -n '1,220p' docs/product/prd-04-interpretation-intelligence.md
sed -n '1,220p' docs/product/prd-06-data-model-and-api.md
sed -n '1,260p' docs/product/prd-16-deck-knowledge-schema-and-export.md
sed -n '1,260p' PLAN.md
cd /home/ram2c/gitclones/.worktrees/tarology/feature/deck-management-surface
git status --short --branch
npm run test --workspace @tarology/web
npm run build --workspace @tarology/web
# for full branch verification, start Prisma dev in apps/api and rerun root ci:checks with DATABASE_URL and TEST_DATABASE_URL set

# if resuming the Reading Studio viewport refinement feature branch:
cd /home/ram2c/gitclones/.worktrees/tarology/fix/reading-studio-panel-canvas-viewport
git status --short --branch
npm run test --workspace @tarology/web -- components/reading/canvas-panel.test.tsx components/reading/reading-studio-shell.test.tsx lib/reading-studio-canvas.test.ts
npm run build --workspace @tarology/web
```

## Codex Continuity Note
`AGENTS.md` is the bootstrap file for session behavior. `PLAN.md` tracks execution state and queue. Keep both updated before handoff.
