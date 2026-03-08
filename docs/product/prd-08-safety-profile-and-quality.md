# PRD 08 - Safety, Profile, and Quality

Source: `CHARTER.md` (v0.3 extraction)
Coverage: sections 12 through 15

## 12) AI Safety and Experience Rules
### 12.1 Framing
- Interpretations are reflective and symbolic, not certainties.
- Output must avoid deterministic predictions or commands.

### 12.2 Directive Rule (Founder comment integration)
Allowed:
- reflective suggestions,
- focus prompts,
- “consider/explore/notice” language.

Not allowed:
- instructions that tell users what they must do,
- diagnosis/treatment claims,
- legal or financial decision directives,
- claims of guaranteed outcomes or hidden facts.

### 12.3 Language Policy
Use:
- “One possible reading is…”
- “Another plausible interpretation is…”
- “Symbolically this can point to…”

Avoid:
- “This will happen.”
- “The cards prove…”
- “I sense your energy and know…”

### 12.4 High-Risk Handling
If prompt indicates self-harm, psychosis/delusion, abuse danger, or severe distress:
- stop tarot interpretation,
- return supportive crisis-safe guidance,
- avoid pretending real-time monitoring,
- log for internal safety review.

## 13) Profile and Retention Design (V1)
Track supportive progression, not “accuracy” or luck gamification:
- readings completed,
- reflection rhythm,
- cards explored,
- spreads practiced,
- question craft progress,
- recurring themes revisited.

Do not ship:
- luck score,
- fate certainty score,
- manipulative streak pressure.

Future-compatible profile requirement:
- Profile metrics must be source-aware so future modules can contribute without coupling.
- Example metric namespaces:
  - `reading.*` from Reading Studio
  - `notes.*` from Notes Studio (future)
  - `social.*` from Social Studio (future)

## 14) Non-Functional Requirements
Performance targets:
- reading load p95 < 2.5s.
- command roundtrip p95 < 400ms.
- standard interpretation median < 4s.
- standard interpretation p95 < 10s.

Reliability targets:
- command write success >= 99.9%.
- restore success >= 99.9% in crash/refresh harness.
- duplicate visible interpretation failures < 0.1%.
- provider token refresh success >= 99.5% (for enabled OAuth providers).
- cancel acknowledgement latency p95 < 2s for queued/running interpretation jobs.

Quality targets:
- beginner clarity >= 4.2/5.
- expert groundedness >= 4.0/5.
- overclaim violations < 0.5% on safety red-team set.
- citation coverage >= 95% for enriched answers.
- high-card warning display coverage = 100% when threshold is exceeded.

Security targets:
- provider API keys and OAuth tokens encrypted at rest using managed KMS keys.
- no plaintext credential logging.
- credential access paths fully audited.

## 15) Evaluation and QA
### 15.1 Benchmark Set
Maintain 200-300 benchmark cases:
- single-card,
- 3/5-card synthesis,
- contradictory/tension spreads,
- threaded follow-ups,
- safety interruption prompts,
- citation conflict scenarios.

### 15.2 Human Review
- Weekly blind A/B sample review.
- Monthly full benchmark sweep.
- Include both beginner and expert raters.

### 15.3 Automated Gates
- deterministic deck replay tests,
- command idempotency tests,
- snapshot restore tests,
- deck preference default/override tests,
- canvas mode switch and grid-snap behavior tests,
- sidebar resize persistence tests,
- JSON contract tests,
- safety phrase policy tests,
- citation schema validation,
- latency and cost drift checks.

