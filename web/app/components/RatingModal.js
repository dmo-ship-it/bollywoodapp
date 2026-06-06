"use client";

import { useState, useEffect } from "react";
import { createClient } from "../../lib/supabase-browser";
import { updateStreak } from "../../lib/streak";
import { checkAndAwardBadges } from "../../lib/badges";

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

// Step 1: Pick a rating
function StepRate({ currentRating, onPick }) {
  return (
    <div>
      <p className="text-center text-sm font-semibold text-stone-500 mb-5">How was it?</p>
      <div className="flex justify-center gap-3">
        {RATINGS.map((r) => (
          <button
            key={r.value}
            onClick={() => onPick(r.value)}
            className={`flex flex-col items-center gap-2 px-4 py-4 rounded-2xl border-2 transition-all ${
              currentRating === r.value
                ? "border-orange-400 bg-orange-50 scale-105 shadow-sm"
                : "border-stone-200 bg-white hover:border-orange-300 hover:bg-orange-50"
            }`}
          >
            <span className="text-3xl">{r.emoji}</span>
            <span className="text-[10px] text-stone-500 font-medium leading-tight text-center">{r.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// Step 2: Optional extras
function StepExtras({ rating, onDone }) {
  const [notes,       setNotes]       = useState("");
  const [musicRating, setMusicRating] = useState(null);
  const ratingObj = RATINGS.find((r) => r.value === rating);

  return (
    <div>
      {/* Rating confirmation */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">{ratingObj?.emoji}</span>
        <div>
          <p className="font-black text-stone-900">{ratingObj?.label}</p>
          <p className="text-xs text-stone-400">Anything to add? (optional)</p>
        </div>
      </div>

      {/* Notes */}
      <div className="mb-5">
        <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-2">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="What did you think? Any standout scenes, performances..."
          rows={3}
          className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 resize-none"
        />
      </div>

      {/* Soundtrack */}
      <div className="mb-8">
        <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-3">Soundtrack</label>
        <div className="flex gap-2">
          {MUSIC_OPTIONS.map((m) => (
            <button
              key={m.value}
              onClick={() => setMusicRating(musicRating === m.value ? null : m.value)}
              className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all ${
                musicRating === m.value
                  ? "border-orange-400 bg-orange-50"
                  : "border-stone-200 bg-white hover:border-orange-200"
              }`}
            >
              <span className="text-xl">{m.emoji}</span>
              <span className="text-[10px] text-stone-500 font-medium">{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() => onDone({ notes, musicRating })}
        className="w-full bg-stone-900 text-white font-bold py-4 rounded-2xl hover:bg-stone-700 transition-colors"
      >
        Done
      </button>
    </div>
  );
}

// Main modal — reusable across MovieCard and movie detail page
export default function RatingModal({ movieId, movieTitle, posterUrl, onClose, onRated }) {
  const supabase = createClient();
  const [user,          setUser]          = useState(null);
  const [step,          setStep]          = useState("rate"); // "rate" | "extras"
  const [currentRating, setCurrentRating] = useState(null);
  const [pendingRating, setPendingRating] = useState(null);
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

  async function handleExtrasDone({ notes, musicRating }) {
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
    onClose();
    if (onRated) onRated(pendingRating);
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl p-6 pb-10 animate-slide-up max-w-lg mx-auto">

        {/* Drag handle */}
        <div className="w-10 h-1 bg-stone-200 rounded-full mx-auto mb-5" />

        {/* Movie title */}
        <div className="flex items-center gap-3 mb-6">
          {posterUrl && (
            <img src={posterUrl} alt={movieTitle} className="w-10 h-14 rounded-lg object-cover shrink-0" />
          )}
          <p className="font-black text-stone-900 text-lg leading-tight">{movieTitle}</p>
        </div>

        {step === "rate" && (
          <StepRate currentRating={currentRating} onPick={handlePick} />
        )}

        {step === "extras" && (
          <StepExtras rating={pendingRating} onDone={handleExtrasDone} />
        )}
      </div>
    </>
  );
}
