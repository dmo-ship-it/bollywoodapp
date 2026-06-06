// Spike: JioSaavn Soundtrack Lookup (no auth required)
// Tests whether JioSaavn's public API can reliably return Bollywood movie soundtracks.
//
// Usage:
//   node scripts/spike-jiosaavn-soundtracks.js
//
// No API key needed — JioSaavn exposes a public search endpoint.
// Note: This uses JioSaavn's unofficial public API. Monitor for breakage.

const https = require("https");

// Sample movies to test — same set as the Spotify spike for comparison
const TEST_MOVIES = [
  { title: "Dilwale Dulhania Le Jayenge", year: 1995, tmdb_id: 19404 },
  { title: "3 Idiots",                   year: 2009, tmdb_id: 20453 },
  { title: "PK",                         year: 2014, tmdb_id: 297222 },
  { title: "Dangal",                     year: 2016, tmdb_id: 328429 },
  { title: "RRR",                        year: 2022, tmdb_id: 759374 },
];

const BASE = "https://www.jiosaavn.com/api.php";

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept": "application/json",
      },
    };
    https.get(url, options, (res) => {
      let data = "";
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`JSON parse error: ${data.slice(0, 200)}`)); }
      });
    }).on("error", reject);
  });
}

async function searchAlbum(movieTitle, year) {
  const q = encodeURIComponent(movieTitle);
  const url = `${BASE}?__call=search.getAlbumResults&_format=json&_marker=0&api_version=4&ctx=web6dot0&p=1&q=${q}&n=10`;
  const data = await httpsGet(url);

  const albums = data?.results || [];
  if (!albums.length) return null;

  // Find the best match — prefer albums with matching year
  const match = albums.find((a) => {
    const albumYear = a.year ? parseInt(a.year) : null;
    return albumYear && Math.abs(albumYear - year) <= 1;
  }) || albums[0];

  return match || null;
}

async function getAlbumSongs(albumId) {
  const url = `${BASE}?__call=content.getAlbumDetails&_format=json&_marker=0&api_version=4&ctx=web6dot0&albumid=${albumId}`;
  const data = await httpsGet(url);
  return data?.list || data?.songs || [];
}

function stripHtml(str) {
  return (str || "").replace(/<[^>]*>/g, "").trim();
}

function transformTrack(song) {
  const info = song.more_info || {};
  const artistMap = info.artistMap || {};
  const singers = (artistMap.artists || [])
    .filter((a) => a.role === "singer")
    .map((a) => a.name);

  return {
    title:        stripHtml(song.title),
    singers,
    composer:     stripHtml(info.music || ""),
    lyricist:     (artistMap.artists || []).find((a) => a.role === "lyricist")?.name || null,
    duration_sec: info.duration ? parseInt(info.duration) : null,
    jiosaavn_id:  song.id,
    jiosaavn_url: song.perma_url,
    image_url:    (song.image || "").replace("150x150", "500x500"),
    has_stream:   !!info.encrypted_media_url,
  };
}

async function main() {
  console.log("🎵  JioSaavn Soundtrack Spike\n");
  console.log("ℹ️   Uses JioSaavn public API — no auth required\n");

  const results = [];

  for (const movie of TEST_MOVIES) {
    process.stdout.write(`🎬  ${movie.title} (${movie.year})... `);

    try {
      const album = await searchAlbum(movie.title, movie.year);

      if (!album) {
        console.log("❌  No album found");
        results.push({ movie: movie.title, year: movie.year, found: false });
        continue;
      }

      const songs = await getAlbumSongs(album.albumid || album.id);

      const albumYear = album.year || "?";
      const albumName = stripHtml(album.title || album.name || "");
      console.log(`✅  ${songs.length} tracks (album: "${albumName}", ${albumYear})`);

      const transformed = songs.map(transformTrack);

      results.push({
        movie:        movie.title,
        year:         movie.year,
        found:        true,
        album_name:   albumName,
        album_year:   albumYear,
        album_id:     album.albumid || album.id,
        track_count:  songs.length,
        tracks:       transformed,
        has_streams:  transformed.filter((t) => t.has_stream).length,
      });

      // Print track listing
      for (const t of transformed) {
        const stream = t.has_stream ? "🔊" : "  ";
        const min = t.duration_sec ? Math.floor(t.duration_sec / 60) : "?";
        const sec = t.duration_sec ? String(t.duration_sec % 60).padStart(2, "0") : "??";
        const artists = t.singers.join(", ") || t.composer;
        console.log(`    ${stream} ${t.title} — ${artists} (${min}:${sec})`);
      }
      console.log();

    } catch (err) {
      console.log(`❌  Error: ${err.message}`);
      results.push({ movie: movie.title, year: movie.year, found: false, error: err.message });
    }

    await new Promise((r) => setTimeout(r, 400));
  }

  // Summary
  const found = results.filter((r) => r.found);

  console.log("━".repeat(50));
  console.log("📊  JIOSAAVN SUMMARY");
  console.log("━".repeat(50));
  console.log(`  Movies tested:    ${results.length}`);
  console.log(`  Albums found:     ${found.length}/${results.length} (${Math.round(found.length / results.length * 100)}%)`);
  console.log(`  With streams:     ${found.filter((r) => r.has_streams > 0).length}/${found.length}`);
  console.log(`  Avg tracks/album: ${found.length ? Math.round(found.reduce((s, r) => s + r.track_count, 0) / found.length) : 0}`);
  console.log();

  // What the data looks like for the app
  if (found.length > 0) {
    console.log("📦  Sample soundtrack array (app format):");
    console.log(JSON.stringify(found[0].tracks.slice(0, 3), null, 2));
  }

  console.log("\nℹ️   NOTE: JioSaavn stream URLs are encrypted — playback needs");
  console.log("    the JioSaavn web/app player or a decryption library.");
  console.log("    Best use: metadata + deep-link to JioSaavn for playback.");
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
