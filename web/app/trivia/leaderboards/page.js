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
    <Link href={`/u/${entry.username}`} style={{ textDecoration: "none" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 16, padding: 16, borderRadius: 14,
        border: "1px solid", transition: "box-shadow 0.15s",
        background: isUser ? "rgba(225,75,51,0.04)" : "var(--card)",
        borderColor: isUser ? "rgba(225,75,51,0.2)" : "var(--line)",
      }}>
        {/* Rank */}
        <div style={{ width: 48, textAlign: "center", flexShrink: 0 }}>
          {entry.rank <= 3 ? (
            <span style={{ fontSize: 18, fontWeight: 900, color: entry.rank === 1 ? "#E6A437" : entry.rank === 2 ? "#9ca3af" : "#C07A4E", fontFamily: "var(--font-mono)" }}>
              #{entry.rank}
            </span>
          ) : (
            <span style={{ fontSize: 16, fontWeight: 700, color: "var(--ink-mute)", fontFamily: "var(--font-mono)" }}>#{entry.rank}</span>
          )}
        </div>

        {/* User Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 700, color: "var(--ink)", fontSize: 14, fontFamily: "var(--font-ui)" }}>{entry.displayName}</p>
          {entry.username && (
            <p style={{ fontSize: 12, color: "var(--ink-mute)" }}>@{entry.username}</p>
          )}
        </div>

        {/* Score */}
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          {tab === "accuracy" ? (
            <>
              <p style={{ fontSize: 22, fontWeight: 900, color: "var(--brand)", fontFamily: "var(--font-ui)" }}>{entry.accuracy}%</p>
              <p style={{ fontSize: 10, color: "var(--ink-mute)", fontFamily: "var(--font-mono)" }}>{entry.total} correct</p>
            </>
          ) : (
            <>
              <p style={{ fontSize: 22, fontWeight: 900, color: "#E6A437", fontFamily: "var(--font-ui)" }}>{entry.streak}</p>
              <p style={{ fontSize: 10, color: "var(--ink-mute)", fontFamily: "var(--font-mono)" }}>day streak</p>
            </>
          )}
        </div>
      </div>
    </Link>
  );

  const tabStyle = (active) => ({
    flex: 1, padding: "8px 16px", borderRadius: 8, fontSize: 14, fontWeight: 500,
    fontFamily: "var(--font-ui)", border: "none", cursor: "pointer", transition: "all 0.15s",
    background: active ? "var(--card)" : "transparent",
    color: active ? "var(--ink)" : "var(--ink-mute)",
    boxShadow: active ? "var(--shadow-card)" : "none",
  });

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 min-h-screen" style={{ background: "var(--paper)" }}>

      {/* Header */}
      <div className="mb-8">
        <h1 style={{ fontSize: 28, fontWeight: 900, color: "var(--ink)", fontFamily: "var(--font-serif)", marginBottom: 6 }}>Trivia Leaderboards</h1>
        <p style={{ color: "var(--ink-mute)", fontSize: 14 }}>Top Bollywood cinema experts</p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, background: "var(--sunk)", borderRadius: 12, padding: 4, marginBottom: 24 }}>
        {["accuracy", "streak"].map(t => (
          <button key={t} onClick={() => handleTabChange(t)} style={tabStyle(tab === t)}>
            {t === "accuracy" ? "Accuracy" : "Streaks"}
          </button>
        ))}
      </div>

      {/* Leaderboard */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl shimmer" />
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
        <div style={{ textAlign: "center", padding: "48px 20px", background: "var(--card)", border: "1px solid var(--line)", borderRadius: 20 }}>
          <p style={{ fontFamily: "var(--font-serif)", fontSize: 16, color: "var(--ink-soft)", marginBottom: 8 }}>No trivia responses yet</p>
        </div>
      )}

      {/* Back Link */}
      <div style={{ marginTop: 32, textAlign: "center" }}>
        <Link href="/trivia" style={{ color: "var(--brand)", fontWeight: 600, fontSize: 14, textDecoration: "none", fontFamily: "var(--font-ui)" }}>
          ← Back to Today's Trivia
        </Link>
      </div>

    </div>
  );
}
