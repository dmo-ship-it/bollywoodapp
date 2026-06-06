"use client";

import { useState, useEffect } from "react";
import { createClient } from "../../lib/supabase-browser";
import { updateStreak } from "../../lib/streak";
import { checkAndAwardBadges } from "../../lib/badges";
import CompareModal from "./CompareModal";

const RATINGS = [
  { emoji: "❤️", label: "Loved it",    value: 5, score: 90, color: "bg-rose-100",   ring: "ring-rose-300"   },
  { emoji: "👍", label: "Liked it",    value: 4, score: 70, color: "bg-orange-100", ring: "ring-orange-300" },
  { emoji: "😐", label: "It was okay", value: 3, score: 50, color: "bg-amber-100",  ring: "ring-amber-300"  },
  { emoji: "👎", label: "Didn't like", value: 2, score: 30, color: "bg-stone-100",  ring: "ring-stone-300"  },
  { emoji: "💔", label: "Disliked",    value: 1, score: 10, color: "bg-stone-100",  ring: "ring-stone-300"  },
];

const MUSIC_OPTIONS = [
  { emoji: "🎵", label: "Bangers",     value: 3 },
  { emoji: "🎶", label: "Pretty good", value: 2 },
  { emoji: "🔇", label: "Forgettable", value: 1 },
];

export default function RatingModal({ movieId, movieTitle, posterUrl, onClose, onRated }) {
  const supabase = createClient();
  const [user,          setUser]          = useState(null);
  const [step,          setStep]          = useState("rate");
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
      { user_id: user.id, movie_id: movieId, rating: pendingRating, score: provisionalScore, notes: notes || null, music_rating: musicRating || null },
      { onConflict: "user_id,movie_id" }
    );

    if (!currentRating) {
      await supabase.from("activity_feed").insert({
        user_id: user.id, activity_type: "rated", movie_id: movieId,
        metadata: { rating: pendingRating, title: movieTitle },
      });
    }

    await Promise.all([updateStreak(supabase, user.id), checkAndAwardBadges(supabase, user.id)]);

    setCurrentRating(pendingRating);
    setSaving(false);
    setStep("compare");
    if (onRated) onRated(pendingRating);
  }

  const ratingObj = RATINGS.find((r) => r.value === pendingRating);

  if (step === "compare") {
    return (
      <CompareModal
        movieId={movieId} movieTitle={movieTitle} posterUrl={posterUrl}
        rating={pendingRating} userId={user?.id} onClose={onClose}
      />
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-xs p-5 relative">

          {/* Close */}
          <button onClick={onClose} className="absolute top-3.5 right-4 text-stone-300 hover:text-stone-600 text-lg leading-none">×</button>

          {/* Movie */}
          <div className="flex items-center gap-2.5 mb-5 pr-5">
            {posterUrl && <img src={posterUrl} alt={movieTitle} className="w-8 h-11 rounded object-cover object-top shrink-0" />}
            <p className="font-semibold text-stone-800 text-sm leading-snug">{movieTitle}</p>
          </div>

          {/* ── Rate step ── */}
          {step === "rate" && (
            <>
              <p className="text-[11px] text-stone-400 uppercase tracking-widest mb-4">How was it?</p>
              <div className="flex justify-between gap-1.5 mb-1">
                {RATINGS.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => handlePick(r.value)}
                    className={`flex-1 flex flex-col items-center gap-2 py-3 rounded-xl transition-all ${
                      currentRating === r.value
                        ? `${r.color} ring-2 ${r.ring}`
                        : "bg-stone-50 hover:bg-stone-100"
                    }`}
                  >
                    <span className="text-xl">{r.emoji}</span>
                    <span className="text-[9px] text-stone-400 leading-tight text-center">{r.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* ── Extras step ── */}
          {step === "extras" && (
            <>
              {/* Rating pill */}
              <div className="flex items-center gap-2 mb-5">
                <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${ratingObj?.color}`}>
                  {ratingObj?.emoji} {ratingObj?.label}
                </span>
                <button onClick={() => setStep("rate")} className="text-xs text-stone-400 hover:text-stone-600">change</button>
              </div>

              {/* Notes */}
              <div className="mb-4">
                <label className="block text-[11px] text-stone-400 uppercase tracking-widest mb-1.5">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="What stood out?"
                  rows={2}
                  className="w-full bg-stone-50 border-0 rounded-xl px-3 py-2.5 text-sm text-stone-800 placeholder-stone-300 focus:outline-none focus:ring-1 focus:ring-stone-300 resize-none"
                />
              </div>

              {/* Soundtrack */}
              <div className="mb-5">
                <label className="block text-[11px] text-stone-400 uppercase tracking-widest mb-1.5">Soundtrack</label>
                <div className="flex gap-1.5">
                  {MUSIC_OPTIONS.map((m) => (
                    <button
                      key={m.value}
                      onClick={() => setMusicRating(musicRating === m.value ? null : m.value)}
                      className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl text-[10px] transition-all ${
                        musicRating === m.value
                          ? "bg-stone-200 text-stone-700"
                          : "bg-stone-50 text-stone-400 hover:bg-stone-100"
                      }`}
                    >
                      <span className="text-base">{m.emoji}</span>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleDone}
                disabled={saving}
                className="w-full bg-stone-900 text-white text-sm font-semibold py-3 rounded-xl hover:bg-stone-700 transition-colors disabled:opacity-40"
              >
                {saving ? "Saving…" : "Done"}
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
