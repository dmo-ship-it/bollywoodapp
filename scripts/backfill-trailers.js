// Backfill missing trailer_url values in Supabase
//
// Queries Supabase for all movies with trailer_url IS NULL, fetches each from
// TMDB with the corrected include_video_language param, and patches just
// trailer_url back. Safe to re-run; skips movies that already have a trailer.
//
// Usage:
//   TMDB_TOKEN=... SUPABASE_URL=... SUPABASE_KEY=... node scripts/backfill-trailers.js

const https = require("https");

const TMDB_TOKEN = process.env.TMDB_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const DELAY_MS = 260; // ~40 req/10s, within TMDB rate limit
const PAGE_SIZE = 1000;
const limitArg = process.argv.indexOf("--limit");
const LIMIT = limitArg !== -1 ? parseInt(process.argv[limitArg + 1]) : Infinity;

if (!TMDB_TOKEN || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌  Missing required env vars: TMDB_TOKEN, SUPABASE_URL, SUPABASE_KEY");
  process.exit(1);
}

const TMDB_HEADERS = { Authorization: `Bearer ${TMDB_TOKEN}`, accept: "application/json" };
const SB_HEADERS = {
  "Content-Type": "application/json",
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function tmdbGet(path) {
  return new Promise((resolve, reject) => {
    https
      .get(`https://api.themoviedb.org/3${path}`, { headers: TMDB_HEADERS }, (res) => {
        let buf = "";
        res.on("data", (c) => (buf += c));
        res.on("end", () => {
          if (res.statusCode !== 200) return reject(new Error(`TMDB ${res.statusCode} for ${path}`));
          try { resolve(JSON.parse(buf)); } catch (e) { reject(e); }
        });
      })
      .on("error", reject);
  });
}

async function getMissingIds() {
  const ids = [];
  let offset = 0;
  while (true) {
    const url =
      `${SUPABASE_URL}/rest/v1/movies` +
      `?trailer_url=is.null&select=id,tmdb_id,title` +
      `&order=tmdb_popularity.desc&limit=${PAGE_SIZE}&offset=${offset}`;
    const res = await fetch(url, { headers: SB_HEADERS });
    if (!res.ok) throw new Error(`Supabase error: ${await res.text()}`);
    const rows = await res.json();
    ids.push(...rows);
    if (rows.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return ids;
}

function extractTrailer(videos) {
  const items = videos?.results || [];
  const t =
    items.find((v) => v.type === "Trailer" && v.site === "YouTube" && v.official) ||
    items.find((v) => v.type === "Trailer" && v.site === "YouTube") ||
    items.find((v) => v.site === "YouTube");
  return t ? `https://www.youtube.com/watch?v=${t.key}` : null;
}

async function patchTrailer(id, trailerUrl) {
  const url = `${SUPABASE_URL}/rest/v1/movies?id=eq.${id}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: SB_HEADERS,
    body: JSON.stringify({ trailer_url: trailerUrl }),
  });
  if (!res.ok) throw new Error(`Supabase PATCH error: ${await res.text()}`);
}

async function main() {
  console.log("🎬  Trailer Backfill\n");
  console.log("📡  Fetching movies with missing trailers from Supabase...");

  const missing = await getMissingIds();
  console.log(`   Found ${missing.length} movies without trailers\n`);

  let found = 0;
  let stillMissing = 0;
  let errors = 0;

  const batch = missing.slice(0, LIMIT);
  if (LIMIT < missing.length) console.log(`   Processing ${batch.length} this run (${missing.length - batch.length} remaining after)\n`);

  for (let i = 0; i < batch.length; i++) {
    const { id, tmdb_id, title } = batch[i];
    process.stdout.write(`[${i + 1}/${missing.length}] ${title}...`);

    try {
      await sleep(DELAY_MS);
      const data = await tmdbGet(
        `/movie/${tmdb_id}?append_to_response=videos&include_video_language=hi,en,null`
      );
      const trailerUrl = extractTrailer(data.videos);
      if (trailerUrl) {
        await patchTrailer(id, trailerUrl);
        console.log(" ✓");
        found++;
      } else {
        console.log(" — (no trailer on TMDB)");
        stillMissing++;
      }
    } catch (err) {
      console.log(` ✗ (${err.message})`);
      errors++;
    }
  }

  console.log("\n📊  Results:");
  console.log(`   Trailers added:       ${found}`);
  console.log(`   Still no trailer:     ${stillMissing}  (TMDB has none)`);
  console.log(`   Errors:               ${errors}`);
  console.log("\n✅  Done!");
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
