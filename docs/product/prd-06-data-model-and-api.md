# PRD 06 - Data Model and API

Source: `CHARTER.md` (v0.3 extraction)
Coverage: sections 9 and 10

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

Data invariants:
- `reading_cards` assignment is immutable for `cardId` and `assignedReversal` after creation.
- visual `rotationDeg` is mutable and independent from reversal meaning.
- each reading stores immutable deck selection metadata (`deckId`, `deckSpecVersion`) once created.
- each reading stores active `canvasMode` and mode-switch history as semantic events.
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

