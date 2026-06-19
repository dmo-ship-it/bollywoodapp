"use client";

import { useState, useEffect } from "react";
import { createClient } from "../../lib/supabase-browser";
import { updateStreak } from "../../lib/streak";
import { checkAndAwardBadges, BADGES } from "../../lib/badges";
import { awardPoints } from "../../lib/points";
import CompareModal from "./CompareModal";
import BadgeToast from "./BadgeToast";

export const RATINGS = [
  { label: "Loved it",    value: 5, score: 90 },
  { label: "Liked it",    value: 4, score: 70 },
  { label: "Okay",        value: 3, score: 50 },
  { label: "Didn't like", value: 2, score: 30 },
  { label: "Hated it",    value: 1, score: 10 },
];

const MUSIC_OPTIONS = [
  { label: "Bangers",     value: 3 },
  { label: "Pretty good", value: 2 },
  { label: "Forgettable", value: 1 },
];

export default function RatingModal({ movieId, movieTitle, posterUrl, onClose, onRated, onDeleted }) {
  const supabase = createClient();
  const [user,          setUser]          = useState(null);
  const [step,          setStep]          = useState("rate");
  const [currentRating, setCurrentRating] = useState(null);
  const [pendingRating, setPendingRating] = useState(null);
  const [notes,         setNotes]         = useState("");
  const [musicRating,   setMusicRating]   = useState(null);
  const [saving,        setSaving]        = useState(false);
  const [newBadges,     setNewBadges]     = useState([]);

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

  async function handleDelete() {
    if (!user || saving) return;
    setSaving(true);
    await supabase.from("user_reactions").delete().eq("user_id", user.id).eq("movie_id", movieId);
    setSaving(false);
    if (onDeleted) onDeleted();
    onClose();
  }

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

    const [, , earnedIds] = await Promise.all([
      updateStreak(supabase, user.id),
      awardPoints(supabase, user.id, "RATE_FILM"),
      checkAndAwardBadges(supabase, user.id),
    ]);

    if (earnedIds?.length > 0) {
      const earned = BADGES.filter((b) => earnedIds.includes(b.id));
      if (earned.length > 0) setNewBadges(earned);
    }

    setCurrentRating(pendingRating);
    setSaving(false);
    setStep("compare");
    if (onRated) onRated(pendingRating);
  }

  const ratingObj = RATINGS.find((r) => r.value === pendingRating);

  if (step === "compare") {
    return (
      <>
        {newBadges.length > 0 && <BadgeToast badges={newBadges} />}
        <CompareModal
          movieId={movieId} movieTitle={movieTitle} posterUrl={posterUrl}
          rating={pendingRating} userId={user?.id} onClose={onClose}
        />
      </>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 40 }} onClick={onClose} />

      {/* Modal */}
      <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div style={{
          background: "var(--card)", borderRadius: "var(--radius)",
          boxShadow: "var(--shadow-card-elevated)",
          width: "100%", maxWidth: 320, padding: 20, position: "relative",
        }}>

          {/* Close */}
          <button
            onClick={onClose}
            style={{ position: "absolute", top: 14, right: 16, color: "var(--ink-mute)", background: "none", border: "none", cursor: "pointer", fontSize: 20, lineHeight: 1 }}
          >×</button>

          {/* Movie */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, paddingRight: 20 }}>
            {posterUrl && <img src={posterUrl} alt={movieTitle} style={{ width: 32, height: 44, borderRadius: 6, objectFit: "cover", objectPosition: "top", flexShrink: 0 }} />}
            <p style={{ fontFamily: "var(--font-ui)", fontWeight: 600, fontSize: 14, color: "var(--ink)", lineHeight: 1.3 }}>{movieTitle}</p>
          </div>

          {/* ── Rate step ── */}
          {step === "rate" && (
            <>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--ink-mute)", marginBottom: 14 }}>
                How was it?
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
                {RATINGS.map((r) => {
                  const isActive = currentRating === r.value;
                  return (
                    <button
                      key={r.value}
                      onClick={() => handlePick(r.value)}
                      style={{
                        width: "100%", padding: "10px 14px",
                        borderRadius: "var(--radius-pill)",
                        border: isActive ? "none" : "1.5px solid var(--line)",
                        background: isActive ? "var(--brand)" : "transparent",
                        color: isActive ? "#fff" : "var(--ink-soft)",
                        fontFamily: "var(--font-ui)", fontWeight: isActive ? 700 : 500, fontSize: 14,
                        cursor: "pointer", textAlign: "left",
                        transition: "all 0.15s",
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                      }}
                      onMouseEnter={e => { if (!isActive) { e.currentTarget.style.borderColor = "var(--brand)"; e.currentTarget.style.color = "var(--ink)"; }}}
                      onMouseLeave={e => { if (!isActive) { e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.color = "var(--ink-soft)"; }}}
                    >
                      <span>{r.label}</span>
                      <span style={{
                        fontFamily: "var(--font-mono)", fontSize: 11,
                        color: isActive ? "rgba(255,255,255,0.7)" : "var(--ink-mute)",
                        letterSpacing: "0.04em",
                      }}>{r.score}</span>
                    </button>
                  );
                })}
              </div>
              {currentRating && (
                <div style={{ marginTop: 12, textAlign: "center" }}>
                  <button
                    onClick={handleDelete}
                    disabled={saving}
                    style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--ink-mute)", background: "none", border: "none", cursor: "pointer", opacity: saving ? 0.4 : 1, transition: "color 0.2s" }}
                    onMouseEnter={e => e.currentTarget.style.color = "#ef4444"}
                    onMouseLeave={e => e.currentTarget.style.color = "var(--ink-mute)"}
                  >
                    Remove rating
                  </button>
                </div>
              )}
            </>
          )}

          {/* ── Extras step ── */}
          {step === "extras" && (
            <>
              {/* Selected rating indicator */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                <span style={{
                  fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 700,
                  color: "#fff", background: "var(--brand)",
                  padding: "4px 12px", borderRadius: "var(--radius-pill)",
                }}>{ratingObj?.label}</span>
                <button
                  onClick={() => setStep("rate")}
                  style={{ marginLeft: "auto", fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--ink-mute)", background: "none", border: "none", cursor: "pointer" }}
                >
                  change
                </button>
              </div>

              {/* Notes */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--ink-mute)", marginBottom: 6 }}>
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="What stood out?"
                  rows={2}
                  style={{
                    width: "100%", background: "var(--sunk)", border: "1.5px solid var(--line)",
                    borderRadius: 10, padding: "10px 12px",
                    fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--ink)",
                    resize: "none", outline: "none", boxSizing: "border-box",
                  }}
                  onFocus={e => e.target.style.borderColor = "var(--brand)"}
                  onBlur={e => e.target.style.borderColor = "var(--line)"}
                />
              </div>

              {/* Soundtrack */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--ink-mute)", marginBottom: 6 }}>
                  Soundtrack
                </label>
                <div style={{ display: "flex", gap: 6 }}>
                  {MUSIC_OPTIONS.map((m) => {
                    const isActive = musicRating === m.value;
                    return (
                      <button
                        key={m.value}
                        onClick={() => setMusicRating(musicRating === m.value ? null : m.value)}
                        style={{
                          flex: 1, padding: "8px 4px",
                          borderRadius: 10, border: "1.5px solid",
                          borderColor: isActive ? "var(--brand)" : "var(--line)",
                          background: isActive ? "rgba(225,75,51,0.08)" : "transparent",
                          color: isActive ? "var(--brand)" : "var(--ink-mute)",
                          fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: isActive ? 700 : 500,
                          cursor: "pointer", transition: "all 0.15s",
                        }}
                      >
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={handleDone}
                disabled={saving}
                style={{
                  width: "100%", background: "var(--brand)", color: "#fff",
                  border: "none", borderRadius: "var(--radius-pill)",
                  padding: "12px 20px",
                  fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 14,
                  cursor: "pointer", opacity: saving ? 0.6 : 1,
                  boxShadow: "var(--shadow-brand)",
                  transition: "all 0.2s",
                }}
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
