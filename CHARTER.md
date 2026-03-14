# Tarology v2 Charter and Execution Spec

Status: Draft v0.3  
Last updated: 2026-03-13  
Owner: Product + Engineering  
Purpose: Canonical map for all contributors (human and AI) building Tarology v2.

Modular companion PRDs now live under `docs/product/`:
- index: `docs/product/README.md`
- domain PRDs: `docs/product/prd-*.md`

This version merges:
- founder comments added to `v0.1`,
- Deep Research findings received on 2026-03-08,
- concrete implementation decisions for V1.

## 0) Locked Decisions (This Month)
1. Architecture is a modular monolith: Next.js frontend + NestJS backend + PostgreSQL.
2. Every reading assigns full deck order at creation time; no card is sampled at click time.
3. Reversal meaning state is assigned at reading creation and stored separately from visual rotation.
4. All meaningful mutations use command API + idempotency key + version checks.
5. Persistence model uses hot projection + append-only event log + snapshots.
6. AI interpretation runs asynchronously in durable workflows with retries and tracing.
7. Interpretation orchestration is hybrid: one orchestrator with bounded parallel specialist passes.
8. V1 interpretation is web-first for card and symbol research on every request (founder requirement), with caching and provenance.
9. Safety posture is reflective guidance, not directives or certainty claims.
10. V1 app auth is Google only, server-side sessions, provider subject (`sub`) as external identity anchor.
11. Model access supports user-managed provider connections in two modes: `api_key` and `oauth` (where provider delegation is available).
12. Git workflow is branch + PR based; direct pushes to `main` are disallowed.
13. CI/CD is established from day one: GitHub Actions for CI and Vercel deployments for web preview/production.
14. Reading Studio side panels support smooth expand/collapse animation and desktop drag-to-resize with per-user persisted widths.
15. Reading canvas architecture is multi-modal (`freeform`, `grid`) with one shared command/state model so new modes can be added without redesign.
16. Users choose a default tarot deck during first-time onboarding; new readings use this default unless the user explicitly overrides deck selection before creation.
17. Post-core symbolic expansion is sequenced as: Visual Storytelling -> Fusion Lab -> Dialogue Mode -> Deck Creation + Moderation -> Private Sharing + Monetization.
18. Card-voice features use an `Archetypal Persona` posture (interpretive construct, not literal entity claims).
19. Symbolic outputs support dual register (`plain` default, `esoteric` optional) with semantic parity.
20. Engagement model is reflective progression; manipulative/addictive loop design is explicitly rejected.
21. Sharing rollout is private-first (tokenized unlisted links) before any public social feed.
22. Custom deck creation is template-moderated and requires rights attestation before publish/share.
23. Monetization direction is subscription plus optional usage packs.
24. Persona implementation remains provider-agnostic; no OpenClaw lock-in.

## 1) Product Vision
Tarology helps beginners receive and explore tarot readings through high-quality AI symbolic synthesis.

The app is not a random card game UI. It is a guided reflective workspace where users can:
- ask a main question,
- branch into sub-questions,
- pull and organize cards visually,
- request interpretations for card groups,
>By default if ever the person doesn't actually select any cards to group together to have an interpretation, then by default the selection is just all of the cards. This makes sense if you think about it because at our reading the typical way of doing one is the person just makes an interpretation by using all of what's on the table.
- review evidence and sources,
- continue readings later with full state restored.

## 2) Primary User and Jobs-To-Be-Done
Primary user: beginner tarot seeker.
- Has little or no tarot background.
- Wants meaningful interpretation without memorizing card symbolism.
- Needs clarity and context while exploring personal questions.

Secondary user: intermediate reader.
- Uses AI as a synthesis assistant, not as an authority.

Primary JTBD:
- “Help me understand what these cards could mean for my question, in clear language, with enough evidence that I can trust the interpretation process.”

