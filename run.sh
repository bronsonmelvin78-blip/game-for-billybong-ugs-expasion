#!/usr/bin/env bash
set -e
# Generate games.json
node scripts/generate-games-list.js

# Serve
PORT=8000
echo "Serving on http://localhost:${PORT}"
python3 -m http.server ${PORT} & SERVER_PID=$!

# Try to open host browser if $BROWSER present
sleep 1
if [ -n "$BROWSER" ]; then
  "$BROWSER" "http://localhost:${PORT}" || true
else
  echo 'Open http://localhost:8000 in your browser (or set $BROWSER and re-run run.sh)'
fi

wait ${SERVER_PID}
