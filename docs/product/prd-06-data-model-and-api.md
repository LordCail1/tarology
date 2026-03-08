# PRD 06 - Data Model and API

Source: `CHARTER.md` (v0.3 extraction + strategic expansion updates)
Coverage: sections 9 and 10 + post-core interface additions

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
- `reading_cards` (fixed assignment + canvas state)
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
- each reading stores immutable deck selection metadata (`deckId`, `deckSpecVersion`) once created.
- each reading stores active `canvasMode` and mode-switch history as semantic events.
- interpretation/storyboard/fusion/dialogue requests store frozen context tuple (`readingId`, `questionId`, `groupId`, `stateVersion`).
- provider credentials are never returned in raw form after initial save.
- OAuth refresh/access tokens are encrypted and rotated per provider policy.
- each generation artifact stores `register_mode`, `provenance_map`, `safety_flags`, and `cost_estimate_snapshot`.
- custom deck publishability requires `rights_attested_at` and `moderation_status=approved`.

## 10) API Design
### 10.1 API Style
Command-oriented mutation API with idempotency.

### 10.2 Minimum Endpoints (V1 Core)
- `POST /v1/readings`
- `GET /v1/readings`
- `GET /v1/readings/{id}`
- `POST /v1/readings/{id}/commands`
- `GET /v1/readings/{id}/events?afterVersion=`
- `GET /v1/readings/{id}/stream`
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
- `POST /v1/readings` accepts optional initial `canvasMode` (`freeform` or `grid`), default `freeform`.
- Storyboard/fusion/dialogue requests require frozen context tuple fields.

### 10.5 Provider Connection Rules
- Connections are scoped per user account.
- One connection may be marked default.
- Generation requests accept optional `providerConnectionId`; if absent, use user's default.
- Provider capability matrix (`supportsApiKey`, `supportsOAuth`, `supportsStreaming`, `supportsBackground`) is resolved server-side.

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
