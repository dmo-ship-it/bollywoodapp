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

export default function CompareModal({ movieId, movieTitle, posterUrl, rating, userId, onClose }) {
  const supabase = createClient();

  const [phase,        setPhase]        = useState("loading"); // loading | comparing | done
  const [sorted,       setSorted]       = useState([]);        // existing bucket movies, score desc
  const [low,          setLow]          = useState(0);
  const [high,         setHigh]         = useState(0);
  const [compsDone,    setCompsDone]    = useState(0);
  const [finalPos,     setFinalPos]     = useState(null);
  const [finalScore,   setFinalScore]   = useState(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("user_reactions")
        .select("score, rating, movies(id, title, year, poster_url)")
        .eq("user_id", userId)
        .eq("rating", rating)
        .neq("movie_id", movieId)
        .not("score", "is", null)
        .order("score", { ascending: false });

      const movies = (data ?? [])
        .map((r) => ({ ...r.movies, score: r.score }))
        .filter((m) => m?.id);

      setSorted(movies);

      if (movies.length === 0) {
        await finish(INITIAL_SCORES[rating], 0);
      } else {
        setLow(0);
        setHigh(movies.length - 1);
        setPhase("comparing");
      }
    }
    load();
  }, []);

  async function finish(score, pos) {
    setFinalScore(score);
    setFinalPos(pos);
    setPhase("done");
    await supabase.from("user_reactions")
      .update({ score })
      .eq("user_id", userId)
      .eq("movie_id", movieId);
  }

  async function handleChoice(newWon) {
    const mid    = Math.floor((low + high) / 2);
    const newCount = compsDone + 1;
    setCompsDone(newCount);

    let newLow = low, newHigh = high;
    if (newWon) {
      newHigh = mid - 1; // new movie goes in upper half (better)
    } else {
      newLow  = mid + 1; // new movie goes in lower half (worse)
    }

    // Converged or hit max comparisons (4)
    if (newLow > newHigh || newCount >= 4) {
      const pos   = newLow;
      const score = insertionScore(sorted, pos, rating);
      await finish(score, pos);
    } else {
      setLow(newLow);
      setHigh(newHigh);
    }
  }

  async function handleSkip() {
    await finish(INITIAL_SCORES[rating], Math.floor(sorted.length / 2));
  }

  const totalComps = Math.min(4, Math.ceil(Math.log2((sorted.length || 0) + 1)));
  const mid        = Math.floor((low + high) / 2);
  const target     = sorted[mid];

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleSkip} />

      {/* Panel */}
      <div className="relative w-full md:max-w-md bg-white rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden">

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 md:hidden">
          <div className="w-10 h-1 bg-stone-200 rounded-full" />
        </div>

        {phase === "loading" && (
          <div className="p-8 text-center text-stone-400">
            <div className="text-3xl mb-3 animate-pulse">🎬</div>
            <p className="text-sm">Finding comparisons…</p>
          </div>
        )}

        {phase === "comparing" && target && (
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
              {/* New movie */}
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

              {/* VS */}
              <div className="shrink-0 flex flex-col items-center gap-1">
                <span className="text-stone-300 font-black text-base">VS</span>
              </div>

              {/* Existing movie */}
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
        )}

        {phase === "done" && (
          <div className="p-8 text-center">
            <div className="text-4xl mb-3">🎉</div>
            <h2 className="text-xl font-black text-stone-900 mb-1">Ranked!</h2>
            {sorted.length > 0 && finalPos !== null ? (
              <p className="text-stone-500 text-sm mb-1">
                <strong className="text-stone-900">#{finalPos + 1}</strong> in your{" "}
                <strong className="text-stone-900">{BUCKET_LABELS[rating]}</strong> films
              </p>
            ) : (
              <p className="text-stone-500 text-sm mb-1">
                First film in your <strong className="text-stone-900">{BUCKET_LABELS[rating]}</strong> list!
              </p>
            )}
            {finalScore && (
              <p className="text-stone-400 text-xs mb-5">Score: {finalScore} / 100</p>
            )}
            <button
              onClick={onClose}
              className="bg-orange-600 text-white font-bold text-sm px-8 py-3 rounded-full hover:bg-orange-500 transition-colors"
            >
              Done →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
