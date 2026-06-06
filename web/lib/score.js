/**
 * Returns a 0-100 display score for a movie.
 * Uses real user average if available, otherwise falls back to TMDB × 10.
 */
export function displayScore(movie) {
  if (movie?.global_score) return Math.round(movie.global_score);
  if (movie?.tmdb_rating > 0) return Math.round(movie.tmdb_rating * 10);
  return null;
}
