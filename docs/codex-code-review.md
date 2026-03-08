# Codex Code Review Setup

Date: 2026-03-08

## Official Trigger
Codex code review can be requested by posting this exact mention in a pull request comment:

`@codex review`

## Official Setup Path
1. Install and configure the Codex GitHub app for the repository.
2. In Codex GitHub settings, choose repository access.
3. Enable automatic reviews for selected repositories if desired.
4. Add repository-specific review preferences in `AGENTS.md` under a review-guidelines section.

## Project Policy (Tarology)
- Every PR must include a Codex review trigger mention.
- We enforce this by automation:
  - `.github/workflows/codex-review-trigger.yml` listens to PR open/reopen/ready-for-review events.
  - On each PR head update (`synchronize`), the workflow posts a fresh `@codex review` trigger tied to the current head SHA.
  - This ensures fixes pushed after review feedback can retrigger a new Codex review pass automatically.
- Contributors can still trigger manually by adding a PR comment with `@codex review`.

## Notes
- Automatic reviews in Codex settings and mention-based reviews can both exist.
- `@codex address that feedback` invokes a Codex task flow and may require Codex environment setup.
- `@codex review` is the canonical review trigger mention for pull request review passes.
- Keep review guidance current in `AGENTS.md` so Codex reviews prioritize project-specific risks.

## References
- https://developers.openai.com/codex/integrations/github
- https://developers.openai.com/codex/guides/agents-md
