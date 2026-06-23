// Fetches specific missing curated films from TMDB by title + year search.
// Saves to data/missing-curated.json, then import with:
//   SUPABASE_URL=... SUPABASE_KEY=... node scripts/import-movies.js --file missing-curated.json
//
// Usage:
//   TMDB_TOKEN=your_token node scripts/fetch-missing-curated.js

const fs = require("fs");
const path = require("path");

const TOKEN = process.env.TMDB_TOKEN;
if (!TOKEN) {
  console.error("❌  Missing TMDB_TOKEN");
  console.error("    Run as: TMDB_TOKEN=your_token node scripts/fetch-missing-curated.js");
  process.exit(1);
}

const OUTPUT_FILE = path.join(__dirname, "../data/missing-curated.json");
const TITLE_OVERRIDES_FILE = path.join(__dirname, "../data/title_overrides.json");
const TITLE_OVERRIDES = fs.existsSync(TITLE_OVERRIDES_FILE)
  ? JSON.parse(fs.readFileSync(TITLE_OVERRIDES_FILE, "utf8"))
  : {};

const BASE = "https://api.themoviedb.org/3";
const HEADERS = { Authorization: `Bearer ${TOKEN}`, accept: "application/json" };
const DELAY_MS = 260;

const MISSING = [
  // Tamil
  { title: "Ninaithale Inikkum",           year: 1979, lang: "ta" },
  { title: "Dasavathaaram",                 year: 2008, lang: "ta" },
  // Telugu
  { title: "Swarna Kamalam",                year: 1988, lang: "te" },
  { title: "Mutha Mestri",                  year: 1993, lang: "te" },
  { title: "Premikudu",                     year: 1994, lang: "te" },
  { title: "Rakshakudu",                    year: 1995, lang: "te" },
  { title: "Ninne Pelladata",               year: 1996, lang: "te" },
  { title: "Attarintiki Daredi",            year: 2013, lang: "te" },
  { title: "Baahubali: The Beginning",      year: 2015, lang: "te" },
  { title: "Baahubali 2: The Conclusion",   year: 2017, lang: "te" },
  { title: "Taxiwaala",                     year: 2018, lang: "te" },
  { title: "Ante Sundaraniki",              year: 2022, lang: "te" },
  { title: "Virata Parvam",                 year: 2022, lang: "te" },
  // Malayalam
  { title: "Kabani Nadi Chuvannappol",      year: 1975, lang: "ml" },
  { title: "Thampu",                        year: 1978, lang: "ml" },
  { title: "Sandesham",                     year: 1991, lang: "ml" },
  { title: "Devaasuram",                    year: 1993, lang: "ml" },
  { title: "Manichithrathazhu",             year: 1993, lang: "ml" },
  { title: "Aaram Thampuran",               year: 1997, lang: "ml" },
  { title: "Arabikatha",                    year: 2007, lang: "ml" },
  { title: "Salt and Pepper",               year: 2011, lang: "ml" },
  { title: "Kammatipaadam",                 year: 2016, lang: "ml" },
  { title: "Jacobinte Swargarajyam",        year: 2016, lang: "ml" },
  { title: "Maayanadhi",                    year: 2017, lang: "ml" },
  { title: "Aadujeevitham: The Goat Life",  year: 2024, lang: "ml" },
];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function get(url) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`TMDB ${res.status} for ${url}`);
  return res.json();
}

async function searchFilm({ title, year, lang }) {
  const q = encodeURIComponent(title);
  const data = await get(`${BASE}/search/movie?query=${q}&year=${year}&language=en-US&page=1`);
  const results = data.results || [];
  // Prefer exact language match, then closest year
  const langMatch = results.find(r => r.original_language === lang);
  const best = langMatch || results[0];
  return best || null;
}

async function fetchDetails(id) {
  return get(
    `${BASE}/movie/${id}?append_to_response=credits,keywords,videos,watch%2Fproviders` +
    `&include_video_language=ta,te,ml,en,null`
  );
}

