# PRD 04 - Interpretation Intelligence

Source: `CHARTER.md` (v0.3 extraction)
Coverage: section 7

## 7) Interpretation Intelligence
### 7.1 Orchestration Model
Use hybrid orchestration:
- one primary orchestrator responsible for final user-facing interpretation,
- bounded specialist passes run in parallel,
- final synthesis merges specialist outputs under safety and citation checks.

### 7.2 Specialist Passes
- Card Symbol Pass: symbols/motifs for each selected card.
- Card Meaning Pass: upright/reversed semantics in beginner language.
- Cross-Card Pattern Pass: overlaps, tensions, and narrative arc.
- Question Alignment Pass: maps synthesis to active thread question.
- Citation/Safety Pass: validates source support and policy compliance.

### 7.3 “Reader Skills” Library (Founder comment integration)
To make output feel natural and human-like without fake certainty, maintain versioned reusable “skills” (prompt modules):
- `beginner_clarity`
- `symbol_to_theme_mapping`
- `cross_card_synthesis`
- `balanced_alternative_reading`
- `reflective_prompt_generation`
- `uncertainty_calibration`

Each interpretation stores `skillsVersion` for reproducibility.

### 7.4 Knowledge and Research Policy (Founder requirement)
V1 policy is web-first per interpretation request:
- Every interpretation runs live web research for selected cards and key symbols.
- Source quality filtering is mandatory.
- Citations are mandatory for factual/context claims.
- Symbolic claims must still include provenance to either web evidence or internal canonical metadata.

Caching policy:
- Cache retrieval evidence and structured extracts for speed and consistency.
- Cached evidence accelerates subsequent runs but does not disable live web pass in V1.

Evolution path:
- Build an internal curated knowledge pack from reviewed/cached evidence over time.
- For high-card interpretation requests, prefer curated evidence + selective web expansion once curated coverage becomes available.
- Shift to “curated-first, web-enrichment-optional” in V1.1 or V2 when coverage is proven.

### 7.5 Source Quality Tiers
- Tier 1: official docs, peer-reviewed publications, museums/institutions, public records.
- Tier 2: reputable publishers and established technical/editorial sources.
- Tier 3: commercial blogs (only if Tier 1/2 unavailable).
- Tier 4: user-generated sources (last resort, clearly labeled).

### 7.6 Interpretation Output Layers
Every interpretation must render three visible layers:
1. Beginner Summary.
2. Why This Pattern (card and symbol evidence).
3. Deep Dive (optional, citations and alternative reading).

### 7.7 Output Contract (Owned by Engineering)
Founder requested engineering ownership for payload details. Engineering must maintain a stable structured contract that includes, at minimum:
- request context (`readingId`, `questionId`, `groupId`, `stateVersion`),
- user-facing interpretation layers,
- uncertainty note,
- citation objects with source metadata,
- safety flags,
- model and skills version metadata.

### 7.8 Large-Card Adaptive Strategy and Cancellation
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
- Interpretation job must be cancellable from UI at all times while queued/running.
- Cancellation must propagate to workflow workers and tool calls.
- Final state must be explicit (`cancelled_by_user`) and persisted with partial artifacts if available.

Future curated-data alignment:
- Planner must support source strategy switching (`web_first`, `curated_first`, `hybrid`) without API redesign.

