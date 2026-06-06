// Enrich Upcoming Movies with YouTube Trailers
// Searches YouTube for movie trailers and adds them to upcoming.json
//
// Requires YOUTUBE_API_KEY environment variable
// Get your key at: https://console.cloud.google.com/
//
// Usage:
//   YOUTUBE_API_KEY=your_key node scripts/enrich-upcoming-youtube.js

const fs = require("fs");
const path = require("path");
const https = require("https");

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const INPUT_FILE = path.join(__dirname, "../data/upcoming.json");
const OUTPUT_FILE = path.join(__dirname, "../data/upcoming.json");

if (!YOUTUBE_API_KEY) {
  console.error("❌  Missing YOUTUBE_API_KEY environment variable.");
  console.error("    Get a key at: https://console.cloud.google.com/");
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = "";
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        res.resume();
        return;
      }
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on("error", reject);
  });
}

async function searchYouTubeTrailer(title, releaseYear) {
  try {
    const query = `${title} ${releaseYear} trailer official`;
    const url = `https://www.googleapis.com/youtube/v3/search?` +
      `part=snippet&` +
      `type=video&` +
      `q=${encodeURIComponent(query)}&` +
      `key=${YOUTUBE_API_KEY}&` +
      `maxResults=5&` +
      `order=relevance`;

    const data = await get(url);

    if (!data.items || data.items.length === 0) {
      return null;
    }

    // Prefer official trailers
    const official = data.items.find(item =>
      item.snippet.title.toLowerCase().includes("official") &&
      item.snippet.title.toLowerCase().includes("trailer")
    );

    if (official) {
      return `https://www.youtube.com/watch?v=${official.id.videoId}`;
    }

    // Fall back to first result
    if (data.items[0]) {
      return `https://www.youtube.com/watch?v=${data.items[0].id.videoId}`;
    }

    return null;
  } catch (e) {
    return null;
  }
}

async function main() {
  console.log("🎬  Upcoming Movies YouTube Trailer Enrichment\n");

  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`❌  Input file not found: ${INPUT_FILE}`);
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(INPUT_FILE, "utf8"));
  const movies = raw.movies || [];

  console.log(`📊  Searching for trailers for ${movies.length} movies...\n`);

  let trailerCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < movies.length; i++) {
    const movie = movies[i];

    process.stdout.write(
      `  [${i + 1}/${movies.length}] ${movie.title.substring(0, 40).padEnd(40)} `
    );

    // Skip if already has a trailer
    if (movie.trailer_url) {
      console.log("⊘ (already has trailer)");
      skippedCount++;
      continue;
    }

    // Rate limiting - YouTube API quota is tight
    await sleep(400);

    const trailer = await searchYouTubeTrailer(movie.title, movie.year);

    if (trailer) {
      movies[i].trailer_url = trailer;
      trailerCount++;
      console.log("✓ (trailer found)");
    } else {
      console.log("✗ (not found)");
    }
  }

  console.log(`\n✅  Enrichment complete`);
  console.log(`  • ${trailerCount} trailers added`);
  console.log(`  • ${skippedCount} movies skipped (already had trailers)`);
  console.log(`  • ${movies.length - trailerCount - skippedCount} no trailer found`);

  // Save enriched data
  fs.writeFileSync(
    OUTPUT_FILE,
    JSON.stringify({
      fetched_at: raw.fetched_at,
      count: movies.length,
      movies,
      enriched_at: new Date().toISOString(),
    }, null, 2)
  );

  console.log(`\n💾  Saved to ${OUTPUT_FILE}\n`);
  console.log("Next: SUPABASE_URL=xxx SUPABASE_KEY=xxx node scripts/import-movies.js --file upcoming.json");
}

main().catch((e) => {
  console.error("Fatal:", e.message);
  process.exit(1);
});