## 3) Product Principles
1. Beginner-first: default responses are clear, concise, and non-jargon.
2. Deterministic reading state: card identity is fixed at reading creation.
3. Explainable AI: every synthesis ties to cards, symbols, and cited sources.
4. Threaded inquiry: users can branch questions without losing context.
5. Durable by default: acknowledged state changes must survive refresh/crash.
6. Reflective safety: suggestions are reflective, never prescriptive directives.

## 4) V1 Scope
### 4.1 In Scope
- Google sign-in.
- Provider connection management for LLM access:
  - user can add API keys,
  - user can connect OAuth provider accounts where supported,
  - user can keep one or both configured.
- ChatGPT-like shell:
  - left: reading history (collapsible, animated, desktop-resizable),
  - center: card fan + canvas with mode selection,
  - right: question threads + interpretation history (collapsible, animated, desktop-resizable).
- First-run preference capture for default tarot deck.
- New reading creation with deterministic deck order and reversal assignment.
- New reading preflight supports deck override before shuffle/assignment.
- Card interactions: draw, flip, drag, rotate, select, group, rename group, and grid-snap placement in grid mode.
- Canvas modes:
  - `freeform` mode for unconstrained positioning.
  - `grid` mode for snap-to-cell placement.
- Question tree:
  - 1 root question,
  - unlimited child questions.
- AI interpretation request against frozen `(question, group, stateVersion)` context.
- Near-realtime backend persistence with restore.
- Basic profile with learning/reflection stats.

### 4.2 Out of Scope (V1)
- Public social feed and sharing marketplace.
- Real-time collaborative readings.
- Payments/subscriptions.
- Voice mode.
- Native mobile apps.

### 4.3 Model Provider Connections (V1)
Supported credential modes:
- `api_key`: user pastes provider API key (encrypted at rest).
- `oauth`: user authorizes delegated provider access through OAuth/OIDC, if provider exposes this capability for third-party inference.

Product requirement:
- User can configure one or many provider connections.
- User can set default provider/model per workspace.
- User can override provider/model per interpretation request.
- Provider connection auth is separate from app account auth (Google sign-in remains required for the app).

Important feasibility note (as of 2026-03-08):
- Some providers document API-key auth for inference but may not expose delegated OAuth that lets a third-party app spend a user's consumer subscription directly.
- OpenAI and Anthropic integrations should be implemented behind capability checks so product behavior matches current provider auth support at runtime.
- The app must expose OAuth mode as capability-driven, not hardcoded to any one provider.

V1 support policy:
- Ship API-key mode for providers where API keys are available.
- Ship OAuth mode behind provider capability flags.
- If provider OAuth delegation is unavailable, UI must say “Not available for this provider yet” and offer API key setup.

## 5) UX Blueprint
### 5.1 Layout
- Left Sidebar:
  - readings list,
  - search/filter,
  - new reading action.
- Main Workspace:
  - reading title + status bar,
  - fan of face-down cards,
  - mode-aware card canvas (`freeform` / `grid`).
- Right Panel:
  - question thread tree,
  - card groups,
  - interpretation outputs with citations and uncertainty note.
- Panel behavior:
  - left and right panels can collapse/expand with motion.
  - left and right panels are desktop-resizable by drag handle.
  - panel width preference is persisted per user.

### 5.2 Core Journey
1. User logs in with Google.
2. On first login, user selects a default tarot deck; preference is persisted.
3. User starts a new reading, can override deck selection, and writes root question.
4. Backend creates deterministic deck assignment for the selected deck and persists commitment metadata.
5. User draws cards; each draw reveals the pre-assigned card.
6. User arranges cards on canvas (freeform drag/rotate or grid-snap mode), groups selected cards, asks sub-questions.
7. User requests interpretation for selected group under selected thread.
8. If selected-card count exceeds configured threshold, UI shows a high-cost warning with estimated token/time usage and requires explicit continue.
9. User can stop/cancel interpretation at any time from a visible control.
10. System returns:
  - beginner summary,
  - “why” layer with card/symbol evidence,
  - optional deep layer with citations.
