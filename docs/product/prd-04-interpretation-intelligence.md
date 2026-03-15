# PRD 04 - Interpretation Intelligence

Source: `CHARTER.md` (v0.3 extraction + strategic expansion updates)
Coverage: section 7 plus post-core specialist passes

## 7) Interpretation Intelligence
### 7.1 Orchestration Model
Use hybrid orchestration:
- one primary orchestrator responsible for final user-facing interpretation,
- bounded specialist passes run in parallel,
- final synthesis merges specialist outputs under safety and citation checks.

### 7.2 Specialist Passes (Core V1)
- Card Symbol Pass: symbols/motifs for each selected card.
- Card Knowledge Pass: card-level information, authored notes, and upright/reversed semantics in plain register by default.
- Cross-Card Pattern Pass: overlaps, tensions, and narrative arc.
- Question Alignment Pass: maps synthesis to active thread question.
- Citation/Safety Pass: validates source support and policy compliance.

### 7.3 Specialist Passes (Post-Core Expansion)
- Story Composer Pass:
  - composes 3-4 scene beats from interpretation evidence,
  - enforces abstraction level (`abstract`, `archetypal`, `everyday`, `action`),
  - emits panel-level provenance for storyboard rendering.
- Fusion Persona Synthesis Pass:
  - synthesizes a stable two-card persona core,
  - applies context lens adaptations (`relationship`, `wellness`, `work/business` as API enum `work_business`, `creativity`, `spiritual`, `everyday`),
  - preserves one core persona identity across lens outputs.
- Dialogue Boundary/Safety Pass:
  - enforces reflective framing and anthropomorphism boundaries,
  - blocks diagnosis/treatment and legal/financial directive outputs,
  - keeps dialogue responses grounded in provenance.

### 7.4 “Reader Skills” Library (Founder comment integration)
To make output feel natural and human-like without fake certainty, maintain versioned reusable “skills” (prompt modules):
- `plain_register_clarity`
- `symbol_to_theme_mapping`
- `cross_card_synthesis`
- `balanced_alternative_reading`
- `reflective_prompt_generation`
- `uncertainty_calibration`
- `dual_register_rendering`
- `persona_boundary_guardrails`

Each interpretation stores `skillsVersion` for reproducibility.

### 7.5 Deck Knowledge and Enrichment Policy
V1 policy is deck-knowledge-first:
- Every interpretation begins from the selected deck's stored card information and linked symbol information.
- Card and symbol information are extensible knowledge fields, not a single fixed “meaning” string.
- Citations/knowledge references are mandatory for factual or contextual claims, whether those references point to deck-authored entries, starter content, or imported supporting sources.
- Live web research is not part of the core V1 interpretation contract.

Starter-content policy:
- Users may initialize a deck from starter content or from an empty template.
- The product must support shipping at least one default deck path with preloaded card/symbol knowledge.
- Until curated production data is ready, starter-content paths may use mock data.

External enrichment policy:
- Future external research/import flows must attach their results to deck knowledge instead of leaving them ephemeral at interpretation time.
- Any later web enrichment should be explicit, optional, and reviewable.

### 7.6 Knowledge Priority Tiers
- Tier 1: current deck's card information, symbol information, and explicit reader-authored notes.
- Tier 2: vetted starter content bundled with the deck template.
- Tier 3: imported or attached supporting sources saved into the deck knowledge base.
- Tier 4: optional future external enrichment awaiting review or consolidation.

### 7.7 Interpretation Output Layers
Every interpretation must render three visible layers:
1. Plain Summary.
2. Why This Pattern (card, symbol, and deck-knowledge evidence).
3. Deep Dive (optional, attached knowledge references and alternative reading).

Post-core modules reuse this foundation:
- Visual Storytelling renders scenes from these same evidence layers.
- Fusion Lab renders persona structure from these same evidence layers.
- Dialogue Mode renders bounded turns from these same evidence layers.

### 7.8 Output Contract (Owned by Engineering)
Engineering maintains a stable structured contract that includes:
- request context (`readingId`, `questionId`, `groupId`, `stateVersion`),
- user-facing interpretation layers,
- uncertainty note,
- citation/reference objects with source metadata,
- safety flags,
- model and skills version metadata,
- `registerMode` (`plain` | `esoteric`).

### 7.9 Large-Card Adaptive Strategy and Cancellation
Interpretation planner requirements:
- Compute selected-card count before execution.
- Estimate expected token range, expected runtime, and risk level.
- Apply mode selection:
  - `normal` mode for small/medium card sets.
  - `high-volume` mode for large card sets (chunking + synthesis staging + stricter budget controls).

High-card warning rule:
- If selected-card count is above the configured threshold, block auto-start and require explicit user confirmation.
- Warning must display:
  - card count,
  - estimated token range,
  - estimated runtime range,
  - notice that cancellation is available.

Stop/cancel rule:
- Interpretation, storyboard, fusion, and dialogue jobs must be cancellable while queued/running.
- Cancellation must propagate to workflow workers and tool calls.
- Final state must be explicit (`cancelled_by_user`) and persisted with partial artifacts if available.

### 7.10 Dual Register Rule
All symbolic outputs support explicit register mode:
- `plain` (default): plain-language phrasing.
- `esoteric`: advanced symbolic vocabulary.

Constraint:
- Register changes wording depth, not semantic intent.
