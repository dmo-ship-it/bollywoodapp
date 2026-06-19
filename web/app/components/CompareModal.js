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

  const scoreFill = (v) => v >= 90 ? "#E14B33" : v >= 70 ? "#E6A437" : v >= 50 ? "#C07A4E" : "#8C8A93";
  const scoreText = (v) => (v >= 70 && v < 90) ? "#261E19" : "#fff";

  async function handleShare() {
    setSharing(true);
    const text = `I rated ${movieTitle} ${myScore}/100 on Rasika`;
    const url  = `${window.location.origin}/movies/${movieId}`;

    try {
      if (navigator.share) {
        await navigator.share({ title: movieTitle, text, url });
      } else {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        alert("Copied to clipboard!");
      }
    } catch (e) {
      // User dismissed share sheet
    }
    setSharing(false);
  }

  return (
    <div style={{ borderRadius: "var(--radius)", overflow: "hidden" }}>
      <div style={{ position: "relative", width: "100%", aspectRatio: "3/4" }}>
        {posterUrl ? (
          <img src={posterUrl} alt={movieTitle} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", background: "var(--sunk)" }} />
        )}

        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.15) 100%)" }} />

        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 20 }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 24, height: 24, borderRadius: "22%", background: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontFamily: "var(--font-serif)", fontSize: 16, color: "#fff", lineHeight: 1 }}>R</span>
            </div>
            <span style={{ fontFamily: "var(--font-serif)", fontSize: 16, color: "#fff" }}>Rasika<span style={{ color: "var(--brand)" }}>.</span></span>
          </div>

          <div>
            <h2 style={{ fontFamily: "var(--font-serif)", color: "#fff", fontSize: 22, lineHeight: 1.2, marginBottom: 16 }}>{movieTitle}</h2>

            {/* Score badges */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 20 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <div style={{ width: 48, height: 48, borderRadius: "28%", background: scoreFill(myScore), display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontFamily: "var(--font-ui)", fontWeight: 800, fontSize: 16, color: scoreText(myScore) }}>{myScore}</span>
                </div>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,255,255,0.7)", letterSpacing: "0.06em" }}>My Score</span>
              </div>
              {myRank !== null && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 48, height: 48, borderRadius: "28%", background: "rgba(255,255,255,0.15)", border: "2px solid var(--brand)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontFamily: "var(--font-ui)", fontWeight: 800, fontSize: 14, color: "#fff" }}>#{myRank}</span>
                  </div>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,255,255,0.7)", letterSpacing: "0.06em" }}>My Rank</span>
                </div>
              )}
              {avgScore && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 48, height: 48, borderRadius: "28%", background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontFamily: "var(--font-ui)", fontWeight: 800, fontSize: 16, color: "#fff" }}>{avgScore}</span>
                  </div>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,255,255,0.7)", letterSpacing: "0.06em" }}>Average</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={handleShare}
                disabled={sharing}
                style={{
                  flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  background: "#fff", color: "var(--ink)",
                  border: "none", borderRadius: "var(--radius-pill)",
                  padding: "12px 16px",
                  fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 14,
                  cursor: "pointer", opacity: sharing ? 0.5 : 1,
                }}
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Share
              </button>
              <button
                onClick={onClose}
                style={{
                  flex: 1, background: "rgba(255,255,255,0.2)", color: "#fff",
                  border: "none", borderRadius: "var(--radius-pill)",
                  padding: "12px 16px",
                  fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 14,
                  cursor: "pointer",
                }}
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
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center" }} className="md:items-center">
      {/* Backdrop */}
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} onClick={phase !== "done" ? handleSkip : undefined} />

      {/* Panel */}
      <div style={{ position: "relative", width: "100%", maxWidth: 400 }}>

        {/* Loading */}
        {phase === "loading" && (
          <div style={{ background: "var(--card)", borderRadius: "var(--radius) var(--radius) 0 0", padding: "32px", textAlign: "center", color: "var(--ink-mute)" }} className="md:rounded-[var(--radius)]">
            <p style={{ fontFamily: "var(--font-ui)", fontSize: 14 }}>Finding comparisons…</p>
          </div>
        )}

        {/* Comparing */}
        {phase === "comparing" && target && (
          <div style={{ background: "var(--card)", borderRadius: "var(--radius) var(--radius) 0 0", boxShadow: "var(--shadow-card-elevated)", overflow: "hidden" }} className="md:rounded-[var(--radius)]">
            <div className="md:hidden" style={{ display: "flex", justifyContent: "center", paddingTop: 12, paddingBottom: 4 }}>
              <div style={{ width: 40, height: 4, background: "var(--line)", borderRadius: 999 }} />
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ textAlign: "center", marginBottom: 20 }}>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--ink-mute)", marginBottom: 6 }}>
                  Ranking your {BUCKET_LABELS[rating]} films
                </p>
                <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 18, color: "var(--ink)" }}>Which did you prefer?</h2>
                {totalComps > 1 && (
                  <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 10 }}>
                    {Array.from({ length: totalComps }).map((_, i) => (
                      <div key={i} style={{
                        width: 6, height: 6, borderRadius: "50%",
                        background: i < compsDone ? "var(--brand)" : i === compsDone ? "var(--ink-mute)" : "var(--line)",
                      }} />
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <button
                  onClick={() => handleChoice(true)}
                  style={{
                    flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                    background: "var(--paper)", border: "2px solid var(--line)",
                    borderRadius: "var(--radius)", padding: 12, cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--brand)"; e.currentTarget.style.background = "rgba(225,75,51,0.04)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.background = "var(--paper)"; }}
                >
                  <div style={{ width: "100%", aspectRatio: "2/3", borderRadius: 10, overflow: "hidden", background: "var(--sunk)" }}>
                    {posterUrl && <img src={posterUrl} alt={movieTitle} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                  </div>
                  <p style={{ fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 600, color: "var(--ink)", textAlign: "center", lineClamp: 2 }}>{movieTitle}</p>
                  <span style={{
                    fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.08em",
                    color: "var(--brand)", background: "rgba(225,75,51,0.08)",
                    border: "1px solid rgba(225,75,51,0.2)", padding: "2px 8px", borderRadius: 999,
                  }}>Just rated</span>
                </button>

                <div style={{ flexShrink: 0 }}>
                  <span style={{ fontFamily: "var(--font-ui)", fontWeight: 800, fontSize: 14, color: "var(--ink-mute)" }}>VS</span>
                </div>

                <button
                  onClick={() => handleChoice(false)}
                  style={{
                    flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                    background: "var(--paper)", border: "2px solid var(--line)",
                    borderRadius: "var(--radius)", padding: 12, cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--brand)"; e.currentTarget.style.background = "rgba(225,75,51,0.04)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.background = "var(--paper)"; }}
                >
                  <div style={{ width: "100%", aspectRatio: "2/3", borderRadius: 10, overflow: "hidden", background: "var(--sunk)" }}>
                    {target.poster_url && <img src={target.poster_url} alt={target.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                  </div>
                  <p style={{ fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 600, color: "var(--ink)", textAlign: "center" }}>{target.title}</p>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink-mute)", letterSpacing: "0.06em" }}>{target.year}</span>
                </button>
              </div>

              <button
                onClick={handleSkip}
                style={{ width: "100%", marginTop: 16, fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--ink-mute)", background: "none", border: "none", cursor: "pointer", padding: "8px 0" }}
              >
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