11. All meaningful actions persist continuously.
12. User returns later and sees exact reading state restored, including chosen deck and canvas mode.

## 6) Deterministic Deck and Randomness
### 6.1 Hard Rule
Card identity and reversal meaning are assigned at reading creation. They are never generated at reveal time.

### 6.2 Required Metadata
Store at reading creation:
- `deckId`
- `deckSpecVersion`
- `shuffleAlgorithmVersion`
- `seedCommitment`
- `orderHash`
- `assignedReversalBits`
- `canvasMode`
- `createdAt`

### 6.3 Algorithm
1. Generate secure random seed/nonce (CSPRNG).
2. Run seeded Fisher-Yates over the selected deck card list.
3. Persist ordered mapping (`deckIndex -> cardId`) for that deck.
4. Persist reversal assignment bits.
5. Render face-down fan from persisted mapping.

### 6.4 V1.1 Extension
Add public randomness proof page (commit-reveal with optional beacon integration) after V1 stability.

## 7) Interpretation Intelligence
### 7.1 Orchestration Model
Use hybrid orchestration:
- one primary orchestrator responsible for final user-facing interpretation,
- bounded specialist passes run in parallel,
- final synthesis merges specialist outputs under safety and citation checks.

### 7.2 Specialist Passes
- Card Symbol Pass: symbols/motifs for each selected card.
- Card Meaning Pass: upright/reversed semantics in beginner language.
- Cross-Card Pattern Pass: overlaps, tensions, and narrative arc.
- Question Alignment Pass: maps synthesis to active thread question.
- Citation/Safety Pass: validates source support and policy compliance.

### 7.3 “Reader Skills” Library (Founder comment integration)
To make output feel natural and human-like without fake certainty, maintain versioned reusable “skills” (prompt modules):
- `beginner_clarity`
- `symbol_to_theme_mapping`
- `cross_card_synthesis`
- `balanced_alternative_reading`
- `reflective_prompt_generation`
- `uncertainty_calibration`

Each interpretation stores `skillsVersion` for reproducibility.

### 7.4 Knowledge and Research Policy (Founder requirement)
V1 policy is web-first per interpretation request:
- Every interpretation runs live web research for selected cards and key symbols.
- Source quality filtering is mandatory.
- Citations are mandatory for factual/context claims.
- Symbolic claims must still include provenance to either web evidence or internal canonical metadata.

Caching policy:
- Cache retrieval evidence and structured extracts for speed and consistency.
- Cached evidence accelerates subsequent runs but does not disable live web pass in V1.

Evolution path:
- Build an internal curated knowledge pack from reviewed/cached evidence over time.
- For high-card interpretation requests, prefer curated evidence + selective web expansion once curated coverage becomes available.
- Shift to “curated-first, web-enrichment-optional” in V1.1 or V2 when coverage is proven.

### 7.5 Source Quality Tiers
- Tier 1: official docs, peer-reviewed publications, museums/institutions, public records.
- Tier 2: reputable publishers and established technical/editorial sources.
- Tier 3: commercial blogs (only if Tier 1/2 unavailable).
- Tier 4: user-generated sources (last resort, clearly labeled).

### 7.6 Interpretation Output Layers
Every interpretation must render three visible layers:
1. Beginner Summary.
2. Why This Pattern (card and symbol evidence).
3. Deep Dive (optional, citations and alternative reading).

### 7.7 Output Contract (Owned by Engineering)
Founder requested engineering ownership for payload details. Engineering must maintain a stable structured contract that includes, at minimum:
- request context (`readingId`, `questionId`, `groupId`, `stateVersion`),
- user-facing interpretation layers,
- uncertainty note,
- citation objects with source metadata,
- safety flags,
- model and skills version metadata.

