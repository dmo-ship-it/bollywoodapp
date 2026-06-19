"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase-browser";
import WahWahButton from "../components/WahWahButton";
import Link from "next/link";

const RATING_COLORS = { 5: "#E14B33", 4: "#E6A437", 3: "#C07A4E", 2: "#8C8A93", 1: "#8C8A93" };

function timeAgo(d) {
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

export function FeedContent() {
  const supabase = createClient();

  const [user,       setUser]       = useState(null);
  const [tab,        setTab]        = useState("following");
  const [activities, setActivities] = useState([]);
  const [wahdIds,    setWahdIds]    = useState(new Set());
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  useEffect(() => { load(); }, [tab, user]); // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    setLoading(true);
    if (!user && tab === "following") { setActivities([]); setLoading(false); return; }

    let query = supabase
      .from("activity_feed")
      .select("id, user_id, activity_type, movie_id, created_at, metadata, wah_wah_count, user_profiles(user_id,display_name,email), movies(id,title,year,poster_url)")
      .order("created_at", { ascending: false })
      .limit(50);

    if (tab === "following" && user) {
      const { data: follows } = await supabase.from("user_follows")
        .select("following_id").eq("follower_id", user.id);
      const followingIds = [user.id, ...(follows?.map(f => f.following_id) ?? [])];
      query = query.in("user_id", followingIds);
    }

    const { data } = await query;
    const items = data ?? [];
    setActivities(items);

    // Fetch which items the current user has already wah'd
    if (user && items.length > 0) {
      const { data: wahs } = await supabase
        .from("wah_wahs")
        .select("target_id")
        .eq("user_id", user.id)
        .eq("target_type", "activity")
        .in("target_id", items.map(a => a.id));
      setWahdIds(new Set((wahs ?? []).map(w => w.target_id)));
    } else {
      setWahdIds(new Set());
    }

    setLoading(false);
  }

  if (!user && tab === "following") {
    return (
      <div className="py-16 text-center">
        <p style={{ fontFamily: "var(--font-serif)", fontSize: 18, color: "var(--ink-soft)", marginBottom: 8 }}>Sign in to see your friends' activity</p>
        <p style={{ color: "var(--ink-mute)", fontSize: 14, marginBottom: 24 }}>Follow people to see what they're watching and rating</p>
        <Link href="/login" style={{ display: "inline-block", background: "var(--brand)", color: "#fff", fontWeight: 700, padding: "10px 24px", borderRadius: "var(--radius-pill)", textDecoration: "none", fontFamily: "var(--font-ui)", boxShadow: "var(--shadow-brand)" }}>
          Sign in →
        </Link>
      </div>
    );
  }

  const tabStyle = (active) => ({
    padding: "8px 16px", borderRadius: 8, fontSize: 14, fontWeight: 500,
    fontFamily: "var(--font-ui)", border: "none", cursor: "pointer", transition: "all 0.15s",
    background: active ? "var(--card)" : "transparent",
    color: active ? "var(--ink)" : "var(--ink-mute)",
    boxShadow: active ? "var(--shadow-card)" : "none",
  });

  return (
    <div>
      <div style={{ display: "flex", gap: 4, background: "var(--sunk)", borderRadius: 12, padding: 4, marginBottom: 24, width: "fit-content" }}>
        {user && (
          <button onClick={() => setTab("following")} style={tabStyle(tab === "following")}>
            Friends
          </button>
        )}
        <button onClick={() => setTab("all")} style={tabStyle(tab === "all")}>
          Global
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-20 rounded-2xl shimmer"/>)}</div>
      ) : activities.length === 0 ? (
        <div style={{ textAlign: "center", padding: "64px 20px", background: "var(--card)", border: "1px solid var(--line)", borderRadius: 20, color: "var(--ink-mute)" }}>
          <p style={{ fontFamily: "var(--font-serif)", fontSize: 16, color: "var(--ink-soft)", marginBottom: 8 }}>No activity yet</p>
          <p style={{ fontSize: 14, color: "var(--ink-mute)", marginBottom: 16 }}>{tab === "following" ? "Follow people to see their activity" : "Be the first to rate a film!"}</p>
          <Link href="/" style={{ color: "var(--brand)", fontSize: 14, fontWeight: 500, textDecoration: "none" }}>Discover films →</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map(activity => {
            const name = activity.user_profiles?.display_name || activity.user_profiles?.email?.split("@")[0] || "Someone";
            const initials = name.slice(0, 2).toUpperCase();
            const movie = activity.movies;
            const isRating = activity.activity_type === "rated";
            const ratingColor = isRating ? (RATING_COLORS[activity.metadata?.rating] ?? "var(--ink-mute)") : "var(--ink-mute)";
            return (
              <div key={activity.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 20, padding: 16, boxShadow: "var(--shadow-card)" }}>
                <div className="flex items-center gap-3">
                  <Link href={`/people/${activity.user_id}`} className="shrink-0">
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 900, fontFamily: "var(--font-ui)" }}>
                      {initials}
                    </div>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link href={`/people/${activity.user_id}`} style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", textDecoration: "none", fontFamily: "var(--font-ui)" }}>
                      {name}
                    </Link>
                    <p style={{ fontSize: 12, color: "var(--ink-mute)", marginTop: 1 }}>{isRating ? "rated" : "saved"} {movie?.title}</p>
                    <p style={{ fontSize: 10, color: "var(--ink-mute)", marginTop: 2 }}>{timeAgo(activity.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div style={{ width: 10, height: 10, borderRadius: "28%", background: ratingColor, flexShrink: 0 }} />
                    {movie?.poster_url && (
                      <Link href={`/movies/${movie.id}`}>
                        <img src={movie.poster_url} alt={movie.title} className="w-8 h-12 rounded-lg object-cover shadow-sm" loading="lazy" />
                      </Link>
                    )}
                    {user && activity.user_id !== user.id && (
                      <WahWahButton
                        targetType="activity"
                        targetId={activity.id}
                        initialCount={activity.wah_wah_count ?? 0}
                        initialVoted={wahdIds.has(activity.id)}
                        size="sm"
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function FeedPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 min-h-screen" style={{ background: "var(--paper)" }}>
      <div className="mb-6">
        <h1 style={{ fontSize: 24, fontWeight: 900, color: "var(--ink)", fontFamily: "var(--font-ui)", marginBottom: 4 }}>Feed</h1>
        <p style={{ color: "var(--ink-mute)", fontSize: 14 }}>What's everyone watching</p>
      </div>
      <FeedContent />
    </div>
  );
}
