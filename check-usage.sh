#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
env_file="$script_dir/.env"

if [[ -f "$env_file" && "${CODEX_RESET_ENV_LOADED:-}" != "1" ]]; then
  CODEX_RESET_ENV_LOADED=1 exec node --env-file="$env_file" -e '
    const { spawnSync } = require("node:child_process");
    const result = spawnSync(process.argv[1], process.argv.slice(2), {
      env: process.env,
      stdio: "inherit",
    });
    process.exit(result.status ?? 1);
  ' "$0" "$@"
fi

base_url="${VITE_BASE_URL:-http://127.0.0.1:3000}"
target_url="${CHECK_USAGE_URL:-${base_url%/}/api/jobs/check-usage}"

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
