#!/usr/bin/env bash

set -euo pipefail

show_usage() {
  cat <<'EOF'
Usage:
  bash ./scripts/git/create-worktree.sh <branch-name> [base-ref]

Creates a dedicated Git worktree under:
  <repo-parent>/.worktrees/<repo-name>/<branch-name>

Examples:
  bash ./scripts/git/create-worktree.sh feature/reading-history-api
  bash ./scripts/git/create-worktree.sh fix/auth-cookie origin/main
EOF
}

branch_name="${1:-}"
base_ref="${2:-main}"

if [ "$branch_name" = "--help" ] || [ "$branch_name" = "-h" ]; then
  show_usage
  exit 0
fi

if [ -z "$branch_name" ]; then
  show_usage >&2
  exit 1
fi

repo_root="$(git rev-parse --show-toplevel)"
repo_name="$(basename "$repo_root")"
repo_parent="$(dirname "$repo_root")"
worktree_root="$repo_parent/.worktrees/$repo_name"
worktree_path="$worktree_root/$branch_name"

if [ -e "$worktree_path" ]; then
  echo "Worktree path already exists: $worktree_path"
  exit 1
fi

mkdir -p "$(dirname "$worktree_path")"

if git show-ref --verify --quiet "refs/heads/$branch_name"; then
  git worktree add "$worktree_path" "$branch_name"
elif git show-ref --verify --quiet "refs/remotes/origin/$branch_name"; then
  git worktree add --track -b "$branch_name" "$worktree_path" "origin/$branch_name"
else
  if ! git rev-parse --verify "$base_ref" >/dev/null 2>&1; then
    echo "Base ref '$base_ref' does not exist locally."
    echo "Run 'git fetch origin main' and 'git checkout main && git pull --ff-only' first."
    exit 1
  fi

  git worktree add -b "$branch_name" "$worktree_path" "$base_ref"
fi

echo
echo "Created worktree:"
echo "  Branch: $branch_name"
echo "  Path:   $worktree_path"
echo
echo "Next steps:"
echo "  cd '$worktree_path'"
echo "  git status --short --branch"
echo "  open the feature-specific Codex agent inside this path"
