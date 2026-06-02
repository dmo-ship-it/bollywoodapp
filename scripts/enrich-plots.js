// Wikipedia Plot Scraper + Claude Theme Extractor
//
// For each movie in the DB, fetches the plot from Wikipedia,
// then uses Claude to extract structured themes and tags.
//
// Usage:
//   SUPABASE_URL=... SUPABASE_KEY=... ANTHROPIC_API_KEY=... node scripts/enrich-plots.js
//
// Run in batches — safe to re-run, skips movies already enriched.

const fs = require("fs");
const path = require("path");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const DELAY_MS = 2000;
const MAX_RETRIES = 4;
const OUTPUT_LOG = path.join(__dirname, "../data/enrichment-log.json");

if (!SUPABASE_URL || !SUPABASE_KEY || !ANTHROPIC_KEY) {
  console.error("❌  Missing env vars. Need: SUPABASE_URL, SUPABASE_KEY, ANTHROPIC_API_KEY");
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

// --- Wikipedia ---

const WIKI_HEADERS = {
  "User-Agent": "BollywoodDBImporter/1.0 (https://github.com/placeholder; contact@example.com)",
  "Accept": "application/json",
};

async function fetchWikipediaPlot(title, year) {
  const searchQuery = encodeURIComponent(`${title} ${year} film`);
  const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${searchQuery}&format=json&origin=*`;

  const searchRes = await fetch(searchUrl, { headers: WIKI_HEADERS });
  if (!searchRes.ok) return null;
  let searchData;
  try { searchData = JSON.parse(await searchRes.text()); } catch { return null; }

  const results = searchData?.query?.search ?? [];
  if (!results.length) return null;

  const pageTitle = results[0].title;
  const contentUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(pageTitle)}&prop=extracts&explaintext=true&format=json&origin=*`;
  const contentRes = await fetch(contentUrl, { headers: WIKI_HEADERS });
  if (!contentRes.ok) return null;
  let contentData;
  try { contentData = JSON.parse(await contentRes.text()); } catch { return null; }

  const pages = contentData?.query?.pages ?? {};
  const page = Object.values(pages)[0];
  if (!page?.extract) return null;

  const text = page.extract;
  const plotMatch = text.match(/==\s*Plot\s*==\n([\s\S]*?)(?=\n==|$)/i);
  if (plotMatch) return plotMatch[1].trim().slice(0, 3000);

  return text.slice(0, 1500);
}

// --- Claude ---

async function extractThemesWithClaude(title, year, plot, existingGenres) {
  const prompt = `You are a Bollywood film expert analyzing movies for a recommendation app.

Film: "${title}" (${year})
Genres from TMDB: ${existingGenres.join(", ")}
Wikipedia plot summary:
"""
${plot}
"""

Extract structured tags for this film. Return ONLY valid JSON with these exact fields:

{
  "themes": [...],      // 2-5 core narrative themes. Examples: "star-crossed lovers", "revenge", "coming of age", "underdog sports", "political corruption", "identity crisis", "family drama", "heist", "supernatural horror"
  "tone": [...],        // 1-3 tonal descriptors. Examples: "feel-good", "dark", "bittersweet", "laugh-out-loud comedy", "emotionally devastating", "edge-of-your-seat thriller", "slow burn", "high energy"
  "setting": [...],     // 1-3 setting tags. Examples: "rural India", "NRI diaspora", "Mughal era", "Mumbai underworld", "small town", "foreign country", "partition era", "1990s nostalgia"
  "notable_elements": [...], // 2-4 standout elements. Examples: "iconic songs", "twist ending", "based on true story", "ensemble cast", "unconventional narrative", "social message", "spectacular action", "tragic ending", "cult classic ending"
  "vibe": [...],        // 1-3 viewer experience tags. Examples: "perfect date night", "watch with family", "cry guaranteed", "great for a rainy day", "timepass fun", "instant classic", "divisive", "comfort rewatch"
  "is_based_on_true_story": true/false,
  "has_item_number": true/false,
  "has_intermission": true/false
}`;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const backoff = Math.min(2000 * Math.pow(2, attempt - 1), 30000);
      await sleep(backoff);
    }

    let rawText = "";
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 512,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      rawText = await res.text();

      if (res.status === 429 || res.status === 529) {
        // Rate limited — retry after backoff
        if (attempt < MAX_RETRIES) continue;
        throw new Error(`Rate limited after ${MAX_RETRIES} retries`);
      }

      if (!res.ok) throw new Error(`Claude API ${res.status}: ${rawText.slice(0, 200)}`);

      const data = JSON.parse(rawText);
      const text = data.content[0].text.trim();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error(`No JSON in response: ${text.slice(0, 100)}`);
      return JSON.parse(jsonMatch[0]);
    } catch (err) {
      // Retry on JSON parse errors (may indicate a garbled/rate-limit response)
      if (attempt < MAX_RETRIES && (err instanceof SyntaxError || err.message.includes("rate"))) {
        continue;
      }
      throw err;
    }
  }
}

