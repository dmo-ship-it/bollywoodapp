import { createClient } from "./supabase-browser";
import TAXONOMY from "./taste-taxonomy.json";

/**
 * TASTE ENGINE
 *
 * Content-based recommender built on a controlled tag vocabulary
 * (see taste-taxonomy.json, populated by scripts/enrich-plots.js).
 *
 * Core idea: SIGNED affinities. Every rating is centered at 3, so a tag a user
 * rates highly accrues positive affinity and a tag they rate poorly accrues
 * negative affinity. A 1-star slapstick film actively pushes recommendations
 * away from slapstick; a 5-star true-story film pulls them toward true stories.
 * This is what lets stated tastes ("less slapstick", "based on true events")
 * emerge from behaviour instead of being hard-coded.
 */

// Columns enriched per movie that the engine scores against.
const MOVIE_FIELDS =
  "id, title, year, genres, language, themes, tone, comedy_style, realism, setting_tags, notable_elements, is_based_on_true_story";
// Fallback if the enrichment columns haven't been added to the DB yet — the
// engine still works on genre/era/language alone, just with less nuance.
const MOVIE_FIELDS_LEGACY = "id, title, year, genres, language";

// Per-dimension weights in the recommendation score. Higher = more influence.
// Tuned so narrative/tonal fit dominates and setting/era are gentle nudges.
const DIMENSION_WEIGHTS = {
  themes:           1.0,
  tone:             0.9,
  comedy_style:     0.8,  // user-salient: separates slapstick from witty satire
  genres:           0.7,
  notable_elements: 0.7,  // "based-on-true-story", "biopic", "tragic-ending" live here
  realism:          0.6,
  setting_tags:     0.5,
  language:         0.5,
  era:              0.4,
};

// Map a 1-5 rating to a signed weight centered at 3 (neutral).
// 5 -> +2, 4 -> +1, 3 -> 0, 2 -> -1, 1 -> -2.
const signedWeight = (rating) => rating - 3;

/**
 * Build a signed-affinity map for one tag dimension across a user's rated films.
 *
 * Returns: { tag -> { tag, count, avgSigned, score, avgRating } }
 *   avgSigned : mean of (rating-3) over films carrying the tag  (range -2..+2)
 *   score     : avgSigned * log2(count+1) — rewards well-evidenced affinities
 *               so a tag seen in 6 films counts more than one seen once.
 */
function buildAffinity(rated, getTags) {
  const map = {};
  rated.forEach((r) => {
    const tags = getTags(r);
    (Array.isArray(tags) ? tags : tags == null ? [] : [tags]).forEach((tag) => {
      if (tag == null || tag === "") return;
      if (!map[tag]) map[tag] = { tag, count: 0, signedSum: 0, ratingSum: 0 };
      map[tag].count += 1;
      map[tag].signedSum += signedWeight(r.rating);
      map[tag].ratingSum += r.rating;
    });
  });
  Object.values(map).forEach((m) => {
    m.avgSigned = m.signedSum / m.count;
    m.score = m.avgSigned * Math.log2(m.count + 1);
    m.avgRating = m.ratingSum / m.count;
  });
  return map;
}

