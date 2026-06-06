"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../../lib/supabase-browser";
import WatchlistButton from "../../components/WatchlistButton";
import RatingModal from "../../components/RatingModal";
import ScoreCircle from "../../components/ScoreCircle";
import { RATINGS } from "../../components/RatingModal";

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

async function computeFriendScore(supabase, userId, movieId) {
  // Get who the user follows
  const { data: follows } = await supabase
    .from("user_follows")
    .select("following_id")
    .eq("follower_id", userId);

  if (!follows?.length) return null;

  const friendIds = follows.map((f) => f.following_id);

  // Get their scores for this movie
  const { data: friendRatings } = await supabase
    .from("user_reactions")
    .select("score")
    .eq("movie_id", movieId)
    .in("user_id", friendIds)
    .not("score", "is", null);

  if (!friendRatings?.length) return null;

  const avg = friendRatings.reduce((sum, r) => sum + r.score, 0) / friendRatings.length;
  return { score: Math.round(avg), count: friendRatings.length };
}

// Score item — circle + label below, Beli style
function ScoreItem({ label, score, sub }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <ScoreCircle score={score ?? "—"} size="md" />
      <div className="text-center">
        <div className="text-[10px] text-stone-500 leading-tight">{label}</div>
        {sub && <div className="text-[9px] text-stone-400 leading-tight">{sub}</div>}
      </div>
    </div>
  );
}

export default function RatingPanel({ movieId, movieTitle, posterUrl }) {
  const supabase = createClient();
  const [user,          setUser]          = useState(null);
  const [currentRating, setCurrentRating] = useState(null);
  const [yourScore,     setYourScore]     = useState(null);
  const [avgScore,      setAvgScore]      = useState(null);
  const [friendScore,   setFriendScore]   = useState(null); // { score, count }
  const [predicted,     setPredicted]     = useState(null);
  const [showModal,     setShowModal]     = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const u = data.user;
      setUser(u);

      // Average score — use real user scores if available, else TMDB × 10
      const [{ data: allScores }, { data: movieData }] = await Promise.all([
        supabase.from("user_reactions").select("score").eq("movie_id", movieId).not("score", "is", null),
        supabase.from("movies").select("tmdb_rating, global_score").eq("id", movieId).single(),
      ]);

      if (allScores?.length >= 3) {
        const avg = allScores.reduce((s, r) => s + r.score, 0) / allScores.length;
        setAvgScore(Math.round(avg));
      } else if (movieData?.global_score) {
        setAvgScore(Math.round(movieData.global_score));
      } else if (movieData?.tmdb_rating > 0) {
        setAvgScore(Math.round(movieData.tmdb_rating * 10));
      }

      if (u) {
        // Your rating + score
        const { data: r } = await supabase
          .from("user_reactions")
          .select("rating, score")
          .eq("user_id", u.id)
          .eq("movie_id", movieId)
          .single();

        if (r) {
          setCurrentRating(r.rating);
          setYourScore(r.score);
        } else {
          // Predict if not yet rated
          computePrediction(supabase, u.id, movieId).then(setPredicted);
        }

        // Friend score
        computeFriendScore(supabase, u.id, movieId).then(setFriendScore);
      }
    });
  }, [movieId]);

  function handleRated(rating) {
    setCurrentRating(rating);
    setPredicted(null);
    // Re-fetch score after rating
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: r } = await supabase
        .from("user_reactions")
        .select("score")
        .eq("user_id", data.user.id)
        .eq("movie_id", movieId)
        .single();
      if (r) setYourScore(r.score);
    });
  }

  const ratingObj = RATINGS.find((r) => r.value === currentRating);

  return (
    <>
      {/* ── Three scores ── */}
      <div className="flex items-start gap-5 mb-5">
        <ScoreItem
          label={yourScore ? "Your Score" : predicted ? "Predicted" : "Your Score"}
          score={yourScore ?? predicted}
          sub={!yourScore && predicted ? "Based on taste" : null}
        />

        {avgScore && (
          <>
            <div className="w-px bg-stone-100 self-stretch mt-1" />
            <ScoreItem
              label="Average Score"
              score={avgScore}
              sub="All users"
            />
          </>
        )}

        {friendScore && (
          <>
            <div className="w-px bg-stone-100 self-stretch mt-1" />
            <ScoreItem
              label="Friend Score"
              score={friendScore.score}
              sub={`${friendScore.count} friend${friendScore.count !== 1 ? "s" : ""}`}
            />
          </>
        )}
      </div>

      {/* ── Rate + Bookmark ── */}
      {user ? (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowModal(true)}
            className={`flex items-center gap-2 text-xs rounded-lg px-3 py-1.5 transition-all border ${
              currentRating
                ? "border-stone-200 bg-stone-50 text-stone-700"
                : "border-stone-300 text-stone-600 hover:bg-stone-50"
            }`}
          >
            {currentRating ? (
              <>
                <div className={`w-2.5 h-2.5 rounded-full ${ratingObj?.dot}`} />
                {ratingObj?.label}
              </>
            ) : <>＋ Rate</>}
          </button>
          <WatchlistButton movieId={movieId} movieTitle={movieTitle} />
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <a
            href="/login"
            className="flex items-center gap-1.5 text-xs text-stone-500 border border-stone-200 rounded-lg px-3 py-1.5 hover:bg-stone-50 transition-colors"
          >
            <span>＋</span> Rate
          </a>
          <WatchlistButton movieId={movieId} movieTitle={movieTitle} />
        </div>
      )}

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