// --- Supabase ---

async function fetchMoviesToEnrich() {
  // Fetch movies that haven't been enriched yet (no plot stored)
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/movies?select=id,title,year,genres,mood_tags,vibe_tags&wikipedia_plot=is.null&limit=500`,
    { headers: SUPABASE_HEADERS }
  );
  if (!res.ok) {
    // Column might not exist yet — fetch all and filter in memory
    const all = await fetch(
      `${SUPABASE_URL}/rest/v1/movies?select=id,title,year,genres,mood_tags,vibe_tags&limit=500`,
      { headers: SUPABASE_HEADERS }
    );
    return all.json();
  }
  return res.json();
}

async function updateMovie(id, fields) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/movies?id=eq.${id}`, {
    method: "PATCH",
    headers: { ...SUPABASE_HEADERS, Prefer: "return=minimal" },
    body: JSON.stringify(fields),
  });
  if (!res.ok) throw new Error(`Update failed: ${await res.text()}`);
}

// --- Main ---

async function main() {
  console.log("🎬  Bollywood Plot Enricher\n");

  // First, add the new columns if they don't exist
  console.log("📋  Adding enrichment columns to DB (if not already there)...");
  const alterRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: "POST",
    headers: SUPABASE_HEADERS,
    body: JSON.stringify({
      query: `
        alter table movies add column if not exists wikipedia_plot text;
        alter table movies add column if not exists themes text[];
        alter table movies add column if not exists tone text[];
        alter table movies add column if not exists setting_tags text[];
        alter table movies add column if not exists notable_elements text[];
        alter table movies add column if not exists is_based_on_true_story boolean;
        alter table movies add column if not exists has_item_number boolean;
        alter table movies add column if not exists has_intermission boolean;
      `,
    }),
  });
  // This may fail if the RPC doesn't exist — that's OK, we'll add columns manually
  console.log("  (If this fails, run the ALTER TABLE commands in Supabase SQL Editor)\n");

  const movies = await fetchMoviesToEnrich();
  console.log(`📊  ${movies.length} films to enrich\n`);

  const log = [];
  let success = 0;
  let failed = 0;

  for (let i = 0; i < movies.length; i++) {
    const m = movies[i];
    process.stdout.write(`[${i + 1}/${movies.length}] ${m.title} (${m.year})... `);

    try {
      await sleep(DELAY_MS);

      // 1. Get Wikipedia plot
      const plot = await fetchWikipediaPlot(m.title, m.year);
      if (!plot) {
        console.log("⚠️  No Wikipedia plot found");
        log.push({ title: m.title, status: "no_plot" });
        failed++;
        continue;
      }

      // 2. Extract themes with Claude
      await sleep(DELAY_MS);
      const tags = await extractThemesWithClaude(m.title, m.year, plot, m.genres ?? []);

      // 3. Update the DB
      await updateMovie(m.id, {
        wikipedia_plot:        plot,
        themes:                tags.themes ?? [],
        tone:                  tags.tone ?? [],
        setting_tags:          tags.setting ?? [],
        notable_elements:      tags.notable_elements ?? [],
        mood_tags:             tags.tone ?? [],   // also populate existing mood_tags field
        vibe_tags:             tags.vibe ?? [],   // also populate existing vibe_tags field
        is_based_on_true_story: tags.is_based_on_true_story ?? false,
        has_item_number:       tags.has_item_number ?? false,
        has_intermission:      tags.has_intermission ?? false,
      });

      console.log(`✓  [${tags.tone?.join(", ")}] ${tags.themes?.slice(0, 2).join(", ")}`);
      log.push({ title: m.title, status: "ok", tags });
      success++;
    } catch (err) {
      console.log(`✗  ${err.message}`);
      log.push({ title: m.title, status: "error", error: err.message });
      failed++;
    }
  }

  fs.writeFileSync(OUTPUT_LOG, JSON.stringify(log, null, 2));

  console.log(`\n✅  Done: ${success} enriched, ${failed} failed`);
  console.log(`📄  Full log saved to data/enrichment-log.json`);
}

main().catch((err) => {
  console.error("❌  Fatal:", err.message);
  process.exit(1);
});