### 7.8 Large-Card Adaptive Strategy and Cancellation
Interpretation planner requirements:
- Compute selected-card count before execution.
- Estimate expected token range, expected runtime, and risk level.
- Apply mode selection:
  - `normal` mode for small/medium card sets.
  - `high-volume` mode for large card sets (chunking + synthesis staging + stricter budget controls).

High-card warning rule:
- If selected-card count is above the configured threshold, block auto-start and require explicit user confirmation.
- Warning must display:
  - card count,
  - estimated token range,
  - estimated runtime range,
  - notice that cancellation is available.

Stop/cancel rule:
- Interpretation job must be cancellable from UI at all times while queued/running.
- Cancellation must propagate to workflow workers and tool calls.
- Final state must be explicit (`cancelled_by_user`) and persisted with partial artifacts if available.

Future curated-data alignment:
- Planner must support source strategy switching (`web_first`, `curated_first`, `hybrid`) without API redesign.

## 8) System Architecture
### 8.1 Repository Shape
Current repo today:
- `apps/web` (Next.js frontend)
- `apps/api` (NestJS backend)
- `packages/shared` (types/contracts)

Planned monorepo additions after core reliability:
- `apps/worker` (workflow workers)
- `packages/prompt-skills` (versioned AI skills)

NestJS module boundaries over time (required):
- implemented today:
  - `identity` (app auth/session/user)
  - `provider-connections` (LLM credentials + capability matrix scaffold)
  - `profile` (profile and preferences)
  - `reading-studio` (readings, cards, threads, interpretations)
- planned later:
  - `knowledge` (retrieval caches, source metadata, citation policy)
  - `workflow` / worker integration for durable AI jobs
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

## 9) Data Model (Conceptual)
Core entities:
- `users`
- `auth_identities`
- `profiles`
- `user_preferences`
- `provider_connections`
- `provider_credentials`
- `decks`
- `cards`
- `readings`
- `reading_cards` (fixed assignment metadata only)
- `question_threads`
- `card_groups`
- `card_group_members`
- `interpretation_requests`
- `interpretation_artifacts`
- `interpretation_estimates`
- `citation_sources`
- `reading_events` (append-only)
- `reading_snapshots`
- `knowledge_documents` (cached/reviewed evidence)
- `profile_stats`

Data invariants:
- `reading_cards` assignment is immutable for `cardId` and `assignedReversal` after creation.
- visual `rotationDeg` is mutable and independent from reversal meaning.
- mutable workspace state persists through semantic events/projections; it must not rewrite the immutable assignment identity stored in `reading_cards`.
- each reading stores immutable deck selection metadata (`deckId`, `deckSpecVersion`) once created.
- each reading stores active `canvasMode` and mode-switch history as semantic events.
- reading lifecycle status is limited to `active`, `archived`, and `deleted`; `reopened` is an event/action, not a persisted status value.
- reader-defined organization states (for example `completed` or custom labels) belong to a separate label/tag layer and must not replace canonical lifecycle status in persistence or API contracts.
- each interpretation request stores frozen target context.
- provider credentials are never returned in raw form after initial save.
- OAuth refresh/access tokens are encrypted and rotated per provider policy.
- each interpretation request stores planner metadata (`cardCount`, `mode`, `sourceStrategy`, `estimateSnapshot`).

## 10) API Design (V1)
### 10.1 API Style
Command-oriented mutation API with idempotency.

### 10.2 Minimum Endpoints
- `POST /v1/readings`
- `GET /v1/readings`
- `GET /v1/readings/{id}`
- `POST /v1/readings/{id}/commands`
- `GET /v1/decks`
- `POST /v1/interpretations`
- `GET /v1/interpretations/{id}`
- `POST /v1/interpretations/estimate`
- `POST /v1/interpretations/{id}/cancel`
- `GET /v1/preferences`
- `PATCH /v1/preferences`
- `GET /v1/profile`
- `GET /v1/profile/stats`
- `GET /v1/provider-connections`
- `POST /v1/provider-connections/api-key`
- `POST /v1/provider-connections/oauth/start`
- `GET /v1/provider-connections/oauth/callback`
- `PATCH /v1/provider-connections/{id}`
- `DELETE /v1/provider-connections/{id}`

