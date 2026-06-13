// Build the final per-language trivia bank.
//
// Combines the sourced "fun_fact" questions (data/trivia/<lang>-funfact.json,
// produced by generate-trivia.js) with DB-grounded "factual" template questions
// generated here, then assigns day_index slots so the bank fills a full year.
//
// Template answers are pulled straight from the verified movies / movie_credits
// data, so they cannot be factually wrong; distractors are sampled from the same
// language pool and checked to be genuinely incorrect for that film.
//
// fun_fact questions get the lowest day_index values, so the most interesting
// questions surface first in the daily rotation.
//
// Usage:
//   SUPABASE_URL=... SUPABASE_KEY=... node scripts/build-trivia-bank.js --lang hi --target 365
//
// Output: data/trivia/<lang>.json  (the seedable bank)

const fs = require("fs");
const path = require("path");

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
const SUPABASE_HEADERS = {
  "Content-Type": "application/json",
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
};
const LANG_NAMES = { hi: "Hindi", ta: "Tamil", ml: "Malayalam", te: "Telugu" };
const POOL_SIZE = 600; // how many well-known films to draw template questions from

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { lang: "hi", target: 365 };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--lang") out.lang = args[++i];
    else if (args[i] === "--target") out.target = parseInt(args[++i], 10);
  }
  if (!LANG_NAMES[out.lang]) throw new Error(`Unknown --lang ${out.lang}`);
  return out;
}

// Deterministic-ish shuffle (Fisher-Yates with Math.random; bank is reviewed by hand anyway)
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function sample(arr, n, exclude = new Set()) {
  const pool = shuffle(arr.filter((x) => !exclude.has(x)));
  return pool.slice(0, n);
}

async function fetchPool(lang) {
  const select =
    "select=id,title,year,movie_credits(role,character_name,billing_order,people(name))";
  const url = `${SUPABASE_URL}/rest/v1/movies?${select}&language=eq.${lang}&imdb_id=not.is.null&year=not.is.null&order=tmdb_votes.desc.nullslast&limit=${POOL_SIZE}`;
  const res = await fetch(url, { headers: SUPABASE_HEADERS });
  if (!res.ok) throw new Error(`Failed to fetch pool: ${await res.text()}`);
  return res.json();
}

// --- Extractors over a film's credits ---
const directorOf = (f) =>
  (f.movie_credits || []).find((c) => /^Director$/i.test(c.role || ""))?.people?.name;
const musicOf = (f) =>
  (f.movie_credits || []).find((c) => /Music/i.test(c.role || ""))?.people?.name;
const castOf = (f) =>
  (f.movie_credits || [])
    .filter((c) => /Actor|Actress/i.test(c.role || ""))
    .sort((a, b) => (a.billing_order ?? 99) - (b.billing_order ?? 99));

// --- Template question generators. Each returns a question or null. ---
function makeDirectorQ(film, allDirectors) {
  const dir = directorOf(film);
  if (!dir) return null;
  const distractors = sample(allDirectors, 3, new Set([dir]));
  if (distractors.length < 3) return null;
  const options = shuffle([dir, ...distractors]);
  return {
    movie_id: film.id, title: film.title, category: "factual", difficulty: "easy",
    question: `Who directed the film "${film.title}" (${film.year})?`,
    options, correct_answer: options.indexOf(dir),
    explanation: `"${film.title}" (${film.year}) was directed by ${dir}.`,
  };
}

function makeMusicQ(film, allMusic) {
  const mus = musicOf(film);
  if (!mus) return null;
  const distractors = sample(allMusic, 3, new Set([mus]));
  if (distractors.length < 3) return null;
  const options = shuffle([mus, ...distractors]);
  return {
    movie_id: film.id, title: film.title, category: "factual", difficulty: "medium",
    question: `Who composed the music for "${film.title}" (${film.year})?`,
    options, correct_answer: options.indexOf(mus),
    explanation: `${mus} composed the soundtrack for "${film.title}".`,
  };
}

function makeYearQ(film) {
  if (!film.year) return null;
  const y = Number(film.year);
  // distractors: nearby years, none equal to y
  const offsets = shuffle([-3, -2, -1, 1, 2, 3, 4, 5]).slice(0, 6);
  const cand = [...new Set(offsets.map((o) => y + o))].filter((v) => v !== y);
  const distractors = sample(cand.map(String), 3);
  if (distractors.length < 3) return null;
  const options = shuffle([String(y), ...distractors]);
  return {
    movie_id: film.id, title: film.title, category: "factual", difficulty: "medium",
    question: `In which year was "${film.title}" released?`,
    options, correct_answer: options.indexOf(String(y)),
    explanation: `"${film.title}" was released in ${y}.`,
  };
}

