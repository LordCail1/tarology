# CI/CD on GitHub + Vercel

## Pipeline Summary
- CI and CD are defined in `.github/workflows/ci-cd.yml`.
- Codex review trigger automation is defined in `.github/workflows/codex-review-trigger.yml`.
- On PR to `main`:
  - run `ci-checks` (install, typecheck, build),
  - deploy preview to Vercel if secrets are configured.
- On push to `main`:
  - run `ci-checks`,
  - deploy production to Vercel if secrets are configured.

## Required GitHub Secrets
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID_WEB`

These are used by the Vercel CLI in GitHub Actions.

## Vercel Project Setup
1. Create a Vercel project for the web app.
2. Ensure it points to this repo and the web app directory (`apps/web`) if needed.
3. Generate a Vercel token.
4. Capture org and project IDs.
5. Add all three values to GitHub repository secrets.

## Branch Protection (Recommended)
Enable a branch protection rule for `main`:
- Require pull request before merging.
- Require status checks before merging.
- Mark `ci-checks` as a required status check.

## Notes
- Deploy jobs are automatically skipped when Vercel secrets are not configured.
- Current CD deploys the Next.js web app. The NestJS API deployment target will be added separately.
- Codex review is requested by PR comment mention (`@codex review`), auto-posted by workflow when missing.

## References
- https://vercel.com/docs/deployments/ci-cd/github-actions
- https://vercel.com/docs/monorepos
- https://docs.github.com/en/actions
- https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches
