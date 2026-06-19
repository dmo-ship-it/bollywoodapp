"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "../../lib/supabase-browser";
import { getTierFromPoints } from "../../lib/points";
import {
  getTodayTrivia,
  submitTriviaAnswer,
  getUserTriviaStats,
  hasAnsweredToday,
  getUserTopLanguage,
  TRIVIA_LANG_NAMES,
} from "../../lib/trivia";

export default function TriviaPage() {
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState(null);
  const [points, setPoints] = useState(null);
  const [tier, setTier] = useState(null);
  const [question, setQuestion] = useState(null);
  const [stats, setStats] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [alreadyAnswered, setAlreadyAnswered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState("hi");

  async function loadForLanguage(currentUser, lang) {
    setSelectedAnswer(null);
    setSubmitted(false);
    setResult(null);

    const answered = await hasAnsweredToday(supabase, currentUser.id, lang);
    setAlreadyAnswered(answered);

    const todayQ = await getTodayTrivia(supabase, lang);
    setQuestion(todayQ);
  }

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUser(user);

      const { data: pointsData } = await supabase
        .from("user_points")
        .select("total_points, is_founder")
        .eq("user_id", user.id)
        .single();

      setPoints(pointsData);
      const userTier = getTierFromPoints(pointsData?.total_points || 0, pointsData?.is_founder);
      setTier(userTier);

      if (userTier.minPoints >= 500 || userTier.id === "founder") {
        const lang = await getUserTopLanguage(supabase, user.id);
        setLanguage(lang);
        await loadForLanguage(user, lang);
        const userStats = await getUserTriviaStats(supabase, user.id);
        setStats(userStats);
      }

      setLoading(false);
    }
    load();
  }, []);

  async function handleSubmitAnswer() {
    if (selectedAnswer === null) return;

    setSubmitted(true);
    try {
      const { isCorrect, explanation } = await submitTriviaAnswer(
        supabase,
        user.id,
        question.id,
        selectedAnswer
      );

      setResult({
        isCorrect,
        explanation,
        selectedOption: question.options[selectedAnswer],
        correctOption: question.options[question.correct_answer],
      });
    } catch (error) {
      console.error("Error submitting answer:", error);
      setResult({ error: error.message });
    }
  }

  if (!user) return null;

  if (loading) {
    return (
      <div style={{ maxWidth: 672, margin: "0 auto", padding: "64px 16px", textAlign: "center", color: "var(--ink-mute)" }}>
        <div className="shimmer" style={{ width: 48, height: 48, borderRadius: "28%", margin: "0 auto 16px" }} />
        <p style={{ fontFamily: "var(--font-ui)", fontSize: 14 }}>Loading today's trivia…</p>
      </div>
    );
  }

  // Trivia locked (below Silver tier)
  if (!tier || (tier.minPoints < 500 && tier.id !== "founder")) {
    const pointsNeeded = 500 - (points?.total_points || 0);
    const progress = Math.min(100, ((points?.total_points || 0) / 500) * 100);
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="text-center mb-8">
          <h1 style={{ fontSize: 28, fontWeight: 900, color: "var(--ink)", fontFamily: "var(--font-serif)", marginBottom: 8 }}>Daily Trivia</h1>
          <p style={{ color: "var(--ink-mute)", fontSize: 14 }}>Test your Bollywood knowledge!</p>
        </div>

        <div style={{ background: "rgba(225,75,51,0.04)", border: "2px solid rgba(225,75,51,0.15)", borderRadius: 20, padding: "48px 32px", textAlign: "center" }}>
          <div style={{ width: 56, height: 56, borderRadius: "28%", background: "var(--sunk)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 22 }}>
            &#x1F512;
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: "var(--ink)", marginBottom: 8 }}>Unlock Trivia</h2>
          <p style={{ color: "var(--ink-mute)", fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
            Reach <strong style={{ color: "var(--ink)" }}>Silver tier</strong> to unlock daily trivia and earn bonus points!
          </p>

          <div className="mb-8">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-soft)", fontFamily: "var(--font-ui)" }}>Points Progress</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--brand)", fontFamily: "var(--font-mono)" }}>{points?.total_points || 0} / 500</span>
            </div>
            <div style={{ height: 12, background: "var(--sunk)", borderRadius: 999, overflow: "hidden" }}>
              <div style={{ height: "100%", background: "var(--brand)", borderRadius: 999, width: `${progress}%`, transition: "width 0.5s" }} />
            </div>
            <p style={{ fontSize: 12, color: "var(--ink-mute)", marginTop: 8 }}>
              {pointsNeeded > 0 ? `${pointsNeeded} points to go` : "You're ready!"}
            </p>
          </div>

          <div style={{ background: "var(--card)", borderRadius: 12, padding: 16, marginBottom: 24, textAlign: "left", border: "1px solid var(--line)" }}>
            <h3 style={{ fontWeight: 700, color: "var(--ink)", fontSize: 13, marginBottom: 12, fontFamily: "var(--font-ui)" }}>How to earn points:</h3>
            <ul style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13, color: "var(--ink-soft)", fontFamily: "var(--font-ui)" }}>
              <li>Rate a film — <strong>+5 pts</strong></li>
              <li>Follow a user — <strong>+10 pts</strong></li>
              <li>Compare films — <strong>+15 pts</strong></li>
              <li>Create a list — <strong>+20 pts</strong></li>
              <li>Receive wah wahs — <strong>+2 pts</strong></li>
            </ul>
          </div>

          <Link href="/" style={{ display: "inline-block", background: "var(--brand)", color: "#fff", fontWeight: 700, padding: "12px 24px", borderRadius: "var(--radius-pill)", textDecoration: "none", fontFamily: "var(--font-ui)", boxShadow: "var(--shadow-brand)" }}>
            Continue Earning Points →
          </Link>
        </div>
      </div>
    );
  }

  if (!question) {
    return (
      <div style={{ maxWidth: 672, margin: "0 auto", padding: "64px 16px", textAlign: "center", color: "var(--ink-mute)" }}>
        <p style={{ fontFamily: "var(--font-serif)", fontSize: 18, color: "var(--ink-soft)", marginBottom: 8 }}>No trivia for today yet</p>
        <p style={{ fontSize: 14, color: "var(--ink-mute)", marginBottom: 24 }}>Check back tomorrow for a new Bollywood trivia question!</p>
        <Link href="/" style={{ color: "var(--brand)", fontSize: 14, fontWeight: 500, textDecoration: "none" }}>← Back to home</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 min-h-screen" style={{ background: "var(--paper)" }}>

      {/* Header */}
      <div className="mb-8">
        <h1 style={{ fontSize: 28, fontWeight: 900, color: "var(--ink)", fontFamily: "var(--font-serif)", marginBottom: 6 }}>Daily Trivia</h1>
        <p style={{ color: "var(--ink-mute)", fontSize: 14 }}>
          Test your knowledge of {TRIVIA_LANG_NAMES[language]} cinema — one new question a day.
        </p>
      </div>

      {/* Stats Card */}
      {stats && (
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 20, padding: 24, marginBottom: 32, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, boxShadow: "var(--shadow-card)" }}>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 24, fontWeight: 900, color: "var(--brand)", fontFamily: "var(--font-ui)" }}>{stats.totalAttempts}</p>
            <p style={{ fontSize: 11, color: "var(--ink-mute)", marginTop: 4, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Answered</p>
          </div>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 24, fontWeight: 900, color: "#22c55e", fontFamily: "var(--font-ui)" }}>{stats.accuracy}%</p>
            <p style={{ fontSize: 11, color: "var(--ink-mute)", marginTop: 4, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Accuracy</p>
          </div>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 24, fontWeight: 900, color: "var(--brand)", fontFamily: "var(--font-ui)" }}>{stats.correctAnswers}</p>
            <p style={{ fontSize: 11, color: "var(--ink-mute)", marginTop: 4, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Correct</p>
          </div>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 24, fontWeight: 900, color: "#E6A437", fontFamily: "var(--font-ui)" }}>{stats.streak}</p>
            <p style={{ fontSize: 11, color: "var(--ink-mute)", marginTop: 4, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Streak</p>
          </div>
        </div>
      )}

      {/* Result card (already answered) */}
      {alreadyAnswered && result && (
        <div style={{
          borderRadius: 20, padding: 32, marginBottom: 32, border: "2px solid",
          background: result.isCorrect ? "rgba(34,197,94,0.05)" : "rgba(239,68,68,0.05)",
          borderColor: result.isCorrect ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: result.isCorrect ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
              {result.isCorrect ? "✓" : "✗"}
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: result.isCorrect ? "#16a34a" : "#dc2626", fontFamily: "var(--font-serif)" }}>
              {result.isCorrect ? "Correct!" : "Not quite!"}
            </h2>
          </div>

          {!result.isCorrect && (
            <div style={{ marginBottom: 16, background: "rgba(255,255,255,0.6)", borderRadius: 10, padding: 12, border: "1px solid rgba(239,68,68,0.2)" }}>
              <p style={{ fontSize: 12, color: "var(--ink-mute)", marginBottom: 4 }}>Correct answer:</p>
              <p style={{ fontWeight: 700, color: "var(--ink)", fontFamily: "var(--font-ui)" }}>{result.correctOption}</p>
            </div>
          )}

          <div style={{ background: "rgba(255,255,255,0.6)", borderRadius: 10, padding: 16 }}>
            <p style={{ fontSize: 12, color: "var(--ink-mute)", marginBottom: 8 }}>Explanation:</p>
            <p style={{ color: "var(--ink)", lineHeight: 1.6, fontSize: 14, fontFamily: "var(--font-ui)" }}>{result.explanation}</p>
            {question?.source_url && (
              <a href={question.source_url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginTop: 12, fontSize: 12, color: "var(--brand)", textDecoration: "none" }}>
                Source ↗
              </a>
            )}
          </div>
        </div>
      )}

      {(!alreadyAnswered || !result) && (
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 20, padding: 32, marginBottom: 32, boxShadow: "var(--shadow-card)" }}>
          {question.category === "fun_fact" && (
            <span style={{ display: "inline-block", marginBottom: 12, padding: "4px 10px", borderRadius: 999, background: "rgba(225,75,51,0.08)", color: "var(--brand)", fontSize: 11, fontWeight: 700, fontFamily: "var(--font-mono)" }}>
              Fun Fact
            </span>
          )}
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)", marginBottom: 24, lineHeight: 1.5, fontFamily: "var(--font-ui)" }}>{question.question}</h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
            {question.options.map((option, index) => (
              <button
                key={index}
                onClick={() => !submitted && setSelectedAnswer(index)}
                disabled={submitted}
                style={{
                  width: "100%", textAlign: "left", padding: "16px", borderRadius: 14,
                  border: "2px solid", cursor: "pointer", fontWeight: 500, fontSize: 14,
                  transition: "all 0.15s", fontFamily: "var(--font-ui)",
                  background: selectedAnswer === index ? "rgba(225,75,51,0.06)" : "var(--card)",
                  borderColor: selectedAnswer === index ? "var(--brand)" : "var(--line)",
                  color: "var(--ink)",
                  opacity: submitted ? 0.5 : 1,
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, borderRadius: "50%", border: "2px solid currentColor", marginRight: 12, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                  {String.fromCharCode(65 + index)}
                </span>
                {option}
              </button>
            ))}
          </div>

          {!submitted ? (
            <button
              onClick={handleSubmitAnswer}
              disabled={selectedAnswer === null}
              style={{ width: "100%", background: "var(--brand)", color: "#fff", fontWeight: 700, padding: "16px 0", borderRadius: 14, border: "none", cursor: "pointer", fontSize: 16, fontFamily: "var(--font-ui)", boxShadow: "var(--shadow-brand)", opacity: selectedAnswer === null ? 0.4 : 1 }}
            >
              Submit Answer
            </button>
          ) : (
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: 14, color: "var(--ink-mute)" }}>Answer submitted!</p>
            </div>
          )}
        </div>
      )}

      {/* Leaderboards Link */}
      <div style={{ textAlign: "center" }}>
        <Link href="/trivia/leaderboards" style={{ color: "var(--brand)", fontWeight: 600, fontSize: 14, textDecoration: "none", fontFamily: "var(--font-ui)" }}>
          View Trivia Leaderboards →
        </Link>
      </div>

    </div>
  );
}
