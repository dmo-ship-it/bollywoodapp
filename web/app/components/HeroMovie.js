"use client";

import Link from "next/link";

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

      {/* Dark overlay */}
      <div className="absolute inset-0 hero-gradient" />
      <div className="absolute inset-0 bg-black/30" />

      {/* Fade to paper at bottom */}
      <div className="absolute inset-x-0 bottom-0 h-32 hero-fade-bottom" />

      {/* Content */}
      <div className="absolute inset-0 flex items-end">
        <div className="w-full max-w-7xl mx-auto px-4 pb-10">
          <div className="max-w-md">

            {/* Vibe tags */}
            {vibes.length > 0 && (
              <div className="flex gap-2 mb-3">
                {vibes.map((v) => (
                  <span
                    key={v}
                    className="backdrop-blur-sm border border-white/20 text-white/90 px-3 py-1"
                    style={{
                      fontSize: 11,
                      fontFamily: "var(--font-mono)",
                      fontWeight: 500,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      background: "rgba(0,0,0,0.30)",
                      borderRadius: "var(--radius-pill)",
                    }}
                  >
                    {v}
                  </span>
                ))}
              </div>
            )}

            <h1
              className="leading-tight mb-2 drop-shadow-lg"
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "clamp(28px, 5vw, 44px)",
                fontWeight: 400,
                color: "var(--cream-light)",
                letterSpacing: "-0.01em",
              }}
            >
              {movie.title}
            </h1>

            <div className="flex items-center gap-3 mb-4">
              {movie.year && (
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--cream-body)", letterSpacing: "0.08em" }}>
                  {movie.year}
                </span>
              )}
              {movie.tmdb_rating > 0 && (
                <span
                  style={{
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    width: 32, height: 32, borderRadius: "28%",
                    background: scoreColor(Math.round(movie.tmdb_rating * 10)),
                    color: scoreText(Math.round(movie.tmdb_rating * 10)),
                    fontFamily: "var(--font-ui)", fontWeight: 800, fontSize: 12,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {Math.round(movie.tmdb_rating * 10)}
                </span>
              )}
              {movie.genres?.slice(0, 2).map((g) => (
                <span key={g} style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--cream-nav)" }}>{g}</span>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <Link
                href={`/movies/${movie.id}`}
                className="font-bold transition-all hover:-translate-y-px"
                style={{
                  background: "var(--brand)",
                  color: "#fff",
                  fontSize: 14,
                  fontFamily: "var(--font-ui)",
                  padding: "10px 20px",
                  borderRadius: "var(--radius-pill)",
                  boxShadow: "var(--shadow-brand-dark)",
                  display: "inline-flex", alignItems: "center", gap: 6,
                }}
              >
                See reactions
                <span style={{ opacity: 0.8 }}>→</span>
              </Link>
              {movie.ott_platforms?.[0] && (
                <span
                  className="border border-white/20 backdrop-blur-sm"
                  style={{
                    fontSize: 12, color: "var(--cream-ui)",
                    padding: "10px 16px", borderRadius: "var(--radius-pill)",
                    background: "rgba(0,0,0,0.20)",
                    fontFamily: "var(--font-ui)",
                  }}
                >
                  {movie.ott_platforms[0]}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function scoreColor(v) {
  if (v >= 90) return "#E14B33";
  if (v >= 70) return "#E6A437";
  if (v >= 50) return "#C07A4E";
  return "#8C8A93";
}

function scoreText(v) {
  return v >= 70 && v < 90 ? "#261E19" : "#FFFFFF";
}
