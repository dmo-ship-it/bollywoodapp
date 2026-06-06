"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../../lib/supabase-browser";
import WatchlistButton from "../../components/WatchlistButton";
import RatingModal from "../../components/RatingModal";

const RATINGS = [
  { emoji: "❤️", label: "Loved it",    value: 5 },
  { emoji: "👍", label: "Liked it",    value: 4 },
  { emoji: "😐", label: "It was okay", value: 3 },
  { emoji: "👎", label: "Didn't like", value: 2 },
  { emoji: "💔", label: "Disliked",    value: 1 },
];

async function computePrediction(supabase, userId, movieId) {
  const [{ data: myRatings }, { data: movieRatings }] = await Promise.all([
    supabase.from("user_reactions").select("movie_id, score").eq("user_id", userId).not("score", "is", null),
    supabase.from("user_reactions").select("user_id, score").eq("movie_id", movieId).neq("user_id", userId).not("score", "is", null),
  ]);
  if (!myRatings?.length || !movieRatings?.length) return null;

  const otherIds = [...new Set(movieRatings.map((r) => r.user_id))];
  const { data: theirRatings } = await supabase
    .from("user_reactions").select("user_id, movie_id, score")
    .in("user_id", otherIds).not("score", "is", null);

  const myMap = Object.fromEntries(myRatings.map((r) => [r.movie_id, r.score]));
  const byUser = {};
  (theirRatings ?? []).forEach((r) => {
    if (!byUser[r.user_id]) byUser[r.user_id] = {};
    byUser[r.user_id][r.movie_id] = r.score;
  });

  let weightedSum = 0, totalWeight = 0;
  for (const rater of movieRatings) {
    const theirMap = byUser[rater.user_id] ?? {};
    const shared = Object.keys(myMap).filter((id) => theirMap[id] != null);
    if (shared.length < 2) continue;
    const sim = shared.reduce((s, id) => s + (1 - Math.abs(myMap[id] - theirMap[id]) / 100), 0) / shared.length;
    if (sim < 0.4) continue;
    weightedSum += rater.score * sim;
    totalWeight += sim;
  }
  return totalWeight === 0 ? null : Math.round(weightedSum / totalWeight);
}

export default function RatingPanel({ movieId, movieTitle, posterUrl }) {
  const supabase = createClient();
  const [user,          setUser]          = useState(null);
  const [currentRating, setCurrentRating] = useState(null);
  const [predicted,     setPredicted]     = useState(null);
  const [communityScore,setCommunityScore]= useState(null);
  const [showModal,     setShowModal]     = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      setUser(data.user);
      if (data.user) {
        const [{ data: r }, { data: movie }] = await Promise.all([
          supabase.from("user_reactions").select("rating").eq("user_id", data.user.id).eq("movie_id", movieId).single(),
          supabase.from("movies").select("global_score").eq("id", movieId).single(),
        ]);
        if (r) setCurrentRating(r.rating);
        if (movie?.global_score) setCommunityScore(Math.round(movie.global_score));
        if (!r) computePrediction(supabase, data.user.id, movieId).then(setPredicted);
      }
    });
  }, [movieId]);

  function handleRated(rating) {
    setCurrentRating(rating);
    setPredicted(null);
  }

  if (!user) {
    return (
      <section className="bg-orange-50 border border-orange-100 rounded-2xl p-6 text-center">
        <p className="text-base font-bold text-stone-900 mb-1">Rate this film</p>
        <p className="text-stone-500 text-xs mb-4">Sign up to rate films and build your personal ranking</p>
        <a href="/login" className="inline-block bg-orange-600 text-white font-bold px-6 py-2.5 rounded-full hover:bg-orange-500 transition-colors text-sm">
          Sign up free
        </a>
      </section>
    );
  }

  const ratingObj = RATINGS.find((r) => r.value === currentRating);

  return (
    <>
      <div className="space-y-3">

        {/* Community + Predicted scores */}
        {(communityScore || predicted) && (
          <div className="flex gap-3">
            {communityScore && (
              <div className="flex-1 bg-white border border-stone-200 rounded-xl p-3 text-center shadow-sm">
                <p className="text-xs text-stone-400 mb-1">Community</p>
                <p className="text-2xl font-black text-stone-900">{communityScore}</p>
                <p className="text-[10px] text-stone-400">/ 100</p>
              </div>
            )}
            {predicted && !currentRating && (
              <div className="flex-1 bg-orange-50 border border-orange-100 rounded-xl p-3 text-center">
                <p className="text-xs text-stone-400 mb-1">Predicted for you</p>
                <p className="text-2xl font-black text-orange-600">{predicted}</p>
                <p className="text-[10px] text-stone-400">/ 100</p>
              </div>
            )}
          </div>
        )}

        {/* Rate button + watchlist */}
        <div className="flex gap-2">
          <button
            onClick={() => setShowModal(true)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${
              currentRating
                ? "bg-stone-100 text-stone-700"
                : "bg-stone-900 text-white hover:bg-stone-700"
            }`}
          >
            {currentRating ? (
              <>
                <span>{ratingObj?.emoji}</span>
                <span>{ratingObj?.label}</span>
              </>
            ) : (
              <>
                <span className="text-base">＋</span>
                <span>Rate</span>
              </>
            )}
          </button>

          <div className="border border-stone-200 rounded-lg px-3 flex items-center bg-white">
            <WatchlistButton movieId={movieId} movieTitle={movieTitle} />
          </div>
        </div>

      </div>

      {/* Rating modal */}
      {showModal && (
        <RatingModal
          movieId={movieId}
          movieTitle={movieTitle}
          posterUrl={posterUrl}
          onClose={() => setShowModal(false)}
          onRated={handleRated}
        />
      )}

    </>
  );
}
