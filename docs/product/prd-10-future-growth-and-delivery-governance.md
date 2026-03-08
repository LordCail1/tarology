# PRD 10 - Future Growth and Delivery Governance

Source: `CHARTER.md` (v0.3 extraction)
Coverage: sections 20 and 21

## 20) Future Growth Blueprint (Pre-wired Now)
This section defines how V1 must be built so a bigger product can be added without rewrites.

### 20.1 Studio Model
Treat each major product mode as a studio:
- `Reading Studio` (V1): tarot workspace and interpretations.
- `Notes Studio` (future): deep note-taking workspace inspired by Obsidian-style workflows.
- `Social Studio` (future): sharing, discovery, or community features.

Each studio has:
- its own frontend route group and state boundaries,
- its own NestJS module(s),
- its own API surface,
- clear event contracts to communicate with other studios.

### 20.2 Notes Studio Readiness Requirements
Even though Notes Studio is not in V1, V1 must preserve these interfaces:
- Ability to attach notes to reading entities by stable IDs:
  - `readingId`
  - `questionId`
  - `cardGroupId`
  - `interpretationId`
- Bidirectional linking model (reading object <-> note object).
- Deferred indexer port for full-text and graph relationships.

Suggested future endpoints (reserved):
- `POST /v1/notes`
- `GET /v1/notes/{id}`
- `PATCH /v1/notes/{id}`
- `POST /v1/notes/links`

### 20.3 UX Transition Pattern (Future)
Support a “shifted canvas” mode transition between studios (reading -> notes) without state loss:
- Preserve reading context in URL/state token.
- Open notes workspace with contextual backlinks to current reading/thread/group.
- Return path restores exact reading workspace state.

### 20.4 Containerization and External Integration
Reading Studio must remain embeddable as a containerized feature:
- no global mutable singletons across studios,
- no direct dependency on social or notes modules,
- integration happens through contracts/events only.

If app evolves into a broader platform, Reading Studio should continue to run unchanged behind its interfaces.

## 21) Delivery Governance (Git + CI/CD)
### 21.1 Source Control
- Project is Git-tracked from the start.
- Default branch is `main`.
- All implementation work happens on short-lived branches.
- Branch naming convention:
  - `feature/<scope>-<description>`
  - `fix/<scope>-<description>`
  - `chore/<scope>-<description>`

### 21.2 Pull Request Policy
- No direct pushes to `main`.
- Every change lands via pull request.
- Every PR must:
  - map to charter section(s),
  - include acceptance evidence,
  - pass required CI checks,
  - trigger Codex review through PR comment mention `@codex review` (manual or automated workflow).
- Squash merge is the default strategy.

### 21.3 CI Baseline (Required)
- CI runs on pull requests and on pushes to `main`.
- Baseline CI gates:
  - dependency install,
  - workspace typecheck,
  - workspace build.
- Required status check name: `ci-checks`.
- Codex review trigger workflow runs on PR lifecycle events and ensures `@codex review` comment exists.

### 21.4 CD Baseline (V1 Hosting)
- Hosting target for V1 web app is Vercel.
- Deployment flows:
  - PR -> preview deployment (when deploy secrets are present),
  - `main` -> production deployment (when deploy secrets are present).
- Deployment automation is defined in repository workflow files under `.github/workflows`.
- API deployment remains separately planned; CI still validates API build from day one.

### 21.5 Checkpoint Discipline
- Contributors create checkpoint commits at meaningful milestones.
- Before ending a coding session:
  - update `PLAN.md` with current state and next tasks,
  - ensure `AGENTS.md` still points the next session to the right context,
  - run required local checks (`typecheck`, `build`).

---

This document is intentionally implementation-ready.  
All future PRD, technical design docs, API contracts, and task breakdowns must inherit from this charter.
