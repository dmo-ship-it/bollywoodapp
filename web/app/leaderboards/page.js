"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "../../lib/supabase-browser";

export default function LeaderboardsPage() {
  const router    = useRouter();
  const supabase  = createClient();

  const [user,        setUser]        = useState(null);
  const [tab,         setTab]         = useState("points");
  const [leaderboard, setLeaderboard] = useState([]);
  const [myEntry,     setMyEntry]     = useState(null);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push("/login"); return; }
      setUser(data.user);
      await load("points", data.user.id);
    });
  }, []);

  useEffect(() => {
    if (user) load(tab, user.id);
  }, [tab]);

  async function load(type, userId) {
    setLoading(true);

    let entries = [];

    if (type === "points") {
      const { data } = await supabase
        .from("user_points")
        .select("user_id, total_points, is_founder, user_profiles(display_name, username)")
        .order("total_points", { ascending: false })
        .limit(100);

      entries = (data ?? []).map((item, i) => ({
        rank:        i + 1,
        userId:      item.user_id,
        displayName: item.user_profiles?.display_name || "Member",
        username:    item.user_profiles?.username,
        score:       item.total_points,
        sub:         `${item.total_points.toLocaleString()} pts`,
        isFounder:   item.is_founder,
      }));

    } else if (type === "films") {
      const { data } = await supabase
        .from("user_reactions")
        .select("user_id, user_profiles!inner(display_name, username)")
        .gt("rating", 0);

      // Group by user and count
      const counts = {};
      const profiles = {};
      (data ?? []).forEach((r) => {
        counts[r.user_id]   = (counts[r.user_id] ?? 0) + 1;
        profiles[r.user_id] = r.user_profiles;
      });

      entries = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 100)
        .map(([uid, count], i) => ({
          rank:        i + 1,
          userId:      uid,
          displayName: profiles[uid]?.display_name || "Member",
          username:    profiles[uid]?.username,
          score:       count,
          sub:         `${count} films rated`,
        }));
    }

    setLeaderboard(entries);
    setMyEntry(entries.find((e) => e.userId === userId) ?? null);
    setLoading(false);
  }

  const tabs = [
    { id: "points", label: "Points" },
    { id: "films",  label: "Films Rated" },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 min-h-screen bg-white">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-900 mb-1">Leaderboard</h1>
        <p className="text-stone-400 text-sm">Top Bolly community members</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-stone-100 rounded-xl p-1 mb-6 w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              tab === t.id ? "bg-white text-stone-900 shadow-sm" : "text-stone-400 hover:text-stone-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Your position — pinned at top if not in view */}
      {myEntry && (
        <div className="mb-4 p-3 bg-orange-50 border border-orange-100 rounded-xl flex items-center gap-3">
          <span className="text-xs text-stone-400 w-7 text-center font-bold">#{myEntry.rank}</span>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center text-white text-xs font-black shrink-0">
            {myEntry.displayName.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-stone-900">You</p>
            <p className="text-[11px] text-stone-400">{myEntry.sub}</p>
          </div>
          <div className="w-9 h-9 rounded-full border border-orange-300 bg-white flex items-center justify-center shrink-0">
            <span className="text-orange-500 font-bold text-xs">{myEntry.score.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-stone-100 animate-pulse" />
          ))}
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="text-center py-20 text-stone-400">
          <p className="text-4xl mb-3">🏆</p>
          <p className="text-sm">No rankings yet — be the first!</p>
        </div>
      ) : (
        <div className="space-y-1">
          {leaderboard.map((entry) => {
            const isMe      = entry.userId === user?.id;
            const initials  = entry.displayName.slice(0, 2).toUpperCase();

            return (
              <Link
                key={entry.userId}
                href={entry.username ? `/u/${entry.username}` : "#"}
                className={`flex items-center gap-3 px-2 py-2.5 rounded-xl transition-all group ${
                  isMe ? "bg-orange-50" : "hover:bg-stone-50"
                }`}
              >
                {/* Rank */}
                <span className="text-xs text-stone-300 font-bold w-7 text-center shrink-0">
                  #{entry.rank}
                </span>

                {/* Avatar */}
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0 ${
                  isMe
                    ? "bg-gradient-to-br from-orange-400 to-rose-500"
                    : "bg-gradient-to-br from-stone-300 to-stone-400"
                }`}>
                  {initials}
                </div>

                {/* Name + context */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate ${isMe ? "text-orange-700" : "text-stone-900 group-hover:text-stone-700"}`}>
                    {isMe ? "You" : entry.displayName}
                  </p>
                  {entry.username && (
                    <p className="text-[11px] text-stone-400">@{entry.username}</p>
                  )}
                </div>

                {/* Score circle */}
                <div className={`w-10 h-10 rounded-full border flex items-center justify-center shrink-0 ${
                  isMe ? "border-orange-400 bg-white" : "border-stone-200 bg-white"
                }`}>
                  <span className={`font-bold text-[11px] ${isMe ? "text-orange-500" : "text-stone-500"}`}>
                    {entry.score >= 1000
                      ? `${(entry.score / 1000).toFixed(1)}k`
                      : entry.score}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
