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
  const [justRated,  setJustRated]  = useState(null);

  return (
    <>
      <div className="group relative block">
        <Link href={`/movies/${movie.id}`} className="block">
          {/* Poster */}
          <div
            className="relative aspect-[2/3] overflow-hidden mb-2"
            style={{
              borderRadius: "var(--radius)",
              background: "var(--sunk)",
              boxShadow: "var(--shadow-card)",
              transition: "box-shadow 0.25s ease, transform 0.25s ease",
            }}
          >
            {movie.poster_url ? (
              <img
                src={movie.poster_url}
                alt={movie.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center" style={{ color: "var(--ink-mute)", fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.1em" }}>
                NO POSTER
              </div>
            )}

            {/* Action buttons — top right on hover */}
            <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col gap-1">
              {comingSoon && movie.trailer_url && (
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.open(movie.trailer_url, "_blank", "noopener,noreferrer"); }}
                  className="p-1 transition-colors" style={{ background: "rgba(255,255,255,0.95)", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}
                  style={{ borderRadius: 6 }}
                  title="Watch trailer"
                >
                  <span className="text-xs leading-none" style={{ color: "var(--ink)" }}>▶</span>
                </button>
              )}
              {!comingSoon && (
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowRating(true); }}
                  className="p-1 transition-colors" style={{ background: "rgba(255,255,255,0.95)", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}
                  style={{ borderRadius: 6 }}
                  title="Rate this film"
                >
                  <span className="text-xs leading-none font-semibold" style={{ color: "var(--ink-soft)" }}>+</span>
                </button>
              )}
              <div className="p-0.5" style={{ background: "rgba(255,255,255,0.95)", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", borderRadius: 6 }}>
                <WatchlistButton movieId={movie.id} movieTitle={movie.title} initialSaved={isWatchlisted} />
              </div>
            </div>
          </div>

          {/* Title + Score */}
          <div className="flex items-start justify-between gap-1 mt-1">
            <div className="min-w-0 flex-1">
              <p
                className="text-[11px] font-semibold leading-tight line-clamp-1 transition-colors"
                style={{ color: "var(--ink)", fontFamily: "var(--font-ui)" }}
              >
                <span className="group-hover:text-[var(--brand)] transition-colors">{movie.title}</span>
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                <p className="text-[10px]" style={{ color: "var(--ink-mute)", fontFamily: "var(--font-mono)" }}>
                  {comingSoon ? formatReleaseDate(movie.release_date) : movie.year}
                </p>
              </div>
            </div>
            {!comingSoon && <ScoreCircle score={justRated ?? (userScore || displayScore(movie))} size="sm" />}
          </div>
        </Link>
      </div>

      {showRating && (
        <RatingModal
          movieId={movie.id}
          movieTitle={movie.title}
          posterUrl={movie.poster_url}
          onClose={() => setShowRating(false)}
          onRated={(rating) => {
            const scores = { 5: 90, 4: 70, 3: 50, 2: 30, 1: 10 };
            setJustRated(scores[rating] ?? 50);
          }}
        />
      )}
    </>
  );
}
