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

      // Top film (highest score)
      if (scored.length > 0) {
        setTopFilm(scored[0].movies);
      }

      // Top director — look up actual director credits for rated films
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

      // Stats
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
    <div className="max-w-md mx-auto px-4 py-16 text-center text-stone-400">
      <div className="text-4xl animate-pulse mb-3">🎬</div>
      Preparing your Wrapped…
    </div>
  );

  const displayName = profile?.display_name || user.email?.split("@")[0] || "You";

  return (
    <div className="max-w-md mx-auto px-4 py-8 bg-stone-50 min-h-screen flex flex-col">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-stone-900 mb-1">Your 2026</h1>
        <p className="text-stone-500">Bollywood Wrapped</p>
      </div>

      {/* Wrapped card */}
      <div className="flex-1 bg-gradient-to-br from-orange-600 to-rose-600 rounded-3xl p-8 shadow-xl mb-6 text-white space-y-8">

        {/* Title */}
        <div className="text-center">
          <p className="text-orange-100 text-sm mb-2">🎬 Your 2026 Bollywood Journey</p>
          <h2 className="text-4xl font-black">{displayName}'s Year</h2>
        </div>

        {/* Top film */}
        {topFilm && (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 text-center">
            <p className="text-orange-100 text-xs uppercase tracking-widest mb-2">Your #1 Film</p>
            <p className="text-2xl font-black mb-2">{topFilm.title}</p>
            {topFilm.poster_url && (
              <img src={topFilm.poster_url} alt={topFilm.title} className="w-16 h-24 rounded-lg object-cover mx-auto" />
            )}
          </div>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
            <p className="text-orange-100 text-xs mb-1">Films Watched</p>
            <p className="text-3xl font-black">{stats?.total ?? 0}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
            <p className="text-orange-100 text-xs mb-1">Avg Rating</p>
            <p className="text-3xl font-black">{stats?.avg ?? 0}/100</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
            <p className="text-orange-100 text-xs mb-1">Loved 🔴</p>
            <p className="text-3xl font-black">{stats?.loved ?? 0}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
            <p className="text-orange-100 text-xs mb-1">🔥 Streak</p>
            <p className="text-3xl font-black">{stats?.streak ?? 0}w</p>
          </div>
        </div>

        {/* Top director */}
        {topDirector && (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 text-center">
            <p className="text-orange-100 text-xs uppercase tracking-widest mb-2">Your Favourite Director</p>
            <p className="text-2xl font-black">{topDirector}</p>
          </div>
        )}

        {/* Top vibe */}
        {dna.length > 0 && (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 text-center">
            <p className="text-orange-100 text-xs uppercase tracking-widest mb-2">Your Vibe</p>
            <p className="text-xl font-bold">{dna[0]?.icon} {dna[0]?.label}</p>
            <p className="text-orange-100 text-sm mt-1">{dna[0]?.pct}% of your taste</p>
          </div>
        )}

        {/* CTA */}
        <div className="text-center">
          <p className="text-orange-100 text-xs">Share your Wrapped →</p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="space-y-3">
        <button
          onClick={() => {
            const text = `My 2026 Bollywood Wrapped: ${stats?.total} films watched, ${stats?.loved} loved ❤️, ${stats?.avg}/100 avg rating 🎬 on @bollyapp`;
            navigator.clipboard.writeText(text);
            alert("Copied to clipboard! Paste on social media.");
          }}
          className="w-full bg-orange-600 text-white font-bold py-3 rounded-full hover:bg-orange-500 transition-colors"
        >
          📋 Copy to clipboard
        </button>
        <Link
          href="/profile"
          className="w-full bg-white text-stone-900 font-bold py-3 rounded-full hover:bg-stone-50 transition-colors text-center border border-stone-200"
        >
          Back to profile
        </Link>
      </div>
    </div>
  );
}
