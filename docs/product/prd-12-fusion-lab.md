# PRD 12 - Fusion Lab

Source: Strategic expansion planning session (2026-03-08)
Horizon: V1.6 (post-storytelling)

## 1) Purpose
Introduce a structured symbolic chemistry mode where two cards are fused into one archetypal persona that can be explored across contexts.

Fusion Lab complements canonical readings; it does not replace deterministic draw-based interpretation.

## 2) Scope
### 2.1 In Scope
- `POST /v1/fusions` for two-card fusion generation.
- `GET /v1/fusions/{id}` retrieval.
- Context lenses:
  - `relationship`
  - `wellness`
  - `work/business` (API enum: `work_business`)
  - `creativity`
  - `spiritual`
  - `everyday`
- Persona tabs:
  - `Essence`
  - `Behavior`
  - `Story`
  - `Visualize`
- Dual register mode (`plain`, `esoteric`).

### 2.2 Out of Scope
- Multi-card council simulation.
- Unbounded roleplay.
- Literal metaphysical claims.

## 3) Product Rules
- Fusion persona has one stable core and many contextual expressions.
- Context lenses adapt expression; they must not rewrite core persona identity.
- Output remains evidence-based and provenance-linked to source cards and interpretation patterns.

## 4) Data and Contracts
Required request contract:
- `FusionRequest`
  - frozen context tuple (`readingId`, `questionId`, `groupId`, `stateVersion`)
  - `cardAId`, `cardBId`
  - `contextLens`
  - `registerMode`

Required response/artifact contracts:
- `FusionPersona`
  - `id`
  - `name`
  - `essence`
  - `coreTraits[]`
  - `contextAdaptations`
  - `provenanceMap`
  - `safetyFlags`

## 5) Interpretation Pipeline Additions
Add specialist pass:
- `Fusion Persona Synthesis Pass`
  - synthesizes card A + card B into a stable archetypal persona core
  - emits lens adaptations
  - enforces reflective uncertainty framing

## 6) Safety Constraints
- Persona is framed as an interpretive construct.
- No certainty claims, no hidden-fact claims.
- Wellness lens is reflective only; no diagnosis/treatment output.
- Financial/legal directives remain prohibited in all lenses.

## 7) Acceptance Criteria
1. Fusion persona remains semantically stable across all context lenses.
2. Each lens output includes provenance references and uncertainty framing.
3. `plain` and `esoteric` register outputs preserve semantic equivalence.
4. Unsafe directive language is blocked by safety pass.

## 8) Metrics
- `% users starting Fusion Lab after storyboard`
- `% fusion sessions that continue to dialogue mode`
- safety violation rate by lens
- generation cost per fusion artifact
