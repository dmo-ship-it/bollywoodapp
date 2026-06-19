"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase-browser";
import { getTasteProfile, getTasteBasedRecommendations } from "../../lib/taste";
import WatchlistButton from "../components/WatchlistButton";
import Link from "next/link";

export default function TasteDiscoveryPage() {
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [taste, setTaste] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUser(user);

      const profile = await getTasteProfile(user.id);
      setTaste(profile);

      const recs = await getTasteBasedRecommendations(user.id);
      setRecommendations(recs);
      setLoading(false);
    }
    load();
  }, []);

  if (!user) return null;
  if (loading) return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-center" style={{ color: "var(--ink-mute)" }}>
      Finding films for your taste…
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 min-h-screen" style={{ background: "var(--paper)" }}>

      {/* Header */}
      <div className="mb-8">
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 32, fontWeight: 700, color: "var(--ink)", marginBottom: 6 }}>Films For Your Taste</h1>
        <p style={{ color: "var(--ink-soft)", fontSize: 14 }}>
          {recommendations.length > 0
            ? `${recommendations.length} unwatched films perfectly matched to your taste`
            : "No recommendations at this time"}
        </p>
      </div>

      {/* Taste Summary */}
      {taste && recommendations.length > 0 && (
        <div style={{ background: "rgba(225,75,51,0.05)", border: "1px solid rgba(225,75,51,0.12)", borderRadius: 16, padding: 20, marginBottom: 24 }}>
          <p style={{ fontSize: 14, color: "var(--ink-soft)", fontWeight: 500, fontFamily: "var(--font-ui)" }}>
            Based on your love of <strong>{taste.directorAffinities[0]?.name}</strong> films,
            <strong> {taste.eraBreakdown[0]?.era} era</strong>,
            and <strong>{taste.genreBreakdown[0]?.genre}</strong> stories…
          </p>
        </div>
      )}

      {/* Recommendations Grid */}
      {recommendations.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 20px", background: "var(--card)", border: "1px solid var(--line)", borderRadius: 20, color: "var(--ink-mute)" }}>
          <p style={{ fontFamily: "var(--font-serif)", fontSize: 18, color: "var(--ink-soft)", marginBottom: 8 }}>No more recommendations</p>
          <p style={{ fontSize: 14, marginBottom: 16 }}>You've seen all the films matching your taste profile!</p>
          <Link href="/taste-profile" style={{ color: "var(--brand)", fontSize: 14, fontWeight: 600 }}>View taste profile →</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {recommendations.map(film => {
            const score = film.global_score ? Math.round(film.global_score) : null;
            return (
              <div key={film.id} className="group relative">
                <Link href={`/movies/${film.id}`} className="block">
                  {/* Poster */}
                  <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-stone-200 shadow-sm mb-2">
                    {film.poster_url ? (
                      <img
                        src={film.poster_url}
                        alt={film.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full" style={{ background: "var(--sunk)" }} />
                    )}

                    {/* Taste Match Score */}
                    <div style={{ position: "absolute", bottom: 6, right: 6, background: "var(--brand)", color: "#fff", fontSize: 10, fontWeight: 700, padding: "3px 7px", borderRadius: 6, fontFamily: "var(--font-ui)" }}>
                      {film.matchPct} for you
                    </div>

                    {/* Watchlist on hover */}
                    <div className="absolute top-1.5 left-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <div className="bg-white/90 backdrop-blur-sm rounded-lg p-1 shadow-sm">
                        <WatchlistButton movieId={film.id} movieTitle={film.title} />
                      </div>
                    </div>
                  </div>

                  {/* Title + meta */}
                  <p style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-soft)", lineHeight: 1.35, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {film.title}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                    <span style={{ fontSize: 10, color: "var(--ink-mute)" }}>{film.year}</span>
                    {score && (
                      <>
                        <span style={{ color: "var(--line)", fontSize: 10 }}>·</span>
                        <span style={{ fontSize: 10, color: "var(--brand)", fontWeight: 700 }}>{score}</span>
                      </>
                    )}
                  </div>
                  {film.matchReasons?.length > 0 && (
                    <p className="text-[10px] text-stone-400 mt-0.5 line-clamp-1">
                      {film.matchReasons.join(" · ")}
                    </p>
                  )}
                </Link>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer CTA */}
      <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 32, paddingBottom: 32 }}>
        <Link href="/taste-profile" style={{ background: "var(--card)", color: "var(--ink)", fontWeight: 700, padding: "12px 24px", borderRadius: "var(--radius-pill)", border: "1px solid var(--line)", fontSize: 14, textDecoration: "none", fontFamily: "var(--font-ui)" }}>
          View Taste Profile
        </Link>
        <Link href="/" style={{ background: "var(--brand)", color: "#fff", fontWeight: 700, padding: "12px 24px", borderRadius: "var(--radius-pill)", border: "none", fontSize: 14, textDecoration: "none", fontFamily: "var(--font-ui)", boxShadow: "var(--shadow-brand)" }}>
          Discover More Films
        </Link>
      </div>
    </div>
  );
}
