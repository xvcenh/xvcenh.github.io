#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
port="${1:-4000}"
if (( $# )); then shift; fi
exec bundle exec jekyll serve --host "${JEKYLL_HOST:-0.0.0.0}" --port "$port" "$@"
