# PRD 01 - Product Foundation

Source: `CHARTER.md` (v0.3 extraction)
Coverage: global metadata + sections 0 through 3

Global context:
- Status: Draft v0.3
- Last updated: 2026-03-15
- Owner: Product + Engineering
- Purpose: Canonical map for all contributors (human and AI) building Tarology v2.

This version merges:
- founder comments added to `v0.1`
- Deep Research findings received on 2026-03-08
- concrete implementation decisions for V1

## 0) Locked Decisions (This Month)
1. Architecture is a modular monolith: Next.js frontend + NestJS backend + PostgreSQL.
2. Every reading assigns full deck order at creation time; no card is sampled at click time.
3. Reversal meaning state is assigned at reading creation and stored separately from visual rotation.
4. All meaningful mutations use command API + idempotency key + version checks.
5. Persistence model uses hot projection + append-only event log + snapshots.
6. AI interpretation runs asynchronously in durable workflows with retries and tracing.
7. Interpretation orchestration is hybrid: one orchestrator with bounded parallel specialist passes.
8. V1 interpretation is deck-knowledge-first: cards and symbols own extensible information inside a deck, and live web research is optional enrichment rather than a baseline requirement.
9. Safety posture is reflective guidance, not directives or certainty claims.
10. V1 app auth is Google only, server-side sessions, provider subject (`sub`) as external identity anchor.
11. Model access supports user-managed provider connections in two modes: `api_key` and `provider_account`; V1 is OpenAI-first, with public API-key access and an allowlisted internal OpenAI subscription-backed mode.
12. Git workflow is branch + PR based; direct pushes to `main` are disallowed.
13. CI/CD is established from day one: GitHub Actions for CI and Vercel deployments for web preview/production.
14. Reading Studio side panels support smooth expand/collapse animation and desktop drag-to-resize with per-user persisted widths.
15. Reading canvas architecture is multi-modal (`freeform`, `grid`) with one shared command/state model so new modes can be added without redesign.
16. Users choose a default tarot deck during first-time onboarding; decks may be initialized from starter content or empty templates, and new readings use the chosen default unless the user explicitly overrides deck selection before creation.
17. Post-core symbolic expansion is sequenced as: Visual Storytelling -> Fusion Lab -> Dialogue Mode -> Deck Creation + Moderation -> Private Sharing + Monetization.
18. Card-voice features use an `Archetypal Persona` posture (interpretive construct, not literal entity claims).
19. Symbolic outputs support dual register (`plain` default, `esoteric` optional) with semantic parity.
20. Engagement model is reflective progression; manipulative/addictive loop design is explicitly rejected.
21. Sharing rollout is private-first (tokenized unlisted links) before any public social feed.
22. Custom deck creation is template-moderated and requires rights attestation before publish/share.
23. Monetization direction is subscription plus optional usage packs.
24. Persona implementation remains provider-agnostic; no OpenClaw lock-in.

## 1) Product Vision
Tarology helps tarot readers build, interpret, and evolve deck-specific symbolic knowledge through high-quality AI synthesis.

The app is not a random card game UI. It is a guided reflective workspace and deck-intelligence studio where users can:
- ask a main question,
- branch into sub-questions,
- pull and organize cards visually,
- inspect and enrich card and symbol knowledge,
- request interpretations for card groups,
>By default if ever the person doesn't actually select any cards to group together to have an interpretation, then by default the selection is just all of the cards. This makes sense if you think about it because at our reading the typical way of doing one is the person just makes an interpretation by using all of what's on the table.
- review grounded deck knowledge and attached sources,
- continue readings later with full state restored.
- export deck state for sharing or cloning.

## 2) Primary User and Jobs-To-Be-Done
Primary user: tarot reader.
- Maintains or develops personal deck knowledge.
- Wants AI to synthesize from cards and symbols without replacing reader judgment.
- Needs control over deck-specific context, symbols, and interpretation framing.

Secondary user: serious learner / deck builder.
- Uses AI as a structured synthesis assistant while building a personal symbolic system.

Primary JTBD:
- “Help me synthesize what these cards and symbols could mean for this question using the deck knowledge I trust, in clear language I can work with.”

## 3) Product Principles
1. Reader-first: plain register is default, but the product serves tarot practice rather than entry-level simplification.
2. Deterministic reading state: card identity is fixed at reading creation.
3. Deck-owned knowledge: cards and symbols hold extensible information inside the deck rather than relying on live web fetches at interpretation time.
4. Explainable AI: every synthesis ties to cards, symbols, and stored deck knowledge or attached sources.
5. Threaded inquiry: users can branch questions without losing context.
6. Durable by default: acknowledged state changes must survive refresh/crash.
7. Reflective safety: suggestions are reflective, never prescriptive directives.