function makeCharacterQ(film, allActors) {
  const cast = castOf(film).filter((c) => c.character_name && c.people?.name);
  if (!cast.length) return null;
  const pick = cast[0];
  const actor = pick.people.name;
  const distractors = sample(allActors, 3, new Set([actor]));
  if (distractors.length < 3) return null;
  const options = shuffle([actor, ...distractors]);
  // strip honorifics/quotes noise from character name
  const char = pick.character_name.replace(/["“”]/g, "").split("(")[0].trim();
  if (char.length < 2) return null;
  return {
    movie_id: film.id, title: film.title, category: "factual", difficulty: "hard",
    question: `Which actor played ${char} in "${film.title}" (${film.year})?`,
    options, correct_answer: options.indexOf(actor),
    explanation: `${actor} played ${char} in "${film.title}".`,
  };
}

function makeCastQ(film, allActors) {
  const cast = castOf(film).map((c) => c.people?.name).filter(Boolean);
  if (cast.length < 1) return null;
  const inFilm = new Set(cast);
  const answer = cast[0];
  // distractors: actors NOT in this film
  const distractors = sample(allActors, 3, inFilm);
  if (distractors.length < 3) return null;
  const options = shuffle([answer, ...distractors]);
  return {
    movie_id: film.id, title: film.title, category: "factual", difficulty: "medium",
    question: `Which of these actors starred in "${film.title}" (${film.year})?`,
    options, correct_answer: options.indexOf(answer),
    explanation: `${answer} was part of the cast of "${film.title}".`,
  };
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("Missing SUPABASE_URL / SUPABASE_KEY");
  const { lang, target } = parseArgs();
  console.log(`\n🧩  Building ${LANG_NAMES[lang]} trivia bank (target ${target})\n`);

  const outDir = path.join(__dirname, "../data/trivia");
  const funPath = path.join(outDir, `${lang}-funfact.json`);
  const funFacts = fs.existsSync(funPath) ? JSON.parse(fs.readFileSync(funPath, "utf8")) : [];
  console.log(`  fun_fact questions: ${funFacts.length}`);

  const pool = await fetchPool(lang);
  console.log(`  template pool: ${pool.length} films`);

  // Global name pools for distractors.
  const allDirectors = [...new Set(pool.map(directorOf).filter(Boolean))];
  const allMusic = [...new Set(pool.map(musicOf).filter(Boolean))];
  const allActors = [...new Set(pool.flatMap((f) => castOf(f).map((c) => c.people?.name)).filter(Boolean))];

  // Generate a varied set of template questions. Rotate generators so the bank
  // isn't all "who directed", and cap one question per film+type.
  const generators = [
    (f) => makeDirectorQ(f, allDirectors),
    (f) => makeCastQ(f, allActors),
    (f) => makeYearQ(f),
    (f) => makeMusicQ(f, allMusic),
    (f) => makeCharacterQ(f, allActors),
  ];

  const need = Math.max(0, target - funFacts.length);
  const fills = [];
  const seen = new Set(); // dedupe by question text
  let gi = 0;
  const shuffledPool = shuffle(pool);
  // Round-robin generators across films until we have enough.
  for (let round = 0; round < generators.length && fills.length < need; round++) {
    for (const film of shuffledPool) {
      if (fills.length >= need) break;
      const q = generators[round](film);
      if (!q) continue;
      if (seen.has(q.question)) continue;
      seen.add(q.question);
      fills.push(q);
    }
  }
  console.log(`  template questions generated: ${fills.length} (needed ${need})`);

  // Assemble: fun_facts first (juiciest), then fills. Assign day_index.
  const bank = [...funFacts, ...shuffle(fills)]
    .slice(0, target)
    .map((q, i) => ({ language: lang, day_index: i, ...q }));

  const outPath = path.join(outDir, `${lang}.json`);
  fs.writeFileSync(outPath, JSON.stringify(bank, null, 2));
  const funCount = bank.filter((q) => q.category === "fun_fact").length;
  console.log(`\n✓ Bank built: ${bank.length} questions (${funCount} fun_fact, ${bank.length - funCount} factual)`);
  if (bank.length < target) {
    console.log(`  ⚠️  Only ${bank.length}/${target} — not enough source films; lower --target or add more films.`);
  }
  console.log(`  → ${path.relative(path.join(__dirname, ".."), outPath)}\n`);
}

main().catch((e) => { console.error("\n💥", e.message); process.exit(1); });