V1 integration/read-model sync extensions:
- `GET /v1/readings/{id}/events?afterVersion=`
- `GET /v1/readings/{id}/stream`

### 10.3 Command Rules
- All commands include:
  - `commandId` (UUID),
  - `expectedVersion`,
  - `type`,
  - `payload`.
- Every mutation request must include `Idempotency-Key` header.
- Duplicate command IDs for same reading must be no-op and return prior result.
- `POST /v1/readings` accepts optional `deckId`; if omitted, server uses user default deck preference.
- `POST /v1/readings` accepts optional initial `canvasMode` (`freeform` or `grid`), default `freeform`.

### 10.4 Provider Connection Rules
- Connections are scoped per user account.
- One connection may be marked default.
- Interpretation request accepts optional `providerConnectionId`; if absent, use user's default.
- Provider capability matrix (`supportsApiKey`, `supportsOAuth`, `supportsStreaming`, `supportsBackground`) is resolved server-side.

### 10.5 Interface and Versioning Rules
- External API is versioned (`/v1/...`), additive-first.
- Breaking changes require `/v2` and migration notes.
- Event contracts are versioned separately from REST contracts.
- Public integration surface must be DTO-based; do not leak internal ORM models.
- Every contract change requires schema validation tests.

Interpretation execution rules:
- `POST /v1/interpretations` may return:
  - `202 accepted` when queued/running,
  - `409 confirmation_required` when high-card threshold is exceeded and confirmation token is missing.
- Cancel endpoint is idempotent.

## 11) Persistence, Restore, and Concurrency
1. Client creates semantic command (not raw pixel stream).
2. Server validates auth + ownership + schema.
3. Server applies mutation transactionally.
4. Server appends event and updates projection.
5. Server returns new aggregate version.
6. Client acknowledges command and removes from local retry queue.

Rules:
- Persist drag/rotate end events, not every movement tick.
- Persist grid-snap placement events as semantic updates (not per-pointer tick).
- Persist panel width preference updates on drag-end (not continuously) as user preference changes.
- Snapshot every 25-50 semantic events or milestone actions.
- Restore path: latest snapshot + tail events.
- Use optimistic concurrency for semantic edits.
- For low-value layout conflicts, last-write-wins is acceptable.

Event/outbox requirement:
- Domain events are written transactionally with state changes.
- Outbox dispatcher publishes integration-safe events.
- Minimum event set for future integrations:
  - `reading.created`
  - `reading.updated`
  - `reading.archived`
  - `reading.reopened`
  - `reading.deleted`
  - `interpretation.completed`
  - `interpretation.cancelled`
  - `interpretation.warning-triggered`
  - `question.created`
  - `card-group.created`

## 12) AI Safety and Experience Rules
### 12.1 Framing
- Interpretations are reflective and symbolic, not certainties.
- Output must avoid deterministic predictions or commands.

### 12.2 Directive Rule (Founder comment integration)
Allowed:
- reflective suggestions,
- focus prompts,
- “consider/explore/notice” language.

Not allowed:
- instructions that tell users what they must do,
- diagnosis/treatment claims,
- legal or financial decision directives,
- claims of guaranteed outcomes or hidden facts.

### 12.3 Language Policy
Use:
- “One possible reading is…”
- “Another plausible interpretation is…”
- “Symbolically this can point to…”

Avoid:
- “This will happen.”
- “The cards prove…”
- “I sense your energy and know…”

### 12.4 High-Risk Handling
If prompt indicates self-harm, psychosis/delusion, abuse danger, or severe distress:
- stop tarot interpretation,
- return supportive crisis-safe guidance,
- avoid pretending real-time monitoring,
- log for internal safety review.

