#!/usr/bin/env node
// Bollywood Plot Enricher using Anthropic Batch API
// Reliable, no hangs, cheaper, automatic retries
//
// Usage:
//   SUPABASE_URL=... SUPABASE_KEY=... ANTHROPIC_API_KEY=... node scripts/enrich-plots-batch.js

const fs = require("fs");
const path = require("path");

// Load .env.local if it exists
try {
  const envPath = path.join(__dirname, "../.env.local");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");
    envContent.split("\n").forEach((line) => {
      const [key, value] = line.split("=");
      if (key && value) process.env[key.trim()] = value.trim();
    });
  }
} catch (e) {
  // Ignore if .env.local doesn't exist
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.MODEL || "claude-haiku-4-5-20251001";
const BATCH_POLL_INTERVAL = 10000; // Poll every 10 seconds

if (!SUPABASE_URL || !SUPABASE_KEY || !ANTHROPIC_KEY) {
  console.error("❌  Missing env vars. Need: SUPABASE_URL, SUPABASE_KEY, ANTHROPIC_API_KEY");
  process.exit(1);
}

const TAXONOMY = require("../web/lib/taste-taxonomy.json");

const ALLOWED = {
  themes:           new Set(TAXONOMY.themes.values),
  tone:             new Set(TAXONOMY.tone.values),
  comedy_style:     new Set(TAXONOMY.comedy_style.values),
  realism:          new Set(TAXONOMY.realism.values),
  setting_tags:     new Set(TAXONOMY.setting_tags.values),
  notable_elements: new Set(TAXONOMY.notable_elements.values),
  vibe:             new Set(TAXONOMY.vibe.values),
};

const CLOSED = ["tone", "comedy_style", "realism", "notable_elements", "vibe"];

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

function filterSingle(dimension, raw) {
  const arr = filterTags(dimension, raw);
  return arr[0] ?? null;
}

const SUPABASE_HEADERS = {
  "Content-Type": "application/json",
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
};

function buildPrompt(title, year, plot, genres) {
  return `You are a Bollywood film expert tagging movies for a recommendation engine.

Film: "${title}" (${year})
Genres from TMDB: ${genres.join(", ") || "unknown"}
TMDB plot summary:
"""
${plot}
"""

Tag this film using ONLY the controlled vocabularies below. Pick the closest-matching allowed values.

THEMES (pick 2-5):
${TAXONOMY.themes.values.join(", ")}

TONE (pick 1-3; CLOSED set):
${TAXONOMY.tone.values.join(", ")}

COMEDY_STYLE (pick exactly 1; CLOSED set; use "none" if no significant comedy):
${TAXONOMY.comedy_style.values.join(", ")}

REALISM (pick exactly 1; CLOSED set):
${TAXONOMY.realism.values.join(", ")}

SETTING (pick 1-3):
${TAXONOMY.setting_tags.values.join(", ")}

NOTABLE_ELEMENTS (pick 2-4; CLOSED set):
${TAXONOMY.notable_elements.values.join(", ")}

VIBE (pick 1-3; CLOSED set):
${TAXONOMY.vibe.values.join(", ")}

Return ONLY valid JSON:
{
  "themes": [...],
  "tone": [...],
  "comedy_style": "...",
  "realism": "...",
  "setting": [...],
  "notable_elements": [...],
  "vibe": [...],
  "is_based_on_true_story": true/false,
  "has_item_number": true/false,
  "has_intermission": true/false
}`;
}

async function fetchMoviesToEnrich() {
  const SELECT = "select=id,title,year,genres,overview,mood_tags,vibe_tags";
  const BATCH_SIZE = 1000;
  let allMovies = [];
  let offset = 0;

  while (true) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/movies?${SELECT}&comedy_style=is.null&order=id.asc&limit=${BATCH_SIZE}&offset=${offset}`,
      { headers: SUPABASE_HEADERS }
    );

    if (!res.ok) {
      throw new Error(`Failed to fetch movies: ${await res.text()}`);
    }

    const batch = await res.json();
    if (batch.length === 0) break;

    allMovies = allMovies.concat(batch);
    offset += BATCH_SIZE;
    console.log(`  Fetched batch: ${allMovies.length} total movies loaded`);
  }

  return allMovies;
}

async function createBatch(movies) {
  console.log(`\n📦  Creating Anthropic batch with ${movies.length} films...`);

  const requests = movies.map((m) => ({
    custom_id: m.id,
    params: {
      model: MODEL,
      max_tokens: 700,
      messages: [
        {
          role: "user",
          content: buildPrompt(m.title, m.year, m.overview, m.genres ?? []),
        },
      ],
    },
  }));

  // Write JSONL to temp file
  const jsonlContent = requests.map((r) => JSON.stringify(r)).join("\n");
  const tempFile = path.join(__dirname, "../data/batch-requests.jsonl");
  fs.writeFileSync(tempFile, jsonlContent);

  console.log(`📄  Batch file written: ${tempFile}`);

  // Upload file using raw multipart encoding
  const fileContent = fs.readFileSync(tempFile);
  const boundary = "----WebKitFormBoundary" + Math.random().toString(36).substring(2, 15);

  const multipartBody = Buffer.concat([
    Buffer.from(`--${boundary}\r\n`),
    Buffer.from(`Content-Disposition: form-data; name="file"; filename="batch-requests.jsonl"\r\n`),
    Buffer.from(`Content-Type: application/octet-stream\r\n\r\n`),
    fileContent,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);

  const uploadRes = await fetch("https://api.anthropic.com/v1/files", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
    },
    body: multipartBody,
  });

  if (!uploadRes.ok) {
    throw new Error(`File upload failed: ${await uploadRes.text()}`);
  }

  const fileData = await uploadRes.json();
  const fileId = fileData.id;

  console.log(`✅  File uploaded: ${fileId}`);

  // Create batch
  const batchRes = await fetch("https://api.anthropic.com/v1/messages/batches", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      requests_file_id: fileId,
    }),
  });

  if (!batchRes.ok) {
    throw new Error(`Batch creation failed: ${await batchRes.text()}`);
  }

  const batch = await batchRes.json();
  return batch;
}

async function pollBatch(batchId) {
  console.log(`\n⏳  Polling batch ${batchId}...`);

  while (true) {
    const res = await fetch(`https://api.anthropic.com/v1/messages/batches/${batchId}`, {
      headers: {
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
    });

    if (!res.ok) {
      throw new Error(`Batch poll failed: ${await res.text()}`);
    }

    const batch = await res.json();

    console.log(
      `  Status: ${batch.processing_status} | ${batch.request_counts.processing} processing, ${batch.request_counts.succeeded} done, ${batch.request_counts.errored} errors`
    );

    if (batch.processing_status === "ended") {
      return batch;
    }

    await new Promise((resolve) => setTimeout(resolve, BATCH_POLL_INTERVAL));
  }
}

