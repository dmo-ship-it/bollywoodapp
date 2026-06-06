// Enrich Upcoming Movies with YouTube Trailers
// Searches YouTube for movie trailers without using an API key (no quota limits)
//
// Usage:
//   node scripts/enrich-upcoming-youtube.js
//   node scripts/enrich-upcoming-youtube.js --force   (re-search even if trailer already set)

const fs = require("fs");
const path = require("path");
const yts = require("yt-search");

const INPUT_FILE = path.join(__dirname, "../data/upcoming.json");
const OUTPUT_FILE = path.join(__dirname, "../data/upcoming.json");
const FORCE = process.argv.includes("--force");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function searchYouTubeTrailer(title, year, language) {
  const queries = [
    `${title} official trailer`,
    `${title} ${year} trailer`,
    `${title} teaser trailer`,
  ];

  for (const query of queries) {
    try {
      const result = await yts(query);
      const videos = result.videos || [];

      // Prefer official/trailer results
      const best =
        videos.find(v =>
          v.title.toLowerCase().includes("trailer") &&
          (v.title.toLowerCase().includes("official") || v.author.name.toLowerCase().includes("official"))
        ) ||
        videos.find(v => v.title.toLowerCase().includes("trailer")) ||
        videos.find(v => v.title.toLowerCase().includes("teaser")) ||
        videos[0];

      if (best) {
        return `https://www.youtube.com/watch?v=${best.videoId}`;
      }
    } catch (e) {
      // try next query
    }
    await sleep(300);
  }

  return null;
}

async function main() {
  console.log("🎬  Upcoming Movies YouTube Trailer Enrichment (no API key)\n");

  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`❌  Input file not found: ${INPUT_FILE}`);
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(INPUT_FILE, "utf8"));
  const movies = raw.movies || [];
  const toEnrich = FORCE ? movies : movies.filter(m => !m.trailer_url);

  console.log(`📊  ${movies.length} total movies, ${toEnrich.length} need trailers\n`);

  let added = 0;
  let failed = 0;

  for (let i = 0; i < toEnrich.length; i++) {
    const movie = toEnrich[i];
    process.stdout.write(`  [${i + 1}/${toEnrich.length}] ${movie.title.substring(0, 45).padEnd(45)} `);

    await sleep(500); // be polite to YouTube

    const trailer = await searchYouTubeTrailer(movie.title, movie.year, movie.language);

    // Update the movie in the original array
    const idx = movies.findIndex(m => m.tmdb_id === movie.tmdb_id);
    if (trailer) {
      movies[idx].trailer_url = trailer;
      added++;
      console.log("✓");
    } else {
      failed++;
      console.log("✗");
    }
  }

  console.log(`\n✅  Done: ${added} trailers added, ${failed} not found`);

  fs.writeFileSync(
    OUTPUT_FILE,
    JSON.stringify({ ...raw, movies, enriched_at: new Date().toISOString() }, null, 2)
  );
  console.log(`💾  Saved to ${OUTPUT_FILE}`);
  console.log("\nNext: SUPABASE_URL=xxx SUPABASE_KEY=xxx node scripts/import-movies.js --file upcoming.json");
}

main().catch((e) => {
  console.error("Fatal:", e.message);
  process.exit(1);
});
