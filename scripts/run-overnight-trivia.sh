#!/usr/bin/env bash
# Overnight trivia build: 120 sourced fun-facts per language, fill to 365, seed.
#
# Runs sequentially (avoids hammering the Anthropic web_search rate limit).
# Resumable: generate-trivia.js skips films already done, so re-running is safe.
#
# Launch under caffeinate so the Mac doesn't sleep mid-run:
#   caffeinate -is bash scripts/run-overnight-trivia.sh
set -uo pipefail
cd "$(dirname "$0")/.."

LOG="data/trivia/overnight-$(date +%Y%m%d-%H%M%S).log"
mkdir -p data/trivia
echo "Logging to $LOG"

say() { echo "[$(date '+%H:%M:%S')] $*" | tee -a "$LOG"; }

LANGS=(hi ta ml te)
FUNFACT_LIMIT=120
TARGET=365

say "=== STEP 1: Generate $FUNFACT_LIMIT fun-facts per language ==="
for L in "${LANGS[@]}"; do
  say "--- generate $L ---"
  node scripts/generate-trivia.js --lang "$L" --limit "$FUNFACT_LIMIT" 2>&1 | tee -a "$LOG"
done

say "=== STEP 2: Assemble full banks (fill to $TARGET) ==="
for L in "${LANGS[@]}"; do
  say "--- assemble $L ---"
  node scripts/build-trivia-bank.js --lang "$L" --target "$TARGET" 2>&1 | tee -a "$LOG"
done

say "=== STEP 3: Seed Supabase (needs migration applied) ==="
if node scripts/seed-trivia.js 2>&1 | tee -a "$LOG"; then
  say "✓ Seed succeeded."
else
  say "⚠️  Seed failed — likely the migration wasn't applied yet."
  say "    Banks are saved in data/trivia/<lang>.json. After applying"
  say "    scripts/trivia-language-migration.sql, just run: node scripts/seed-trivia.js"
fi

say "=== DONE ==="
for L in "${LANGS[@]}"; do
  if [ -f "data/trivia/$L.json" ]; then
    say "  $L: $(node -e "console.log(require('./data/trivia/$L.json').length)") questions"
  fi
done