async function processBatchResults(batchId) {
  console.log(`\n📥  Retrieving results...`);

  const resultsRes = await fetch(
    `https://api.anthropic.com/v1/messages/batches/${batchId}/results`,
    {
      headers: {
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
    }
  );

  if (!resultsRes.ok) {
    throw new Error(`Results fetch failed: ${await resultsRes.text()}`);
  }

  const resultsText = await resultsRes.text();
  const results = resultsText
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));

  console.log(`✅  Retrieved ${results.length} results\n`);

  let success = 0;
  let failed = 0;

  for (const result of results) {
    const movieId = result.custom_id;

    if (result.error) {
      console.log(`❌  ${movieId}: ${result.error.message}`);
      failed++;
      continue;
    }

    try {
      const content = result.result.content[0].text;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON in response");

      const parsed = JSON.parse(jsonMatch[0]);

      const tags = {
        themes: filterTags("themes", parsed.themes),
        tone: filterTags("tone", parsed.tone),
        comedy_style: filterSingle("comedy_style", parsed.comedy_style),
        realism: filterSingle("realism", parsed.realism),
        setting_tags: filterTags("setting_tags", parsed.setting),
        notable_elements: filterTags("notable_elements", parsed.notable_elements),
        vibe: filterTags("vibe", parsed.vibe),
        is_based_on_true_story: parsed.is_based_on_true_story === true,
        has_item_number: parsed.has_item_number === true,
        has_intermission: parsed.has_intermission === true,
      };

      // Update DB
      const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/movies?id=eq.${movieId}`, {
        method: "PATCH",
        headers: { ...SUPABASE_HEADERS, Prefer: "return=minimal" },
        body: JSON.stringify({
          themes: tags.themes,
          tone: tags.tone,
          comedy_style: tags.comedy_style,
          realism: tags.realism,
          setting_tags: tags.setting_tags,
          notable_elements: tags.notable_elements,
          vibe_tags: tags.vibe,
          mood_tags: tags.tone,
          is_based_on_true_story: tags.is_based_on_true_story,
          has_item_number: tags.has_item_number,
          has_intermission: tags.has_intermission,
        }),
      });

      if (!updateRes.ok) throw new Error(`DB update failed: ${await updateRes.text()}`);

      success++;
      if (success % 100 === 0) {
        console.log(`  ✅  ${success} films saved to DB`);
      }
    } catch (err) {
      console.log(`❌  ${movieId}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n✅  Done: ${success} enriched, ${failed} failed`);
}

async function main() {
  console.log("🎬  Bollywood Plot Enricher (Batch API)\n");

  try {
    const movies = await fetchMoviesToEnrich();
    console.log(`📊  ${movies.length} films to enrich\n`);

    if (movies.length === 0) {
      console.log("✅  All films already enriched!");
      return;
    }

    const batch = await createBatch(movies);
    console.log(`🎯  Batch ID: ${batch.id}`);

    const completed = await pollBatch(batch.id);
    console.log(`✅  Batch completed: ${completed.request_counts.succeeded} succeeded`);

    await processBatchResults(batch.id);
  } catch (err) {
    console.error("❌  Fatal:", err.message);
    process.exit(1);
  }
}

main();
