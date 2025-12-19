#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Generate games.json once and then start the watch-and-serve server
node scripts/generate-games-list.js

PORT=8000
PIDFILE=".games-server.pid"

if [ -f "$PIDFILE" ]; then
  OLD_PID=$(cat "$PIDFILE" 2>/dev/null || true)
  if [ -n "$OLD_PID" ] && kill -0 "$OLD_PID" 2>/dev/null; then
    echo "Killing existing server (PID $OLD_PID)"
    kill "$OLD_PID" || true
    sleep 0.5
  fi
  rm -f "$PIDFILE"
fi

echo "Starting watch-and-serve server on port ${PORT}"
node scripts/watch-and-serve.js >/dev/null 2>&1 &
SERVER_PID=$!
echo "${SERVER_PID}" > "$PIDFILE"
sleep 0.5

URL="http://localhost:${PORT}"
if [ -n "${BROWSER-}" ]; then
  echo "Opening browser: $URL"
  "$BROWSER" "$URL" || echo "Failed to open browser with \$BROWSER"
else
  echo "Open ${URL} in your browser"
fi

wait "$SERVER_PID"
