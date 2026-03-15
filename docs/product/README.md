# Tarology Product Documentation Index

Status: Active (modular PRD set)
Last updated: 2026-03-15

This index is the entrypoint for product requirements.

Migration note:
- The modular PRD files in this folder are extracted from `CHARTER.md` and organized by domain.
- During migration, `CHARTER.md` remains the tie-breaker if any wording conflict appears.

## How To Use
1. Start here and open only the PRD files relevant to your task.
2. Update the smallest relevant PRD file(s) instead of editing one giant document.
3. If a requirement spans multiple areas, update all affected PRDs and keep terms consistent.
4. Keep `PLAN.md` aligned with any changed requirement or sequencing.

## PRD Map
- [PRD 01 - Product Foundation](./prd-01-product-foundation.md)
- [PRD 02 - V1 Scope and UX Blueprint](./prd-02-v1-scope-and-ux.md)
- [PRD 03 - Deterministic Deck and Randomness](./prd-03-deterministic-deck.md)
- [PRD 04 - Interpretation Intelligence](./prd-04-interpretation-intelligence.md)
- [PRD 05 - System Architecture](./prd-05-system-architecture.md)
- [PRD 06 - Data Model and API](./prd-06-data-model-and-api.md)
- [PRD 07 - Persistence and Concurrency](./prd-07-persistence-and-concurrency.md)
- [PRD 08 - Safety, Profile, and Quality](./prd-08-safety-profile-and-quality.md)
- [PRD 09 - Roadmap, Risks, and Open Decisions](./prd-09-roadmap-risks-and-open-decisions.md)
- [PRD 10 - Future Growth and Delivery Governance](./prd-10-future-growth-and-delivery-governance.md)
- [PRD 11 - Visual Storytelling Mode](./prd-11-visual-storytelling.md)
- [PRD 12 - Fusion Lab](./prd-12-fusion-lab.md)
- [PRD 13 - Dialogue Mode](./prd-13-dialogue-mode.md)
- [PRD 14 - Deck Creation and Moderation](./prd-14-deck-creation-and-moderation.md)
- [PRD 15 - Sharing, Engagement, and Monetization](./prd-15-sharing-engagement-and-monetization.md)
- [PRD 16 - Deck Knowledge Schema and Export](./prd-16-deck-knowledge-schema-and-export.md)

## Symbolic Expansion
Symbolic expansion modules are staged after reliability gates to protect trust and shipping focus.

Gate sequence:
1. Gate -1: Auth + profile + preferences baseline (Google sign-in, profile shell, deck preference capture).
2. Gate 0: Core reading reliability (durable state, restore, command envelope, high-card warning/cancel, canvas mode baseline).
3. Release A (V1.5): Visual Storytelling.
4. Release B (V1.6): Fusion Lab.
5. Release C (V1.7): Dialogue Mode.
6. Release D (V2): Deck Creation + Moderation.
7. Release E (V2): Private Sharing + Monetization.

Dependency graph:
- `Visual Storytelling` depends on frozen interpretation context, provenance, and safety boundary checks.
- `Fusion Lab` depends on interpretation synthesis and reuses storytelling renderers.
- `Dialogue Mode` depends on provider-agnostic `PersonaSpec` and dialogue boundary/safety pass.
- `Deck Creation + Moderation` depends on template policy, rights attestation, and moderation workflow.
- `Private Sharing + Monetization` depends on stable artifact schemas and entitlement enforcement.

## Editing Rule
- Keep section intent unchanged unless requirements are intentionally being revised.
- When revising behavior, include concrete acceptance criteria in the touched PRD(s).