## 13) Profile and Retention Design (V1)
Track supportive progression, not “accuracy” or luck gamification:
- readings completed,
- reflection rhythm,
- cards explored,
- spreads practiced,
- question craft progress,
- recurring themes revisited.

Do not ship:
- luck score,
- fate certainty score,
- manipulative streak pressure.

Future-compatible profile requirement:
- Profile metrics must be source-aware so future modules can contribute without coupling.
- Example metric namespaces:
  - `reading.*` from Reading Studio
  - `notes.*` from Notes Studio (future)
  - `social.*` from Social Studio (future)

## 14) Non-Functional Requirements
Performance targets:
- reading load p95 < 2.5s.
- command roundtrip p95 < 400ms.
- standard interpretation median < 4s.
- standard interpretation p95 < 10s.

Reliability targets:
- command write success >= 99.9%.
- restore success >= 99.9% in crash/refresh harness.
- duplicate visible interpretation failures < 0.1%.
- provider token refresh success >= 99.5% (for enabled OAuth providers).
- cancel acknowledgement latency p95 < 2s for queued/running interpretation jobs.

Quality targets:
- beginner clarity >= 4.2/5.
- expert groundedness >= 4.0/5.
- overclaim violations < 0.5% on safety red-team set.
- citation coverage >= 95% for enriched answers.
- high-card warning display coverage = 100% when threshold is exceeded.

Security targets:
- provider API keys and OAuth tokens encrypted at rest using managed KMS keys.
- no plaintext credential logging.
- credential access paths fully audited.

## 15) Evaluation and QA
### 15.1 Benchmark Set
Maintain 200-300 benchmark cases:
- single-card,
- 3/5-card synthesis,
- contradictory/tension spreads,
- threaded follow-ups,
- safety interruption prompts,
- citation conflict scenarios.

### 15.2 Human Review
- Weekly blind A/B sample review.
- Monthly full benchmark sweep.
- Include both beginner and expert raters.

### 15.3 Automated Gates
- deterministic deck replay tests,
- command idempotency tests,
- snapshot restore tests,
- deck preference default/override tests,
- canvas mode switch and grid-snap behavior tests,
- sidebar resize persistence tests,
- JSON contract tests,
- safety phrase policy tests,
- citation schema validation,
- latency and cost drift checks.

## 16) Delivery Sequence
### 16.1 Gate -1 (Foundation)
- Google auth baseline.
- Profile shell baseline.
- Default deck preference onboarding.

### 16.2 Gate 0 (Core Reliability)
- deterministic reading creation,
- command envelope + idempotency,
- event log + snapshots + restore path,
- question/groups persistence,
- interpretation warning + cancellation,
- canvas mode baseline (`freeform` + `grid`).

### 16.3 Core 12-Week Build Window
Weeks 1-2:
- monorepo bootstrap,
- Google auth,
- provider connection framework (API key mode),
- onboarding default deck preference capture,
- deterministic reading creation,
- base schema.

Weeks 3-4:
- chat shell motion + panel resize persistence,
- canvas mode abstraction (`freeform` + `grid` contract),
- command API,
- event log + snapshots,
- restore reliability,
- card canvas interactions.

Weeks 5-6:
- question tree,
- card groups,
- frozen interpretation targets.

Weeks 7-8:
- interpretation workflow MVP,
- web-first research,
- citation persistence,
- uncertainty rendering,
- high-card estimate + warning UX,
- stop/cancel control and workflow cancellation path.

Weeks 9-10:
- safety interruption pipeline,
- tracing/observability,
- retry and dedupe hardening,
- first OAuth-capable provider integration (if provider support is available).

Weeks 11-12:
- benchmark harness,
- profile stats,
- latency/cost tuning,
- beta launch readiness.

