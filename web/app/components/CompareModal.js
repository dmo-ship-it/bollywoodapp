"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase-browser";

const BUCKET_RANGES  = { 5: [80,100], 4: [60,79], 3: [40,59], 2: [20,39], 1: [0,19] };
const INITIAL_SCORES = { 5: 90, 4: 70, 3: 50, 2: 30, 1: 10 };
const BUCKET_LABELS  = { 5: "Loved", 4: "Liked", 3: "Okay", 2: "Didn't like", 1: "Hated" };

function insertionScore(sortedMovies, pos, rating) {
  const [min, max] = BUCKET_RANGES[rating];
  if (sortedMovies.length === 0) return INITIAL_SCORES[rating];
  if (pos === 0)                  return Math.round((sortedMovies[0].score + max) / 2);
  if (pos >= sortedMovies.length) return Math.round((sortedMovies[sortedMovies.length - 1].score + min) / 2);
  return Math.round((sortedMovies[pos - 1].score + sortedMovies[pos].score) / 2);
}

// ── Shareable result card ─────────────────────────────────────────────────
function ResultCard({ movieTitle, posterUrl, movieId, myScore, myRank, avgScore, onClose }) {
  const [sharing, setSharing] = useState(false);

  async function handleShare() {
    setSharing(true);
    const text = `I rated ${movieTitle} ${myScore}/100 on Bolly 🎬`;
    const url  = `${window.location.origin}/movies/${movieId}`;

    try {
      if (navigator.share) {
        await navigator.share({ title: movieTitle, text, url });
      } else {
        // Fallback — copy to clipboard
        await navigator.clipboard.writeText(`${text}\n${url}`);
        alert("Copied to clipboard!");
      }
    } catch (e) {
      // User dismissed share sheet — that's fine
    }
    setSharing(false);
  }

  return (
    <div className="relative overflow-hidden rounded-2xl md:rounded-3xl">

      {/* Poster background */}
      <div className="relative w-full aspect-[3/4]">
        {posterUrl ? (
          <img src={posterUrl} alt={movieTitle} className="w-full h-full object-cover object-top" />
        ) : (
          <div className="w-full h-full bg-stone-800 flex items-center justify-center text-6xl">🎬</div>
        )}

        {/* Gradient overlay — bottom heavy */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/10" />

        {/* Content on top of poster */}
        <div className="absolute inset-0 flex flex-col justify-between p-5">

          {/* Logo top-left */}
          <div className="flex items-center gap-1">
            <span className="text-white font-black text-lg tracking-tighter">bolly</span>
            <span className="text-orange-400 text-lg leading-none">•</span>
          </div>

          {/* Bottom content */}
          <div>
            {/* Movie title */}
            <h2 className="text-white font-black text-2xl leading-tight mb-4">{movieTitle}</h2>

            {/* Score circles */}
            <div className="flex items-start gap-5 mb-6">
              {/* My Score */}
              <div className="flex flex-col items-center gap-1.5">
                <div className="w-12 h-12 rounded-full bg-white/15 border-2 border-orange-400 flex items-center justify-center backdrop-blur-sm">
                  <span className="text-orange-400 font-black text-sm">{myScore}</span>
                </div>
                <span className="text-white/70 text-[10px] text-center">My Score</span>
              </div>

              {/* My Rank */}
              {myRank !== null && (
                <div className="flex flex-col items-center gap-1.5">
                  <div className="w-12 h-12 rounded-full bg-white/15 border-2 border-orange-400 flex items-center justify-center backdrop-blur-sm">
                    <span className="text-orange-400 font-black text-sm">#{myRank}</span>
                  </div>
                  <span className="text-white/70 text-[10px] text-center">My Rank</span>
                </div>
              )}

              {/* Average Score */}
              {avgScore && (
                <div className="flex flex-col items-center gap-1.5">
                  <div className="w-12 h-12 rounded-full bg-white/15 border-2 border-white/40 flex items-center justify-center backdrop-blur-sm">
                    <span className="text-white font-black text-sm">{avgScore}</span>
                  </div>
                  <span className="text-white/70 text-[10px] text-center">Average</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleShare}
                disabled={sharing}
                className="flex-1 flex items-center justify-center gap-2 bg-white text-stone-900 font-bold text-sm py-3 rounded-xl hover:bg-stone-100 transition-colors disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Share
              </button>
              <button
                onClick={onClose}
                className="flex-1 bg-white/20 text-white font-bold text-sm py-3 rounded-xl hover:bg-white/30 transition-colors backdrop-blur-sm"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main modal ─────────────────────────────────────────────────────────────
export default function CompareModal({ movieId, movieTitle, posterUrl, rating, userId, onClose }) {
  const supabase = createClient();

  const [phase,       setPhase]       = useState("loading");
  const [sorted,      setSorted]      = useState([]);
  const [low,         setLow]         = useState(0);
  const [high,        setHigh]        = useState(0);
  const [compsDone,   setCompsDone]   = useState(0);
  const [finalScore,  setFinalScore]  = useState(null);
  const [overallRank, setOverallRank] = useState(null);
  const [avgScore,    setAvgScore]    = useState(null);

  useEffect(() => {
    async function load() {
      const [reactionsRes, avgRes] = await Promise.all([
        supabase
          .from("user_reactions")
          .select("score, rating, movies(id, title, year, poster_url)")
          .eq("user_id", userId)
          .eq("rating", rating)
          .neq("movie_id", movieId)
          .not("score", "is", null)
          .order("score", { ascending: false }),
        supabase
          .from("user_reactions")
          .select("score")
          .eq("movie_id", movieId)
          .not("score", "is", null),
      ]);

      const movies = (reactionsRes.data ?? [])
        .map((r) => ({ ...r.movies, score: r.score }))
        .filter((m) => m?.id);

      setSorted(movies);

      // Community average
      const scores = avgRes.data ?? [];
      if (scores.length > 0) {
        setAvgScore(Math.round(scores.reduce((s, r) => s + r.score, 0) / scores.length));
      }

      if (movies.length === 0) {
        await finish(INITIAL_SCORES[rating]);
      } else {
        setLow(0);
        setHigh(movies.length - 1);
        setPhase("comparing");
      }
    }
    load();
  }, []);

  async function finish(score) {
    setFinalScore(score);
    setPhase("done");
    await supabase.from("user_reactions")
      .update({ score })
      .eq("user_id", userId)
      .eq("movie_id", movieId);

    const { count } = await supabase
      .from("user_reactions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .neq("movie_id", movieId)
      .gt("score", score);
    setOverallRank((count ?? 0) + 1);
  }

  async function handleChoice(newWon) {
    const mid      = Math.floor((low + high) / 2);
    const newCount = compsDone + 1;
    setCompsDone(newCount);

    let newLow = low, newHigh = high;
    if (newWon) {
      newHigh = mid - 1;
    } else {
      newLow  = mid + 1;
    }

    if (newLow > newHigh || newCount >= 4) {
      const score = insertionScore(sorted, newLow, rating);
      await finish(score);
    } else {
      setLow(newLow);
      setHigh(newHigh);
    }
  }

  async function handleSkip() {
    await finish(INITIAL_SCORES[rating]);
  }

  const totalComps = Math.min(4, Math.ceil(Math.log2((sorted.length || 0) + 1)));
  const mid        = Math.floor((low + high) / 2);
  const target     = sorted[mid];

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={phase !== "done" ? handleSkip : undefined} />

      {/* Panel */}
      <div className="relative w-full md:max-w-sm">

        {/* Loading */}
        {phase === "loading" && (
          <div className="bg-white rounded-t-3xl md:rounded-3xl p-8 text-center text-stone-400">
            <div className="text-3xl mb-3 animate-pulse">🎬</div>
            <p className="text-sm">Finding comparisons…</p>
          </div>
        )}

        {/* Comparing */}
        {phase === "comparing" && target && (
          <div className="bg-white rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden">
            <div className="flex justify-center pt-3 pb-1 md:hidden">
              <div className="w-10 h-1 bg-stone-200 rounded-full" />
            </div>
            <div className="p-5">
              <div className="text-center mb-4">
                <p className="text-xs text-stone-400 uppercase tracking-widest font-medium mb-1">
                  Ranking your {BUCKET_LABELS[rating]} films
                </p>
                <h2 className="text-base font-black text-stone-900">Which did you prefer?</h2>
                {totalComps > 1 && (
                  <div className="flex justify-center gap-1.5 mt-2">
                    {Array.from({ length: totalComps }).map((_, i) => (
                      <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < compsDone ? "bg-orange-600" : i === compsDone ? "bg-stone-400" : "bg-stone-200"}`} />
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 items-center">
                <button
                  onClick={() => handleChoice(true)}
                  className="flex-1 group flex flex-col items-center gap-2 bg-white border-2 border-stone-200 hover:border-orange-400 hover:bg-orange-50 rounded-2xl p-3 transition-all active:scale-[0.98]"
                >
                  <div className="w-full aspect-[2/3] rounded-xl overflow-hidden bg-stone-100">
                    {posterUrl
                      ? <img src={posterUrl} alt={movieTitle} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-3xl">🎬</div>
                    }
                  </div>
                  <p className="text-xs font-semibold text-stone-800 group-hover:text-orange-600 text-center line-clamp-2 transition-colors">{movieTitle}</p>
                  <span className="text-[10px] text-orange-500 font-medium bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-full">Just rated</span>
                </button>

                <div className="shrink-0">
                  <span className="text-stone-300 font-black text-base">VS</span>
                </div>

                <button
                  onClick={() => handleChoice(false)}
                  className="flex-1 group flex flex-col items-center gap-2 bg-white border-2 border-stone-200 hover:border-orange-400 hover:bg-orange-50 rounded-2xl p-3 transition-all active:scale-[0.98]"
                >
                  <div className="w-full aspect-[2/3] rounded-xl overflow-hidden bg-stone-100">
                    {target.poster_url
                      ? <img src={target.poster_url} alt={target.title} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-3xl">🎬</div>
                    }
                  </div>
                  <p className="text-xs font-semibold text-stone-800 group-hover:text-orange-600 text-center line-clamp-2 transition-colors">{target.title}</p>
                  <span className="text-[10px] text-stone-400">{target.year}</span>
                </button>
              </div>

              <button onClick={handleSkip} className="w-full mt-4 text-stone-400 text-xs hover:text-stone-600 transition-colors py-2">
                Too close to call — skip
              </button>
            </div>
          </div>
        )}

        {/* Done — shareable card */}
        {phase === "done" && (
          <ResultCard
            movieTitle={movieTitle}
            posterUrl={posterUrl}
            movieId={movieId}
            myScore={finalScore}
            myRank={overallRank}
            avgScore={avgScore}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
}
