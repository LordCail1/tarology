# PRD 09 - Roadmap, Risks, and Open Decisions

Source: `CHARTER.md` (v0.3 extraction + strategic expansion updates)
Coverage: sections 16 through 19

## 16) Delivery Sequence
### 16.1 Gate -1 (Foundation)
- Google auth baseline.
- Profile shell baseline.
- Default deck preference onboarding.

### 16.2 Gate 0 (Core Reliability MVP)
- deterministic reading creation,
- multiple reading history with reopen/delete/archive flow,
- durable card layout/state persistence across refresh and reading switches,
- command envelope + idempotency,
- event log + snapshots + restore path,
- question/groups persistence,
- interpretation warning + cancellation,
- canvas mode baseline (`freeform` + `grid`).

Gate 0 exit rule:
- user can create multiple readings, switch between them, and see exact prior card state/layout restored without data loss.

### 16.3 Gate 0.5 (Dogfooding Deployment Baseline)
- public API hosting on a stable domain,
- managed Postgres + durable session store,
- production env hard-fail behavior (no localhost fallbacks),
- Docker packaging/local full-stack runtime,
- full-stack CD on merge to `main` with post-deploy smoke tests.

### 16.4 Post-Core Releases
- Release A (V1.5): Visual Storytelling Mode.
- Release B (V1.6): Fusion Lab.
- Release C (V1.7): Dialogue Mode.
- Release D (V2): Deck Creation (Template + Moderation).
- Release E (V2): Private Sharing + Monetization.

## 17) Risk Register and Kill Tests
- Beginner confusion remains high.
  - Mitigation: progressive disclosure, plain-register default, clearer summaries.
  - Kill test: clarity < 4.0 after 3 iterations.

- Overclaiming or unsafe outputs.
  - Mitigation: strict safety pass + uncertainty templates + dialogue boundary pass.
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
2. During migration, charter is the tie-breaker source of truth if wording conflicts appear across PRDs.
3. Every feature PR must include:
  - mapped charter sections,
  - acceptance criteria evidence,
  - migration/rollback note (if schema changed).
4. Keep architecture decision records current.
5. No production debug endpoints exposing user/session/account internals.

## 19) Open Decisions
1. Durable workflow engine choice for V1 deployment target.
2. V1 brand posture language default in onboarding (`plain` only vs optional `esoteric`).
3. Public randomness verification timing (V1.1 vs V2).
4. Initial deck/art package licensing strategy.
5. Data retention windows for sensitive reading text and generated artifacts.
6. Provider-by-provider launch order for OAuth connections.
7. Default high-card warning threshold and initial token/runtime budget limits.
8. Storyboard model/provider routing strategy per abstraction level.
9. Subscription packaging details (plan tiers and usage pack denominations).
