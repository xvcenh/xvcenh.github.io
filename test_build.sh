#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
JEKYLL_ENV=production bundle exec jekyll build --strict_front_matter
python3 scripts/check_site.py
