#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
bash test_build.sh
if [[ -n "$(git status --porcelain)" ]]; then
  git add --all
  git commit -m "更新工程手记 $(date '+%Y-%m-%d %H:%M')"
fi
git push origin HEAD:main