### 16.4 Post-Core Releases
- Release A (V1.5): Visual Storytelling Mode.
- Release B (V1.6): Fusion Lab.
- Release C (V1.7): Dialogue Mode.
- Release D (V2): Deck Creation (Template + Moderation).
- Release E (V2): Private Sharing + Monetization.

## 17) Risk Register and Kill Tests
- Beginner confusion remains high.
  - Mitigation: progressive disclosure and clearer summaries.
  - Kill test: clarity < 4.0 after 3 iterations.

- Overclaiming or unsafe outputs.
  - Mitigation: strict safety pass + uncertainty templates.
  - Kill test: overclaim rate > 0.5%.

- Data loss after crashes.
  - Mitigation: command idempotency + snapshots + replay.
  - Kill test: restore success < 99.5%.

- AI orchestration complexity blocks delivery.
  - Mitigation: keep orchestrator-centric hybrid, avoid agent sprawl.
  - Kill test: roadmap slips > 2 weeks due to orchestration complexity.

- Web-first research cost/latency spikes.
  - Mitigation: retrieval caching, model tiering, async deep mode.
  - Kill test: cost per active user rises without retention lift.

- Large-card interpretation requests create runaway token/time costs.
  - Mitigation: threshold warnings, planner modes, chunked execution, explicit cancellation.
  - Kill test: high-card runs exceed budget guardrails without warning in production telemetry.

- Provider OAuth delegation unavailable or unstable.
  - Mitigation: capability flags + API-key fallback + clear UX messaging.
  - Kill test: OAuth connection success rate < 95% for enabled providers.

- Post-core generation cost growth (storyboard/fusion/dialogue) outpaces retention.
  - Mitigation: cost estimate confirmation, quotas, entitlement controls.
  - Kill test: generation cost grows for 2 release cycles without measurable retention gain.

- Provenance quality decays in generated artifacts.
  - Mitigation: mandatory provenance map, contract tests, reviewer audits.
  - Kill test: provenance completeness < 99% on benchmark artifacts.

- Anthropomorphic confusion from persona features.
  - Mitigation: explicit interpretive framing + boundary copy.
  - Kill test: user misunderstanding signal exceeds defined threshold in usability studies.

- Deck creation introduces moderation/legal risk.
  - Mitigation: template constraints + rights attestation + moderation review.
  - Kill test: blocked-content leakage above policy threshold.

## 18) Contributor Protocol
1. The modular PRD set in `docs/product/` is the primary editing surface for requirements.
2. During migration, this charter is the tie-breaker source of truth if wording conflicts appear across PRDs.
3. Every feature PR must include:
  - mapped charter sections,
  - acceptance criteria evidence,
  - migration/rollback note (if schema changed).
4. Keep architecture decision records current.
5. No production debug endpoints exposing user/session/account internals.

## 19) Open Decisions (Reduced)
1. Durable workflow engine choice for V1 deployment target.
2. V1 onboarding posture default (`plain` only vs optional `esoteric` chooser).
3. Public randomness verification timing (V1.1 vs V2).
4. Initial deck/art package licensing strategy.
5. Data retention windows for sensitive reading text and generated artifacts.
6. Provider-by-provider launch order for OAuth connections.
7. Default high-card warning threshold and initial token/runtime budget limits.
8. Storyboard model/provider routing strategy per abstraction level.
9. Subscription packaging details (plan tiers and usage-pack denominations).

## 20) Future Growth Blueprint (Pre-wired Now)
This section defines how V1 must be built so a bigger product can be added without rewrites.

### 20.1 Studio Model
Treat each major product mode as a studio:
- `Reading Studio` (V1): tarot workspace and interpretations.
- `Notes Studio` (future): deep note-taking workspace inspired by Obsidian-style workflows.
- `Social Studio` (future): sharing, discovery, or community features.

Each studio has:
- its own frontend route group and state boundaries,
- its own NestJS module(s),
- its own API surface,
- clear event contracts to communicate with other studios.

