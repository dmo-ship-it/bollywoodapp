// Upcoming Releases Fetcher
// Pulls future-dated films (no vote filter) for the "Coming Soon" section
//
// Usage:
//   TMDB_TOKEN=xxx node scripts/fetch-upcoming.js

const fs = require("fs");
const path = require("path");
const https = require("https");

const TOKEN = process.env.TMDB_TOKEN;
const OUTPUT_FILE = path.join(__dirname, "../data/upcoming.json");
const LANGUAGES = [
  { code: "hi", name: "Hindi" },
  { code: "ta", name: "Tamil" },
  { code: "te", name: "Telugu" },
  { code: "ml", name: "Malayalam" },
];
const DELAY_MS = 260;
const TODAY = new Date().toISOString().split("T")[0];

if (!TOKEN) {
  console.error("❌  Missing TMDB_TOKEN environment variable.");
  process.exit(1);
}

const BASE = "https://api.themoviedb.org/3";
const HEADERS = { Authorization: `Bearer ${TOKEN}`, accept: "application/json" };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: HEADERS }, (res) => {
      let data = "";
      if (res.statusCode !== 200) { reject(new Error(`TMDB ${res.statusCode}`)); res.resume(); return; }
      res.on("data", (c) => (data += c));
      res.on("end", () => { try { resolve(JSON.parse(data)); } catch (e) { reject(e); } });
    }).on("error", reject);
  });
}

function fetchPage(language, page) {
  return get(
    `${BASE}/discover/movie?with_original_language=${language}` +
    `&sort_by=primary_release_date.asc&primary_release_date.gte=${TODAY}&page=${page}`
  );
}

function fetchDetails(id) {
  return get(`${BASE}/movie/${id}?append_to_response=credits,keywords,videos,watch%2Fproviders`);
}

function extractOTT(watchProviders) {
  const inData = watchProviders?.results?.IN;
  if (!inData) return [];
  const flatrate = inData.flatrate || [];
  return flatrate.map((p) => p.provider_name);
}

function extractTrailer(videos) {
  const items = videos?.results || [];
  const trailer =
    items.find((v) => v.type === "Trailer" && v.site === "YouTube" && v.official) ||
    items.find((v) => v.type === "Trailer" && v.site === "YouTube") ||
    items.find((v) => v.type === "Teaser" && v.site === "YouTube") ||
    items.find((v) => v.site === "YouTube");
  return trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null;
}

function transform(raw) {
  return {
    tmdb_id: raw.id,
    imdb_id: raw.imdb_id || null,
    title: raw.title,
    original_title: raw.original_title,
    tagline: raw.tagline || null,
    overview: raw.overview,
    year: raw.release_date ? parseInt(raw.release_date.split("-")[0]) : null,
    release_date: raw.release_date || null,
    poster_url: raw.poster_path ? `https://image.tmdb.org/t/p/w500${raw.poster_path}` : null,
    backdrop_url: raw.backdrop_path ? `https://image.tmdb.org/t/p/w1280${raw.backdrop_path}` : null,
    trailer_url: extractTrailer(raw.videos),
    runtime_minutes: raw.runtime || null,
    language: raw.original_language || "hi",
    genres: (raw.genres || []).map((g) => g.name),
    keywords: (raw.keywords?.keywords || []).map((k) => k.name),
    production_houses: (raw.production_companies || []).map((c) => c.name),
    tmdb_rating: raw.vote_average || null,
    tmdb_votes: raw.vote_count || 0,
    tmdb_popularity: raw.popularity || 0,
    ott_platforms: extractOTT(raw["watch/providers"]),
    cast: (raw.credits?.cast || []).slice(0, 10).map((c) => ({
      tmdb_id: c.id, name: c.name, character: c.character,
      photo_url: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null,
      billing_order: c.order + 1,
    })),
    crew: (raw.credits?.crew || []).filter((c) => ["Director", "Producer", "Director of Photography", "Music"].includes(c.job)).map((c) => ({
      tmdb_id: c.id, name: c.name, job: c.job,
      photo_url: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null,
    })),
    mood_tags: [], vibe_tags: [],
    fetched_at: new Date().toISOString(),
    is_verified: false,
  };
}

async function main() {
  console.log("🎬  Upcoming Releases Fetcher");
  console.log(`📅  Releases after ${TODAY}\n`);

  const movies = [];
  const seen = new Set();

  for (const lang of LANGUAGES) {
    console.log(`\n🎞️   ${lang.name}...`);
    let page = 1, pageData = null;

    while (true) {
      try { pageData = await fetchPage(lang.code, page); }
      catch (e) { console.log(`  ✗ page ${page}: ${e.message}`); break; }

      const results = pageData.results || [];
      if (!results.length) break;

      for (const film of results) {
        if (seen.has(film.id)) continue;
        seen.add(film.id);
        try {
          await sleep(DELAY_MS);
          const details = await fetchDetails(film.id);
          movies.push(transform(details));
          process.stdout.write(`    [${movies.length}] ${film.title}\n`);
        } catch (e) { /* skip */ }
      }

      page++;
      if (page > pageData.total_pages || page > 5) break; // cap at 5 pages/lang
    }
  }

  console.log(`\n✅  ${movies.length} upcoming films`);
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify({ fetched_at: new Date().toISOString(), count: movies.length, movies }, null, 2));
  console.log(`💾  Saved to ${OUTPUT_FILE}`);
  console.log("\nNext: SUPABASE_URL=xxx SUPABASE_KEY=xxx node scripts/import-movies.js --file upcoming.json");
}

main().catch((e) => { console.error("Fatal:", e.message); process.exit(1); });
