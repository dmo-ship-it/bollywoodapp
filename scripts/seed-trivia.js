// Seed assembled trivia banks into Supabase.
//
// Reads data/trivia/<lang>.json (built by build-trivia-bank.js) and upserts the
// rows into trivia_questions, keyed on (language, day_index). Safe to re-run.
//
// Run the migration first: scripts/trivia-language-migration.sql
//
// Usage:
//   SUPABASE_URL=... SUPABASE_KEY=... node scripts/seed-trivia.js            # all langs found
//   SUPABASE_URL=... SUPABASE_KEY=... node scripts/seed-trivia.js --lang hi  # one language

const fs = require("fs");
const path = require("path");

try {
  const envPath = path.join(__dirname, "../.env.local");
  if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, "utf8").split("\n").forEach((line) => {
      const [key, ...rest] = line.split("=");
      if (key && rest.length) process.env[key.trim()] = rest.join("=").trim();
    });
  }
} catch (_) {}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const SUPABASE_HEADERS = {
  "Content-Type": "application/json",
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
};
const LANGS = ["hi", "ta", "ml", "te"];

function parseArgs() {
  const args = process.argv.slice(2);
  let lang = null;
  for (let i = 0; i < args.length; i++) if (args[i] === "--lang") lang = args[++i];
  return { lang };
}

function toRow(q) {
  return {
    language: q.language,
    day_index: q.day_index,
    question: q.question,
    options: q.options,
    correct_answer: q.correct_answer,
    explanation: q.explanation,
    source_url: q.source_url || null,
    category: q.category || "factual",
    difficulty: q.difficulty || "medium",
    movie_id: q.movie_id || null,
  };
}

async function upsert(rows) {
  // on_conflict on the (language, day_index) unique constraint => idempotent.
  const url = `${SUPABASE_URL}/rest/v1/trivia_questions?on_conflict=language,day_index`;
  const res = await fetch(url, {
    method: "POST",
    headers: { ...SUPABASE_HEADERS, Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`Upsert failed (${res.status}): ${await res.text()}`);
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("Missing SUPABASE_URL / SUPABASE_KEY");
  const { lang } = parseArgs();
  const dir = path.join(__dirname, "../data/trivia");
  const langs = lang ? [lang] : LANGS;

  console.log("\n🌱  Seeding trivia banks\n");
  for (const l of langs) {
    const p = path.join(dir, `${l}.json`);
    if (!fs.existsSync(p)) { console.log(`  ${l}: no bank file, skipping`); continue; }
    const bank = JSON.parse(fs.readFileSync(p, "utf8")).map(toRow);
    // Upload in chunks of 200 to stay well under request limits.
    for (let i = 0; i < bank.length; i += 200) {
      await upsert(bank.slice(i, i + 200));
    }
    console.log(`  ${l}: upserted ${bank.length} questions`);
  }
  console.log("\n✓ Done.\n");
}

main().catch((e) => { console.error("\n💥", e.message); process.exit(1); });
