// Fun-fact trivia generator
//
// For the most popular films in a given language, uses Claude with the
// server-side web_search tool to find ONE genuinely surprising, verifiable
// piece of trivia or a famous goof (think: Kareena's mismatched footwear in
// K3G) and turn it into a 4-option multiple-choice question with a source URL.
//
// Facts come from real web sources (search-grounded) and every question is
// validated before it's kept; low-confidence / unsourced ones are dropped.
//
// Usage:
//   ANTHROPIC_API_KEY=... SUPABASE_URL=... SUPABASE_KEY=... \
//     node scripts/generate-trivia.js --lang hi --limit 30
//
// Output: data/trivia/<lang>-funfact.json  (resumable — skips films already done)

const fs = require("fs");
const path = require("path");

// --- env (matches scripts/enrich-plots.js) ---
try {
  const envPath = path.join(__dirname, "../.env.local");
  if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, "utf8").split("\n").forEach((line) => {
      const [key, ...rest] = line.split("=");
      if (key && rest.length) process.env[key.trim()] = rest.join("=").trim();
    });
  }
} catch (_) {}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
// Web search + fact synthesis wants a capable model. Override with MODEL=...
const MODEL = process.env.MODEL || "claude-sonnet-4-6";
const DELAY_MS = 1500;
const MAX_RETRIES = 3;

const SUPABASE_HEADERS = {
  "Content-Type": "application/json",
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
};

const LANG_NAMES = { hi: "Hindi", ta: "Tamil", ml: "Malayalam", te: "Telugu" };

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { lang: "hi", limit: 30 };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--lang") out.lang = args[++i];
    else if (args[i] === "--limit") out.limit = parseInt(args[++i], 10);
  }
  if (!LANG_NAMES[out.lang]) throw new Error(`Unknown --lang ${out.lang} (use hi|ta|ml|te)`);
  return out;
}

// --- Supabase: top films for a language ---
async function fetchTopFilms(lang, limit) {
  // Best-known films first. tmdb_votes (number of ratings) tracks real-world
  // fame/recognition far better than tmdb_popularity (which is recency-biased),
  // and well-known films have the richest documented trivia.
  // Cast/crew live in movie_credits -> people (embedded).
  const select =
    "select=id,title,year,imdb_id,tmdb_votes,box_office_india_crore," +
    "movie_credits(role,billing_order,people(name))";
  const url = `${SUPABASE_URL}/rest/v1/movies?${select}&language=eq.${lang}&imdb_id=not.is.null&order=tmdb_votes.desc.nullslast&limit=${limit}`;
  const res = await fetch(url, { headers: SUPABASE_HEADERS });
  if (!res.ok) throw new Error(`Failed to fetch films: ${await res.text()}`);
  return res.json();
}

function filmContext(film) {
  const credits = film.movie_credits || [];
  const nameOf = (c) => c.people?.name;
  const director = credits.find((c) => /Director$/i.test(c.role || "") && !/Music/i.test(c.role || ""))?.people?.name
    || credits.find((c) => /^Director$/i.test(c.role || ""))?.people?.name;
  const music = credits.find((c) => /Music/i.test(c.role || ""))?.people?.name;
  const cast = credits
    .filter((c) => /Actor|Actress|Cast/i.test(c.role || "") || c.billing_order != null)
    .sort((a, b) => (a.billing_order ?? 99) - (b.billing_order ?? 99))
    .map(nameOf)
    .filter(Boolean)
    .slice(0, 5);
  const year = film.year ? String(film.year).slice(0, 4) : "unknown year";
  return { director, music, cast, year };
}

function buildPrompt(film, lang) {
  const { director, music, cast, year } = filmContext(film);
  return `You are building a daily movie-trivia game for fans of Indian (${LANG_NAMES[lang]}) cinema.

FILM: "${film.title}" (${year})
Director: ${director || "unknown"}
Music: ${music || "unknown"}
Main cast: ${cast.join(", ") || "unknown"}

Use web search to find ONE genuinely SURPRISING, fun, and VERIFIABLE piece of trivia or a famous goof about THIS specific film. Good examples: memorable continuity errors (e.g. an actor's footwear changing mid-scene), on-set anecdotes, casting facts (who was originally offered a role), record-breaking feats, hidden details fans love. Avoid generic, easily-guessable facts (like "who directed it" or "what year it released").

Then turn that fact into a 4-option multiple-choice question where exactly one option is correct and the other three are plausible but wrong. Keep the question self-contained and spoiler-light.

Return ONLY a JSON object, no prose:
{
  "question": "the question text, mentioning the film by name",
  "options": ["A", "B", "C", "D"],
  "correct_answer": 0,
  "explanation": "1-2 sentences stating the fact and why it's true",
  "source_url": "https://... the page that documents this fact",
  "difficulty": "easy" | "medium" | "hard",
  "confidence": "high" | "medium" | "low"
}

Rules:
- correct_answer is the 0-based index of the correct option.
- Provide a real source_url you actually found via search. If you cannot find a well-sourced, interesting fact, return {"skip": true} instead.
- Set confidence "low" if you are unsure the fact is accurate.`;
}

