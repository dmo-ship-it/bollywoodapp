"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../../lib/supabase-browser";
import WatchlistButton from "../../components/WatchlistButton";
import CompareModal from "../../components/CompareModal";
import { updateStreak } from "../../../lib/streak";
import { checkAndAwardBadges, BADGES } from "../../../lib/badges";

const RATINGS = [
  { emoji: "❤️", label: "Loved it",    value: 5, score: 90 },
  { emoji: "👍", label: "Liked it",    value: 4, score: 70 },
  { emoji: "😐", label: "It was okay", value: 3, score: 50 },
  { emoji: "👎", label: "Didn't like", value: 2, score: 30 },
  { emoji: "💔", label: "Disliked",    value: 1, score: 10 },
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
  const [user,           setUser]           = useState(null);
  const [currentRating,  setCurrentRating]  = useState(null);
  const [saving,         setSaving]         = useState(false);
  const [newBadges,      setNewBadges]      = useState([]);
  const [predicted,      setPredicted]      = useState(null);
  const [communityScore, setCommunityScore] = useState(null);
  const [showCompare,    setShowCompare]    = useState(false);
  const [pendingRating,  setPendingRating]  = useState(null);

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

  async function handleRate(rating) {
    if (!user || saving) return;
    setSaving(true);

    // Save the rating with a provisional score first
    const provisionalScore = RATINGS.find((r) => r.value === rating)?.score ?? 50;
    await supabase.from("user_reactions").upsert(
      { user_id: user.id, movie_id: movieId, rating, score: provisionalScore },
      { onConflict: "user_id,movie_id" }
    );

    // Log to activity feed (first-time rating only)
    if (!currentRating) {
      await supabase.from("activity_feed").insert({
        user_id: user.id, activity_type: "rated", movie_id: movieId,
        metadata: { rating, title: movieTitle },
      });
    }

    // Streak + badges
    const [, earnedIds] = await Promise.all([
      updateStreak(supabase, user.id),
      checkAndAwardBadges(supabase, user.id),
    ]);
    if (earnedIds.length > 0) {
      setNewBadges(BADGES.filter((b) => earnedIds.includes(b.id)));
      setTimeout(() => setNewBadges([]), 4000);
    }

    setCurrentRating(rating);
    setPredicted(null);
    setSaving(false);

    // Trigger compare modal to refine ranking
    setPendingRating(rating);
    setShowCompare(true);
  }

  function handleCompareClose() {
    setShowCompare(false);
    setPendingRating(null);
  }

  if (!user) {
    return (
      <section className="mt-10 bg-orange-50 border border-orange-100 rounded-2xl p-8 text-center">
        <p className="text-xl font-bold text-stone-900 mb-2">Rate this film</p>
        <p className="text-stone-500 text-sm mb-5">Sign up to rate films and build your personal ranking</p>
        <a href="/login" className="inline-block bg-orange-600 text-white font-bold px-8 py-3 rounded-full hover:bg-orange-500 transition-colors text-sm">
          Sign up free — takes 30 seconds
        </a>
      </section>
    );
  }

  return (
    <>
      <section className="mt-10 space-y-4">

        {/* Badge toast */}
        {newBadges.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 text-center">
            <p className="text-sm font-bold text-stone-900 mb-2">🎉 Badge{newBadges.length > 1 ? "s" : ""} unlocked!</p>
            <div className="flex justify-center gap-3 flex-wrap">
              {newBadges.map((b) => (
                <span key={b.id} className="text-xs bg-white border border-orange-200 px-3 py-1.5 rounded-full text-stone-700 font-medium">
                  {b.icon} {b.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Community + Predicted */}
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

        {/* Rating panel */}
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-stone-500">
              {currentRating ? "Your rating" : "Rate this film"}
            </p>
            <WatchlistButton movieId={movieId} movieTitle={movieTitle} />
          </div>

          <div className="flex justify-center gap-2 flex-wrap">
            {RATINGS.map((r) => (
              <button
                key={r.value}
                onClick={() => handleRate(r.value)}
                disabled={saving}
                className={`flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl border transition-all ${
                  currentRating === r.value
                    ? "bg-orange-50 border-orange-400 scale-105 shadow-sm"
                    : "border-stone-200 bg-white hover:border-orange-300 hover:bg-orange-50"
                } disabled:opacity-50`}
              >
                <span className="text-2xl">{r.emoji}</span>
                <span className="text-[10px] text-stone-500 text-center leading-tight">{r.label}</span>
              </button>
            ))}
          </div>

          {currentRating && (
            <p className="text-center text-xs text-stone-400 mt-3">
              Tap to change your rating
            </p>
          )}
        </div>
      </section>

      {/* Compare modal — appears after rating */}
      {showCompare && pendingRating && (
        <CompareModal
          movieId={movieId}
          movieTitle={movieTitle}
          posterUrl={posterUrl}
          rating={pendingRating}
          userId={user.id}
          onClose={handleCompareClose}
        />
      )}
    </>
  );
}
