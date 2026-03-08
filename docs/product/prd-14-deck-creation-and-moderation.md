# PRD 14 - Deck Creation and Moderation

Source: Strategic expansion planning session (2026-03-08)
Horizon: V2

## 1) Purpose
Allow users to create custom tarot decks with AI-assisted workflows while enforcing safety, moderation, and rights policies.

## 2) Scope
### 2.1 In Scope
- `POST /v1/decks/custom` create/update draft deck.
- `GET /v1/decks/custom` list user drafts.
- Template-led deck generation (style templates, card slots, naming structure).
- Rights attestation at draft or submit time.
- Moderation workflow with publish gating.

### 2.2 Out of Scope
- Open public marketplace in first rollout.
- Anonymous publishing.
- Unmoderated deck sharing.

## 3) Product Rules
- Deck creation is template-moderated, not unconstrained generation.
- Moderation and rights attestation are mandatory before any shareability.
- User onboarding default deck selection remains required even if custom decks exist.

## 4) Data and Contracts
- `CustomDeckDraft`
  - `id`
  - `ownerUserId`
  - `templateId`
  - `status`
  - `moderationStatus`
  - `rightsAttestedAt`
- `DeckModerationStatus`
  - `pending`
  - `approved`
  - `rejected`
  - `blocked`
- `DeckRightsAttestation`
  - attestation text
  - user confirmation metadata
  - timestamp

Required entities:
- `custom_deck_drafts`
- `custom_deck_cards`
- `deck_moderation_reviews`

## 5) Moderation Policy
- Block unsafe content categories per policy baseline.
- Block likely infringing likeness/IP content.
- Require manual review for uncertain cases.
- Publishing is disabled until moderation status is `approved`.

## 6) Acceptance Criteria
1. Draft deck cannot be published/shared without rights attestation.
2. Moderation status transitions are persisted and auditable.
3. Unsafe/infringing assets are blocked from publish path.
4. Deck defaults and per-reading overrides still function with custom decks.

## 7) Metrics
- deck draft completion rate
- moderation false-positive and false-negative rates
- rights attestation completion rate
- approved custom deck retention impact
