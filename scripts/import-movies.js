// Import movies.json into Supabase
//
// Usage:
//   SUPABASE_URL=https://xxx.supabase.co SUPABASE_KEY=your_anon_key node scripts/import-movies.js

const fs = require("fs");
const path = require("path");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const DATA_FILE = path.join(__dirname, "../data/movies.json");
const BATCH_SIZE = 50;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌  Missing environment variables.");
  console.error("    Run as:");
  console.error("    SUPABASE_URL=https://xxx.supabase.co SUPABASE_KEY=your_key node scripts/import-movies.js");
  process.exit(1);
}

const HEADERS = {
  "Content-Type": "application/json",
  "apikey": SUPABASE_KEY,
  "Authorization": `Bearer ${SUPABASE_KEY}`,
  "Prefer": "resolution=merge-duplicates",
};

async function upsert(table, rows) {
  const url = `${SUPABASE_URL}/rest/v1/${table}`;
  const res = await fetch(url, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase error on ${table}: ${err}`);
  }
}

function toDate(str) {
  if (!str) return null;
  return str.length === 4 ? `${str}-01-01` : str;
}

function buildMovieRow(m) {
  return {
    tmdb_id:               m.tmdb_id,
    imdb_id:               m.imdb_id,
    title:                 m.title,
    original_title:        m.original_title,
    tagline:               m.tagline,
    overview:              m.overview,
    year:                  m.year,
    release_date:          toDate(m.release_date),
    poster_url:            m.poster_url,
    backdrop_url:          m.backdrop_url,
    trailer_url:           m.trailer_url,
    runtime_minutes:       m.runtime_minutes,
    language:              m.language,
    genres:                m.genres,
    keywords:              m.keywords?.slice(0, 20) ?? [],
    production_houses:     m.production_houses,
    ott_platforms:         m.ott_platforms,
    tmdb_rating:           m.tmdb_rating,
    tmdb_votes:            m.tmdb_votes,
    tmdb_popularity:       m.tmdb_popularity,
    mood_tags:             m.mood_tags ?? [],
    vibe_tags:             m.vibe_tags ?? [],
    fetched_at:            m.fetched_at,
    is_verified:           false,
  };
}

function buildPeopleRows(m) {
  const people = [];
  const seen = new Set();

  for (const c of m.cast ?? []) {
    if (!seen.has(c.tmdb_id)) {
      seen.add(c.tmdb_id);
      people.push({ tmdb_id: c.tmdb_id, name: c.name, photo_url: c.photo_url, primary_role: "Actor" });
    }
  }
  for (const c of m.crew ?? []) {
    if (!seen.has(c.tmdb_id)) {
      seen.add(c.tmdb_id);
      people.push({ tmdb_id: c.tmdb_id, name: c.name, photo_url: c.photo_url, primary_role: c.job });
    }
  }
  return people;
}

async function main() {
  console.log("🎬  Bollywood DB Importer");
  console.log(`📂  Reading ${DATA_FILE}...`);

  const raw = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  const movies = raw.movies;
  console.log(`📊  ${movies.length} films to import\n`);

  // 1. Insert movies in batches
  console.log("📽️   Inserting movies...");
  for (let i = 0; i < movies.length; i += BATCH_SIZE) {
    const batch = movies.slice(i, i + BATCH_SIZE).map(buildMovieRow);
    await upsert("movies", batch);
    process.stdout.write(`  ${Math.min(i + BATCH_SIZE, movies.length)}/${movies.length} ✓\r`);
  }
  console.log(`\n  ✅  Movies done`);

  // 2. Fetch inserted movies to get their UUIDs
  console.log("\n🔑  Fetching movie IDs...");
  const idsRes = await fetch(
    `${SUPABASE_URL}/rest/v1/movies?select=id,tmdb_id&limit=1000`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
  );
  const movieRows = await idsRes.json();
  const tmdbToUuid = Object.fromEntries(movieRows.map((r) => [r.tmdb_id, r.id]));

  // 3. Collect and deduplicate all people
  console.log("\n👥  Inserting people...");
  const allPeople = new Map();
  for (const m of movies) {
    for (const p of buildPeopleRows(m)) {
      if (!allPeople.has(p.tmdb_id)) allPeople.set(p.tmdb_id, p);
    }
  }
  const peopleArr = [...allPeople.values()];
  for (let i = 0; i < peopleArr.length; i += BATCH_SIZE) {
    await upsert("people", peopleArr.slice(i, i + BATCH_SIZE));
    process.stdout.write(`  ${Math.min(i + BATCH_SIZE, peopleArr.length)}/${peopleArr.length} ✓\r`);
  }
  console.log(`\n  ✅  ${peopleArr.length} people done`);

  // 4. Fetch people UUIDs
  console.log("\n🔑  Fetching people IDs...");
  const pagesNeeded = Math.ceil(peopleArr.length / 1000);
  const personRows = [];
  for (let p = 0; p < pagesNeeded; p++) {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/people?select=id,tmdb_id&limit=1000&offset=${p * 1000}`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    personRows.push(...(await r.json()));
  }
  const personTmdbToUuid = Object.fromEntries(personRows.map((r) => [r.tmdb_id, r.id]));

  // 5. Insert credits
  console.log("\n🎭  Inserting credits...");
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

  for (let i = 0; i < allCredits.length; i += BATCH_SIZE) {
    await upsert("movie_credits", allCredits.slice(i, i + BATCH_SIZE));
    process.stdout.write(`  ${Math.min(i + BATCH_SIZE, allCredits.length)}/${allCredits.length} ✓\r`);
  }
  console.log(`\n  ✅  ${allCredits.length} credits done`);

  console.log("\n🎉  Import complete!");
  console.log("\nYour Supabase database now has:");
  console.log(`  • ${movies.length} movies`);
  console.log(`  • ${peopleArr.length} people`);
  console.log(`  • ${allCredits.length} cast/crew credits`);
  console.log("\nOpen your Supabase dashboard → Table Editor to browse the data.");
}

main().catch((err) => {
  console.error("\n❌  Fatal error:", err.message);
  process.exit(1);
});
