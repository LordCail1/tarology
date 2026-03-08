# PRD 01 - Product Foundation

Source: `CHARTER.md` (v0.3 extraction)
Coverage: global metadata + sections 0 through 3

Global context:
- Status: Draft v0.3
- Last updated: 2026-03-08
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
8. V1 interpretation is web-first for card and symbol research on every request (founder requirement), with caching and provenance.
9. Safety posture is reflective guidance, not directives or certainty claims.
10. V1 app auth is Google only, server-side sessions, provider subject (`sub`) as external identity anchor.
11. Model access supports user-managed provider connections in two modes: `api_key` and `oauth` (where provider delegation is available).
12. Git workflow is branch + PR based; direct pushes to `main` are disallowed.
13. CI/CD is established from day one: GitHub Actions for CI and Vercel deployments for web preview/production.
14. Reading Studio side panels support smooth expand/collapse animation and desktop drag-to-resize with per-user persisted widths.
15. Reading canvas architecture is multi-modal (`freeform`, `grid`) with one shared command/state model so new modes can be added without redesign.
16. Users choose a default tarot deck during first-time onboarding; new readings use this default unless the user explicitly overrides deck selection before creation.

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

