"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "../../lib/supabase-browser";
import { getTierFromPoints } from "../../lib/points";

export default function LeaderboardsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("all-time");
  const [leaderboard, setLeaderboard] = useState([]);
  const [userRank, setUserRank] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUser(user);

      await loadLeaderboard(tab, user.id);
    }
    load();
  }, []);

  useEffect(() => {
    if (user) loadLeaderboard(tab, user.id);
  }, [tab]);

  async function loadLeaderboard(type, userId) {
    setLoading(true);

    const orderBy = type === "month" ? "this_month_points" : "total_points";

    const { data } = await supabase
      .from("user_points")
      .select(`
        user_id,
        total_points,
        this_month_points,
        is_founder,
        user_profiles (user_id, display_name, username)
      `)
      .order(orderBy, { ascending: false })
      .limit(100);

    if (data) {
      const processedData = data.map((item, index) => ({
        rank: index + 1,
        userId: item.user_id,
        displayName: item.user_profiles?.display_name || "User",
        username: item.user_profiles?.username,
        points: type === "month" ? item.this_month_points : item.total_points,
        tier: getTierFromPoints(item.total_points, item.is_founder),
        isFounder: item.is_founder,
      }));

      setLeaderboard(processedData);

      // Find user's rank
      const userEntry = processedData.find(u => u.userId === userId);
      setUserRank(userEntry);
    }

    setLoading(false);
  }

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
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-stone-900">{entry.displayName}</p>
            {entry.isFounder && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">🏛️ Founder</span>}
            {entry.tier.id !== "silver" && entry.tier.id !== "founder" && (
              <span className="text-xs">{entry.tier.label}</span>
            )}
          </div>
          {entry.username && (
            <p className="text-xs text-stone-400">@{entry.username}</p>
          )}
        </div>

        {/* Points */}
        <div className="text-right shrink-0">
          <p className="text-2xl font-black text-orange-600">{entry.points.toLocaleString()}</p>
          <p className="text-[10px] text-stone-400">points</p>
        </div>
      </div>
    </Link>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 bg-stone-50 min-h-screen">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-stone-900 mb-4">🏆 Leaderboards</h1>
        <p className="text-stone-600">Top cinema enthusiasts by engagement</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-stone-100 rounded-xl p-1 mb-6">
        {["all-time", "month"].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t
                ? "bg-white text-stone-900 shadow-sm"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            {t === "all-time" ? "📊 All-Time" : "📈 This Month"}
          </button>
        ))}
      </div>

      {/* Your Rank */}
      {userRank && (
        <div className="mb-8 bg-gradient-to-r from-orange-100 to-rose-100 border-2 border-orange-300 rounded-2xl p-6">
          <p className="text-sm text-stone-600 mb-2">YOUR RANK</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-black text-stone-900">#{userRank.rank}</p>
              <p className="text-sm text-stone-600">{userRank.points.toLocaleString()} points</p>
            </div>
            <div className="text-right">
              <p className="text-2xl">{userRank.tier.label}</p>
              {userRank.rank <= 10 && (
                <p className="text-xs text-orange-600 font-bold mt-1">🎉 Top 10!</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-stone-200 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {leaderboard.map(entry => (
            <LeaderboardRow
              key={entry.userId}
              entry={entry}
              isUser={entry.userId === user?.id}
            />
          ))}
        </div>
      )}

      {/* Info */}
      <div className="mt-12 bg-white border border-stone-200 rounded-2xl p-6">
        <h2 className="font-bold text-stone-900 mb-4">How Points Work</h2>
        <div className="space-y-2 text-sm text-stone-600">
          <p>⭐ Rate a film: <strong>+5 points</strong></p>
          <p>👥 Follow a user: <strong>+10 points</strong></p>
          <p>⚖️ Compare films: <strong>+15 points</strong></p>
          <p>📝 Create a list: <strong>+20 points</strong></p>
          <p>🤝 Referral sign-up: <strong>+100 points</strong></p>
          <p>🎯 Referral milestone (10 films): <strong>+250 points</strong></p>
        </div>
      </div>

    </div>
  );
}