function extractTrailer(videos) {
  const items = videos?.results || [];
  const t = items.find(v => v.type === "Trailer" && v.site === "YouTube" && v.official)
         || items.find(v => v.type === "Trailer" && v.site === "YouTube")
         || items.find(v => v.site === "YouTube");
  return t ? `https://www.youtube.com/watch?v=${t.key}` : null;
}

function extractOTT(wp) {
  return (wp?.results?.IN?.flatrate || []).map(p => p.provider_name);
}

function extractCast(credits) {
  return (credits?.cast || []).slice(0, 10).map(c => ({
    tmdb_id: c.id, name: c.name, character: c.character,
    photo_url: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null,
    billing_order: c.order + 1,
  }));
}

function extractCrew(credits) {
  return (credits?.crew || [])
    .filter(c => ["Director","Producer","Director of Photography","Music"].includes(c.job))
    .map(c => ({
      tmdb_id: c.id, name: c.name, job: c.job,
      photo_url: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null,
    }));
}

function transform(raw) {
  return {
    tmdb_id:           raw.id,
    imdb_id:           raw.imdb_id || null,
    title:             TITLE_OVERRIDES[String(raw.id)] ?? raw.title,
    original_title:    raw.original_title,
    tagline:           raw.tagline || null,
    overview:          raw.overview,
    year:              raw.release_date ? parseInt(raw.release_date.split("-")[0]) : null,
    release_date:      raw.release_date || null,
    poster_url:        raw.poster_path ? `https://image.tmdb.org/t/p/w500${raw.poster_path}` : null,
    backdrop_url:      raw.backdrop_path ? `https://image.tmdb.org/t/p/w1280${raw.backdrop_path}` : null,
    trailer_url:       extractTrailer(raw.videos),
    runtime_minutes:   raw.runtime || null,
    language:          raw.original_language || null,
    genres:            (raw.genres || []).map(g => g.name),
    keywords:          (raw.keywords?.keywords || []).map(k => k.name).slice(0, 20),
    production_houses: (raw.production_companies || []).map(c => c.name),
    tmdb_rating:       raw.vote_average || null,
    tmdb_votes:        raw.vote_count || 0,
    tmdb_popularity:   raw.popularity || 0,
    ott_platforms:     extractOTT(raw["watch/providers"]),
    cast:              extractCast(raw.credits),
    crew:              extractCrew(raw.credits),
    mood_tags: [], vibe_tags: [],
    fetched_at:        new Date().toISOString(),
    is_verified:       false,
  };
}

async function main() {
  console.log(`\n🎬  Fetching ${MISSING.length} missing curated films from TMDB\n`);
  const movies = [];
  const notFound = [];

  for (const entry of MISSING) {
    process.stdout.write(`  Searching: ${entry.title} (${entry.year})...`);
    try {
      await sleep(DELAY_MS);
      const hit = await searchFilm(entry);
      if (!hit) {
        console.log(" ✗ not found on TMDB");
        notFound.push(entry.title);
        continue;
      }
      await sleep(DELAY_MS);
      const details = await fetchDetails(hit.id);
      const movie = transform(details);
      movies.push(movie);
      console.log(` ✓  "${movie.title}" (${movie.year}) [${movie.language}] tmdb:${movie.tmdb_id}`);
    } catch (err) {
      console.log(` ✗  Error: ${err.message}`);
      notFound.push(entry.title);
    }
  }

  console.log(`\n✅  Fetched ${movies.length}/${MISSING.length} films`);
  if (notFound.length) {
    console.log(`⚠️   Not found on TMDB (${notFound.length}): ${notFound.join(", ")}`);
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify({ fetched_at: new Date().toISOString(), count: movies.length, movies }, null, 2));
  console.log(`💾  Saved to ${OUTPUT_FILE}\n`);
  console.log("Next step — import into Supabase:");
  console.log(`  SUPABASE_URL=${process.env.SUPABASE_URL || "https://lljwlbgamwdwzdxzefjt.supabase.co"} SUPABASE_KEY=your_service_role_key node scripts/import-movies.js --file missing-curated.json`);
}

main().catch(err => { console.error("Fatal:", err.message); process.exit(1); });
