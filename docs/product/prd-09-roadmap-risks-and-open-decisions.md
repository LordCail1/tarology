# PRD 09 - Roadmap, Risks, and Open Decisions

Source: `CHARTER.md` (v0.3 extraction)
Coverage: sections 16 through 19

## 16) 12-Week Roadmap
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
2. V1 brand posture language: secular-only, spiritual-only, or both.
3. Public randomness verification timing (V1.1 vs V2).
4. Initial deck/art package licensing strategy.
5. Data retention windows for sensitive reading text.
6. Provider-by-provider launch order for OAuth connections.
7. Default high-card warning threshold and initial token/runtime budget limits.

