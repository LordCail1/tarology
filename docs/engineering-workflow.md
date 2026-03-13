# Engineering Workflow

## Branching Model
- Protected branch: `main`.
- Every code change starts on a short-lived branch from `main`.
- Branch naming:
  - `feature/<scope>-<short-description>`
  - `fix/<scope>-<short-description>`
  - `chore/<scope>-<short-description>`

## Pull Request Rules
- No direct pushes to `main`.
- Open a PR to merge into `main`.
- Required check before merge: GitHub Action job `ci-checks`.
- Keep PRs small and single-purpose.
- Squash merge by default to keep `main` history clean.
- Every PR must trigger Codex review via PR comment mention: `@codex review`.
- Repository workflow `.github/workflows/codex-review-trigger.yml` auto-posts the mention when missing.
- Recommended additional required check in branch protection: `request-codex-review`.
- GitHub should auto-delete remote head branches after merge.

## Commit Policy
- Use checkpoint commits at meaningful milestones.
- Preferred commit style:
  - `feat: ...`
  - `fix: ...`
  - `chore: ...`
  - `docs: ...`
  - `refactor: ...`

## Local Dev Loop
```bash
npm run typecheck
npm run build
```

For local stack bring-up and manual smoke tests on `main`, use:
- [`docs/local-dev-runbook.md`](./local-dev-runbook.md)

## Before Push / Before PR
Before pushing a branch or opening a PR:

```bash
git fetch origin main
git status --short
npm run ci:checks
```

- Update the branch with the latest `origin/main` before review:
  - `git rebase origin/main` is preferred for a clean history.
  - `git merge origin/main` is acceptable if the branch should stay merge-based.
- Resolve conflicts on the feature branch before opening the PR whenever possible.
- `git status --short` should be clean after the intended changes are committed:
  - no stray debug edits,
  - no temporary files,
  - no half-finished experiments left in the branch.
- If `npm run ci:checks` requires extra env vars, services, or seed data, document that in the PR.
- Every PR description should include:
  - what changed,
  - acceptance evidence,
  - migrations / env vars / manual smoke steps,
  - known risks or follow-up work.

## Post-Merge Cleanup
After a PR is merged:

```bash
git checkout main
git pull --ff-only
npm run git:cleanup-local
```

- `git checkout main` ensures the current branch is not a candidate for deletion.
- `git pull --ff-only` updates the local merge base before cleanup.
- `npm run git:cleanup-local` deletes local branches already merged into `main` and keeps `main`, `master`, and the current branch.
- To preview the branches first, run `npm run git:cleanup-local -- --dry-run`.

## Release Flow (Initial)
1. Merge validated PR into `main`.
2. CI runs automatically.
3. Vercel production deployment runs automatically (if secrets are configured).
4. Tag release manually when needed (`v0.x.y`).
