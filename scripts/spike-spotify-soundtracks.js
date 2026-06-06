// Spike: Spotify Soundtrack Lookup
// Tests whether Spotify can reliably return Bollywood movie soundtracks.
//
// Usage:
//   SPOTIFY_CLIENT_ID=xxx SPOTIFY_CLIENT_SECRET=yyy node scripts/spike-spotify-soundtracks.js
//
// Get credentials at: https://developer.spotify.com/dashboard

const https = require("https");

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("❌  Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET");
  console.error("    Get them at: https://developer.spotify.com/dashboard");
  process.exit(1);
}

// Sample movies to test — a mix of eras and languages
const TEST_MOVIES = [
  { title: "Dilwale Dulhania Le Jayenge", year: 1995, tmdb_id: 19404 },
  { title: "3 Idiots",                   year: 2009, tmdb_id: 20453 },
  { title: "PK",                         year: 2014, tmdb_id: 297222 },
  { title: "Dangal",                     year: 2016, tmdb_id: 328429 },
  { title: "RRR",                        year: 2022, tmdb_id: 759374 },
];

function httpsPost(hostname, path, headers, body) {
  return new Promise((resolve, reject) => {
    const req = https.request({ hostname, path, method: "POST", headers }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch (e) { reject(new Error(`JSON parse error: ${data}`)); }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function httpsGet(url, headers) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers }, (res) => {
      let data = "";
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`JSON parse error`)); }
      });
    }).on("error", reject);
  });
}

async function getAccessToken() {
  const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
  const body = "grant_type=client_credentials";
  const { status, body: data } = await httpsPost(
    "accounts.spotify.com",
    "/api/token",
    {
      "Authorization": `Basic ${credentials}`,
      "Content-Type":  "application/x-www-form-urlencoded",
      "Content-Length": Buffer.byteLength(body),
    },
    body
  );
  if (status !== 200) throw new Error(`Token error: ${JSON.stringify(data)}`);
  return data.access_token;
}

async function searchAlbum(token, movieTitle, year) {
  // Try two search strategies: "Movie Title Soundtrack" and "Movie Title Original Motion Picture"
  const queries = [
    `${movieTitle} Soundtrack`,
    `${movieTitle} Original Soundtrack`,
    `${movieTitle} Songs`,
  ];

  const headers = { Authorization: `Bearer ${token}` };

  for (const q of queries) {
    const encoded = encodeURIComponent(q);
    const url = `https://api.spotify.com/v1/search?q=${encoded}&type=album&market=IN&limit=5`;
    const data = await httpsGet(url, headers);
    const albums = data.albums?.items || [];

    // Find the best match — prefer albums with matching year
    const match = albums.find((a) => {
      const albumYear = a.release_date?.split("-")[0];
      return Math.abs(parseInt(albumYear) - year) <= 1;
    }) || albums[0];

    if (match) return { query: q, album: match };
  }
  return null;
}

async function getAlbumTracks(token, albumId) {
  const headers = { Authorization: `Bearer ${token}` };
  const url = `https://api.spotify.com/v1/albums/${albumId}/tracks?market=IN&limit=50`;
  const data = await httpsGet(url, headers);
  return data.items || [];
}

function formatDuration(ms) {
  const totalSec = Math.round(ms / 1000);
  return `${Math.floor(totalSec / 60)}:${String(totalSec % 60).padStart(2, "0")}`;
}

function transformTrack(track) {
  return {
    title:        track.name,
    singers:      track.artists.map((a) => a.name),
    duration_sec: Math.round(track.duration_ms / 1000),
    preview_url:  track.preview_url,
    spotify_id:   track.id,
    spotify_url:  track.external_urls?.spotify,
  };
}

async function main() {
  console.log("🎵  Spotify Soundtrack Spike\n");

  let token;
  try {
    token = await getAccessToken();
    console.log("✅  Authenticated with Spotify\n");
  } catch (err) {
    console.error("❌  Auth failed:", err.message);
    process.exit(1);
  }

  const results = [];

  for (const movie of TEST_MOVIES) {
    process.stdout.write(`🎬  ${movie.title} (${movie.year})... `);

    try {
      const found = await searchAlbum(token, movie.title, movie.year);

      if (!found) {
        console.log("❌  No album found");
        results.push({ movie: movie.title, year: movie.year, found: false });
        continue;
      }

      const { album } = found;
      const tracks = await getAlbumTracks(token, album.id);
      const albumYear = album.release_date?.split("-")[0];

      console.log(`✅  ${tracks.length} tracks (album: "${album.name}", ${albumYear})`);

      const transformed = tracks.map(transformTrack);

      results.push({
        movie:        movie.title,
        year:         movie.year,
        found:        true,
        album_name:   album.name,
        album_year:   albumYear,
        album_id:     album.id,
        track_count:  tracks.length,
        tracks:       transformed,
        has_previews: transformed.filter((t) => t.preview_url).length,
      });

      // Print track listing
      for (const t of transformed) {
        const preview = t.preview_url ? "🔊" : "  ";
        console.log(`    ${preview} ${t.title} — ${t.singers.join(", ")} (${formatDuration(t.duration_sec * 1000)})`);
      }
      console.log();

    } catch (err) {
      console.log(`❌  Error: ${err.message}`);
      results.push({ movie: movie.title, year: movie.year, found: false, error: err.message });
    }

    // Small delay to be polite
    await new Promise((r) => setTimeout(r, 300));
  }

  // Summary
  const found = results.filter((r) => r.found);
  const withPreviews = found.filter((r) => r.has_previews > 0);

  console.log("━".repeat(50));
  console.log("📊  SPOTIFY SUMMARY");
  console.log("━".repeat(50));
  console.log(`  Movies tested:       ${results.length}`);
  console.log(`  Albums found:        ${found.length}/${results.length} (${Math.round(found.length / results.length * 100)}%)`);
  console.log(`  With audio previews: ${withPreviews.length}/${found.length}`);
  console.log(`  Avg tracks/album:    ${found.length ? Math.round(found.reduce((s, r) => s + r.track_count, 0) / found.length) : 0}`);
  console.log();

  // What the data looks like for the app
  if (found.length > 0) {
    console.log("📦  Sample soundtrack array (app format):");
    console.log(JSON.stringify(found[0].tracks.slice(0, 3), null, 2));
  }
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
