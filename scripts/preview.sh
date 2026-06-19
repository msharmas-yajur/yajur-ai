#!/bin/bash
# Local Jekyll preview server
# Usage: ./scripts/preview.sh [port]
# Default port is 4000. Use different ports for simultaneous worktree previews.

set -e

PORT=${1:-4000}
DIR=$(cd "$(dirname "$0")/.." && pwd)

echo "Starting Jekyll preview at http://localhost:$PORT"
echo "Directory: $DIR"
echo "Press Ctrl+C to stop"
echo ""

bundle exec jekyll serve \
  --source "$DIR" \
  --host 0.0.0.0 \
  --port "$PORT" \
  --livereload \
  --incremental
