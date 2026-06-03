"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase-browser";
import Link from "next/link";

const DECADES = [
  { label: "All time", min: 0,    max: 9999 },
  { label: "2020s",    min: 2020, max: 2029 },
  { label: "2010s",    min: 2010, max: 2019 },
  { label: "2000s",    min: 2000, max: 2009 },
  { label: "90s",      min: 1990, max: 1999 },
  { label: "Classics", min: 0,    max: 1989 },
];

const LANGUAGES = ["All", "Hindi", "Tamil", "Telugu", "Malayalam", "Kannada"];

export default function RankingsPage() {
  const supabase = createClient();

  const [user,      setUser]      = useState(null);
  const [mode,      setMode]      = useState("personal"); // "personal" | "global"
  const [movies,    setMovies]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [decade,    setDecade]    = useState(DECADES[0]);
  const [language,  setLanguage]  = useState("All");
  const [totalRatings, setTotalRatings] = useState(0);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (!data.user) setMode("global");
    });
  }, []);

  useEffect(() => {
    if (user === null && mode === "personal") return; // wait for auth check
    fetchRankings();
  }, [user, mode, decade, language]);

  async function fetchRankings() {
    setLoading(true);

    if (mode === "personal" && user) {
      let q = supabase
        .from("user_reactions")
        .select("score, rating, movies(id, title, year, poster_url, genres, language, global_score)")
        .eq("user_id", user.id)
        .gt("rating", 0)
        .not("score", "is", null)
        .order("score", { ascending: false })
        .limit(100);

      const { data } = await q;
      let results = (data ?? []).map((r) => ({ ...r.movies, userScore: r.score, userRating: r.rating })).filter(Boolean);

      if (decade.min > 0)     results = results.filter((m) => m.year >= decade.min && m.year <= decade.max);
      if (decade.max === 1989) results = results.filter((m) => m.year <= 1989);
      if (language !== "All") results = results.filter((m) => m.language === language || m.genres?.includes(language));

      setMovies(results);
    } else {
      let q = supabase
        .from("movies")
        .select("id, title, year, poster_url, genres, global_score, tmdb_rating, language")
        .not("global_score", "is", null)
        .order("global_score", { ascending: false })
        .limit(100);

      if (decade.min > 0)     q = q.gte("year", decade.min).lte("year", decade.max);
      if (decade.max === 1989) q = q.lte("year", 1989);
      if (language !== "All") q = q.contains("genres", [language]);

      const [{ data }, { count }] = await Promise.all([
        q,
        supabase.from("user_reactions").select("*", { count: "exact", head: true }).not("score", "is", null),
      ]);

      setMovies(data ?? []);
      setTotalRatings(count ?? 0);
    }

    setLoading(false);
  }

  const isPersonal = mode === "personal" && !!user;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 bg-stone-50 min-h-screen">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-stone-900 mb-1">Rankings</h1>
        <p className="text-stone-500 text-sm">
          {isPersonal ? "Your films ranked by personal score" : `Community's top films · ${totalRatings > 0 ? `${totalRatings.toLocaleString()} ratings` : ""}`}
        </p>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-1 bg-stone-100 rounded-xl p-1 mb-5 w-fit">
        {user && (
          <button
            onClick={() => setMode("personal")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === "personal" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-700"}`}
          >
            My Rankings
          </button>
        )}
        <button
          onClick={() => setMode("global")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === "global" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-700"}`}
        >
          🌍 Global
        </button>
      </div>

      {/* Filters */}
      <div className="space-y-3 mb-6">
        {/* Decade */}
        <div className="flex gap-1.5 overflow-x-auto scroll-hide -mx-4 px-4 pb-1">
          {DECADES.map((d) => (
            <button
              key={d.label}
              onClick={() => setDecade(d)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                decade.label === d.label
                  ? "bg-stone-900 text-white border-stone-900"
                  : "bg-white text-stone-500 border-stone-200 hover:border-stone-300"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>

        {/* Language */}
        <div className="flex gap-1.5 overflow-x-auto scroll-hide -mx-4 px-4 pb-1">
          {LANGUAGES.map((l) => (
            <button
              key={l}
              onClick={() => setLanguage(l)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                language === l
                  ? "bg-orange-600 text-white border-orange-600"
                  : "bg-white text-stone-500 border-stone-200 hover:border-stone-300"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => <div key={i} className="h-16 rounded-2xl shimmer" />)}
        </div>
      ) : movies.length === 0 ? (
        <div className="text-center py-20 text-stone-400 bg-white border border-stone-200 rounded-2xl">
          <p className="text-4xl mb-3">{isPersonal ? "🏆" : "🌍"}</p>
          <p className="font-medium text-stone-600 mb-1">
            {isPersonal ? "No personal rankings yet" : "No global rankings yet"}
          </p>
          <p className="text-sm mb-4">
            {isPersonal ? "Rate films to build your list" : "Be the first to rate films"}
          </p>
          <Link href={isPersonal ? "/onboarding" : "/onboarding"} className="text-orange-600 text-sm hover:underline">
            Start rating →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {movies.map((movie, i) => {
            const score      = isPersonal ? movie.userScore : movie.global_score;
            const roundScore = score ? Math.round(score) : null;
            const rank       = i + 1;
            const medal      = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;
            const scoreColor = !roundScore ? "text-stone-400"
              : roundScore >= 80 ? "text-rose-600"
              : roundScore >= 60 ? "text-orange-600"
              : "text-stone-500";
            const barColor = !roundScore ? "bg-stone-200"
              : roundScore >= 80 ? "bg-rose-500"
              : roundScore >= 60 ? "bg-orange-500"
              : "bg-stone-300";

            return (
              <Link
                key={movie.id}
                href={`/movies/${movie.id}`}
                className="flex items-center gap-3 bg-white border border-stone-200 rounded-2xl p-3 hover:border-stone-300 hover:shadow-sm transition-all group"
              >
                {/* Rank */}
                <div className="w-8 text-center shrink-0">
                  {medal
                    ? <span className="text-xl">{medal}</span>
                    : <span className="text-stone-400 text-sm font-bold">#{rank}</span>
                  }
                </div>

                {/* Poster */}
                <div className="w-10 h-14 rounded-lg overflow-hidden bg-stone-100 shrink-0">
                  {movie.poster_url
                    ? <img src={movie.poster_url} alt={movie.title} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center">🎬</div>
                  }
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-stone-900 group-hover:text-orange-600 transition-colors truncate">
                    {movie.title}
                  </p>
                  <p className="text-xs text-stone-400 mt-0.5">
                    {movie.year}
                    {movie.genres?.length > 0 && ` · ${movie.genres.slice(0, 2).join(", ")}`}
                  </p>
                </div>

                {/* Score */}
                {roundScore && (
                  <div className="shrink-0 flex flex-col items-end gap-1.5">
                    <p className={`text-lg font-black ${scoreColor}`}>{roundScore}</p>
                    <div className="w-14 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${barColor}`} style={{ width: `${roundScore}%` }} />
                    </div>
                  </div>
                )}
              </Link>
            );
          })}

          {/* CTA at bottom */}
          {isPersonal && movies.length > 0 && (
            <div className="pt-4 text-center">
              <Link href="/compare" className="inline-block bg-orange-600 text-white font-bold text-sm px-6 py-2.5 rounded-full hover:bg-orange-500 transition-colors">
                Compare films to refine rankings →
              </Link>
            </div>
          )}
          {!isPersonal && !user && (
            <div className="pt-4 bg-orange-50 border border-orange-100 rounded-2xl p-5 text-center">
              <p className="font-semibold text-stone-900 text-sm mb-1">See your personal ranking</p>
              <p className="text-stone-500 text-xs mb-3">Sign in to rank films based on your own taste</p>
              <Link href="/login" className="inline-block bg-orange-600 text-white font-bold text-sm px-5 py-2 rounded-full hover:bg-orange-500 transition-colors">
                Sign in →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
