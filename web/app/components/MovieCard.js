"use client";

import Link from "next/link";
import { useState } from "react";
import WatchlistButton from "./WatchlistButton";
import RatingModal from "./RatingModal";
import { displayScore } from "../../lib/score";

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

export default function MovieCard({ movie, userScore }) {
  const [showRating, setShowRating] = useState(false);
  const [scored,     setScored]     = useState(userScore ?? null);

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

            {/* Your Score badge */}
            {scored && (
              <div className="absolute top-2 left-2 bg-white/95 rounded-md px-1.5 py-0.5 shadow-sm">
                <span className="text-[10px] font-bold text-stone-700">{scored}</span>
              </div>
            )}

            {/* Action buttons — top right on hover */}
            <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col gap-1">
              {/* Rate button */}
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowRating(true); }}
                className="bg-white/95 rounded-md p-1 shadow-sm hover:bg-stone-50 transition-colors"
                title="Rate this film"
              >
                <span className="text-xs leading-none font-medium text-stone-600">＋</span>
              </button>
              {/* Watchlist button */}
              <div className="bg-white/95 rounded-md p-0.5 shadow-sm">
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
            {(() => {
              const s = scored ?? displayScore(movie);
              return s ? (
                <>
                  <span className="text-stone-300 text-[10px]">·</span>
                  <span className={`text-[10px] font-semibold ${scored ? "text-stone-700" : "text-stone-400"}`}>{s}</span>
                </>
              ) : null;
            })()}
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
