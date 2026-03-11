# CI/CD on GitHub + Vercel

## Pipeline Summary
- CI and CD are defined in `.github/workflows/ci-cd.yml`.
- Codex review trigger automation is defined in `.github/workflows/codex-review-trigger.yml`.
- On PR to `main`:
  - run `ci-checks` (`npm ci`, then `npm run ci:checks` for workspace typecheck, API tests, web tests, and build),
  - deploy preview to Vercel if secrets are configured.
- On push to `main`:
  - run `ci-checks` (`npm ci`, then `npm run ci:checks`),
  - deploy production to Vercel if secrets are configured.

## Required GitHub Secrets
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID_WEB`

These are used by the Vercel CLI in GitHub Actions.

## Vercel Project Setup
1. Create a Vercel project for the web app.
2. Ensure it points to this repo and sets the project Root Directory to `apps/web`.
3. Generate a Vercel token.
4. Capture org and project IDs.
5. Add all three values to GitHub repository secrets.

## Monorepo Deployment Note
- The GitHub Actions deploy jobs run `vercel pull` and `vercel deploy` from the repo root, not from `apps/web`.
- This is required so workspace siblings like `packages/shared` are uploaded to Vercel during preview and production builds.
- The Vercel project itself should still be configured with Root Directory `apps/web`.

## Branch Protection (Recommended)
Enable a branch protection rule for `main`:
- Require pull request before merging.
- Require status checks before merging.
- Mark `ci-checks` as a required status check.

## Notes
- Deploy jobs are automatically skipped when Vercel secrets are not configured.
- Current CD deploys the Next.js web app only.
- Public API hosting and full-stack CD are intentionally deferred until the Gate 0 durable reading MVP is complete.
- Once that MVP threshold is reached, the next delivery step is extending CD to the API/DB-backed stack with post-deploy smoke checks.
- Codex review is requested by PR comment mention (`@codex review`), auto-posted by workflow when missing.

## References
- https://vercel.com/docs/deployments/ci-cd/github-actions
- https://vercel.com/docs/monorepos
- https://docs.github.com/en/actions
- https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches
