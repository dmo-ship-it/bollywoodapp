// Enrich Upcoming Movies with IMDb Data
// Fetches additional data (trailers, more cast/crew) from IMDb for upcoming movies
// Uses the imdb-api.com service (free, no auth required)
//
// Usage:
//   node scripts/enrich-upcoming-imdb.js [--output enriched-upcoming.json]

const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");

const INPUT_FILE = path.join(__dirname, "../data/upcoming.json");
const OUTPUT_FILE = path.join(__dirname, process.argv.indexOf("--output") !== -1
  ? process.argv[process.argv.indexOf("--output") + 1]
  : "../data/upcoming.json");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function get(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    client.get(url, (res) => {
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

async function fetchImDbData(imdbId) {
  try {
    // Using imdb-api.com free API
    const url = `https://imdb-api.com/en/API/Title/${imdbId}`;
    const data = await get(url);

    if (data.errorMessage) {
      console.log(`    ⚠️  IMDb error: ${data.errorMessage}`);
      return null;
    }

    return data;
  } catch (e) {
    console.log(`    ⚠️  Failed to fetch IMDb data: ${e.message}`);
    return null;
  }
}

function extractTrailerFromImDb(imdbData) {
  // IMDb-api returns trailer info, but it's limited
  // Return YouTube URL if available
  if (imdbData.trailer?.linkEmbed) {
    const youtubeId = imdbData.trailer.linkEmbed.split("/embed/")[1];
    if (youtubeId) {
      return `https://www.youtube.com/watch?v=${youtubeId}`;
    }
  }
  return null;
}

function mergeActors(tmdbCast, imdbActors) {
  // IMDb might have more actors, merge both sources
  if (!imdbActors || !Array.isArray(imdbActors)) return tmdbCast;

  const seen = new Set(tmdbCast.map(c => c.name.toLowerCase()));
  const merged = [...tmdbCast];

  // Add IMDb actors not already in TMDB list (up to 10 total)
  for (const actor of imdbActors.slice(0, 20)) {
    if (!seen.has(actor.name.toLowerCase()) && merged.length < 15) {
      merged.push({
        tmdb_id: null,
        name: actor.name,
        character: actor.asCharacter || null,
        photo_url: actor.image || null,
        billing_order: merged.length + 1,
      });
      seen.add(actor.name.toLowerCase());
    }
  }

  return merged.slice(0, 15);
}

function enrichMovie(movie, imdbData) {
  if (!imdbData) return movie;

  const enriched = { ...movie };

  // Add trailer if we found one and movie doesn't have it
  if (!enriched.trailer_url) {
    const trailerUrl = extractTrailerFromImDb(imdbData);
    if (trailerUrl) {
      enriched.trailer_url = trailerUrl;
    }
  }

  // Merge cast - IMDb often has more complete cast info for upcoming movies
  if (imdbData.actorList && Array.isArray(imdbData.actorList)) {
    enriched.cast = mergeActors(enriched.cast || [], imdbData.actorList);
  }

  // Add more detailed overview if available
  if (!enriched.overview && imdbData.plot) {
    enriched.overview = imdbData.plot;
  }

  // Update rating if IMDb has one and we don't
  if (!enriched.imdb_rating && imdbData.imDbRating) {
    enriched.imdb_rating = parseFloat(imdbData.imDbRating);
  }

  enriched.imdb_votes = imdbData.imDbRatingCount ? parseInt(imdbData.imDbRatingCount) : (enriched.imdb_votes || 0);

  // Sync IMDb plot as fallback
  if (imdbData.plot && imdbData.plot.length > enriched.overview?.length) {
    enriched.overview = imdbData.plot;
  }

  return enriched;
}

async function main() {
  console.log("🎬  Upcoming Movies IMDb Enrichment\n");

  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`❌  Input file not found: ${INPUT_FILE}`);
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(INPUT_FILE, "utf8"));
  const movies = raw.movies || [];

  console.log(`📊  Enriching ${movies.length} movies with IMDb data...\n`);

  let enrichedCount = 0;
  let trailerCount = 0;

  for (let i = 0; i < movies.length; i++) {
    const movie = movies[i];

    process.stdout.write(`  [${i + 1}/${movies.length}] ${movie.title.substring(0, 40).padEnd(40)} `);

    if (!movie.imdb_id) {
      console.log("⊘ (no IMDb ID)");
      continue;
    }

    // Rate limiting - IMDb API has limits
    await sleep(200);

    const imdbData = await fetchImDbData(movie.imdb_id);

    if (imdbData) {
      const before = movie.trailer_url;
      movies[i] = enrichMovie(movie, imdbData);
      enrichedCount++;

      if (!before && movies[i].trailer_url) {
        trailerCount++;
        console.log("✓ (trailer added)");
      } else if (movies[i].cast?.length > (movie.cast?.length || 0)) {
        console.log("✓ (cast expanded)");
      } else {
        console.log("✓");
      }
    } else {
      console.log("✗");
    }
  }

  console.log(`\n✅  Enrichment complete`);
  console.log(`  • ${enrichedCount} movies enhanced`);
  console.log(`  • ${trailerCount} trailers added`);

  // Save enriched data
  fs.writeFileSync(
    OUTPUT_FILE,
    JSON.stringify({
      fetched_at: new Date().toISOString(),
      count: movies.length,
      movies,
      enriched_at: new Date().toISOString(),
    }, null, 2)
  );

  console.log(`💾  Saved to ${OUTPUT_FILE}\n`);
  console.log("Next: SUPABASE_URL=xxx SUPABASE_KEY=xxx node scripts/import-movies.js --file upcoming.json");
}

main().catch((e) => {
  console.error("Fatal:", e.message);
  process.exit(1);
});
