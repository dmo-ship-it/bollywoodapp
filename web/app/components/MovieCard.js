"use client";

import Link from "next/link";
import { useState } from "react";
import WatchlistButton from "./WatchlistButton";
import RatingModal from "./RatingModal";
import ScoreCircle from "./ScoreCircle";
import { displayScore } from "../../lib/score";


function formatReleaseDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function MovieCard({ movie, userScore, isWatchlisted = false, comingSoon = false }) {
  const [showRating, setShowRating] = useState(false);
  const [scored,     setScored]     = useState(userScore ?? null);


  return (
    <>
      <div className="group relative block">
        <Link href={`/movies/${movie.id}`} className="block">
          {/* Poster */}
          <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-stone-200 mb-2 shadow-sm">
            {movie.poster_url ? (
              <img
                src={movie.poster_url}
                alt={movie.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-stone-400 text-3xl">🎬</div>
            )}



            {/* Action buttons — top right on hover */}
            <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col gap-1">
              {/* Trailer button — for coming soon */}
              {comingSoon && movie.trailer_url && (
                <a
                  href={movie.trailer_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="bg-white/95 rounded-md p-1 shadow-sm hover:bg-stone-50 transition-colors"
                  title="Watch trailer"
                >
                  <span className="text-xs leading-none">▶</span>
                </a>
              )}
              {/* Rate button — hidden for unreleased films */}
              {!comingSoon && (
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowRating(true); }}
                  className="bg-white/95 rounded-md p-1 shadow-sm hover:bg-stone-50 transition-colors"
                  title="Rate this film"
                >
                  <span className="text-xs leading-none font-medium text-stone-600">＋</span>
                </button>
              )}
              {/* Watchlist button */}
              <div className="bg-white/95 rounded-md p-0.5 shadow-sm">
                <WatchlistButton movieId={movie.id} movieTitle={movie.title} initialSaved={isWatchlisted} />
              </div>
            </div>
          </div>

          {/* Text + Score */}
          <div className="flex items-start justify-between gap-1 mt-1">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-stone-800 leading-tight line-clamp-1 group-hover:text-orange-600 transition-colors">
                {movie.title}
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                <p className="text-[10px] text-stone-400">
                  {comingSoon ? formatReleaseDate(movie.release_date) : movie.year}
                </p>
                {comingSoon && movie.trailer_url && (
                  <span className="inline-block text-[10px] text-orange-500 font-medium">🎬</span>
                )}
              </div>
            </div>
            {!comingSoon && <ScoreCircle score={scored ?? displayScore(movie)} size="sm" />}
          </div>
        </Link>
      </div>

      {/* Rating modal */}
      {showRating && (
        <RatingModal
          movieId={movie.id}
          movieTitle={movie.title}
          posterUrl={movie.poster_url}
          onClose={() => setShowRating(false)}
          onRated={(rating) => {
            // Provisional score based on rating until exact score is computed
            const scores = { 5: 90, 4: 70, 3: 50, 2: 30, 1: 10 };
            setScored(scores[rating] ?? 50);
          }}
        />
      )}
    </>
  );
}
