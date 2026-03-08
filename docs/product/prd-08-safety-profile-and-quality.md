# PRD 08 - Safety, Profile, and Quality

Source: `CHARTER.md` (v0.3 extraction + strategic expansion updates)
Coverage: sections 12 through 15

## 12) AI Safety and Experience Rules
### 12.1 Framing
- Interpretations are reflective and symbolic, not certainties.
- Archetypal personas are interpretive constructs, never factual entities.
- Output must avoid deterministic predictions or commands.

### 12.2 Directive Rule
Allowed:
- reflective suggestions,
- focus prompts,
- `consider/explore/notice` language.

Not allowed:
- instructions that tell users what they must do,
- diagnosis/treatment claims,
- legal or financial decision directives,
- claims of guaranteed outcomes or hidden facts.

### 12.3 Language Policy (Dual Register)
Use (plain register):
- `One possible reading is...`
- `Another plausible interpretation is...`
- `This pattern may suggest...`

Use (esoteric register):
- `Symbolically this current can indicate...`
- `One archetypal reading is...`

Avoid in all registers:
- `This will happen.`
- `The cards prove...`
- `I know your reality for certain...`

Constraint:
- `plain` and `esoteric` outputs must preserve semantic intent, only differing in vocabulary/style depth.

### 12.4 Wellness Boundary
- Use `wellness` labeling, not clinical health framing.
- Wellness outputs can discuss reflection, habits, stress, and balance.
- Wellness outputs must not diagnose, prescribe treatment, or imply medical certainty.

### 12.5 Anthropomorphism Boundary
- Persona/dialogue modes may use archetypal voice for clarity.
- System must disclose that persona outputs are generated interpretations.
- UI must avoid framing persona responses as supernatural fact claims.

### 12.6 High-Risk Handling
If prompt indicates self-harm, psychosis/delusion, abuse danger, or severe distress:
- stop tarot interpretation,
- return supportive crisis-safe guidance,
- avoid pretending real-time monitoring,
- log for internal safety review.

### 12.7 Content Moderation Policy (Deck and Share Surfaces)
- Custom deck assets must pass policy checks before publish/share eligibility.
- Rights attestation is mandatory before moderation review can move to `approved`.
- Unsafe or likely infringing outputs must be blocked from publish/share paths.
- Uncertain moderation outcomes must route to human review before approval.

## 13) Profile and Retention Design
Track supportive progression, not accuracy gamification:
- readings completed,
- reflection rhythm,
- cards explored,
- spreads practiced,
- question craft progress,
- recurring themes revisited,
- storyboard/fusion artifact revisit behavior.

Do not ship:
- luck score,
- fate certainty score,
- manipulative streak pressure,
- compulsion-oriented reward loops.

Future-compatible profile requirement:
- Profile metrics must be source-aware so future modules can contribute without coupling.
- Example metric namespaces:
  - `reading.*` from Reading Studio
  - `story.*` from Visual Storytelling
  - `fusion.*` from Fusion Lab
  - `dialogue.*` from Dialogue Mode
  - `notes.*` from Notes Studio (future)
  - `social.*` from Social Studio (future)

## 14) Non-Functional Requirements
Performance targets:
- reading load p95 < 2.5s.
- command roundtrip p95 < 400ms.
- standard interpretation median < 4s.
- standard interpretation p95 < 10s.
- storyboard/fusion/dialogue cancel acknowledgement p95 < 2s.

Reliability targets:
- command write success >= 99.9%.
- restore success >= 99.9% in crash/refresh harness.
- duplicate visible interpretation failures < 0.1%.
- provider token refresh success >= 99.5% (for enabled OAuth providers).
- cancellation endpoints are idempotent and auditable.

Quality targets:
- beginner clarity >= 4.2/5.
- expert groundedness >= 4.0/5.
- overclaim violations < 0.5% on safety red-team set.
- citation coverage >= 95% for enriched answers.
- high-card warning display coverage = 100% when threshold is exceeded.
- dual-register semantic parity pass rate >= 99% in test suite.

Security targets:
- provider API keys and OAuth tokens encrypted at rest using managed KMS keys.
- no plaintext credential logging.
- credential access paths fully audited.
- private share links are revocable and time-bound.

## 15) Evaluation and QA
### 15.1 Benchmark Set
Maintain benchmark cases for:
- single-card,
- 3/5-card synthesis,
- contradictory/tension spreads,
- threaded follow-ups,
- safety interruption prompts,
- citation conflict scenarios,
- storyboard abstraction variants,
- fusion lens consistency,
- dialogue boundary enforcement.

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
- dual-register semantic equivalence tests,
- citation schema validation,
- latency and cost drift checks,
- moderation gate tests for custom decks,
- share-link expiry/revocation tests,
- entitlement budget decrement tests.