// --- Claude with web_search server tool ---
async function generateForFilm(film, lang) {
  const prompt = buildPrompt(film, lang);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 1500,
          tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 4 }],
          messages: [{ role: "user", content: prompt }],
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const rawText = await res.text();
      if (res.status === 429 || res.status === 529) {
        if (attempt < MAX_RETRIES) { await sleep(5000 * attempt); continue; }
        throw new Error(`Rate limited after ${MAX_RETRIES} retries`);
      }
      if (!res.ok) throw new Error(`Claude API ${res.status}: ${rawText.slice(0, 300)}`);

      const data = JSON.parse(rawText);
      // Concatenate all text blocks from the final assistant turn.
      const text = (data.content || [])
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error(`No JSON in response: ${text.slice(0, 120)}`);
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed;
    } catch (err) {
      if (attempt < MAX_RETRIES && (err instanceof SyntaxError || /rate|abort/i.test(err.message))) {
        await sleep(2000 * attempt);
        continue;
      }
      throw err;
    }
  }
}

// --- Validation: only keep clean, sourced, confident questions ---
function validate(q, film) {
  if (!q || q.skip === true) return null;
  if (typeof q.question !== "string" || q.question.length < 10) return null;
  if (!Array.isArray(q.options) || q.options.length !== 4) return null;
  if (q.options.some((o) => typeof o !== "string" || !o.trim())) return null;
  if (new Set(q.options.map((o) => o.trim().toLowerCase())).size !== 4) return null; // distinct
  if (!Number.isInteger(q.correct_answer) || q.correct_answer < 0 || q.correct_answer > 3) return null;
  if (typeof q.explanation !== "string" || q.explanation.length < 10) return null;
  if (typeof q.source_url !== "string" || !/^https?:\/\//.test(q.source_url)) return null;
  if (q.confidence === "low") return null;
  return {
    movie_id: film.id,
    title: film.title,
    question: q.question.trim(),
    options: q.options.map((o) => o.trim()),
    correct_answer: q.correct_answer,
    explanation: q.explanation.trim(),
    source_url: q.source_url.trim(),
    difficulty: ["easy", "medium", "hard"].includes(q.difficulty) ? q.difficulty : "medium",
    confidence: q.confidence || "medium",
    category: "fun_fact",
  };
}

// --- Main ---
async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY || !ANTHROPIC_KEY) {
    throw new Error("Missing SUPABASE_URL / SUPABASE_KEY / ANTHROPIC_API_KEY env");
  }
  const { lang, limit } = parseArgs();
  console.log(`\n🎬  Fun-fact trivia generator — ${LANG_NAMES[lang]} (top ${limit})  [model: ${MODEL}]\n`);

  const outDir = path.join(__dirname, "../data/trivia");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `${lang}-funfact.json`);

  // Resume: load anything already generated.
  let results = [];
  if (fs.existsSync(outPath)) {
    results = JSON.parse(fs.readFileSync(outPath, "utf8"));
    console.log(`  Resuming — ${results.length} questions already saved.\n`);
  }
  const doneIds = new Set(results.map((r) => r.movie_id));

  const films = await fetchTopFilms(lang, limit);
  console.log(`  Fetched ${films.length} top films.\n`);

  let kept = 0, skipped = 0;
  for (const film of films) {
    if (doneIds.has(film.id)) continue;
    process.stdout.write(`  • ${film.title} … `);
    try {
      const raw = await generateForFilm(film, lang);
      const q = validate(raw, film);
      if (q) {
        results.push(q);
        kept++;
        console.log(`✅  ${q.difficulty}`);
      } else {
        skipped++;
        console.log(`⏭️  skipped (no well-sourced fact)`);
      }
      // Save after each film so the run is fully resumable.
      fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
    } catch (err) {
      skipped++;
      console.log(`❌  ${err.message}`);
    }
    await sleep(DELAY_MS);
  }

  console.log(`\n✓ Done. Kept ${kept}, skipped ${skipped}. Total in bank: ${results.length}`);
  console.log(`  → ${path.relative(path.join(__dirname, ".."), outPath)}\n`);
}

main().catch((e) => { console.error("\n💥", e.message); process.exit(1); });
