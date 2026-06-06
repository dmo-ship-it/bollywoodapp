"use client";

import Link from "next/link";

const VIBE_ICONS = {
  "feel-good": "🫶", "emotionally devastating": "😭",
  "edge-of-your-seat thriller": "😰", "laugh-out-loud comedy": "😂",
  "dark": "🌑", "high energy": "🔥", "slow burn": "🕯️", "bittersweet": "💛",
};

export default function HeroMovie({ movie }) {
  if (!movie?.backdrop_url) return null;

  const vibes = [...(movie.tone ?? []), ...(movie.mood_tags ?? [])].slice(0, 2);

  return (
    <div className="relative w-full h-[52vh] min-h-[360px] max-h-[500px] overflow-hidden">
      <img
        src={movie.backdrop_url}
        alt={movie.title}
        className="absolute inset-0 w-full h-full object-cover object-top"
      />

      {/* Dark overlay on the image */}
      <div className="absolute inset-0 hero-gradient" />
      <div className="absolute inset-0 bg-black/30" />

      {/* Fade to warm white at the bottom */}
      <div className="absolute inset-x-0 bottom-0 h-32 hero-fade-bottom" />

      {/* Content */}
      <div className="absolute inset-0 flex items-end">
        <div className="w-full max-w-7xl mx-auto px-4 pb-10">
          <div className="max-w-md">
            {vibes.length > 0 && (
              <div className="flex gap-2 mb-2.5">
                {vibes.map((v) => (
                  <span key={v} className="text-[11px] font-medium bg-black/30 backdrop-blur-sm border border-white/20 text-white/90 px-2.5 py-1 rounded-full">
                    {VIBE_ICONS[v.toLowerCase()] ?? "✨"} {v}
                  </span>
                ))}
              </div>
            )}

            <h1 className="text-3xl md:text-4xl font-black leading-tight tracking-tight text-white mb-2 drop-shadow-lg">
              {movie.title}
            </h1>

            <div className="flex items-center gap-3 text-sm mb-4">
              {movie.year && <span className="text-white/70">{movie.year}</span>}
              {movie.tmdb_rating > 0 && (
                <span className="text-white/70 font-semibold">{Math.round(movie.tmdb_rating * 10)}</span>
              )}
              {movie.genres?.slice(0, 2).map((g) => (
                <span key={g} className="text-white/50 text-xs">{g}</span>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <Link
                href={`/movies/${movie.id}`}
                className="bg-orange-600 text-white text-sm font-bold px-5 py-2.5 rounded-full hover:bg-orange-500 transition-colors shadow-lg"
              >
                See reactions →
              </Link>
              {movie.ott_platforms?.[0] && (
                <span className="text-white/80 text-xs border border-white/20 bg-black/20 backdrop-blur-sm px-4 py-2.5 rounded-full">
                  ▶ {movie.ott_platforms[0]}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