### 20.2 Notes Studio Readiness Requirements
Even though Notes Studio is not in V1, V1+ must preserve these interfaces:
- Ability to attach notes to reading entities by stable IDs:
  - `readingId`
  - `questionId`
  - `cardGroupId`
  - `interpretationId`
  - `storyboardId` (post-core)
  - `fusionId` (post-core)
  - `dialogueSessionId` (post-core)
- Bidirectional linking model (reading object <-> note object).
- Deferred indexer port for full-text and graph relationships.

Suggested future endpoints (reserved):
- `POST /v1/notes`
- `GET /v1/notes/{id}`
- `PATCH /v1/notes/{id}`
- `POST /v1/notes/links`

### 20.3 Private Share Artifact Flow (Pre-Social)
Private share is the first sharing stage and the bridge into Social Studio.

Flow:
1. Artifact is created in Reading Studio (`storyboard`, `fusion`, `dialogue summary`).
2. Artifact is stored with provenance and safety flags.
3. User creates tokenized private share link (`unlisted`, expiry, revocation).
4. Social Studio (future) ingests shared artifacts through stable `ShareArtifactRef` contracts.

Design rule:
- Sharing contracts must not require direct database coupling between studios.

### 20.4 UX Transition Pattern (Future)
Support a “shifted canvas” mode transition between studios (reading -> notes/social) without state loss:
- Preserve reading context in URL/state token.
- Open destination studio with contextual backlinks to current reading/thread/group.
- Return path restores exact reading workspace state.

### 20.5 Containerization and External Integration
Reading Studio must remain embeddable as a containerized feature:
- no global mutable singletons across studios,
- no direct dependency on social or notes modules,
- integration happens through contracts/events only.

If app evolves into a broader platform, Reading Studio should continue to run unchanged behind its interfaces.

## 21) Delivery Governance (Git + CI/CD)
### 21.1 Source Control
- Project is Git-tracked from the start.
- Default branch is `main`.
- All implementation work happens on short-lived branches.
- Branch naming convention:
  - `feature/<scope>-<description>`
  - `fix/<scope>-<description>`
  - `chore/<scope>-<description>`

### 21.2 Pull Request Policy
- No direct pushes to `main`.
- Every change lands via pull request.
- Every PR must:
  - map to charter section(s),
  - include acceptance evidence,
  - pass required CI checks,
  - trigger Codex review through PR comment mention `@codex review` (manual or automated workflow).
- Squash merge is the default strategy.

### 21.3 CI Baseline (Required)
- CI runs on pull requests and on pushes to `main`.
- Baseline CI gates:
  - dependency install,
  - workspace typecheck,
  - API tests,
  - web tests,
  - workspace build.
- Required status check name: `ci-checks`.
- Codex review trigger workflow runs on PR lifecycle events and ensures `@codex review` comment exists.

### 21.4 CD Baseline (Current + Post-MVP)
- Hosting target for V1 web app is Vercel.
- Deployment flows:
  - PR -> preview deployment (when deploy secrets are present),
  - `main` -> production deployment (when deploy secrets are present).
- Deployment automation is defined in repository workflow files under `.github/workflows`.
- Current hosted production may remain web-only until Gate 0 exit criteria are met.
- The next delivery gate after Gate 0 is full-stack dogfooding deployment:
  - public API hosting,
  - managed Postgres,
  - durable session storage,
  - and post-deploy smoke tests.
- API deployment is intentionally deferred only until the durable reading MVP threshold is met; after that it is prioritized before post-core feature releases.

### 21.5 Checkpoint Discipline
- Contributors create checkpoint commits at meaningful milestones.
- Before ending a coding session:
  - update `PLAN.md` with current state and next tasks,
  - ensure `AGENTS.md` still points the next session to the right context,
  - run `npm run ci:checks`.

---

This document is intentionally implementation-ready.  
All future PRD, technical design docs, API contracts, and task breakdowns must inherit from this charter.
