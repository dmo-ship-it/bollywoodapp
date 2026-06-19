"use client";

import MovieCard from "./MovieCard";

export default function MovieRow({ title, subtitle, movies, userScores = {}, userWatchlist = new Set(), onSeeAll, comingSoon = false }) {
  if (!movies?.length) return null;

  return (
    <section className="mb-8">
      {/* Header */}
      <div className="flex items-end justify-between mb-3">
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--ink)", fontFamily: "var(--font-ui)" }}>{title}</h2>
          {subtitle && <p style={{ fontSize: 12, color: "var(--ink-mute)", marginTop: 2, fontFamily: "var(--font-ui)" }}>{subtitle}</p>}
        </div>
        {onSeeAll && (
          <button
            onClick={onSeeAll}
            style={{ fontSize: 12, color: "var(--ink-mute)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-ui)", flexShrink: 0 }}
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
