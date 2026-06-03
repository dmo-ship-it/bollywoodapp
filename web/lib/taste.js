import { createClient } from "./supabase-browser";

/**
 * Calculate taste profile across 6 dimensions
 * All calculations are weighted by rating (1-5 scale)
 */

export async function getTasteProfile(userId) {
  const supabase = createClient();

  // Fetch all user ratings with movie and credit details
  const { data: reactions } = await supabase
    .from("user_reactions")
    .select("rating, score, movies(id, title, year, genres, language)")
    .eq("user_id", userId)
    .gt("rating", 0);

  if (!reactions?.length) return null;

  const rated = reactions.filter(r => r.movies);
  const totalWeight = rated.reduce((sum, r) => sum + r.rating, 0);

  // 1. ERA BREAKDOWN (by decade)
  const eraMap = {};
  rated.forEach(r => {
    const decade = Math.floor(r.movies.year / 10) * 10;
    const era = `${decade}s`;
    if (!eraMap[era]) eraMap[era] = 0;
    eraMap[era] += r.rating;
  });
  const eraBreakdown = Object.entries(eraMap)
    .map(([era, weight]) => ({ era, pct: Math.round((weight / totalWeight) * 100), weight }))
    .sort((a, b) => b.weight - a.weight);

  // 2. GENRE BREAKDOWN
  const genreMap = {};
  rated.forEach(r => {
    (r.movies.genres || []).forEach(g => {
      if (!genreMap[g]) genreMap[g] = 0;
      genreMap[g] += r.rating;
    });
  });
  const genreBreakdown = Object.entries(genreMap)
    .map(([genre, weight]) => ({ genre, pct: Math.round((weight / totalWeight) * 100), weight }))
    .sort((a, b) => b.weight - a.weight);

  // 3. LANGUAGE BREAKDOWN
  const languageMap = {};
  rated.forEach(r => {
    const lang = r.movies.language || "Unknown";
    if (!languageMap[lang]) languageMap[lang] = 0;
    languageMap[lang] += r.rating;
  });
  const languageBreakdown = Object.entries(languageMap)
    .map(([lang, weight]) => ({ language: lang, pct: Math.round((weight / totalWeight) * 100), weight }))
    .sort((a, b) => b.weight - a.weight);

  // 4. DIRECTOR AFFINITY (requires movie_credits)
  const movieIds = rated.map(r => r.movies.id);
  const { data: credits } = await supabase
    .from("movie_credits")
    .select("movie_id, role, people(id, name)")
    .in("movie_id", movieIds)
    .eq("role", "Director");

  const directorMap = {};
  credits?.forEach(c => {
    const directorId = c.people?.id;
    const directorName = c.people?.name;
    const movieId = c.movie_id;
    const movieRating = rated.find(r => r.movies.id === movieId)?.rating || 0;

    const key = `${directorId}-${directorName}`;
    if (!directorMap[key]) directorMap[key] = { id: directorId, name: directorName, count: 0, totalRating: 0 };
    directorMap[key].count += 1;
    directorMap[key].totalRating += movieRating;
  });
  const directorAffinities = Object.values(directorMap)
    .filter(d => d.count >= 2) // Only directors with 2+ films
    .map(d => ({
      id: d.id,
      name: d.name,
      count: d.count,
      avgRating: (d.totalRating / d.count).toFixed(1),
      weight: d.totalRating
    }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 10); // Top 10

  // 5. ACTOR AFFINITY
  const { data: actorCredits } = await supabase
    .from("movie_credits")
    .select("movie_id, role, people(id, name)")
    .in("movie_id", movieIds)
    .eq("role", "Actor");

  const actorMap = {};
  actorCredits?.forEach(c => {
    const actorId = c.people?.id;
    const actorName = c.people?.name;
    const movieId = c.movie_id;
    const movieRating = rated.find(r => r.movies.id === movieId)?.rating || 0;

    const key = `${actorId}-${actorName}`;
    if (!actorMap[key]) actorMap[key] = { id: actorId, name: actorName, count: 0, totalRating: 0 };
    actorMap[key].count += 1;
    actorMap[key].totalRating += movieRating;
  });
  const actorAffinities = Object.values(actorMap)
    .filter(a => a.count >= 2)
    .map(a => ({
      id: a.id,
      name: a.name,
      count: a.count,
      avgRating: (a.totalRating / a.count).toFixed(1),
      weight: a.totalRating
    }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 10);

  // 6. MOOD/VIBE PROFILE (from genres, approximated)
  const vibeMap = {
    "emotional": 0,      // Drama, Romance
    "thoughtful": 0,     // Drama, Thriller
    "masala": 0,         // Action, Comedy
    "artistic": 0,       // Drama (art house)
    "light": 0,          // Comedy
    "intense": 0,        // Thriller, Action
  };

  rated.forEach(r => {
    const genres = r.movies.genres || [];
    genres.forEach(g => {
      if (["Drama", "Romance"].includes(g)) vibeMap.emotional += r.rating * 0.7;
      if (["Drama", "Thriller"].includes(g)) vibeMap.thoughtful += r.rating * 0.7;
      if (["Action", "Comedy"].includes(g)) vibeMap.masala += r.rating * 0.7;
      if (g === "Drama") vibeMap.artistic += r.rating * 0.5;
      if (g === "Comedy") vibeMap.light += r.rating * 0.7;
      if (["Thriller", "Action"].includes(g)) vibeMap.intense += r.rating * 0.7;
    });
  });

  const vibeBreakdown = Object.entries(vibeMap)
    .map(([vibe, weight]) => ({ vibe, pct: Math.round((weight / totalWeight) * 100) }))
    .filter(v => v.pct > 0)
    .sort((a, b) => b.pct - a.pct);

  return {
    eraBreakdown,
    genreBreakdown,
    languageBreakdown,
    directorAffinities,
    actorAffinities,
    vibeBreakdown,
    totalFilmsRated: rated.length,
    totalWeight,
  };
}

/**
 * Calculate percentile rankings for a user's taste
 */
export async function getTastePercentiles(userId) {
  const supabase = createClient();
  const profile = await getTasteProfile(userId);
  if (!profile) return null;

  // Fetch all users' taste profiles (cached in production, but for now we'll compute)
  // For MVP, we'll estimate percentiles based on smaller sample
  const { data: allReactions } = await supabase
    .from("user_reactions")
    .select("user_id, rating, movies(year, genres, language)")
    .gt("rating", 0);

  if (!allReactions?.length) return profile;

  // Calculate stats for each dimension across all users
  const userTasteMap = {};
  allReactions.forEach(r => {
    if (!userTasteMap[r.user_id]) {
      userTasteMap[r.user_id] = { eras: {}, genres: {}, languages: {}, totalWeight: 0 };
    }
    const user = userTasteMap[r.user_id];
    user.totalWeight += r.rating;

    const decade = `${Math.floor(r.movies.year / 10) * 10}s`;
    user.eras[decade] = (user.eras[decade] || 0) + r.rating;

    (r.movies.genres || []).forEach(g => {
      user.genres[g] = (user.genres[g] || 0) + r.rating;
    });

    const lang = r.movies.language || "Unknown";
    user.languages[lang] = (user.languages[lang] || 0) + r.rating;
  });

  // Calculate percentiles for era, genre, language
  const getPercentile = (userValue, allValues) => {
    const sorted = allValues.sort((a, b) => a - b);
    const idx = sorted.findIndex(v => v >= userValue);
    return Math.round((idx / sorted.length) * 100);
  };

  const topEra = profile.eraBreakdown[0];
  const topGenre = profile.genreBreakdown[0];
  const topLanguage = profile.languageBreakdown[0];

  const eraValues = Object.values(userTasteMap).map(u => u.eras[topEra.era] || 0);
  const genreValues = Object.values(userTasteMap).map(u => u.genres[topGenre.genre] || 0);
  const languageValues = Object.values(userTasteMap).map(u => u.languages[topLanguage.language] || 0);

  return {
    ...profile,
    percentiles: {
      topEra: { era: topEra.era, percentile: getPercentile(topEra.weight, eraValues) },
      topGenre: { genre: topGenre.genre, percentile: getPercentile(topGenre.weight, genreValues) },
      topLanguage: { language: topLanguage.language, percentile: getPercentile(topLanguage.weight, languageValues) },
    },
  };
}

/**
 * Find films matching user's taste profile (unseen films)
 */
export async function getTasteBasedRecommendations(userId) {
  const supabase = createClient();
  const profile = await getTasteProfile(userId);
  if (!profile) return [];

  // Fetch all unseen movies
  const { data: seenMovies } = await supabase
    .from("user_reactions")
    .select("movie_id")
    .eq("user_id", userId)
    .gt("rating", 0);

  const seenIds = seenMovies?.map(m => m.movie_id) || [];

  const { data: allMovies } = await supabase
    .from("movies")
    .select("id, title, year, genres, language, poster_url, global_score")
    .notIn("id", seenIds.length > 0 ? seenIds : ["00000000-0000-0000-0000-000000000000"])
    .limit(500);

  if (!allMovies?.length) return [];

  // Score each movie against user's taste profile
  const scored = allMovies.map(movie => {
    let score = 0;

    // Era match (highest weight)
    const movieDecade = `${Math.floor(movie.year / 10) * 10}s`;
    const eraMatch = profile.eraBreakdown.find(e => e.era === movieDecade);
    if (eraMatch) score += eraMatch.pct * 2;

    // Genre match
    (movie.genres || []).forEach(g => {
      const genreMatch = profile.genreBreakdown.find(gen => gen.genre === g);
      if (genreMatch) score += genreMatch.pct;
    });

    // Language match
    const langMatch = profile.languageBreakdown.find(l => l.language === movie.language);
    if (langMatch) score += langMatch.pct * 1.5;

    return { ...movie, tasteMatchScore: score };
  });

  // Sort by taste match + global score (as tiebreaker)
  return scored
    .sort((a, b) => {
      if (b.tasteMatchScore !== a.tasteMatchScore) {
        return b.tasteMatchScore - a.tasteMatchScore;
      }
      return (b.global_score || 0) - (a.global_score || 0);
    })
    .slice(0, 20);
}
