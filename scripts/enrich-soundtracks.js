// JioSaavn Soundtrack Enricher
//
// For each movie in Supabase with an empty soundtrack, fetches the album from
// JioSaavn and writes track metadata back to the movies table.
//
// Usage:
//   SUPABASE_URL=https://xxx.supabase.co SUPABASE_KEY=your_key node scripts/enrich-soundtracks.js
//
// Options:
//   --limit N       Only process N movies (default: all)
//   --dry-run       Print what would be fetched without writing to DB
//
// Safe to re-run — skips movies that already have a non-empty soundtrack array.
// Tracks not-found films in data/soundtrack-log.json to avoid redundant retries.

const https = require("https");
const fs = require("fs");
const path = require("path");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const DELAY_MS = 500; // be polite to JioSaavn
const LOG_FILE = path.join(__dirname, "../data/soundtrack-log.json");

const isDryRun = process.argv.includes("--dry-run");
const limitArg = process.argv.indexOf("--limit");
const LIMIT = limitArg !== -1 ? parseInt(process.argv[limitArg + 1]) : Infinity;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌  Missing SUPABASE_URL or SUPABASE_KEY");
  console.error("    Run as: SUPABASE_URL=... SUPABASE_KEY=... node scripts/enrich-soundtracks.js");
  process.exit(1);
}

const SUPABASE_HEADERS = {
  "Content-Type": "application/json",
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
};

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// --- JioSaavn ---

const SAAVN_BASE = "https://www.jiosaavn.com/api.php";

function saavnGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" } }, (res) => {
      let data = "";
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`JSON parse: ${data.slice(0, 100)}`)); }
      });
    }).on("error", reject);
  });
}

async function findAlbum(title, year) {
  const q = encodeURIComponent(title);
  const url = `${SAAVN_BASE}?__call=search.getAlbumResults&_format=json&_marker=0&api_version=4&ctx=web6dot0&p=1&q=${q}&n=10`;
  const data = await saavnGet(url);
  const albums = data?.results || [];
  if (!albums.length) return null;

  // Only accept albums within 2 years of the movie's release — no arbitrary fallback
  return albums.find((a) => a.year && Math.abs(parseInt(a.year) - year) <= 2) || null;
}

async function fetchAlbumTracks(albumId) {
  const url = `${SAAVN_BASE}?__call=content.getAlbumDetails&_format=json&_marker=0&api_version=4&ctx=web6dot0&albumid=${albumId}`;
  const data = await saavnGet(url);
  return data?.list || [];
}

function stripHtml(str) {
  return (str || "").replace(/<[^>]*>/g, "").trim();
}

function transformTrack(song) {
  const info = song.more_info || {};
  const artists = info.artistMap?.artists || [];
  const singers = artists.filter((a) => a.role === "singer").map((a) => a.name);
  const lyricist = artists.find((a) => a.role === "lyricist")?.name || null;

  return {
    title:        stripHtml(song.title),
    singers,
    composer:     stripHtml(info.music || ""),
    lyricist,
    duration_sec: info.duration ? parseInt(info.duration) : null,
    jiosaavn_id:  song.id,
    jiosaavn_url: song.perma_url || null,
    image_url:    (song.image || "").replace("150x150", "500x500") || null,
  };
}

// --- Supabase ---

async function fetchMoviesToEnrich(page, pageSize) {
  // Fetch movies where soundtrack is empty array or null
  // We filter in memory since Supabase can't easily filter on empty JSONB arrays
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/movies?select=id,title,year,soundtrack&limit=${pageSize}&offset=${page * pageSize}&order=year.asc`,
    { headers: SUPABASE_HEADERS }
  );
  if (!res.ok) throw new Error(`Supabase fetch failed: ${await res.text()}`);
  return res.json();
}

async function updateSoundtrack(id, tracks) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/movies?id=eq.${id}`, {
    method: "PATCH",
    headers: { ...SUPABASE_HEADERS, Prefer: "return=minimal" },
    body: JSON.stringify({ soundtrack: tracks }),
  });
  if (!res.ok) throw new Error(`Update failed: ${await res.text()}`);
}

