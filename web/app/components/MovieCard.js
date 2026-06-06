"use client";

import Link from "next/link";
import { useState } from "react";
import WatchlistButton from "./WatchlistButton";
import RatingModal from "./RatingModal";

const VIBE_ICONS = {
  "feel-good":                  "🫶",
  "emotionally devastating":    "😭",
  "edge-of-your-seat thriller": "😰",
  "laugh-out-loud comedy":      "😂",
  "dark":                       "🌑",
  "high energy":                "🔥",
  "high-energy":                "🔥",
  "slow burn":                  "🕯️",
  "bittersweet":                "💛",
  "emotional":                  "💙",
};

export default function MovieCard({ movie }) {
  const [showRating, setShowRating] = useState(false);
  const [rated,      setRated]      = useState(false);

  const allVibes = [...(movie.tone ?? []), ...(movie.mood_tags ?? [])];
  const topVibe  = allVibes.find((t) => VIBE_ICONS[t.toLowerCase()]);
  const vibeIcon = topVibe ? VIBE_ICONS[topVibe.toLowerCase()] : null;

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

            {/* Vibe on hover */}
            {vibeIcon && (
              <div className="absolute top-2 left-2 text-sm leading-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 drop-shadow-md">
                {vibeIcon}
              </div>
            )}

            {/* Rated indicator */}
            {rated && (
              <div className="absolute top-2 left-2 text-sm leading-none drop-shadow-md">
                ✅
              </div>
            )}

            {/* Action buttons — top right on hover */}
            <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col gap-1">
              {/* Rate button */}
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowRating(true); }}
                className="bg-white/90 backdrop-blur-sm rounded-lg p-1.5 shadow-sm hover:bg-orange-50 transition-colors"
                title="Rate this film"
              >
                <span className="text-sm leading-none">＋</span>
              </button>
              {/* Watchlist button */}
              <div className="bg-white/90 backdrop-blur-sm rounded-lg p-1 shadow-sm">
                <WatchlistButton movieId={movie.id} movieTitle={movie.title} />
              </div>
            </div>
          </div>

          {/* Text */}
          <p className="text-[11px] font-semibold text-stone-800 leading-tight line-clamp-1 group-hover:text-orange-600 transition-colors">
            {movie.title}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            {movie.year && <span className="text-[10px] text-stone-400">{movie.year}</span>}
            {movie.tmdb_rating > 0 && (
              <>
                <span className="text-stone-300 text-[10px]">·</span>
                <span className="text-[10px] text-orange-500 font-semibold">★ {movie.tmdb_rating.toFixed(1)}</span>
              </>
            )}
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
          onRated={() => setRated(true)}
        />
      )}
    </>
  );
}
