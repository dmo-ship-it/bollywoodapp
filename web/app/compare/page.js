"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "../../lib/supabase-browser";
import Link from "next/link";

const COMPARISON_TYPES = [
  { id: "overall",   label: "Overall",            emoji: "🎬" },
  { id: "emotional", label: "More emotional",     emoji: "😭" },
  { id: "rewatch",   label: "Would rewatch",      emoji: "🔁" },
  { id: "music",     label: "Better music",       emoji: "🎶" },
  { id: "theater",   label: "Theater experience", emoji: "🎭" },
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
      await supabase.from("user_comparisons").insert({
        user_id: user.id, movie_a_id: pair[0].id, movie_b_id: pair[1].id,
        winner_id: winnerId, comparison_type: compType.id,
      });
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
    <div className="min-h-[calc(100vh-56px)] bg-stone-50 flex flex-col items-center justify-center px-4 py-8">

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
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
              compType.id === ct.id
                ? "bg-orange-600 text-white border-orange-600"
                : "bg-white text-stone-500 border-stone-200 hover:border-stone-300"
            }`}
          >
            {ct.emoji} {ct.label}
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
                  className={`flex-1 group flex flex-col items-center gap-3 rounded-2xl p-3 border transition-all duration-300 ${
                    isWinner ? "border-orange-500 bg-orange-50 scale-105 shadow-md"
                    : isLoser ? "border-stone-200 bg-stone-50 opacity-40 scale-95"
                    : "border-stone-200 bg-white hover:border-orange-300 hover:scale-[1.02] active:scale-[0.98] shadow-sm"
                  }`}
                >
                  <div className="w-full aspect-[2/3] rounded-xl overflow-hidden bg-stone-100 relative">
                    {film.poster_url
                      ? <img src={film.poster_url} alt={film.title} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-4xl">🎬</div>
                    }
                    {isWinner && (
                      <div className="absolute inset-0 flex items-center justify-center bg-orange-500/20">
                        <span className="text-5xl animate-bounce">✓</span>
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

      {eloFired && <p className="text-xs text-orange-600 mt-3 font-medium">Rankings updated ↑</p>}

      <div className="flex items-center gap-6 mt-8">
        <button onClick={() => { setStreak(0); loadPair(); }} className="text-stone-400 text-sm hover:text-stone-700 transition-colors">
          Skip
        </button>
        {streak > 0 && (
          <div className="flex items-center gap-1.5 bg-white border border-stone-200 px-4 py-2 rounded-full shadow-sm">
            <span className="text-orange-500">🔥</span>
            <span className="text-sm font-bold text-stone-700">{streak} streak</span>
          </div>
        )}
        <Link href="/profile" className="text-stone-400 text-sm hover:text-stone-700 transition-colors">
          See my rankings →
        </Link>
      </div>

      {!user && total >= 3 && (
        <div className="mt-10 bg-white border border-stone-200 rounded-2xl p-5 text-center max-w-sm shadow-sm">
          <p className="font-bold text-sm text-stone-900 mb-1">Save your rankings</p>
          <p className="text-stone-500 text-xs mb-4">Sign up to build a permanent ranked list</p>
          <Link href="/login" className="inline-block bg-orange-600 text-white font-bold text-sm px-6 py-2.5 rounded-full hover:bg-orange-500 transition-colors">
            Join free →
          </Link>
        </div>
      )}
    </div>
  );
}