// --- Log helpers ---

function loadLog() {
  if (!fs.existsSync(LOG_FILE)) return { enriched: {}, not_found: {}, errors: {} };
  try { return JSON.parse(fs.readFileSync(LOG_FILE, "utf8")); }
  catch { return { enriched: {}, not_found: {}, errors: {} }; }
}

function saveLog(log) {
  fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));
}

// --- Main ---

async function main() {
  console.log("🎵  JioSaavn Soundtrack Enricher");
  if (isDryRun) console.log("🔍  DRY RUN — no writes to DB\n");
  console.log();

  const log = loadLog();

  let processed = 0;
  let enriched = 0;
  let notFound = 0;
  let skipped = 0;
  let errors = 0;

  const PAGE_SIZE = 500;
  let page = 0;
  let totalFetched = 0;

  outer: while (true) {
    const batch = await fetchMoviesToEnrich(page, PAGE_SIZE);
    if (!batch.length) break;
    totalFetched += batch.length;
    page++;

    for (const movie of batch) {
      if (processed >= LIMIT) break outer;

      // Skip if already has tracks
      if (Array.isArray(movie.soundtrack) && movie.soundtrack.length > 0) {
        skipped++;
        continue;
      }

      // Skip if we already know it's not on JioSaavn
      if (log.not_found[movie.id]) {
        skipped++;
        continue;
      }

      processed++;
      process.stdout.write(`[${processed}] ${movie.title} (${movie.year})... `);

      try {
        await sleep(DELAY_MS);

        const album = await findAlbum(movie.title, movie.year);
        if (!album) {
          console.log("— not found");
          log.not_found[movie.id] = { title: movie.title, year: movie.year };
          notFound++;
          saveLog(log);
          continue;
        }

        await sleep(DELAY_MS);
        const rawTracks = await fetchAlbumTracks(album.albumid || album.id);

        if (!rawTracks.length) {
          console.log(`— album "${stripHtml(album.title)}" found but has no tracks`);
          log.not_found[movie.id] = { title: movie.title, year: movie.year, reason: "empty_album" };
          notFound++;
          saveLog(log);
          continue;
        }

        const tracks = rawTracks.map(transformTrack);
        const albumYear = album.year || "?";
        console.log(`✓  ${tracks.length} tracks (${stripHtml(album.title)}, ${albumYear})`);

        if (!isDryRun) {
          await updateSoundtrack(movie.id, tracks);
        }

        log.enriched[movie.id] = { title: movie.title, year: movie.year, track_count: tracks.length };
        enriched++;
        saveLog(log);

      } catch (err) {
        console.log(`✗  ${err.message}`);
        log.errors[movie.id] = { title: movie.title, year: movie.year, error: err.message };
        errors++;
        saveLog(log);
        // Back off on errors in case we're hitting rate limits
        await sleep(DELAY_MS * 4);
      }
    }

    // If we got fewer than a full page, we've exhausted the DB
    if (batch.length < PAGE_SIZE) break;
  }

  console.log();
  console.log("━".repeat(50));
  console.log("📊  DONE");
  console.log("━".repeat(50));
  console.log(`  Enriched:   ${enriched}`);
  console.log(`  Not found:  ${notFound}`);
  console.log(`  Skipped:    ${skipped} (already had tracks or previously not found)`);
  console.log(`  Errors:     ${errors}`);
  console.log(`  Log saved:  data/soundtrack-log.json`);

  if (notFound > 0) {
    console.log();
    console.log("ℹ️   Not-found films are logged and will be skipped on re-runs.");
    console.log("    Delete their entries from data/soundtrack-log.json to retry them.");
  }
}

main().catch((err) => {
  console.error("❌  Fatal:", err.message);
  process.exit(1);
});
