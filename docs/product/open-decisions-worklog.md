# Open Decisions Worklog

Status: Temporary working document
Last updated: 2026-03-13
Owner: Product + Engineering

Purpose:
- Capture ongoing decision work that may take multiple sessions and intermediate commits.
- Preserve reasoning while requirements are still in discussion.
- Provide a stable handoff point for future agents without prematurely rewriting canonical PRDs.

Important:
- This file is not a source of truth.
- Final decisions must be folded back into `CHARTER.md`, the relevant `docs/product/prd-*.md` files, and `PLAN.md`.
- Delete this file once the decisions below are resolved and the canonical docs are updated.

## How To Use
1. Add new reasoning under the relevant decision section instead of scattering notes across commits.
2. Record provisional leanings explicitly so the current direction is visible.
3. When a decision is settled, fill in `Final decision` and `Follow-up updates`.
4. After the final updates land in canonical docs, remove the completed section or delete this file entirely.

## Decision 1: Web-First Research Policy
### Current requirement
- V1 interpretation policy currently says every interpretation performs live web research for selected cards and key symbols, with caching and provenance.

### Why this is under review
- This is currently the highest likely source of cost and latency pressure in the roadmap.
- It may also complicate the first dogfooding loop before the core interpretation system is even stable.

### Options under discussion
1. Keep live web research mandatory for every interpretation request.
2. Move to curated-first with selective live web enrichment when coverage gaps or confidence thresholds require it.
3. Keep live web research mandatory only for specific interpretation classes, such as deep-dive mode or certain symbolic claims.

### Tradeoffs
- Option 1 maximizes freshness and founder intent, but increases cost, latency, and operational complexity.
- Option 2 improves speed and predictability, but risks drifting away from the current founder requirement.
- Option 3 may be the best practical middle path, but it requires a clean product definition for when live research is mandatory.

### Provisional leaning
- Pending discussion.

### Final decision
- Pending.

### Follow-up updates
- Pending.

## Decision 2: Provider-Connections V1 Scope
### Current requirement
- V1 scope currently includes user-managed provider connections with both `api_key` and capability-driven `oauth` modes.

### Why this is under review
- This may be too much scope for the first real dogfooding loop.
- Provider capability differences can create product complexity before the core reading/interpretation loop is mature.

### Options under discussion
1. Keep provider connections fully in V1 core scope.
2. Narrow V1 to API-key mode only, with OAuth explicitly delayed.
3. Keep the provider-connections domain and data model in V1, but defer end-user connection management UX until after the first dogfooding baseline.

### Tradeoffs
- Option 1 preserves the broadest original ambition, but increases implementation and support complexity.
- Option 2 simplifies launch, but may conflict with the current locked decision language.
- Option 3 preserves the architecture direction while reducing immediate surface area.

### Provisional leaning
- Pending discussion.

### Final decision
- Pending.

### Follow-up updates
- Pending.

## Decision 3: Reading Lifecycle Vocabulary Alignment
### Current requirement
- Canonical docs and the API now use reading lifecycle states aligned around `active`, `archived`, and `deleted`.
- The local Reading Studio mock/UI still uses `active`, `paused`, and `complete`.

### Why this is under review
- Mixed vocabulary will cause confusion when the web shell is wired to the durable reading API.
- This is both a product-language question and an implementation alignment question.

### Options under discussion
1. Normalize everything to `active` / `archived` / `deleted`.
2. Keep `paused` / `complete` as UI-only labels mapped from backend lifecycle states.
3. Introduce a separate user-facing “progress” concept distinct from lifecycle status.

### Tradeoffs
- Option 1 is the cleanest technically and easiest to align across docs/contracts/UI.
- Option 2 may preserve friendlier UI copy, but creates mapping complexity.
- Option 3 is richer conceptually, but likely premature for the current stage of the product.

### Provisional leaning
- Pending discussion.

### Final decision
- Pending.

### Follow-up updates
- Pending.
