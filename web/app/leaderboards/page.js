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
      const { data: pointsData } = await supabase
        .from("user_points")
        .select("user_id, total_points, is_founder")
        .order("total_points", { ascending: false })
        .limit(100);

      if (pointsData?.length) {
        const userIds = pointsData.map((p) => p.user_id);
        const { data: profilesData } = await supabase
          .from("user_profiles")
          .select("user_id, display_name, username")
          .in("user_id", userIds);

        const profileMap = {};
        (profilesData ?? []).forEach((p) => { profileMap[p.user_id] = p; });

        entries = pointsData.map((item, i) => ({
          rank:        i + 1,
          userId:      item.user_id,
          displayName: profileMap[item.user_id]?.display_name || "Member",
          username:    profileMap[item.user_id]?.username,
          score:       item.total_points,
          sub:         `${item.total_points.toLocaleString()} pts`,
          isFounder:   item.is_founder,
        }));
      }

    } else if (type === "friends") {
      // Get who the user follows
      const { data: follows } = await supabase
        .from("user_follows")
        .select("following_id")
        .eq("follower_id", userId);

      const friendIds = (follows ?? []).map((f) => f.following_id);
      // Include yourself in friends ranking
      const allIds = [userId, ...friendIds];

      if (allIds.length === 0) {
        entries = [];
      } else {
        const [{ data: pointsData }, { data: profilesData }] = await Promise.all([
          supabase.from("user_points").select("user_id, total_points, is_founder").in("user_id", allIds).order("total_points", { ascending: false }),
          supabase.from("user_profiles").select("user_id, display_name, username").in("user_id", allIds),
        ]);

        const profileMap = {};
        (profilesData ?? []).forEach((p) => { profileMap[p.user_id] = p; });

        entries = (pointsData ?? []).map((item, i) => ({
          rank:        i + 1,
          userId:      item.user_id,
          displayName: profileMap[item.user_id]?.display_name || "Member",
          username:    profileMap[item.user_id]?.username,
          score:       item.total_points,
          sub:         `${item.total_points.toLocaleString()} pts`,
          isFounder:   item.is_founder,
        }));
      }
    }

    setLeaderboard(entries);
    setMyEntry(entries.find((e) => e.userId === userId) ?? null);
    setLoading(false);
  }

  const tabs = [
    { id: "points",  label: "Global" },
    { id: "friends", label: "Friends" },
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


      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-stone-100 animate-pulse" />
          ))}
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="text-center py-20 text-stone-400">
          <p className="text-4xl mb-3">{tab === "friends" ? "👥" : "🏆"}</p>
          <p className="text-sm text-stone-500 mb-1">
            {tab === "friends" ? "No friends yet" : "No rankings yet"}
          </p>
          {tab === "friends" && (
            <Link href="/taste-profile" className="text-orange-600 text-sm hover:underline">
              Find people to follow →
            </Link>
          )}
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
