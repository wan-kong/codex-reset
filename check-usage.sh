#!/usr/bin/env bash
set -euo pipefail

target_url="${CHECK_USAGE_URL:-http://127.0.0.1:3000/api/jobs/check-usage}"

if [[ -z "${CRON_SECRET:-}" ]]; then
  echo "CRON_SECRET is required."
  exit 1
fi

response_file="$(mktemp)"
status="$(
  curl -sS -o "$response_file" -w "%{http_code}" \
    -X POST "$target_url" \
    -H "Authorization: Bearer $CRON_SECRET"
)"

echo "HTTP $status"
cat "$response_file"
rm "$response_file"

if [[ "$status" -lt 200 || "$status" -ge 300 ]]; then
  exit 1
fi
