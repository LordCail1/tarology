# PRD 13 - Dialogue Mode

Source: Strategic expansion planning session (2026-03-08)
Horizon: V1.7 (post-fusion)

## 1) Purpose
Allow users to have bounded dialogue with archetypal personas derived from reading or fusion context.

Dialogue mode is reflective and educational. It is not a factual authority or autonomous entity simulation.

## 2) Scope
### 2.1 In Scope
- `POST /v1/dialogue-sessions`
- `POST /v1/dialogue-sessions/{id}/messages`
- `GET /v1/dialogue-sessions/{id}`
- Persona creation from frozen context tuple (`readingId`, `questionId`, `groupId`, `stateVersion`).
- Provider-agnostic persona architecture.
- Dual register output (`plain` default, `esoteric` optional).

### 2.2 Out of Scope
- Free-running long-lived agents.
- Persona-to-persona autonomous loops.
- Claims of literal spiritual entities.

## 3) Persona Architecture
Define `PersonaSpec` as provider-agnostic core schema:
- identity frame
- symbolic worldview and boundaries
- style profile
- safety boundary contract
- memory policy (session-scoped by default)

No runtime should depend on OpenClaw-specific file formats.
OpenClaw-like patterns can be adapted as an internal serializer layer only.

## 4) Data and Contracts
- `DialogueSession`
  - `id`
  - `personaSpecId`
  - `status`
  - `registerMode`
  - `safetyFlags`
  - `createdAt`
- `DialogueTurn`
  - `turnIndex`
  - `userMessage`
  - `personaResponse`
  - `provenanceMap`
  - `boundaryActions[]`

## 5) Interpretation Pipeline Additions
Add specialist pass:
- `Dialogue Boundary/Safety Pass`
  - certainty and directive language suppression
  - high-risk escalation handling
  - semantic consistency checks against fusion/storyboard provenance

## 6) Safety Constraints
- Mandatory reflective disclaimer in session header.
- No diagnosis/treatment instructions.
- No legal/financial directives.
- No certainty claims or hidden-fact framing.
- High-risk prompts interrupt dialogue and route to crisis-safe guidance.

## 7) Acceptance Criteria
1. Dialogue responses remain traceable to source cards/patterns.
2. Boundary pass blocks certainty/diagnosis/directive outputs.
3. `plain` and `esoteric` register outputs keep semantic parity.
4. Session creation and message posting respect frozen context versions.

## 8) Metrics
- `% fusion sessions entering dialogue mode`
- dialogue continuation depth with no safety violation
- boundary intervention rate
- user-reported beginner clarity after dialogue
