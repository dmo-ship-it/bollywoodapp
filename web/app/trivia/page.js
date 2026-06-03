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

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUser(user);

      // Get user's points and tier
      const { data: pointsData } = await supabase
        .from("user_points")
        .select("total_points, is_founder")
        .eq("user_id", user.id)
        .single();

      setPoints(pointsData);
      const userTier = getTierFromPoints(pointsData?.total_points || 0, pointsData?.is_founder);
      setTier(userTier);

      // Check if user has access to trivia (Silver tier or higher)
      if (userTier.minPoints >= 500 || userTier.id === "founder") {
        // Check if user already answered today
        const answered = await hasAnsweredToday(supabase, user.id);
        setAlreadyAnswered(answered);

        // Get today's question
        const todayQ = await getTodayTrivia(supabase);
        setQuestion(todayQ);

        // Get user's stats
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
      setResult({
        error: error.message,
      });
    }
  }

  if (!user) return null;

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="text-4xl mb-4 animate-pulse">🎬</div>
        Loading today's trivia...
      </div>
    );
  }

  // Check if user has unlocked trivia (Silver tier or higher)
  if (!tier || (tier.minPoints < 500 && tier.id !== "founder")) {
    const pointsNeeded = 500 - (points?.total_points || 0);
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-stone-900 mb-2">🎬 Daily Trivia</h1>
          <p className="text-stone-600">Test your Bollywood knowledge!</p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-rose-50 border-2 border-orange-200 rounded-2xl p-12 text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-black text-stone-900 mb-2">Unlock Trivia</h2>
          <p className="text-stone-600 mb-6">
            Reach <strong>Silver tier</strong> to unlock daily trivia and earn bonus points!
          </p>

          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-stone-700">Points Progress</span>
              <span className="text-sm font-bold text-orange-600">{points?.total_points || 0} / 500</span>
            </div>
            <div className="h-3 bg-white rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-400 to-rose-400 transition-all duration-500"
                style={{ width: `${Math.min(100, ((points?.total_points || 0) / 500) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-stone-500 mt-2">
              {pointsNeeded > 0 ? (
                <>🎯 {pointsNeeded} points to go!</>
              ) : (
                <>✓ You're ready!</>
              )}
            </p>
          </div>

          <div className="bg-white rounded-xl p-4 mb-6 text-left">
            <h3 className="font-bold text-stone-900 mb-3">How to earn points:</h3>
            <ul className="space-y-2 text-sm text-stone-600">
              <li>⭐ Rate a film: <strong>+5 points</strong></li>
              <li>👥 Follow a user: <strong>+10 points</strong></li>
              <li>⚖️ Compare films: <strong>+15 points</strong></li>
              <li>📝 Create a list: <strong>+20 points</strong></li>
              <li>👏 Receive wah wahs: <strong>+2 points</strong></li>
            </ul>
          </div>

          <Link href="/" className="inline-block bg-orange-600 text-white font-bold px-6 py-3 rounded-full hover:bg-orange-500 transition-colors">
            Continue Earning Points →
          </Link>
        </div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-4xl mb-4">🎭</p>
        <p className="text-lg font-bold text-stone-900 mb-2">No trivia for today yet</p>
        <p className="text-stone-500 mb-6">Check back tomorrow for a new Bollywood trivia question!</p>
        <Link href="/" className="text-orange-600 hover:underline">← Back to home</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 bg-stone-50 min-h-screen">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-stone-900 mb-2">🎬 Daily Trivia</h1>
        <p className="text-stone-600">Test your Bollywood knowledge!</p>
      </div>

      {/* Stats Card */}
      {stats && (
        <div className="bg-white border border-stone-200 rounded-2xl p-6 mb-8 grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-2xl font-black text-orange-600">{stats.totalAttempts}</p>
            <p className="text-xs text-stone-500 mt-1">Answered</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-black text-green-600">{stats.accuracy}%</p>
            <p className="text-xs text-stone-500 mt-1">Accuracy</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-black text-orange-600">{stats.correctAnswers}</p>
            <p className="text-xs text-stone-500 mt-1">Correct</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-black text-rose-600">🔥 {stats.streak}</p>
            <p className="text-xs text-stone-500 mt-1">Streak</p>
          </div>
        </div>
      )}

      {/* Question Card */}
      {alreadyAnswered && result && (
        <div className={`rounded-2xl p-8 mb-8 border-2 ${
          result.isCorrect
            ? "bg-green-50 border-green-300"
            : "bg-red-50 border-red-300"
        }`}>
          <div className="flex items-center gap-3 mb-4">
            {result.isCorrect ? (
              <span className="text-4xl">✅</span>
            ) : (
              <span className="text-4xl">❌</span>
            )}
            <h2 className={`text-2xl font-black ${
              result.isCorrect ? "text-green-700" : "text-red-700"
            }`}>
              {result.isCorrect ? "Correct!" : "Not quite!"}
            </h2>
          </div>

          {!result.isCorrect && (
            <div className="mb-4 bg-white bg-opacity-60 rounded-lg p-3 border border-red-200">
              <p className="text-sm text-stone-600 mb-1">Correct answer:</p>
              <p className="font-bold text-stone-900">{result.correctOption}</p>
            </div>
          )}

          <div className="bg-white bg-opacity-60 rounded-lg p-4">
            <p className="text-sm text-stone-600 mb-2">Explanation:</p>
            <p className="text-stone-900 leading-relaxed">{result.explanation}</p>
          </div>
        </div>
      )}

      {!alreadyAnswered || !result ? (
        <div className="bg-white border border-stone-200 rounded-2xl p-8 mb-8">
          <h2 className="text-xl font-bold text-stone-900 mb-6">{question.question}</h2>

          <div className="space-y-3 mb-8">
            {question.options.map((option, index) => (
              <button
                key={index}
                onClick={() => !submitted && setSelectedAnswer(index)}
                disabled={submitted}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all font-medium ${
                  selectedAnswer === index
                    ? "bg-orange-50 border-orange-400 text-stone-900"
                    : "bg-white border-stone-200 text-stone-700 hover:border-orange-300"
                } disabled:opacity-50`}
              >
                <span className="inline-block w-6 h-6 rounded-full border-2 border-current mr-3 text-center leading-5">
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
              className="w-full bg-orange-600 text-white font-bold py-4 rounded-xl hover:bg-orange-500 transition-colors disabled:opacity-40"
            >
              Submit Answer
            </button>
          ) : (
            <div className="text-center">
              <p className="text-sm text-stone-500">Answer submitted!</p>
            </div>
          )}
        </div>
      ) : null}

      {/* Leaderboards Link */}
      <div className="text-center">
        <Link href="/trivia/leaderboards" className="text-orange-600 hover:underline font-medium">
          View Trivia Leaderboards →
        </Link>
      </div>

    </div>
  );
}
