#!/bin/bash
# Local Jekyll preview server
# Usage: ./scripts/preview.sh [port]
# Default port is 4000. Use different ports for simultaneous worktree previews.

set -e

PORT=${1:-4000}
DIR=$(cd "$(dirname "$0")/.." && pwd)

# ── Ruby resolution ───────────────────────────────────────────────────────────
# Jekyll 4.4 needs Ruby >= 3.0. macOS ships Ruby 2.6 at /usr/bin and it shadows
# newer installs on PATH, which makes `bundle` fail with a confusing bundler
# version error. Find a usable Ruby and put it first. Portable: probes common
# version managers rather than hardcoding a path.
ruby_ok() { [ -x "$1" ] && "$1" -e 'exit(RUBY_VERSION.split(".")[0].to_i >= 3)' 2>/dev/null; }

if ! ruby_ok "$(command -v ruby 2>/dev/null)"; then
  for CAND in \
    "$(command -v rbenv >/dev/null 2>&1 && rbenv which ruby 2>/dev/null)" \
    "$(command -v asdf  >/dev/null 2>&1 && asdf which ruby  2>/dev/null)" \
    /opt/homebrew/opt/ruby/bin/ruby \
    /usr/local/opt/ruby/bin/ruby \
    /usr/bin/ruby3 ; do
    if ruby_ok "$CAND"; then
      export PATH="$(dirname "$CAND"):$PATH"
      break
    fi
  done
fi

if ! ruby_ok "$(command -v ruby 2>/dev/null)"; then
  echo "error: no Ruby >= 3.0 found (Jekyll 4.4 requires it)." >&2
  echo "       found: $(ruby -v 2>/dev/null || echo 'no ruby on PATH')" >&2
  echo "       on macOS: brew install ruby" >&2
  exit 1
fi

echo "Ruby:      $(ruby -v)"

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
