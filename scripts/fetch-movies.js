// Regional Cinema Movie Fetcher
// Pulls ALL Hindi, Tamil, and Telugu films from TMDB and saves them to data/movies.json
//
// Usage:
//   TMDB_TOKEN=your_token_here node fetch-movies.js
//
// Get your token at: https://www.themoviedb.org/settings/api

const fs = require("fs");
const path = require("path");

const TOKEN = process.env.TMDB_TOKEN;
const OUTPUT_FILE = path.join(__dirname, "../data/movies.json");
const LANGUAGES = [
  { code: "hi", name: "Hindi" },
  { code: "ta", name: "Tamil" },
  { code: "te", name: "Telugu" },
];
const DELAY_MS = 260; // ~40 requests per 10s — stays within TMDB rate limit

if (!TOKEN) {
  console.error("❌  Missing TMDB_TOKEN environment variable.");
  console.error("    Run as: TMDB_TOKEN=your_token_here node fetch-movies.js");
  process.exit(1);
}

const BASE = "https://api.themoviedb.org/3";
const HEADERS = {
  Authorization: `Bearer ${TOKEN}`,
  accept: "application/json",
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function get(url) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`TMDB error ${res.status} for ${url}`);
  return res.json();
}

// Fetch one page of films for a specific language, sorted by vote count
async function fetchPage(language, page) {
  const url =
    `${BASE}/discover/movie` +
    `?with_original_language=${language}` +
    `&region=IN` +
    `&sort_by=vote_count.desc` +
    `&vote_count.gte=50` +
    `&page=${page}`;
  return get(url);
}

// Fetch full details for one film in a single API call
async function fetchMovieDetails(id) {
  const url =
    `${BASE}/movie/${id}` +
    `?append_to_response=credits,keywords,videos,watch%2Fproviders`;
  return get(url);
}

function extractOTT(watchProviders) {
  // Pull Indian OTT platforms from the watch/providers response
  const inData = watchProviders?.results?.IN;
  if (!inData) return [];
  const flatrate = inData.flatrate || [];
  return flatrate.map((p) => p.provider_name);
}

function extractTrailer(videos) {
  const items = videos?.results || [];
  const trailer =
    items.find(
      (v) => v.type === "Trailer" && v.site === "YouTube" && v.official
    ) ||
    items.find((v) => v.type === "Trailer" && v.site === "YouTube") ||
    items.find((v) => v.site === "YouTube");
  return trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null;
}

function extractCast(credits) {
  return (credits?.cast || []).slice(0, 10).map((c) => ({
    tmdb_id: c.id,
    name: c.name,
    character: c.character,
    photo_url: c.profile_path
      ? `https://image.tmdb.org/t/p/w185${c.profile_path}`
      : null,
    billing_order: c.order + 1,
  }));
}

function extractCrew(credits) {
  const roles = ["Director", "Producer", "Director of Photography", "Music"];
  return (credits?.crew || [])
    .filter((c) => roles.includes(c.job))
    .map((c) => ({
      tmdb_id: c.id,
      name: c.name,
      job: c.job,
      photo_url: c.profile_path
        ? `https://image.tmdb.org/t/p/w185${c.profile_path}`
        : null,
    }));
}

function transformMovie(raw) {
  return {
    // Identity
    tmdb_id: raw.id,
    imdb_id: raw.imdb_id || null,
    title: raw.title,
    original_title: raw.original_title,
    tagline: raw.tagline || null,
    overview: raw.overview,

    // Release
    year: raw.release_date ? parseInt(raw.release_date.split("-")[0]) : null,
    release_date: raw.release_date || null,

    // Media
    poster_url: raw.poster_path
      ? `https://image.tmdb.org/t/p/w500${raw.poster_path}`
      : null,
    backdrop_url: raw.backdrop_path
      ? `https://image.tmdb.org/t/p/w1280${raw.backdrop_path}`
      : null,
    trailer_url: extractTrailer(raw.videos),

    // Film details
    runtime_minutes: raw.runtime || null,
    language: raw.original_language || "hi",
    genres: (raw.genres || []).map((g) => g.name),
    keywords: (raw.keywords?.keywords || []).map((k) => k.name),
    production_houses: (raw.production_companies || []).map((c) => c.name),

    // Community (TMDB's own ratings — separate from our app's ratings)
    tmdb_rating: raw.vote_average || null,
    tmdb_votes: raw.vote_count || 0,
    tmdb_popularity: raw.popularity || 0,

    // OTT
    ott_platforms: extractOTT(raw["watch/providers"]),

    // People
    cast: extractCast(raw.credits),
    crew: extractCrew(raw.credits),

    // Fields to fill in manually later
    box_office_india_crore: null,  // e.g. 500 (means ₹500 crore)
    verdict: null,                 // "Blockbuster" / "Hit" / "Average" / "Flop"
    certificate: null,             // "U" / "UA" / "A"
    is_remake: null,
    remake_of: null,
    awards: [],                    // Fill manually: Filmfare, National Awards, IIFA
    soundtrack: [],                // Fill manually: songs, singers, composers
    mood_tags: [],                 // Community-contributed after launch
    vibe_tags: [],                 // Community-contributed after launch

    // Meta
    fetched_at: new Date().toISOString(),
    is_verified: false,
  };
}

async function main() {
  console.log("🎬  Regional Cinema Movie Fetcher");
  console.log(`📍  Languages: ${LANGUAGES.map(l => l.name).join(", ")}\n`);

  const movies = [];
  const seenIds = new Set();

  for (const lang of LANGUAGES) {
    console.log(`\n🎞️   Fetching ${lang.name} films (${lang.code})...`);
    let page = 1;
    let pageData = null;
    let langCount = 0;

    while (true) {
      process.stdout.write(`  📄  Page ${page} — fetching list...`);

      try {
        pageData = await fetchPage(lang.code, page);
      } catch (err) {
        console.log(`\n  ✗ Error fetching page ${page}: ${err.message}`);
        break;
      }

      const results = pageData.results || [];

      if (results.length === 0) {
        console.log("\n  ✓ No more results.");
        break;
      }

      console.log(` ${results.length} films found`);

      for (const film of results) {
        if (seenIds.has(film.id)) {
          // Already fetched from another language
          continue;
        }
        seenIds.add(film.id);

        process.stdout.write(
          `    [${movies.length + 1}] ${film.title}...`
        );

        try {
          await sleep(DELAY_MS);
          const details = await fetchMovieDetails(film.id);
          const transformed = transformMovie(details);
          movies.push(transformed);
          langCount++;
          console.log(" ✓");
        } catch (err) {
          console.log(` ✗ (${err.message})`);
        }
      }

      page++;

      // Safety check — TMDB won't have infinite pages
      if (page > pageData.total_pages) {
        console.log(`  ✓ Reached last page (${pageData.total_pages}).`);
        break;
      }
    }

    console.log(`  📊  ${langCount} ${lang.name} films added (${movies.length} total so far)`);
  }

  console.log(`\n✅  Fetched ${movies.length} films total`);
  console.log(`💾  Saving to ${OUTPUT_FILE}...`);

  fs.writeFileSync(
    OUTPUT_FILE,
    JSON.stringify({ fetched_at: new Date().toISOString(), count: movies.length, movies }, null, 2)
  );

  console.log("🎉  Done!\n");
  console.log("Next steps:");
  console.log("  1. Review data/movies.json");
  console.log("  2. Run: SUPABASE_URL=... SUPABASE_KEY=... node scripts/import-movies.js");
}

main().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
