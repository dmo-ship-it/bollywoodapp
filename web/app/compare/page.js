"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "../../lib/supabase-browser";
import { awardPoints } from "../../lib/points";
import Link from "next/link";

const COMPARISON_TYPES = [
  { id: "overall",   label: "Overall" },
  { id: "emotional", label: "More emotional" },
  { id: "rewatch",   label: "Would rewatch" },
  { id: "music",     label: "Better music" },
  { id: "theater",   label: "Theater experience" },
];

function applyElo(winnerScore, loserScore) {
  const K = 8;
  const expected = 1 / (1 + Math.pow(10, (loserScore - winnerScore) / 100));
  return [
    Math.round(Math.min(100, Math.max(0, winnerScore + K * (1 - expected))) * 10) / 10,
    Math.round(Math.min(100, Math.max(0, loserScore  + K * (expected - 1))) * 10) / 10,
  ];
}

export default function ComparePage() {
  const supabase = createClient();
  const [user,     setUser]     = useState(null);
  const [pair,     setPair]     = useState(null);
  const [compType, setCompType] = useState(COMPARISON_TYPES[0]);
  const [loading,  setLoading]  = useState(true);
  const [chosen,   setChosen]   = useState(null);
  const [streak,   setStreak]   = useState(0);
  const [total,    setTotal]    = useState(0);
  const [eloFired, setEloFired] = useState(false);

  useEffect(() => { supabase.auth.getUser().then(({ data }) => setUser(data.user)); }, []);

  const loadPair = useCallback(async () => {
    setLoading(true); setChosen(null); setEloFired(false);
    const { data } = await supabase
      .from("movies")
      .select("id, title, year, poster_url, tmdb_rating, genres")
      .order("tmdb_popularity", { ascending: false })
      .limit(100);
    if (data?.length >= 2) {
      const shuffled = [...data].sort(() => Math.random() - 0.5);
      setPair([shuffled[0], shuffled[1]]);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadPair(); }, [loadPair]);

  async function handleChoice(winnerId) {
    if (chosen || !pair) return;
    setChosen(winnerId);
    setStreak((s) => s + 1);
    setTotal((t) => t + 1);
    const loserId = pair.find((m) => m.id !== winnerId)?.id;
    if (user) {
      await Promise.all([
        supabase.from("user_comparisons").insert({
          user_id: user.id, movie_a_id: pair[0].id, movie_b_id: pair[1].id,
          winner_id: winnerId, comparison_type: compType.id,
        }),
        awardPoints(supabase, user.id, "COMPARE_FILMS"),
      ]);
      const { data: rated } = await supabase
        .from("user_reactions").select("movie_id, score")
        .eq("user_id", user.id).in("movie_id", [pair[0].id, pair[1].id]);
      if (rated?.length === 2 && rated.every((r) => r.score != null)) {
        const wR = rated.find((r) => r.movie_id === winnerId);
        const lR = rated.find((r) => r.movie_id === loserId);
        const [nW, nL] = applyElo(wR.score, lR.score);
        await Promise.all([
          supabase.from("user_reactions").update({ score: nW }).eq("user_id", user.id).eq("movie_id", winnerId),
          supabase.from("user_reactions").update({ score: nL }).eq("user_id", user.id).eq("movie_id", loserId),
        ]);
        setEloFired(true);
      }
    }
    setTimeout(loadPair, 900);
  }

  return (
    <div className="min-h-[calc(100vh-56px)] flex flex-col items-center justify-center px-4 py-8" style={{ background: "var(--paper)" }}>

      <div className="text-center mb-6">
        <h1 className="text-2xl font-black text-stone-900 mb-1">Which did you enjoy more?</h1>
        <p className="text-stone-500 text-sm">Your choices refine your personal film rankings</p>
      </div>

      {/* Type selector */}
      <div className="flex gap-2 flex-wrap justify-center mb-8">
        {COMPARISON_TYPES.map((ct) => (
          <button
            key={ct.id}
            onClick={() => setCompType(ct)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "6px 14px", borderRadius: "var(--radius-pill)", fontSize: 12, fontWeight: 500,
              fontFamily: "var(--font-ui)", border: "1.5px solid", cursor: "pointer", transition: "all 0.15s",
              background: compType.id === ct.id ? "var(--brand)" : "var(--card)",
              color: compType.id === ct.id ? "#fff" : "var(--ink-soft)",
              borderColor: compType.id === ct.id ? "var(--brand)" : "var(--line)",
            }}
          >
            {ct.label}
          </button>
        ))}
      </div>

      {/* VS Cards */}
      {loading ? (
        <div className="flex gap-4 w-full max-w-md">
          <div className="flex-1 aspect-[2/3] rounded-2xl shimmer" />
          <div className="flex items-center text-stone-300 font-black text-2xl">VS</div>
          <div className="flex-1 aspect-[2/3] rounded-2xl shimmer" />
        </div>
      ) : pair ? (
        <div className="flex gap-3 w-full max-w-md items-center">
          {pair.map((film, idx) => {
            const isWinner = chosen === film.id;
            const isLoser  = chosen && chosen !== film.id;
            return (
              <>
                <button
                  key={film.id}
                  onClick={() => handleChoice(film.id)}
                  disabled={!!chosen}
                  style={{
                    flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
                    borderRadius: 20, padding: 12, border: "1.5px solid", cursor: "pointer",
                    transition: "all 0.3s",
                    borderColor: isWinner ? "var(--brand)" : "var(--line)",
                    background: isWinner ? "rgba(225,75,51,0.04)" : isLoser ? "var(--sunk)" : "var(--card)",
                    opacity: isLoser ? 0.4 : 1,
                    transform: isWinner ? "scale(1.05)" : isLoser ? "scale(0.95)" : "scale(1)",
                    boxShadow: isWinner ? "var(--shadow-card)" : "none",
                  }}
                >
                  <div className="w-full aspect-[2/3] rounded-xl overflow-hidden bg-stone-100 relative">
                    {film.poster_url
                      ? <img src={film.poster_url} alt={film.title} className="w-full h-full object-cover" />
                      : <div className="w-full h-full" style={{ background: "var(--sunk)" }} />
                    }
                    {isWinner && (
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(225,75,51,0.15)" }}>
                        <span style={{ fontSize: 48, color: "var(--brand)", fontWeight: 900, animation: "bounce 0.5s" }}>✓</span>
                      </div>
                    )}
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-sm text-stone-900 leading-tight">{film.title}</p>
                    <p className="text-stone-400 text-xs mt-0.5">{film.year}</p>
                    {film.tmdb_rating > 0 && (
                      <p className="text-stone-400 text-xs mt-1">{Math.round(film.tmdb_rating * 10)}</p>
                    )}
                  </div>
                </button>
                {idx === 0 && (
                  <div className="shrink-0 text-stone-300 font-black text-lg">VS</div>
                )}
              </>
            );
          })}
        </div>
      ) : null}

      {eloFired && <p style={{ fontSize: 12, color: "var(--brand)", marginTop: 12, fontWeight: 500, fontFamily: "var(--font-ui)" }}>Rankings updated ↑</p>}

      <div className="flex items-center gap-6 mt-8">
        <button onClick={() => { setStreak(0); loadPair(); }} className="text-stone-400 text-sm hover:text-stone-700 transition-colors">
          Skip
        </button>
        {streak > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--card)", border: "1px solid var(--line)", padding: "8px 16px", borderRadius: "var(--radius-pill)", boxShadow: "var(--shadow-card)" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--brand)", fontFamily: "var(--font-mono)" }}>{streak}</span>
            <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink-soft)", fontFamily: "var(--font-ui)" }}>streak</span>
          </div>
        )}
        <Link href="/profile" className="text-stone-400 text-sm hover:text-stone-700 transition-colors">
          See my rankings →
        </Link>
      </div>

      {!user && total >= 3 && (
        <div style={{ marginTop: 40, background: "var(--card)", border: "1px solid var(--line)", borderRadius: 20, padding: 20, textAlign: "center", maxWidth: 360, boxShadow: "var(--shadow-card)" }}>
          <p style={{ fontWeight: 700, fontSize: 14, color: "var(--ink)", marginBottom: 4, fontFamily: "var(--font-ui)" }}>Save your rankings</p>
          <p style={{ color: "var(--ink-mute)", fontSize: 12, marginBottom: 16 }}>Sign up to build a permanent ranked list</p>
          <Link href="/login" style={{ display: "inline-block", background: "var(--brand)", color: "#fff", fontWeight: 700, fontSize: 14, padding: "10px 24px", borderRadius: "var(--radius-pill)", textDecoration: "none", fontFamily: "var(--font-ui)" }}>
            Join free →
          </Link>
        </div>
      )}
    </div>
  );
}
