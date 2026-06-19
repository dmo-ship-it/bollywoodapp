"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase-browser";
import Link from "next/link";

export default function WrappedPage() {
  const router   = useRouter();
  const supabase = createClient();

  const [user,         setUser]         = useState(null);
  const [profile,      setProfile]      = useState(null);
  const [stats,        setStats]        = useState(null);
  const [topFilm,      setTopFilm]      = useState(null);
  const [topDirector,  setTopDirector]  = useState(null);
  const [dna,          setDNA]          = useState([]);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUser(user);

      const { data: profile } = await supabase
        .from("user_profiles").select("*").eq("user_id", user.id).single();
      setProfile(profile);

      const { data: reactions } = await supabase
        .from("user_reactions").select("rating, score, movies(id, title, year, poster_url, genres)")
        .eq("user_id", user.id).gt("rating", 0);

      if (!reactions?.length) { setLoading(false); return; }

      const rated = reactions.filter(r => r.rating > 0);
      const scored = reactions.filter(r => r.score != null).sort((a, b) => b.score - a.score);

      if (scored.length > 0) setTopFilm(scored[0].movies);

      const ratedMovieIds = rated.map(r => r.movies?.id).filter(Boolean);
      if (ratedMovieIds.length > 0) {
        const { data: credits } = await supabase
          .from("movie_credits")
          .select("movie_id, people(id, name)")
          .eq("role", "Director")
          .in("movie_id", ratedMovieIds);

        if (credits?.length > 0) {
          const directorMap = {};
          credits.forEach(c => {
            const name = c.people?.name;
            if (name) directorMap[name] = (directorMap[name] ?? 0) + 1;
          });
          const topDir = Object.entries(directorMap).sort((a, b) => b[1] - a[1])[0]?.[0];
          setTopDirector(topDir);
        }
      }

      setStats({
        total: rated.length,
        loved: rated.filter(r => r.rating === 5).length,
        avg: scored.length ? (scored.reduce((s, r) => s + r.score, 0) / scored.length).toFixed(0) : 0,
        streak: profile?.streak_current ?? 0,
      });

      setDNA(profile?.dna ?? []);
      setLoading(false);
    }
    load();
  }, []);

  if (!user) return null;
  if (loading) return (
    <div style={{ maxWidth: 448, margin: "0 auto", padding: "64px 16px", textAlign: "center", color: "var(--ink-mute)" }}>
      <div className="shimmer" style={{ width: 48, height: 48, borderRadius: "28%", margin: "0 auto 16px" }} />
      <p style={{ fontFamily: "var(--font-ui)", fontSize: 14 }}>Preparing your Wrapped…</p>
    </div>
  );

  const displayName = profile?.display_name || user.email?.split("@")[0] || "You";

  const statLabel = { fontSize: 11, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "var(--font-mono)", marginBottom: 4 };
  const statValue = { fontSize: 28, fontWeight: 900, color: "#fff", fontFamily: "var(--font-ui)" };
  const glassCard = { background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)", borderRadius: 16, padding: "20px", textAlign: "center" };
  const glassCardSm = { ...glassCard, borderRadius: 12, padding: 16 };

  return (
    <div className="max-w-md mx-auto px-4 py-8 min-h-screen flex flex-col" style={{ background: "var(--paper)" }}>

      {/* Header */}
      <div className="mb-8">
        <h1 style={{ fontSize: 28, fontWeight: 900, color: "var(--ink)", fontFamily: "var(--font-ui)", marginBottom: 4 }}>Your 2026</h1>
        <p style={{ color: "var(--ink-mute)", fontSize: 14, fontFamily: "var(--font-ui)" }}>Bollywood Wrapped</p>
      </div>

      {/* Wrapped card */}
      <div className="flex-1 rounded-3xl p-8 shadow-xl mb-6 text-white space-y-8" style={{ background: "linear-gradient(135deg, var(--brand) 0%, #C73527 100%)" }}>

        {/* Title */}
        <div className="text-center">
          <p style={{ ...statLabel, color: "rgba(255,255,255,0.6)", marginBottom: 8 }}>Your 2026 Bollywood Journey</p>
          <h2 style={{ fontSize: 32, fontWeight: 900, color: "#fff", fontFamily: "var(--font-serif)" }}>{displayName}'s Year</h2>
        </div>

        {/* Top film */}
        {topFilm && (
          <div style={glassCard}>
            <p style={statLabel}>Your #1 Film</p>
            <p style={{ fontSize: 20, fontWeight: 900, color: "#fff", marginBottom: 8, fontFamily: "var(--font-serif)" }}>{topFilm.title}</p>
            {topFilm.poster_url && (
              <img src={topFilm.poster_url} alt={topFilm.title} className="w-16 h-24 rounded-lg object-cover mx-auto" />
            )}
          </div>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <div style={glassCardSm}>
            <p style={statLabel}>Films Watched</p>
            <p style={statValue}>{stats?.total ?? 0}</p>
          </div>
          <div style={glassCardSm}>
            <p style={statLabel}>Avg Rating</p>
            <p style={statValue}>{stats?.avg ?? 0}/100</p>
          </div>
          <div style={glassCardSm}>
            <p style={statLabel}>Loved</p>
            <p style={statValue}>{stats?.loved ?? 0}</p>
          </div>
          <div style={glassCardSm}>
            <p style={statLabel}>Streak</p>
            <p style={statValue}>{stats?.streak ?? 0}w</p>
          </div>
        </div>

        {/* Top director */}
        {topDirector && (
          <div style={glassCard}>
            <p style={statLabel}>Your Favourite Director</p>
            <p style={{ fontSize: 20, fontWeight: 900, color: "#fff", fontFamily: "var(--font-serif)" }}>{topDirector}</p>
          </div>
        )}

        {/* Top vibe */}
        {dna.length > 0 && (
          <div style={glassCard}>
            <p style={statLabel}>Your Vibe</p>
            <p style={{ fontSize: 18, fontWeight: 700, color: "#fff", fontFamily: "var(--font-serif)" }}>{dna[0]?.label}</p>
            <p style={{ ...statLabel, marginTop: 4 }}>{dna[0]?.pct}% of your taste</p>
          </div>
        )}

        {/* CTA */}
        <div className="text-center">
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", fontFamily: "var(--font-ui)" }}>Share your Wrapped →</p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="space-y-3">
        <button
          onClick={() => {
            const text = `My 2026 Bollywood Wrapped: ${stats?.total} films watched, ${stats?.loved} loved, ${stats?.avg}/100 avg rating on Rasika`;
            navigator.clipboard.writeText(text);
            alert("Copied to clipboard! Paste on social media.");
          }}
          style={{ width: "100%", background: "var(--brand)", color: "#fff", fontWeight: 700, padding: "12px 0", borderRadius: "var(--radius-pill)", border: "none", cursor: "pointer", fontFamily: "var(--font-ui)", fontSize: 15, boxShadow: "var(--shadow-brand)" }}
        >
          Copy to clipboard
        </button>
        <Link
          href="/profile"
          style={{ display: "block", width: "100%", background: "var(--card)", color: "var(--ink)", fontWeight: 700, padding: "12px 0", borderRadius: "var(--radius-pill)", border: "1px solid var(--line)", textAlign: "center", textDecoration: "none", fontFamily: "var(--font-ui)", fontSize: 15 }}
        >
          Back to profile
        </Link>
      </div>
    </div>
  );
}
