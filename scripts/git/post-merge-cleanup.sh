#!/usr/bin/env bash

set -euo pipefail

base_branch="main"
dry_run="false"

for arg in "$@"; do
  case "$arg" in
    --dry-run)
      dry_run="true"
      ;;
    *)
      base_branch="$arg"
      ;;
  esac
done

current_branch="$(git branch --show-current)"

if ! git rev-parse --verify "$base_branch" >/dev/null 2>&1; then
  echo "Base branch '$base_branch' does not exist locally."
  echo "Run 'git checkout $base_branch && git pull --ff-only' before cleanup."
  exit 1
fi

merged_branches="$(
  git for-each-ref --format='%(refname:short)' "refs/heads" --merged "$base_branch" |
    while IFS= read -r branch; do
      if [ -z "$branch" ]; then
        continue
      fi

      if [ "$branch" = "$base_branch" ] || [ "$branch" = "$current_branch" ]; then
        continue
      fi

      case "$branch" in
        main|master)
          continue
          ;;
      esac

      printf '%s\n' "$branch"
    done
)"

if [ -z "$merged_branches" ]; then
  echo "No merged local branches to delete."
  exit 0
fi

if [ "$dry_run" = "true" ]; then
  echo "Merged local branches eligible for deletion:"
  printf '%s\n' "$merged_branches"
  exit 0
fi

echo "Deleting merged local branches:"
printf '%s\n' "$merged_branches"

printf '%s\n' "$merged_branches" | while IFS= read -r branch; do
  git branch -d "$branch"
done
