# Tarology v2 Plan

Last updated: 2026-03-08 (America/Toronto)
Owner: Product + Engineering

## Goal
Ship a reliable V1 foundation for Tarology v2 that matches the charter: deterministic-at-creation card assignment, durable reading state, modular NestJS architecture, and an interpretation pipeline that can scale from small card groups to high-card runs with warning and cancellation controls.

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

## Completed So Far
- Monorepo structure and workspace scripts.
- NestJS module skeleton:
  - `identity`
  - `provider-connections`
  - `reading-studio`
- Deterministic deck assignment on reading creation.
- Shared `CreateReading` contract package.
- CI/CD baseline and Vercel preview/production pipeline.
- Reading Studio shell redesign with persisted panel state and mobile drawers.
- Documentation modularization into PRD set with `docs/product/README.md` index.
- Strategic expansion documentation pass completed (storytelling -> fusion -> dialogue -> deck creation -> sharing/monetization).

## Locked Product Decisions (Execution)
- Card identity and reversal are fixed at reading creation; never sampled on click.
- App auth is Google-first for V1.
- Provider connectivity supports both `api_key` and `oauth` modes where capability exists.
- Reading sidebars must support animation + desktop drag-resize with persisted widths.
- Canvas architecture is mode-capable (`freeform`, `grid`) behind one state/command model.
- User default deck is captured during onboarding and can be overridden per reading.
- Post-core expansion order is locked:
  1. Visual Storytelling
  2. Fusion Lab
  3. Dialogue Mode
  4. Deck Creation + Moderation
  5. Private Sharing + Monetization
- Card voice posture is archetypal persona (interpretive, non-literal).
- Engagement model is reflective progression, not manipulative loops.

## Immediate Queue (Gate -1 and Gate 0)
1. Add persistent storage baseline (PostgreSQL + migrations + local dev setup).
- Acceptance: readings survive API restart; in-memory map removed from canonical path.

2. Introduce command mutation envelope for reading changes.
- Acceptance: command ID, idempotency key, expected version checks, append-only event write, projection update.

3. Build read-model restore path.
- Acceptance: `GET /v1/readings/:id` returns current projection; snapshots/events replay strategy is in place.

4. Implement question tree and saved card groups.
- Acceptance: root/sub-questions and named groups persist with relationships.

5. Start provider-connections domain with capability model.
- Acceptance: schema/API support provider type, credential mode (`api_key` or `oauth`), status, and default selection.

6. Add interpretation request job model with cancellable state machine.
- Acceptance: queued/running/completed/failed/cancelled states with idempotent cancellation.

7. Implement high-card warning plumbing.
- Acceptance: server returns estimate metadata and warning threshold signal for large card sets.

8. Implement desktop sidebar resize handles + smooth motion polish.
- Acceptance: left/right panels resize by drag on desktop and persist per user widths.

9. Introduce multi-mode canvas architecture.
- Acceptance: reading state tracks `canvasMode`; placement model supports both freeform and grid snap.

10. Add deck preference onboarding + per-reading deck override.
- Acceptance: first login captures default deck in preferences; reading creation can override before assignment.

## Post-Core Strategic Queue (Unlock after Gate 0)
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
- Onboarding register choice (`plain` only vs optional `esoteric` picker).
- Pricing/package shape for subscription and usage packs.
- Data retention windows for generated artifacts and dialogue logs.

## Known Risks
- Provider OAuth delegation capability varies by provider.
- High-card and visual generation flows can cause cost drift.
- Provenance quality can regress if not contract-tested.
- Persona features can create anthropomorphic misunderstanding without clear framing.
- Deck creation introduces moderation/IP policy burden.

## Next Agent Start Commands
```bash
cd /home/ram2c/gitclones/tarology
git status --short
npm run ci:checks
sed -n '1,220p' docs/product/README.md
sed -n '1,260p' PLAN.md
```

## Codex Continuity Note
`AGENTS.md` is the bootstrap file for session behavior. `PLAN.md` tracks execution state and queue. Keep both updated before handoff.
