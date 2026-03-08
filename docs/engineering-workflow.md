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

## Release Flow (Initial)
1. Merge validated PR into `main`.
2. CI runs automatically.
3. Vercel production deployment runs automatically (if secrets are configured).
4. Tag release manually when needed (`v0.x.y`).
