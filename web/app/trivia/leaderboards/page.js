"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "../../../lib/supabase-browser";
import { getTriviaLeaderboard, getStreakLeaderboard } from "../../../lib/trivia";

export default function TriviaLeaderboardsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("accuracy");
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUser(user);

      await loadLeaderboard("accuracy");
    }
    load();
  }, []);

  async function loadLeaderboard(type) {
    setLoading(true);
    let data = [];

    if (type === "accuracy") {
      data = await getTriviaLeaderboard(supabase, "all_time", 100);
    } else if (type === "streak") {
      data = await getStreakLeaderboard(supabase, 100);
    }

    setLeaderboard(data);
    setLoading(false);
  }

  const handleTabChange = (newTab) => {
    setTab(newTab);
    loadLeaderboard(newTab);
  };

  const LeaderboardRow = ({ entry, isUser = false }) => (
    <Link href={`/u/${entry.username}`}>
      <div className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
        isUser
          ? "bg-gradient-to-r from-orange-50 to-rose-50 border-orange-200"
          : "bg-white border-stone-200 hover:border-orange-300"
      }`}>
        {/* Rank */}
        <div className="w-12 shrink-0 text-center">
          {entry.rank === 1 && <span className="text-2xl">🥇</span>}
          {entry.rank === 2 && <span className="text-2xl">🥈</span>}
          {entry.rank === 3 && <span className="text-2xl">🥉</span>}
          {entry.rank > 3 && <span className="text-lg font-bold text-stone-400">#{entry.rank}</span>}
        </div>

        {/* User Info */}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-stone-900">{entry.displayName}</p>
          {entry.username && (
            <p className="text-xs text-stone-400">@{entry.username}</p>
          )}
        </div>

        {/* Score */}
        <div className="text-right shrink-0">
          {tab === "accuracy" ? (
            <>
              <p className="text-2xl font-black text-orange-600">{entry.accuracy}%</p>
              <p className="text-[10px] text-stone-400">{entry.total} correct</p>
            </>
          ) : (
            <>
              <p className="text-2xl font-black text-rose-600">🔥 {entry.streak}</p>
              <p className="text-[10px] text-stone-400">day streak</p>
            </>
          )}
        </div>
      </div>
    </Link>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 bg-stone-50 min-h-screen">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-stone-900 mb-2">🏆 Trivia Leaderboards</h1>
        <p className="text-stone-600">Top Bollywood cinema experts</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-stone-100 rounded-xl p-1 mb-6">
        {["accuracy", "streak"].map(t => (
          <button
            key={t}
            onClick={() => handleTabChange(t)}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t
                ? "bg-white text-stone-900 shadow-sm"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            {t === "accuracy" ? "📊 Accuracy" : "🔥 Streaks"}
          </button>
        ))}
      </div>

      {/* Leaderboard */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-stone-200 animate-pulse" />
          ))}
        </div>
      ) : leaderboard.length > 0 ? (
        <div className="space-y-3">
          {leaderboard.map(entry => (
            <LeaderboardRow
              key={entry.userId}
              entry={entry}
              isUser={entry.userId === user?.id}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white border border-stone-200 rounded-2xl">
          <p className="text-4xl mb-3">🎬</p>
          <p className="text-stone-600">No trivia responses yet</p>
        </div>
      )}

      {/* Back Link */}
      <div className="mt-8 text-center">
        <Link href="/trivia" className="text-orange-600 hover:underline font-medium">
          ← Back to Today's Trivia
        </Link>
      </div>

    </div>
  );
}
