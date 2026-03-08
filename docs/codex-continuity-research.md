# Codex Continuity Research Notes

Date: 2026-03-08
Scope: How new Codex sessions pick up context in a fresh run.

## Key Findings

### 1) `AGENTS.md` is the primary project instruction file
- Codex scans for `AGENTS.md` in multiple scopes.
- More local files override broader ones.
- Practical rule for this repo: keep `/AGENTS.md` current at session end.

### 2) `PLAN.md` is a team convention, not default magic
- `PLAN.md` is useful for handoff state but is not the default instruction source by itself.
- We keep `PLAN.md` as the operational handoff map and reference it from `AGENTS.md`.

### 3) Config options that affect behavior
- `project_doc_fallback_filenames`: allows fallback filenames when `AGENTS.md` is absent.
- `model_instructions_file`: points Codex to an explicit instruction file.
- `history.persistence`: controls local history persistence behavior.

### 4) Session continuation in automation
- Codex non-interactive mode supports continuation patterns (`resume`, `--continue`) and structured outputs for pipeline integrations.

## Repo Practice
- Keep both files updated before ending a session:
  - `AGENTS.md` for instructions.
  - `PLAN.md` for current state and next tasks.

## References
- https://developers.openai.com/codex/guides/agents-md
- https://developers.openai.com/codex/config-reference
- https://developers.openai.com/codex/automation/non-interactive-mode
