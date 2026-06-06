"use client";

import MovieCard from "./MovieCard";

export default function MovieRow({ title, subtitle, movies, userScores = {}, userWatchlist = new Set(), onSeeAll, comingSoon = false }) {
  if (!movies?.length) return null;

  return (
    <section className="mb-8">
      {/* Header */}
      <div className="flex items-end justify-between mb-3">
        <div>
          <h2 className="text-lg font-bold text-stone-900">{title}</h2>
          {subtitle && <p className="text-xs text-stone-400 mt-0.5">{subtitle}</p>}
        </div>
        {onSeeAll && (
          <button
            onClick={onSeeAll}
            className="text-xs text-stone-400 hover:text-stone-700 transition-colors shrink-0"
          >
            See all →
          </button>
        )}
      </div>

      {/* Horizontal scroll */}
      <div className="flex gap-3 md:gap-4 overflow-x-auto scroll-hide -mx-4 px-4 pb-1">
        {movies.map((movie) => (
          <div key={movie.id} className="shrink-0 w-28 sm:w-32 md:w-36">
            <MovieCard
              movie={movie}
              userScore={userScores[movie.id]}
              isWatchlisted={userWatchlist.has(movie.id)}
              comingSoon={comingSoon}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
