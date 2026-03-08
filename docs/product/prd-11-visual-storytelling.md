# PRD 11 - Visual Storytelling Mode

Source: Strategic expansion planning session (2026-03-08)
Horizon: V1.5 (post-core)

## 1) Purpose
Add a visual meaning layer to interpretations by generating a 3-4 panel storyboard from a frozen reading context.

The feature is not a generic image generator. It is a structured rendering of interpretation evidence so users can understand symbolic patterns at multiple abstraction levels.

## 2) Scope
### 2.1 In Scope
- `POST /v1/storyboards` asynchronous generation from frozen context tuple:
  - `readingId`
  - `questionId`
  - `groupId`
  - `stateVersion`
- Abstraction levels:
  - `abstract`
  - `archetypal`
  - `everyday`
  - `action`
- Dual register output mode:
  - `plain` (default)
  - `esoteric`
- 3-4 storyboard panels with per-panel provenance.
- `GET /v1/storyboards/{id}` retrieval.
- `POST /v1/storyboards/{id}/cancel` idempotent cancellation.

### 2.2 Out of Scope
- Public feed and public publishing.
- Open creator marketplace.
- Realtime co-editing of storyboards.

## 3) UX Contract
1. User requests interpretation.
2. User selects `Visualize this reading`.
3. User chooses `abstraction_level` and `register_mode`.
4. System generates storyboard panels + captions + provenance.
5. User can save privately and revisit in reading history.

Panel structure (target):
- panel 1: emotional landscape
- panel 2: core tension
- panel 3: turning point
- panel 4 (optional): lived embodiment

## 4) Data and Contracts
Required request contract:
- `StoryboardRequest`
  - frozen context tuple (`readingId`, `questionId`, `groupId`, `stateVersion`)
  - `abstractionLevel`
  - `registerMode`
  - optional style/template id

Required response/artifact contracts:
- `StoryboardPanel`
  - `panelIndex`
  - `imageUri`
  - `caption`
  - `provenanceMap`
  - `safetyFlags`
- `StoryboardArtifact`
  - `id`
  - `status`
  - `panels[]`
  - `costEstimateSnapshot`
  - `createdAt`

## 5) Interpretation Pipeline Additions
Add a specialist pass before image generation:
- `Story Composer Pass`
  - transforms interpretation evidence into scene beats
  - enforces abstraction level and register mode
  - emits provenance-aware composition payload

Rule:
- Visual outputs must be generated from structured interpretation artifacts, not raw free-form prompts.

## 6) Safety Constraints
- Every storyboard must include reflective framing, not certainty framing.
- Story visuals are interpretive constructs, not forecasts.
- Wellness context must avoid diagnosis/treatment outputs.
- Legal/financial directive style captions are prohibited.

## 7) Acceptance Criteria
1. Every panel includes provenance to cards/symbols/pattern evidence.
2. Same frozen context can render all abstraction levels with semantic consistency.
3. `register_mode=plain` and `register_mode=esoteric` preserve core meaning.
4. Cancellation is idempotent and reflected in persisted status.
5. Generation cost estimate is shown for high-cost runs before execution.

## 8) Metrics
- `% interpretations followed by storyboard generation`
- `% storyboard artifacts revisited`
- safety violation rate for storyboard outputs
- cost per storyboard vs retention uplift
