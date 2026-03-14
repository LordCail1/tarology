# Parallel Agent Worktrees

Status: Active repo convention
Last updated: 2026-03-14

Purpose:
- Record the repo-specific convention that sits on top of the global `$parallel-agent-worktrees` skill.
- Keep Tarology's local path, helper commands, and coordination-lane expectations in one place.

Primary guidance:
- Use the global `$parallel-agent-worktrees` skill for the full workflow.
- Use this document only for Tarology-specific conventions and commands.

## Tarology Standard
- The primary coordination checkout is:
  - `/home/ram2c/gitclones/tarology`
- Keep the coordination lane on `main` whenever practical.
- Every implementation branch gets its own dedicated Git worktree under:
  - `/home/ram2c/gitclones/.worktrees/tarology/<branch-name>`
- Use one Codex implementation agent per worktree.
- Never rely on “I created a branch” alone; the agent must actually be running inside that branch's worktree.

If a branch name contains `/`, the worktree path will also contain nested folders. Example:
- branch: `feature/reading-history-api`
- path: `/home/ram2c/gitclones/.worktrees/tarology/feature/reading-history-api`

## Responsibilities
### Coordination lane
- Owns docs, planning, merge/conflict handling, PR review follow-up, and cross-branch decisions.
- Usually stays in `/home/ram2c/gitclones/tarology`.
- Fork feature conversations from the current coordination context.

### Feature lane
- Owns one concrete implementation branch and one dedicated worktree.
- Starts from a fork of the current coordination conversation.
- Works only inside its assigned worktree until the branch is pushed and reviewed.

## Create A Feature Worktree
From the coordination worktree:

```bash
git checkout main
git pull --ff-only
npm run git:worktree:add -- feature/<scope>-<short-description>
```

The helper script creates a worktree under:
- `/home/ram2c/gitclones/.worktrees/tarology/<branch-name>`

Then open the feature agent inside that exact path.

Preferred command:

```bash
npm run git:worktree:add -- feature/<scope>-<short-description>
```

Optional base ref:

```bash
npm run git:worktree:add -- feature/<scope>-<short-description> origin/main
```

The helper script creates the worktree under the standard Tarology root, creates or reuses the branch, and prints the next commands for the feature agent.

Use raw `git worktree` commands only if the helper script is unavailable.

## Cleanup After Merge
From the coordination worktree:

```bash
git checkout main
git pull --ff-only
git worktree remove /home/ram2c/gitclones/.worktrees/tarology/<branch-name>
git worktree prune
npm run git:cleanup-local
```

## Non-Negotiable Rule
For local parallel development in this repo:
- one branch,
- one worktree,
- one implementation agent.

Anything else is treated as an error-prone recovery scenario, not a normal workflow.
