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

  const ratingObj = RATINGS.find((r) => r.value === currentRating);

  // Not logged in — just show small icon buttons as placeholders
  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <a
          href="/login"
          className="flex items-center gap-1.5 text-xs text-stone-500 border border-stone-200 rounded-lg px-3 py-1.5 hover:bg-stone-50 transition-colors"
        >
          <span>＋</span> Rate
        </a>
        <WatchlistButton movieId={movieId} movieTitle={movieTitle} />
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-3">

        {/* Rate icon button */}
        <button
          onClick={() => setShowModal(true)}
          className={`flex items-center gap-1.5 text-xs rounded-lg px-3 py-1.5 transition-all border ${
            currentRating
              ? "border-stone-200 bg-stone-50 text-stone-700"
              : "border-stone-300 text-stone-600 hover:bg-stone-50"
          }`}
        >
          {currentRating ? (
            <>{ratingObj?.emoji} {ratingObj?.label}</>
          ) : (
            <>＋ Rate</>
          )}
        </button>

        {/* Bookmark */}
        <WatchlistButton movieId={movieId} movieTitle={movieTitle} />

        {/* Scores — inline, small */}
        {communityScore && (
          <span className="text-xs text-stone-400">
            Community <span className="font-semibold text-stone-600">{communityScore}</span>
            <span className="text-stone-300">/100</span>
          </span>
        )}
        {predicted && !currentRating && (
          <span className="text-xs text-stone-400">
            Predicted <span className="font-semibold text-stone-600">{predicted}</span>
            <span className="text-stone-300">/100</span>
          </span>
        )}

      </div>

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
