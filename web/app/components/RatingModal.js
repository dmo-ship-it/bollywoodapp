"use client";

import { useState, useEffect } from "react";
import { createClient } from "../../lib/supabase-browser";
import { updateStreak } from "../../lib/streak";
import { checkAndAwardBadges } from "../../lib/badges";
import CompareModal from "./CompareModal";

const RATINGS = [
  { emoji: "❤️", label: "Loved it",    value: 5, score: 90 },
  { emoji: "👍", label: "Liked it",    value: 4, score: 70 },
  { emoji: "😐", label: "It was okay", value: 3, score: 50 },
  { emoji: "👎", label: "Didn't like", value: 2, score: 30 },
  { emoji: "💔", label: "Disliked",    value: 1, score: 10 },
];

const MUSIC_OPTIONS = [
  { emoji: "🎵", label: "Bangers",     value: 3 },
  { emoji: "🎶", label: "Pretty good", value: 2 },
  { emoji: "🔇", label: "Forgettable", value: 1 },
];

export default function RatingModal({ movieId, movieTitle, posterUrl, onClose, onRated }) {
  const supabase = createClient();
  const [user,          setUser]          = useState(null);
  const [step,          setStep]          = useState("rate");   // "rate" | "extras" | "compare"
  const [currentRating, setCurrentRating] = useState(null);
  const [pendingRating, setPendingRating] = useState(null);
  const [notes,         setNotes]         = useState("");
  const [musicRating,   setMusicRating]   = useState(null);
  const [saving,        setSaving]        = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      setUser(data.user);
      if (data.user) {
        const { data: r } = await supabase
          .from("user_reactions")
          .select("rating")
          .eq("user_id", data.user.id)
          .eq("movie_id", movieId)
          .single();
        if (r) setCurrentRating(r.rating);
      }
    });
  }, [movieId]);

  function handlePick(rating) {
    setPendingRating(rating);
    setStep("extras");
  }

  async function handleDone() {
    if (!user || saving) return;
    setSaving(true);

    const provisionalScore = RATINGS.find((r) => r.value === pendingRating)?.score ?? 50;

    await supabase.from("user_reactions").upsert(
      {
        user_id:      user.id,
        movie_id:     movieId,
        rating:       pendingRating,
        score:        provisionalScore,
        notes:        notes || null,
        music_rating: musicRating || null,
      },
      { onConflict: "user_id,movie_id" }
    );

    if (!currentRating) {
      await supabase.from("activity_feed").insert({
        user_id: user.id, activity_type: "rated", movie_id: movieId,
        metadata: { rating: pendingRating, title: movieTitle },
      });
    }

    await Promise.all([
      updateStreak(supabase, user.id),
      checkAndAwardBadges(supabase, user.id),
    ]);

    setCurrentRating(pendingRating);
    setSaving(false);

    // Immediately go to compare
    setStep("compare");
    if (onRated) onRated(pendingRating);
  }

  const ratingObj = RATINGS.find((r) => r.value === pendingRating);

  // Compare step — hand off to CompareModal which handles its own UI
  if (step === "compare") {
    return (
      <CompareModal
        movieId={movieId}
        movieTitle={movieTitle}
        posterUrl={posterUrl}
        rating={pendingRating}
        userId={user?.id}
        onClose={onClose}
      />
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Centered floating modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 relative">

          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 text-xl leading-none transition-colors"
          >
            ×
          </button>

          {/* Movie title */}
          <div className="flex items-center gap-3 mb-6 pr-6">
            {posterUrl && (
              <img src={posterUrl} alt={movieTitle} className="w-9 h-12 rounded-lg object-cover shrink-0" />
            )}
            <p className="font-black text-stone-900 leading-tight">{movieTitle}</p>
          </div>

          {/* ── Step: Rate ── */}
          {step === "rate" && (
            <>
              <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4">How was it?</p>
              <div className="flex justify-between gap-2">
                {RATINGS.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => handlePick(r.value)}
                    className={`flex-1 flex flex-col items-center gap-2 py-4 rounded-2xl border-2 transition-all ${
                      currentRating === r.value
                        ? "border-orange-400 bg-orange-50 scale-105 shadow-sm"
                        : "border-stone-100 bg-stone-50 hover:border-orange-300 hover:bg-orange-50"
                    }`}
                  >
                    <span className="text-2xl">{r.emoji}</span>
                    <span className="text-[9px] text-stone-500 font-medium leading-tight text-center">{r.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* ── Step: Extras ── */}
          {step === "extras" && (
            <>
              {/* Rating confirmation */}
              <div className="flex items-center gap-3 mb-5 p-3 bg-stone-50 rounded-xl">
                <span className="text-2xl">{ratingObj?.emoji}</span>
                <div>
                  <p className="font-bold text-stone-900 text-sm">{ratingObj?.label}</p>
                  <p className="text-xs text-stone-400">Anything to add? (optional)</p>
                </div>
                <button
                  onClick={() => setStep("rate")}
                  className="ml-auto text-xs text-orange-600 font-semibold hover:underline"
                >
                  Change
                </button>
              </div>

              {/* Notes */}
              <div className="mb-4">
                <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="What did you think?"
                  rows={2}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 resize-none"
                />
              </div>

              {/* Soundtrack */}
              <div className="mb-6">
                <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Soundtrack</label>
                <div className="flex gap-2">
                  {MUSIC_OPTIONS.map((m) => (
                    <button
                      key={m.value}
                      onClick={() => setMusicRating(musicRating === m.value ? null : m.value)}
                      className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border transition-all ${
                        musicRating === m.value
                          ? "border-orange-400 bg-orange-50"
                          : "border-stone-200 bg-stone-50 hover:border-orange-200"
                      }`}
                    >
                      <span className="text-lg">{m.emoji}</span>
                      <span className="text-[9px] text-stone-500 font-medium">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleDone}
                disabled={saving}
                className="w-full bg-stone-900 text-white font-bold py-3.5 rounded-2xl hover:bg-stone-700 transition-colors disabled:opacity-50"
              >
                {saving ? "Saving…" : "Done →"}
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
