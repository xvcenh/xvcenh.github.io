#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
[[ -n "$(git status --porcelain)" ]] || exit 0
bash deploy.sh
