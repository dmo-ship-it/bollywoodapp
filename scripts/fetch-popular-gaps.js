// Fetch known popular films that are genuinely absent from our DB.
// Checks existing titles first — only fetches what's missing.
//
// Usage:
//   TMDB_TOKEN=your_token node scripts/fetch-popular-gaps.js
//   Then import:
//   SUPABASE_URL=... SUPABASE_KEY=... node scripts/import-movies.js --file popular-gaps.json

const fs   = require("fs");
const path = require("path");
const https = require("https");

const TOKEN = process.env.TMDB_TOKEN;
if (!TOKEN) { console.error("❌  Missing TMDB_TOKEN"); process.exit(1); }

const SUPABASE_URL = process.env.SUPABASE_URL || "https://lljwlbgamwdwzdxzefjt.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const OUTPUT_FILE  = path.join(__dirname, "../data/popular-gaps.json");
const TITLE_OVERRIDES_FILE = path.join(__dirname, "../data/title_overrides.json");
const TITLE_OVERRIDES = fs.existsSync(TITLE_OVERRIDES_FILE)
  ? JSON.parse(fs.readFileSync(TITLE_OVERRIDES_FILE, "utf8")) : {};

const BASE    = "https://api.themoviedb.org/3";
const HEADERS = { Authorization: `Bearer ${TOKEN}`, accept: "application/json" };
const DELAY   = 260;

