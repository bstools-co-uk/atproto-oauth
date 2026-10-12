#!/bin/sh
set -e

KEY_FILE="/app/data/private-key.env"

if [ ! -f "$KEY_FILE" ]; then
  echo "No existing key found — generating PRIVATE_KEY (first run)..."
  mkdir -p "$(dirname "$KEY_FILE")"
  # --silent suppresses pnpm's "$ tsx scripts/gen-key.mts" header line
  KEY=$(pnpm --silent gen-key)
  echo "PRIVATE_KEY=$KEY" > "$KEY_FILE"
else
  echo "Found existing key, reusing it."
fi

# Load PRIVATE_KEY into this shell's environment
export $(grep -v '^#' "$KEY_FILE" | xargs -0 -I{} echo {})
export PRIVATE_KEY="$(cut -d= -f2- "$KEY_FILE")"

# Hard-code the public URL
export PUBLIC_URL="${PUBLIC_URL:-https://test.alias.bstools.co.uk}"

exec pnpm start