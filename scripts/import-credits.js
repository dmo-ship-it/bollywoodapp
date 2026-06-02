// Re-runs only the credits import step (movies + people already imported)
const fs = require("fs");
const path = require("path");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const DATA_FILE = path.join(__dirname, "../data/movies.json");
const BATCH_SIZE = 50;

const HEADERS = {
  "Content-Type": "application/json",
  "apikey": SUPABASE_KEY,
  "Authorization": `Bearer ${SUPABASE_KEY}`,
  "Prefer": "resolution=merge-duplicates",
};

async function upsert(table, rows) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`Supabase error on ${table}: ${await res.text()}`);
}

async function fetchAll(path) {
  const rows = [];
  let offset = 0;
  while (true) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}&limit=1000&offset=${offset}`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    const page = await res.json();
    if (!page.length) break;
    rows.push(...page);
    if (page.length < 1000) break;
    offset += 1000;
  }
  return rows;
}

async function main() {
  console.log("🎭  Credits-only import\n");

  const movies = JSON.parse(fs.readFileSync(DATA_FILE, "utf8")).movies;

  console.log("🔑  Fetching movie IDs...");
  const movieRows = await fetchAll("movies?select=id,tmdb_id");
  const tmdbToUuid = Object.fromEntries(movieRows.map((r) => [r.tmdb_id, r.id]));

  console.log("🔑  Fetching people IDs...");
  const personRows = await fetchAll("people?select=id,tmdb_id");
  const personTmdbToUuid = Object.fromEntries(personRows.map((r) => [r.tmdb_id, r.id]));

  console.log("\n🎭  Building credits...");
  const allCredits = [];
  for (const m of movies) {
    const movieUuid = tmdbToUuid[m.tmdb_id];
    if (!movieUuid) continue;

    for (const c of m.cast ?? []) {
      const personUuid = personTmdbToUuid[c.tmdb_id];
      if (!personUuid) continue;
      allCredits.push({
        movie_id:       movieUuid,
        person_id:      personUuid,
        role:           "Actor",
        character_name: c.character ?? null,
        billing_order:  c.billing_order ?? null,
      });
    }
    for (const c of m.crew ?? []) {
      const personUuid = personTmdbToUuid[c.tmdb_id];
      if (!personUuid) continue;
      allCredits.push({
        movie_id:       movieUuid,
        person_id:      personUuid,
        role:           c.job,
        character_name: null,
        billing_order:  null,
      });
    }
  }

  console.log(`   ${allCredits.length} credits to insert`);
  for (let i = 0; i < allCredits.length; i += BATCH_SIZE) {
    await upsert("movie_credits", allCredits.slice(i, i + BATCH_SIZE));
    process.stdout.write(`  ${Math.min(i + BATCH_SIZE, allCredits.length)}/${allCredits.length} ✓\r`);
  }

  console.log(`\n\n🎉  Done! ${allCredits.length} credits imported.`);
}

main().catch((err) => { console.error("❌ ", err.message); process.exit(1); });