// ─── Film lists ──────────────────────────────────────────────────────────────
const TARGETS = [
  // ── Hindi ──────────────────────────────────────────────────────────────────
  { title: "Brahmastra: Part One – Shiva",  year: 2022, lang: "hi" },
  { title: "Toilet: Ek Prem Katha",         year: 2017, lang: "hi" },
  { title: "Tanhaji: The Unsung Warrior",   year: 2020, lang: "hi" },
  { title: "Super 30",                      year: 2019, lang: "hi" },
  { title: "Bala",                          year: 2019, lang: "hi" },
  { title: "Chhalaang",                     year: 2020, lang: "hi" },
  { title: "Ludo",                          year: 2020, lang: "hi" },
  { title: "Mimi",                          year: 2021, lang: "hi" },
  { title: "Atrangi Re",                    year: 2021, lang: "hi" },
  { title: "Gehraiyaan",                    year: 2022, lang: "hi" },
  { title: "Dobaaraa",                      year: 2022, lang: "hi" },
  { title: "Vikram Vedha",                  year: 2022, lang: "hi" },
  { title: "Bhediya",                       year: 2022, lang: "hi" },
  { title: "Selfiee",                       year: 2023, lang: "hi" },
  { title: "Sam Bahadur",                   year: 2023, lang: "hi" },
  { title: "Fighter",                       year: 2024, lang: "hi" },
  { title: "Merry Christmas",               year: 2024, lang: "hi" },
  { title: "Crew",                          year: 2024, lang: "hi" },
  { title: "Auron Mein Kahan Dum Tha",      year: 2024, lang: "hi" },
  { title: "Singham Returns",               year: 2024, lang: "hi" },

  // ── Tamil ──────────────────────────────────────────────────────────────────
  { title: "Kadhalan",                      year: 1994, lang: "ta" },
  { title: "Vaalee",                        year: 1999, lang: "ta" },
  { title: "Engeyum Eppothum",              year: 2011, lang: "ta" },
  { title: "Aarohanam",                     year: 2012, lang: "ta" },
  { title: "Kumki",                         year: 2012, lang: "ta" },
  { title: "Neram",                         year: 2013, lang: "ta" },
  { title: "Maatr",                         year: 2014, lang: "ta" },
  { title: "Ennai Ariyathe",               year: 2015, lang: "ta" },
  { title: "Meaghamann",                    year: 2014, lang: "ta" },
  { title: "Thanga Magan",                  year: 2015, lang: "ta" },
  { title: "Inaindha Kaigal",              year: 2016, lang: "ta" },
  { title: "Thaana Serndha Koottam",        year: 2018, lang: "ta" },
  { title: "Kannum Kannum Kollaiyadithaal", year: 2020, lang: "ta" },
  { title: "Anbirkiniyal",                  year: 2020, lang: "ta" },
  { title: "Mandela",                       year: 2021, lang: "ta" },
  { title: "Soorarai Pottru",              year: 2020, lang: "ta" },
  { title: "Jagame Thandhiram",             year: 2021, lang: "ta" },
  { title: "Etharkkum Thunindhavan",        year: 2022, lang: "ta" },
  { title: "Thiruchitrambalam",             year: 2022, lang: "ta" },
  { title: "Varisu",                        year: 2023, lang: "ta" },
  { title: "Thunivu",                       year: 2023, lang: "ta" },
  { title: "Viduthalai Part 1",             year: 2023, lang: "ta" },
  { title: "Captain Miller",                year: 2024, lang: "ta" },
  { title: "Meiyazhagan",                   year: 2024, lang: "ta" },

  // ── Telugu — pre-1980 NTR/ANR classics ─────────────────────────────────────
  { title: "Malliswari",                    year: 1951, lang: "te" },
  { title: "Pellichesi Choodu",             year: 1952, lang: "te" },
  { title: "Adarsha Kutumbam",              year: 1958, lang: "te" },
  { title: "Appu Chesi Pappu Koodu",        year: 1959, lang: "te" },
  { title: "Gulebakavali Katha",            year: 1962, lang: "te" },
  { title: "Manchi Manasulu",               year: 1962, lang: "te" },
  { title: "Lava Kusha",                    year: 1963, lang: "te" },
  { title: "Maa Bhoomi",                    year: 1980, lang: "te" },
  { title: "Naa Ninna Mareyalenu",          year: 1968, lang: "te" },
  { title: "Dasara Bullodu",                year: 1971, lang: "te" },
  { title: "Devatha",                       year: 1982, lang: "te" },
  { title: "Meghasandesam",                 year: 1982, lang: "te" },
  { title: "Driver Ramudu",                 year: 1979, lang: "te" },
  { title: "Eduruleni Manishi",             year: 1964, lang: "te" },
  { title: "Naa Illu India",                year: 2020, lang: "te" },

  // ── Telugu — 2000s–2020s gaps ───────────────────────────────────────────────
  { title: "Premisthe",                     year: 2001, lang: "te" },
  { title: "Nuvve Nuvve",                   year: 2002, lang: "te" },
  { title: "Darling",                       year: 2010, lang: "te" },
  { title: "Julayi",                        year: 2012, lang: "te" },
  { title: "Mirchi",                        year: 2013, lang: "te" },
  { title: "Ram Leela",                     year: 2015, lang: "te" },
  { title: "Soggade Chinni Nayana",         year: 2016, lang: "te" },
  { title: "Fidaa",                         year: 2017, lang: "te" },
  { title: "Bheeshma",                      year: 2020, lang: "te" },
  { title: "Uppena",                        year: 2021, lang: "te" },
  { title: "Nagarjuna: The Warrior",        year: 2022, lang: "te" },
  { title: "Pushpa 2: The Rule",            year: 2024, lang: "te" },
  { title: "Devara: Part 1",                year: 2024, lang: "te" },
  { title: "Guntur Kaaram",                 year: 2024, lang: "te" },
  { title: "Tillu Square",                  year: 2024, lang: "te" },

  // ── Malayalam — notable gaps ────────────────────────────────────────────────
  { title: "Thenum Vayambum",               year: 1961, lang: "ml" },
  { title: "Chattambinadu",                 year: 1971, lang: "ml" },
  { title: "Thakara",                       year: 1979, lang: "ml" },
  { title: "Yavanika",                      year: 1982, lang: "ml" },
  { title: "Oru CBI Diary Kurippu",         year: 1988, lang: "ml" },
  { title: "Thenmavin Kombathu",            year: 1994, lang: "ml" },
  { title: "Minnaram",                      year: 1994, lang: "ml" },
  { title: "Spadikam",                      year: 1995, lang: "ml" },
  { title: "Chattambinadu",                 year: 2009, lang: "ml" },
  { title: "Classmates",                    year: 2006, lang: "ml" },
  { title: "Christian Brothers",            year: 2011, lang: "ml" },
  { title: "Ordinary",                      year: 2012, lang: "ml" },
  { title: "Traffic",                       year: 2011, lang: "ml" },
  { title: "Seconds",                       year: 2013, lang: "ml" },
  { title: "North 24 Kaatham",              year: 2013, lang: "ml" },
  { title: "Ennu Ninte Moideen",            year: 2015, lang: "ml" },
  { title: "Oru Muthassi Gadha",            year: 2016, lang: "ml" },
  { title: "Trance",                        year: 2020, lang: "ml" },
  { title: "Aadujeevitham",                 year: 2024, lang: "ml" },
  { title: "Redu",                          year: 2015, lang: "ml" },
  { title: "Lord Livingstone 7000 Kandi",   year: 2015, lang: "ml" },
  { title: "Godha",                         year: 2017, lang: "ml" },
  { title: "Odiyan",                        year: 2018, lang: "ml" },
  { title: "Ishq",                          year: 2019, lang: "ml" },
  { title: "Thallumaala",                   year: 2022, lang: "ml" },
  { title: "Roam Rome Mein",                year: 2019, lang: "ml" },
  { title: "Iratta",                        year: 2023, lang: "ml" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function httpsGet(url) {
  return new Promise((res, rej) => {
    https.get(url, { headers: HEADERS }, r => {
      let d = "";
      if (r.statusCode !== 200) { rej(new Error(`TMDB ${r.statusCode}`)); r.resume(); return; }
      r.on("data", c => d += c);
      r.on("end", () => { try { res(JSON.parse(d)); } catch(e) { rej(e); } });
    }).on("error", rej);
  });
}

function supabaseGet(path) {
  return new Promise((res, rej) => {
    if (!SUPABASE_KEY) { res([]); return; }
    const opts = {
      hostname: SUPABASE_URL.replace("https://", ""),
      path,
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    };
    https.get(opts, r => {
      let d = "";
      r.on("data", c => d += c);
      r.on("end", () => { try { res(JSON.parse(d)); } catch(e) { rej(e); } });
    }).on("error", rej);
  });
}

async function fetchAllDbTitles() {
  if (!SUPABASE_KEY) return new Set();
  const all = [];
  for (const lang of ["hi", "ta", "te", "ml"]) {
    let offset = 0;
    while (true) {
      const batch = await supabaseGet(
        `/rest/v1/movies?select=title,year,language&language=eq.${lang}&limit=1000&offset=${offset}`
      );
      if (!Array.isArray(batch) || !batch.length) break;
      all.push(...batch);
      if (batch.length < 1000) break;
      offset += 1000;
    }
  }
  return new Set(all.map(m => `${m.title.toLowerCase().trim()}::${m.year}`));
}

async function searchTmdb({ title, year, lang }) {
  const q   = encodeURIComponent(title);
  const data = await httpsGet(`${BASE}/search/movie?query=${q}&year=${year}&language=en-US&page=1`);
  const results = data.results || [];
  return results.find(r => r.original_language === lang) || results[0] || null;
}

async function fetchDetails(id) {
  return httpsGet(
    `${BASE}/movie/${id}?append_to_response=credits,keywords,videos,watch%2Fproviders` +
    `&include_video_language=hi,ta,te,ml,en,null`
  );
}

function extractTrailer(videos) {
  const items = videos?.results || [];
  const t = items.find(v => v.type === "Trailer" && v.site === "YouTube" && v.official)
         || items.find(v => v.type === "Trailer" && v.site === "YouTube")
         || items.find(v => v.site === "YouTube");
  return t ? `https://www.youtube.com/watch?v=${t.key}` : null;
}

function extractOTT(wp)   { return (wp?.results?.IN?.flatrate || []).map(p => p.provider_name); }
function extractCast(c)   { return (c?.cast || []).slice(0, 10).map(p => ({ tmdb_id: p.id, name: p.name, character: p.character, photo_url: p.profile_path ? `https://image.tmdb.org/t/p/w185${p.profile_path}` : null, billing_order: p.order + 1 })); }
function extractCrew(c)   { return (c?.crew || []).filter(p => ["Director","Producer","Director of Photography","Music"].includes(p.job)).map(p => ({ tmdb_id: p.id, name: p.name, job: p.job, photo_url: p.profile_path ? `https://image.tmdb.org/t/p/w185${p.profile_path}` : null })); }

function transform(raw) {
  return {
    tmdb_id:           raw.id,
    imdb_id:           raw.imdb_id || null,
    title:             TITLE_OVERRIDES[String(raw.id)] ?? raw.title,
    original_title:    raw.original_title,
    tagline:           raw.tagline || null,
    overview:          raw.overview,
    year:              raw.release_date ? parseInt(raw.release_date.split("-")[0]) : null,
    release_date:      raw.release_date || null,
    poster_url:        raw.poster_path  ? `https://image.tmdb.org/t/p/w500${raw.poster_path}`   : null,
    backdrop_url:      raw.backdrop_path ? `https://image.tmdb.org/t/p/w1280${raw.backdrop_path}` : null,
    trailer_url:       extractTrailer(raw.videos),
    runtime_minutes:   raw.runtime || null,
    language:          raw.original_language || null,
    genres:            (raw.genres || []).map(g => g.name),
    keywords:          (raw.keywords?.keywords || []).map(k => k.name).slice(0, 20),
    production_houses: (raw.production_companies || []).map(c => c.name),
    tmdb_rating:       raw.vote_average || null,
    tmdb_votes:        raw.vote_count  || 0,
    tmdb_popularity:   raw.popularity  || 0,
    ott_platforms:     extractOTT(raw["watch/providers"]),
    cast:              extractCast(raw.credits),
    crew:              extractCrew(raw.credits),
    mood_tags: [], vibe_tags: [],
    fetched_at: new Date().toISOString(),
    is_verified: false,
  };
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🎬  Popular gaps fetcher — ${TARGETS.length} candidates\n`);

  // Step 1: load existing DB titles so we skip what we already have
  process.stdout.write("🔍  Loading existing DB titles…");
  const existing = await fetchAllDbTitles();
  console.log(` ${existing.size} films already in DB\n`);

  const toFetch  = TARGETS.filter(f => !existing.has(`${f.title.toLowerCase().trim()}::${f.year}`));
  const skipped  = TARGETS.length - toFetch.length;
  console.log(`⏩  Skipping ${skipped} already-present films`);
  console.log(`📥  Fetching ${toFetch.length} genuinely missing films\n`);

  const movies   = [];
  const notFound = [];

  for (const entry of toFetch) {
    process.stdout.write(`  [${entry.lang}] ${entry.title} (${entry.year})…`);
    try {
      await sleep(DELAY);
      const hit = await searchTmdb(entry);
      if (!hit) { console.log(" ✗ not found on TMDB"); notFound.push(entry.title); continue; }
      await sleep(DELAY);
      const details = await fetchDetails(hit.id);
      const movie   = transform(details);
      movies.push(movie);
      console.log(` ✓  "${movie.title}" (${movie.year}) [${movie.language}]`);
    } catch (err) {
      console.log(` ✗  ${err.message}`);
      notFound.push(entry.title);
    }
  }

  console.log(`\n✅  Fetched ${movies.length}/${toFetch.length}`);
  if (notFound.length) console.log(`⚠️   Not found (${notFound.length}): ${notFound.join(", ")}`);

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify({ fetched_at: new Date().toISOString(), count: movies.length, movies }, null, 2));
  console.log(`💾  Saved to ${OUTPUT_FILE}`);
  console.log(`\nNext step:`);
  console.log(`  SUPABASE_URL=${SUPABASE_URL} SUPABASE_KEY=your_service_role_key node scripts/import-movies.js --file popular-gaps.json\n`);
}

main().catch(err => { console.error("Fatal:", err.message); process.exit(1); });