// Sorted list of liked tags (positive affinity) for display.
function topLiked(affinity, limit = 8) {
  return Object.values(affinity)
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// Sorted list of disliked tags (negative affinity) for display / debugging.
function topDisliked(affinity, limit = 6) {
  return Object.values(affinity)
    .filter((m) => m.score < 0)
    .sort((a, b) => a.score - b.score)
    .slice(0, limit);
}

export async function getTasteProfile(userId) {
  const supabase = createClient();

  let { data: reactions, error } = await supabase
    .from("user_reactions")
    .select(`rating, score, movies(${MOVIE_FIELDS})`)
    .eq("user_id", userId)
    .gt("rating", 0);

  // Enrichment columns may not exist yet — fall back to the legacy column set.
  if (error) {
    ({ data: reactions } = await supabase
      .from("user_reactions")
      .select(`rating, score, movies(${MOVIE_FIELDS_LEGACY})`)
      .eq("user_id", userId)
      .gt("rating", 0));
  }

  if (!reactions?.length) return null;

  const rated = reactions.filter((r) => r.movies);
  const totalWeight = rated.reduce((sum, r) => sum + r.rating, 0);

  // ── Legacy breakdowns (kept for the existing taste-profile UI) ──

  // 1. ERA (by decade)
  const eraMap = {};
  rated.forEach((r) => {
    if (!r.movies.year) return;
    const era = `${Math.floor(r.movies.year / 10) * 10}s`;
    eraMap[era] = (eraMap[era] || 0) + r.rating;
  });
  const eraBreakdown = Object.entries(eraMap)
    .map(([era, weight]) => ({ era, pct: Math.round((weight / totalWeight) * 100), weight }))
    .sort((a, b) => b.weight - a.weight);

  // 2. GENRE
  const genreMap = {};
  rated.forEach((r) => {
    (r.movies.genres || []).forEach((g) => {
      genreMap[g] = (genreMap[g] || 0) + r.rating;
    });
  });
  const genreBreakdown = Object.entries(genreMap)
    .map(([genre, weight]) => ({ genre, pct: Math.round((weight / totalWeight) * 100), weight }))
    .sort((a, b) => b.weight - a.weight);

  // 3. LANGUAGE
  const languageMap = {};
  rated.forEach((r) => {
    const lang = r.movies.language || "Unknown";
    languageMap[lang] = (languageMap[lang] || 0) + r.rating;
  });
  const languageBreakdown = Object.entries(languageMap)
    .map(([lang, weight]) => ({ language: lang, pct: Math.round((weight / totalWeight) * 100), weight }))
    .sort((a, b) => b.weight - a.weight);

  // 4 + 5. DIRECTOR / ACTOR affinity (requires movie_credits)
  const movieIds = rated.map((r) => r.movies.id);
  const ratingById = {};
  rated.forEach((r) => { ratingById[r.movies.id] = r.rating; });

  const buildCreditAffinity = (credits) => {
    const m = {};
    credits?.forEach((c) => {
      const id = c.people?.id;
      const name = c.people?.name;
      if (!id) return;
      const rating = ratingById[c.movie_id] || 0;
      const key = `${id}-${name}`;
      if (!m[key]) m[key] = { id, name, count: 0, totalRating: 0, signedSum: 0 };
      m[key].count += 1;
      m[key].totalRating += rating;
      m[key].signedSum += signedWeight(rating);
    });
    return Object.values(m)
      .filter((d) => d.count >= 2)
      .map((d) => ({
        id: d.id,
        name: d.name,
        count: d.count,
        avgRating: (d.totalRating / d.count).toFixed(1),
        weight: d.totalRating,
        signedScore: d.signedSum * Math.log2(d.count + 1),
      }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 10);
  };

  const [{ data: directorCredits }, { data: actorCredits }] = await Promise.all([
    supabase.from("movie_credits").select("movie_id, role, people(id, name)").in("movie_id", movieIds).eq("role", "Director"),
    supabase.from("movie_credits").select("movie_id, role, people(id, name)").in("movie_id", movieIds).eq("role", "Actor"),
  ]);
  const directorAffinities = buildCreditAffinity(directorCredits);
  const actorAffinities = buildCreditAffinity(actorCredits);

  // ── Rich signed affinities (the new core of the engine) ──

  const affinities = {
    themes:           buildAffinity(rated, (r) => r.movies.themes),
    tone:             buildAffinity(rated, (r) => r.movies.tone),
    comedy_style:     buildAffinity(rated, (r) => r.movies.comedy_style),
    realism:          buildAffinity(rated, (r) => r.movies.realism),
    setting_tags:     buildAffinity(rated, (r) => r.movies.setting_tags),
    notable_elements: buildAffinity(rated, (r) => r.movies.notable_elements),
    genres:           buildAffinity(rated, (r) => r.movies.genres),
    language:         buildAffinity(rated, (r) => (r.movies.language ? [r.movies.language] : [])),
    era:              buildAffinity(rated, (r) => (r.movies.year ? [`${Math.floor(r.movies.year / 10) * 10}s`] : [])),
  };

  // Specific true-story affinity (notable_elements carries the tag; surface it directly).
  const trueStory = affinities.notable_elements["based-on-true-story"];

  // ── Mood/Vibe profile, now derived from real `tone` tags instead of a hard-coded genre map ──
  let vibeBreakdown = topLiked(affinities.tone, 8).map((m) => ({
    vibe: m.tag,
    pct: Math.round((m.avgRating / 5) * 100),
    avgSigned: Number(m.avgSigned.toFixed(2)),
    count: m.count,
  }));

  // Fallback for un-enriched data (no `tone` tags): derive a coarse vibe from genres
  // so the profile UI never goes blank before enrichment has run.
  if (vibeBreakdown.length === 0) {
    const vibeMap = { emotional: 0, thoughtful: 0, masala: 0, artistic: 0, light: 0, intense: 0 };
    rated.forEach((r) => {
      (r.movies.genres || []).forEach((g) => {
        if (["Drama", "Romance"].includes(g)) vibeMap.emotional += r.rating * 0.7;
        if (["Drama", "Thriller"].includes(g)) vibeMap.thoughtful += r.rating * 0.7;
        if (["Action", "Comedy"].includes(g)) vibeMap.masala += r.rating * 0.7;
        if (g === "Drama") vibeMap.artistic += r.rating * 0.5;
        if (g === "Comedy") vibeMap.light += r.rating * 0.7;
        if (["Thriller", "Action"].includes(g)) vibeMap.intense += r.rating * 0.7;
      });
    });
    vibeBreakdown = Object.entries(vibeMap)
      .map(([vibe, weight]) => ({ vibe, pct: Math.round((weight / totalWeight) * 100) }))
      .filter((v) => v.pct > 0)
      .sort((a, b) => b.pct - a.pct);
  }

  return {
    // legacy fields (consumed by taste-profile/page.js)
    eraBreakdown,
    genreBreakdown,
    languageBreakdown,
    directorAffinities,
    actorAffinities,
    vibeBreakdown,
    totalFilmsRated: rated.length,
    totalWeight,

    // new rich affinities
    affinities,
    likes: {
      themes: topLiked(affinities.themes),
      tones: topLiked(affinities.tone),
      comedy: topLiked(affinities.comedy_style),
      settings: topLiked(affinities.setting_tags),
      notable: topLiked(affinities.notable_elements),
    },
    dislikes: {
      themes: topDisliked(affinities.themes),
      tones: topDisliked(affinities.tone),
      comedy: topDisliked(affinities.comedy_style),
    },
    trueStoryAffinity: trueStory
      ? { avgSigned: Number(trueStory.avgSigned.toFixed(2)), count: trueStory.count, avgRating: Number(trueStory.avgRating.toFixed(1)) }
      : null,
  };
}

/**
 * Percentile rankings for a user's top era/genre/language (unchanged surface,
 * kept for the taste-profile page's "Top X%" badges).
 */
export async function getTastePercentiles(userId) {
  const supabase = createClient();
  const profile = await getTasteProfile(userId);
  if (!profile) return null;

  const { data: allReactions } = await supabase
    .from("user_reactions")
    .select("user_id, rating, movies(year, genres, language)")
    .gt("rating", 0);

  if (!allReactions?.length) return profile;

  const userTasteMap = {};
  allReactions.forEach((r) => {
    if (!r.movies) return;
    if (!userTasteMap[r.user_id]) userTasteMap[r.user_id] = { eras: {}, genres: {}, languages: {} };
    const u = userTasteMap[r.user_id];
    if (r.movies.year) {
      const decade = `${Math.floor(r.movies.year / 10) * 10}s`;
      u.eras[decade] = (u.eras[decade] || 0) + r.rating;
    }
    (r.movies.genres || []).forEach((g) => { u.genres[g] = (u.genres[g] || 0) + r.rating; });
    const lang = r.movies.language || "Unknown";
    u.languages[lang] = (u.languages[lang] || 0) + r.rating;
  });

  const getPercentile = (userValue, allValues) => {
    const sorted = allValues.sort((a, b) => a - b);
    const idx = sorted.findIndex((v) => v >= userValue);
    return Math.round((idx / sorted.length) * 100);
  };

  const topEra = profile.eraBreakdown[0];
  const topGenre = profile.genreBreakdown[0];
  const topLanguage = profile.languageBreakdown[0];
  if (!topEra || !topGenre || !topLanguage) return profile;

  const eraValues = Object.values(userTasteMap).map((u) => u.eras[topEra.era] || 0);
  const genreValues = Object.values(userTasteMap).map((u) => u.genres[topGenre.genre] || 0);
  const languageValues = Object.values(userTasteMap).map((u) => u.languages[topLanguage.language] || 0);

  return {
    ...profile,
    percentiles: {
      topEra: { era: topEra.era, percentile: getPercentile(topEra.weight, eraValues) },
      topGenre: { genre: topGenre.genre, percentile: getPercentile(topGenre.weight, genreValues) },
      topLanguage: { language: topLanguage.language, percentile: getPercentile(topLanguage.weight, languageValues) },
    },
  };
}

// Human-readable label for a kebab-case tag ("based-on-true-story" -> "Based On True Story").
function labelFor(tag) {
  return String(tag)
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Recommend unseen films, scored against the user's signed affinities across
 * every tag dimension. Each recommendation carries a `tasteMatchScore`, a
 * normalized `matchPct` (0-100), and `matchReasons` explaining the top drivers.
 */
// Per dimension, return the tags of a candidate film as an array. Shared by the
// recommendation engine and the per-card personalized scorer.
const DIM_TAGS = {
  themes:           (m) => m.themes || [],
  tone:             (m) => m.tone || [],
  comedy_style:     (m) => (m.comedy_style ? [m.comedy_style] : []),
  realism:          (m) => (m.realism ? [m.realism] : []),
  setting_tags:     (m) => m.setting_tags || [],
  notable_elements: (m) => m.notable_elements || [],
  genres:           (m) => m.genres || [],
  language:         (m) => (m.language ? [m.language] : []),
  era:              (m) => (m.year ? [`${Math.floor(m.year / 10) * 10}s`] : []),
};

// A median loved film maps to this score; exceptional matches reach ~100. Keeping
// the baseline below 100 leaves headroom so "for you" scores spread realistically
// instead of pinning everything at 100.
const PERSONAL_BASELINE_TARGET = 85;

// Map a calibrated ratio (candidate score ÷ loved-film baseline) to a 0-100 score.
function personalScoreFromRatio(ratio) {
  return Math.max(0, Math.min(100, Math.round(ratio * PERSONAL_BASELINE_TARGET)));
}

// Score a single movie against a set of affinities. Returns { score, contributions }.
function scoreMovie(movie, affinities) {
  let score = 0;
  const contributions = [];
  for (const dim of Object.keys(DIMENSION_WEIGHTS)) {
    const weight = DIMENSION_WEIGHTS[dim];
    const affinity = affinities[dim] || {};
    for (const tag of DIM_TAGS[dim](movie)) {
      const entry = affinity[tag];
      if (!entry) continue;
      const value = entry.score * weight;
      score += value;
      contributions.push({ dim, tag, value, affinity: entry });
    }
  }
  return { score, contributions };
}

// Median taste-score across the user's loved films (4–5★). Used as the anchor for
// "as well-matched as films you already loved". Returns 0 if there isn't enough
// signal (fewer than 3 loved films) to calibrate confidently.
function computeLovedBaseline(seenMovies, affinities) {
  const lovedRated = seenMovies.filter((r) => r.movies && r.rating >= 4);
  if (lovedRated.length < 3) return 0;
  const lovedScores = lovedRated
    .map((r) => scoreMovie(r.movies, affinities).score)
    .sort((a, b) => a - b);
  const mid = Math.floor(lovedScores.length / 2);
  return lovedScores.length % 2 === 0
    ? (lovedScores[mid - 1] + lovedScores[mid]) / 2
    : lovedScores[mid];
}

/**
 * Personalized 0-100 "for you" score for an arbitrary set of movies, calibrated
 * to the user's own loved-film baseline. Returns a { movieId -> score } map.
 *
 * Returns {} when the user lacks enough taste signal (< 3 loved films) — callers
 * should fall back to the global score in that case.
 */
export async function getPersonalizedScoreMap(userId, movieIds) {
  if (!userId || !movieIds?.length) return {};
  const supabase = createClient();
  const profile = await getTasteProfile(userId);
  if (!profile) return {};
  const { affinities } = profile;

  // Seen films (with enrichment) → loved-film baseline.
  let { data: seenMovies } = await supabase
    .from("user_reactions")
    .select(`rating, movies(${MOVIE_FIELDS})`)
    .eq("user_id", userId)
    .gt("rating", 0);
  seenMovies = seenMovies || [];

  const lovedBaseline = computeLovedBaseline(seenMovies, affinities);
  if (lovedBaseline <= 0) return {}; // not enough signal — caller uses global score

  // Fetch enrichment for the requested movies (the home page only loads light cols).
  let { data: movies } = await supabase
    .from("movies")
    .select(`${MOVIE_FIELDS}, global_score`)
    .in("id", movieIds);
  movies = movies || [];

  const map = {};
  for (const movie of movies) {
    const { score: tasteScore } = scoreMovie(movie, affinities);
    const quality = movie.global_score ? (movie.global_score / 100) * 0.5 : 0;
    map[movie.id] = personalScoreFromRatio((tasteScore + quality) / lovedBaseline);
  }
  return map;
}

/**
 * Recommend unseen films, scored against the user's signed affinities across
 * every tag dimension. Each recommendation carries a `tasteMatchScore`, a
 * normalized `matchPct` (0-100), and `matchReasons` explaining the top drivers.
 */
export async function getTasteBasedRecommendations(userId, { limit = 20 } = {}) {
  const supabase = createClient();
  const profile = await getTasteProfile(userId);
  if (!profile) return [];

  // Fetch seen movies with their full fields so we can calibrate the scoring baseline.
  let { data: seenMovies } = await supabase
    .from("user_reactions")
    .select(`movie_id, rating, movies(${MOVIE_FIELDS})`)
    .eq("user_id", userId)
    .gt("rating", 0);
  seenMovies = seenMovies || [];
  const seenIds = seenMovies.map((m) => m.movie_id);

  const excludeIds = seenIds.length > 0 ? seenIds : ["00000000-0000-0000-0000-000000000000"];
  let { data: allMovies, error } = await supabase
    .from("movies")
    .select(`${MOVIE_FIELDS}, poster_url, global_score`)
    .notIn("id", excludeIds)
    .limit(800);

  if (error) {
    ({ data: allMovies } = await supabase
      .from("movies")
      .select(`${MOVIE_FIELDS_LEGACY}, poster_url, global_score`)
      .notIn("id", excludeIds)
      .limit(800));
  }

  if (!allMovies?.length) return [];

  const { affinities } = profile;

  // ── Personal baseline: matchPct=100 means "as well-matched as films you
  // already loved" — not just the best film in today's candidate pool.
  const lovedBaseline = computeLovedBaseline(seenMovies, affinities);

  const scored = allMovies.map((movie) => {
    const { score: tasteScore, contributions } = scoreMovie(movie, affinities);

    // Quality prior: gentle tiebreaker toward well-regarded films.
    const quality = movie.global_score ? (movie.global_score / 100) * 0.5 : 0;
    const score = tasteScore + quality;

    // Personalized match reasons: include user's avg rating for that tag so the
    // reason reads as "yours" not generic.
    const matchReasons = contributions
      .filter((c) => c.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 3)
      .map((c) => {
        const label = labelFor(c.tag);
        const avgR = c.affinity.avgRating;
        // Show "Tag (★4.2)" only when there's meaningful personal data.
        return c.affinity.count >= 2 && avgR
          ? `${label} (★${Number(avgR).toFixed(1)})`
          : label;
      });

    return { ...movie, tasteMatchScore: score, _contributions: contributions, matchReasons };
  });

  // ── Calibrated normalization against the user's own loved-film baseline.
  // If we have a loved baseline, use it; otherwise fall back to pool max so the
  // page is never empty for new users.
  const positiveScored = scored.filter((s) => s.tasteMatchScore > 0);
  const fallbackMax = positiveScored.reduce((mx, s) => Math.max(mx, s.tasteMatchScore), 0) || 1;
  const anchor = lovedBaseline > 0 ? lovedBaseline : fallbackMax;

  return scored
    .map((s) => ({ ...s, matchPct: personalScoreFromRatio(s.tasteMatchScore / anchor) }))
    .sort((a, b) => {
      if (b.tasteMatchScore !== a.tasteMatchScore) return b.tasteMatchScore - a.tasteMatchScore;
      return (b.global_score || 0) - (a.global_score || 0);
    })
    .slice(0, limit);
}

export { TAXONOMY };
