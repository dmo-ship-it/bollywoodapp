"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "../../lib/supabase-browser";

export function LeaderboardsContent() {
  const supabase  = createClient();

  const [user,        setUser]        = useState(null);
  const [tab,         setTab]         = useState("points");
  const [leaderboard, setLeaderboard] = useState([]);
  const [myEntry,     setMyEntry]     = useState(null);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      setUser(data.user);
      await load("points", data.user?.id ?? null);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (user !== undefined) load(tab, user?.id ?? null);
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

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
          .from("user_profiles").select("user_id, display_name, username").in("user_id", userIds);
        const profileMap = {};
        (profilesData ?? []).forEach((p) => { profileMap[p.user_id] = p; });
        entries = pointsData.map((item, i) => ({
          rank:        i + 1,
          userId:      item.user_id,
          displayName: profileMap[item.user_id]?.display_name || "Member",
          username:    profileMap[item.user_id]?.username,
          score:       item.total_points,
          isFounder:   item.is_founder,
        }));
      }
    } else if (type === "friends" && userId) {
      const { data: follows } = await supabase.from("user_follows").select("following_id").eq("follower_id", userId);
      const allIds = [userId, ...(follows ?? []).map((f) => f.following_id)];
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
        isFounder:   item.is_founder,
      }));
    }

    setLeaderboard(entries);
    setMyEntry(entries.find((e) => e.userId === userId) ?? null);
    setLoading(false);
  }

  const tabStyle = (active) => ({
    padding: "6px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500,
    fontFamily: "var(--font-ui)", border: "none", cursor: "pointer", transition: "all 0.15s",
    background: active ? "var(--card)" : "transparent",
    color: active ? "var(--ink)" : "var(--ink-mute)",
    boxShadow: active ? "var(--shadow-card)" : "none",
  });

  return (
    <div>
      <div style={{ display: "flex", gap: 4, background: "var(--sunk)", borderRadius: 12, padding: 4, marginBottom: 24, width: "fit-content" }}>
        {[{ id: "points", label: "Global" }, { id: "friends", label: "Friends" }].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={tabStyle(tab === t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => <div key={i} className="h-14 rounded-xl shimmer" />)}
        </div>
      ) : leaderboard.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 20px", color: "var(--ink-mute)" }}>
          <p style={{ fontFamily: "var(--font-serif)", fontSize: 16, color: "var(--ink-soft)", marginBottom: 8 }}>{tab === "friends" ? "No friends yet" : "No rankings yet"}</p>
          {tab === "friends" && (
            <Link href="/taste-profile" style={{ color: "var(--brand)", fontSize: 13, fontWeight: 500, textDecoration: "none" }}>Find people to follow →</Link>
          )}
        </div>
      ) : (
        <div className="space-y-1">
          {leaderboard.map((entry) => {
            const isMe     = entry.userId === user?.id;
            const initials = entry.displayName.slice(0, 2).toUpperCase();
            return (
              <Link
                key={entry.userId}
                href={entry.username ? `/u/${entry.username}` : "#"}
                style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "8px 8px", borderRadius: 12,
                  transition: "background 0.12s", textDecoration: "none",
                  background: isMe ? "rgba(225,75,51,0.04)" : "transparent",
                }}
              >
                <span style={{ fontSize: 11, color: "var(--ink-mute)", fontWeight: 700, width: 28, textAlign: "center", flexShrink: 0, fontFamily: "var(--font-mono)" }}>#{entry.rank}</span>
                <div style={{ width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 900, flexShrink: 0, background: isMe ? "var(--brand)" : "var(--sunk)" }}>
                  <span style={{ color: isMe ? "#fff" : "var(--ink-mute)" }}>{initials}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: isMe ? "var(--brand)" : "var(--ink)", fontFamily: "var(--font-ui)" }}>
                    {isMe ? "You" : entry.displayName}
                  </p>
                  {entry.username && <p style={{ fontSize: 11, color: "var(--ink-mute)" }}>@{entry.username}</p>}
                </div>
                <div style={{ width: 40, height: 40, borderRadius: "50%", border: `1.5px solid ${isMe ? "var(--brand)" : "var(--line)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: "var(--card)" }}>
                  <span style={{ fontWeight: 700, fontSize: 11, color: isMe ? "var(--brand)" : "var(--ink-mute)", fontFamily: "var(--font-mono)" }}>
                    {entry.score >= 1000 ? `${(entry.score / 1000).toFixed(1)}k` : entry.score}
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

export default function LeaderboardsPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 min-h-screen" style={{ background: "var(--paper)" }}>
      <div className="mb-6">
        <h1 style={{ fontSize: 22, fontWeight: 900, color: "var(--ink)", fontFamily: "var(--font-ui)", marginBottom: 4 }}>Leaderboard</h1>
        <p style={{ color: "var(--ink-mute)", fontSize: 13 }}>Top Rasika community members</p>
      </div>
      <LeaderboardsContent />
    </div>
  );
}
