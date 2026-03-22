# PRD 06 - Data Model and API

Source: `CHARTER.md` (v0.3 extraction + strategic expansion updates)
Coverage: sections 9 and 10 + post-core interface additions

Detailed deck-knowledge and export/import execution rules now live in:
- `docs/product/prd-16-deck-knowledge-schema-and-export.md`

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
- `symbols`
- `card_symbols`
- `card_information_entries`
- `symbol_information_entries`
- `deck_exports`
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
- `knowledge_sources` (starter/imported supporting sources)
- `profile_stats`

Post-core entities:
- `visual_story_artifacts`
- `visual_story_panels`
- `fusion_personas`
- `dialogue_sessions`
- `dialogue_turns`
- `persona_specs`
- `custom_deck_drafts`
- `custom_deck_cards`
- `deck_moderation_reviews`
- `share_links`
- `billing_entitlements`
- `usage_events`

Data invariants:
- `reading_cards` assignment is immutable for `cardId` and `assignedReversal` after creation.
- visual `rotationDeg` is mutable and independent from reversal meaning.
- mutable workspace state persists through semantic events/projections; it must not rewrite the immutable assignment identity stored in `reading_cards`.
- card and symbol information are extensible knowledge records, not a single fixed meaning field.
- symbols are deck-scoped first-class entities, independently viewable, and may be linked to multiple cards.
- decks may be initialized from starter content or empty templates.
- deck exports must preserve cards, symbols, knowledge entries, and card-symbol links.
- each reading stores immutable deck selection metadata (`deckId`, `deckSpecVersion`) once created.
- each reading stores durable freeform card layout state through semantic events/projections.
- reading lifecycle status is limited to `active`, `archived`, and `deleted`; `reopened` is an event/action, not a persisted status value.
- reader-facing organization markers such as `completed`, `paused`, or custom labels belong to a separate label/tag layer and must not redefine lifecycle status in stored projections or API contracts.
- interpretation/storyboard/fusion/dialogue requests store frozen context tuple (`readingId`, `questionId`, `groupId`, `stateVersion`).
- interpretation requests prefer deck-owned knowledge over external retrieval and store planner metadata describing the chosen knowledge strategy.
- provider credentials are never returned in raw form after initial save.
- provider-account tokens or session artifacts are encrypted/handled according to provider policy when that mode is enabled.
- each generation artifact stores `register_mode`, `provenance_map`, `safety_flags`, and `cost_estimate_snapshot`.
- custom deck publishability requires `rights_attested_at` and `moderation_status=approved`.

## 10) API Design
### 10.1 API Style
Command-oriented mutation API with idempotency.

### 10.2 Minimum Endpoints (V1 Core)
- `POST /v1/decks`
- `POST /v1/readings`
- `GET /v1/decks/{id}`
- `PATCH /v1/decks/{id}`
- `POST /v1/decks/{id}/initialize`
- `GET /v1/readings`
- `GET /v1/readings/{id}`
- `POST /v1/readings/{id}/commands`
- `GET /v1/decks`
- `GET /v1/cards/{id}`
- `PATCH /v1/cards/{id}`
- `GET /v1/symbols`
- `POST /v1/symbols`
- `PATCH /v1/symbols/{id}`
- `POST /v1/decks/{id}/export`
- `POST /v1/decks/import`
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
- `POST /v1/provider-connections/provider-account/start`
- `POST /v1/provider-connections/provider-account/complete`
- `PATCH /v1/provider-connections/{id}`
- `DELETE /v1/provider-connections/{id}`

V1 integration/read-model sync extensions:
- `GET /v1/readings/{id}/events?afterVersion=`
- `GET /v1/readings/{id}/stream`

### 10.3 Post-Core Endpoints (V1.5+)
- `POST /v1/storyboards`
- `GET /v1/storyboards/{id}`
- `POST /v1/storyboards/{id}/cancel`
- `POST /v1/fusions`
- `GET /v1/fusions/{id}`
- `POST /v1/fusions/{id}/cancel`
- `POST /v1/dialogue-sessions`
- `POST /v1/dialogue-sessions/{id}/messages`
- `GET /v1/dialogue-sessions/{id}`
- `POST /v1/dialogue-sessions/{id}/cancel`
- `POST /v1/decks/custom`
- `GET /v1/decks/custom`
- `POST /v1/share-links`
- `GET /v1/share-links/{token}`
- `GET /v1/entitlements`

### 10.4 Command and Context Rules
- All mutation commands include:
  - `commandId` (UUID),
  - `expectedVersion`,
  - `type`,
  - `payload`.
- Every mutation request includes `Idempotency-Key` header.
- Duplicate command IDs for same aggregate are no-op and return prior result.
- `POST /v1/readings` accepts optional `deckId`; if omitted, server uses user default deck preference.
- Storyboard/fusion/dialogue requests require frozen context tuple fields.

### 10.5 Provider Connection Rules
- Connections are scoped per user account.
- One connection may be marked default.
- Generation requests accept optional `providerConnectionId`; if absent, use user's default.
- Provider capability matrix (`supportsApiKey`, `supportsProviderAccount`, `supportsStreaming`, `supportsBackground`) is resolved server-side.
- OpenAI is the first provider required in V1.
- Public hosted OpenAI connections use `api_key`.
- Hosted OpenAI `provider_account` mode is reserved for allowlisted internal accounts in V1.

### 10.6 Interface and Versioning Rules
- External API is versioned (`/v1/...`), additive-first.
- Breaking changes require `/v2` and migration notes.
- Event contracts are versioned separately from REST contracts.
- Public integration surface must be DTO-based; do not leak internal ORM models.
- Every contract change requires schema validation tests.

Execution/cancellation rules:
- `POST /v1/interpretations` may return:
  - `202 accepted` when queued/running,
  - `409 confirmation_required` when high-card threshold is exceeded and confirmation token is missing.
- Storyboard/fusion/dialogue cancellation is idempotent.

### 10.7 New Contract Types
- `StoryboardRequest`, `StoryboardPanel`, `StoryboardArtifact`
- `FusionRequest`, `FusionPersona`, `FusionContextLens`
- `DialogueSession`, `DialogueTurn`, `PersonaSpec`
- `CustomDeckDraft`, `DeckModerationStatus`, `DeckRightsAttestation`
- `ShareArtifactRef`, `ShareVisibility`
- `EntitlementPlan`, `UsageBudget`

Shared fields used across generated artifacts:
- `register_mode` (`plain` | `esoteric`, default `plain`)
- `abstraction_level` (`abstract` | `archetypal` | `everyday` | `action`)
- `provenance_map`
- `safety_flags`
- `cost_estimate_snapshot`
- `moderation_status`
- `rights_attested_at`
