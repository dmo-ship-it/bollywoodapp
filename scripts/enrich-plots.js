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
// Constrained classification works well on Haiku; override with MODEL=claude-opus-4-8 for max quality.
const MODEL = process.env.MODEL || "claude-haiku-4-5-20251001";
const DELAY_MS = 2000;
const MAX_RETRIES = 4;
const OUTPUT_LOG = path.join(__dirname, "../data/enrichment-log.json");

// Canonical controlled vocabulary — shared with the taste engine (web/lib/taste.js).
const TAXONOMY = require("../web/lib/taste-taxonomy.json");

// Build a lookup of allowed values per dimension for post-validation.
const ALLOWED = {
  themes:           new Set(TAXONOMY.themes.values),
  tone:             new Set(TAXONOMY.tone.values),
  comedy_style:     new Set(TAXONOMY.comedy_style.values),
  realism:          new Set(TAXONOMY.realism.values),
  setting_tags:     new Set(TAXONOMY.setting_tags.values),
  notable_elements: new Set(TAXONOMY.notable_elements.values),
  vibe:             new Set(TAXONOMY.vibe.values),
};

// Dimensions where Claude must pick ONLY from the closed set (hallucinations dropped).
const CLOSED = ["tone", "comedy_style", "realism", "notable_elements", "vibe"];
// Dimensions that allow a small number of free-form additions.
const OPEN = ["themes", "setting_tags"];

function bullet(values) {
  return values.join(", ");
}

// Keep only values that are in the allowed set (for closed dimensions),
// or normalize to kebab-case (for open dimensions). Always returns an array.
function filterTags(dimension, raw) {
  if (!Array.isArray(raw)) raw = raw == null ? [] : [raw];
  const normalized = raw
    .filter((v) => typeof v === "string")
    .map((v) => v.trim().toLowerCase().replace(/\s+/g, "-"));
  if (CLOSED.includes(dimension)) {
    return [...new Set(normalized.filter((v) => ALLOWED[dimension].has(v)))];
  }
  return [...new Set(normalized.filter(Boolean))];
}

// Single-value dimension (realism): return the first allowed value or null.
function filterSingle(dimension, raw) {
  const arr = filterTags(dimension, raw);
  return arr[0] ?? null;
}

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
  const prompt = `You are a Bollywood film expert tagging movies for a recommendation engine.

Film: "${title}" (${year})
Genres from TMDB: ${existingGenres.join(", ") || "unknown"}
Wikipedia plot summary:
"""
${plot}
"""

Tag this film using ONLY the controlled vocabularies below. Choosing consistent tags across films is critical — the engine matches users to films by these exact tag strings, so do NOT invent synonyms or variants. Pick the closest-matching allowed value.

THEMES (pick 2-5 core narrative themes; you may add at most 1 new kebab-case theme only if nothing below fits):
${bullet(TAXONOMY.themes.values)}

TONE (pick 1-3; CLOSED set — pick only from this list, no additions):
${bullet(TAXONOMY.tone.values)}

COMEDY_STYLE (pick exactly 1; CLOSED set; use "none" if the film has no significant comedic intent):
${bullet(TAXONOMY.comedy_style.values)}

REALISM (pick exactly 1; CLOSED set — how grounded the film feels):
${bullet(TAXONOMY.realism.values)}

SETTING (pick 1-3 setting/era tags; you may add at most 1 new kebab-case tag only if nothing below fits):
${bullet(TAXONOMY.setting_tags.values)}

NOTABLE_ELEMENTS (pick 2-4; CLOSED set — structural/production standouts):
${bullet(TAXONOMY.notable_elements.values)}

VIBE (pick 1-3 viewer-occasion tags; CLOSED set):
${bullet(TAXONOMY.vibe.values)}

Return ONLY valid JSON, no prose, with exactly these fields:
{
  "themes": [...],
  "tone": [...],
  "comedy_style": ["..."],
  "realism": "...",
  "setting": [...],
  "notable_elements": [...],
  "vibe": [...],
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
          model: MODEL,
          max_tokens: 700,
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
      const parsed = JSON.parse(jsonMatch[0]);

      // Validate against the controlled vocabulary — drop anything hallucinated.
      return {
        themes:                 filterTags("themes", parsed.themes),
        tone:                   filterTags("tone", parsed.tone),
        comedy_style:           filterSingle("comedy_style", parsed.comedy_style),
        realism:                filterSingle("realism", parsed.realism),
        setting:                filterTags("setting_tags", parsed.setting),
        notable_elements:       filterTags("notable_elements", parsed.notable_elements),
        vibe:                   filterTags("vibe", parsed.vibe),
        is_based_on_true_story: parsed.is_based_on_true_story === true,
        has_item_number:        parsed.has_item_number === true,
        has_intermission:       parsed.has_intermission === true,
      };
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
        alter table movies add column if not exists comedy_style text;
        alter table movies add column if not exists realism text;
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
        themes:                tags.themes,
        tone:                  tags.tone,
        comedy_style:          tags.comedy_style,
        realism:               tags.realism,
        setting_tags:          tags.setting,
        notable_elements:      tags.notable_elements,
        mood_tags:             tags.tone,    // also populate existing mood_tags field
        vibe_tags:             tags.vibe,    // also populate existing vibe_tags field
        is_based_on_true_story: tags.is_based_on_true_story,
        has_item_number:       tags.has_item_number,
        has_intermission:      tags.has_intermission,
      });

      console.log(`✓  [${tags.tone.join(", ")}] ${tags.themes.slice(0, 2).join(", ")}`);
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
