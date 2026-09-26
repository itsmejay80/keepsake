#!/usr/bin/env bash
set -euo pipefail

set -a
. ./.env
set +a

browser_pid=""
browser_url="${BROWSER_WEB_URL:-http://127.0.0.1:9222}"

if ! curl --fail --silent --max-time 1 "$browser_url/json/version" >/dev/null; then
  if ! command -v chromium >/dev/null; then
    echo "Chromium is required for browser-backed crawling. Install it or set BROWSER_WEB_URL." >&2
    exit 1
  fi

  mkdir -p "$DATA_DIR/chromium-profile"
  chromium \
    --headless=new \
    --remote-debugging-address=127.0.0.1 \
    --remote-debugging-port=9222 \
    --user-data-dir="$DATA_DIR/chromium-profile" \
    --no-first-run \
    --no-default-browser-check \
    --disable-gpu \
    --disable-dev-shm-usage \
    --hide-scrollbars \
    --disable-blink-features=AutomationControlled \
    --window-size=1440,900 \
    >/tmp/karakeep-chromium.log 2>&1 &
  browser_pid=$!
fi

cleanup() {
  if [[ -n "$browser_pid" ]]; then
    kill "$browser_pid" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

pnpm db:migrate
exec turbo dev --parallel --filter=@karakeep/web --filter=@karakeep/workers
