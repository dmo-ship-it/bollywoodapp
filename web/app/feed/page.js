"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase-browser";
import WahWahButton from "../components/WahWahButton";
import Link from "next/link";

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
        <p className="text-4xl mb-4">👥</p>
        <p className="font-bold text-stone-900 text-lg mb-2">Sign in to see your friends' activity</p>
        <p className="text-stone-500 mb-6">Follow people to see what they're watching and rating</p>
        <Link href="/login" className="inline-block bg-orange-600 text-white font-bold px-6 py-2.5 rounded-full hover:bg-orange-500 transition-colors">
          Sign in →
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-1 bg-stone-100 rounded-xl p-1 mb-6 w-fit">
        {user && (
          <button
            onClick={() => setTab("following")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === "following" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-700"}`}
          >
            Friends
          </button>
        )}
        <button
          onClick={() => setTab("all")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === "all" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-700"}`}
        >
          Global
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-20 rounded-2xl shimmer"/>)}</div>
      ) : activities.length === 0 ? (
        <div className="text-center py-16 bg-white border border-stone-200 rounded-2xl text-stone-400">
          <p className="text-3xl mb-3">🎬</p>
          <p className="font-medium text-stone-600 mb-1">No activity yet</p>
          <p className="text-sm mb-4">{tab === "following" ? "Follow people to see their activity" : "Be the first to rate a film!"}</p>
          <Link href="/" className="text-orange-600 text-sm hover:underline">Discover films →</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map(activity => {
            const name = activity.user_profiles?.display_name || activity.user_profiles?.email?.split("@")[0] || "Someone";
            const initials = name.slice(0, 2).toUpperCase();
            const movie = activity.movies;
            const ratingMap = { 5: "❤️", 4: "👍", 3: "😐", 2: "👎", 1: "💔" };
            const emoji = activity.activity_type === "rated" ? ratingMap[activity.metadata?.rating] ?? "⭐" : "🔖";
            return (
              <div key={activity.id} className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm hover:border-stone-300 transition-all">
                <div className="flex items-center gap-3">
                  <Link href={`/people/${activity.user_id}`} className="shrink-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center text-white text-xs font-black">
                      {initials}
                    </div>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link href={`/people/${activity.user_id}`} className="text-sm font-semibold text-stone-900 hover:text-orange-600 transition-colors">
                      {name}
                    </Link>
                    <p className="text-xs text-stone-500">{activity.activity_type === "rated" ? "rated" : "saved"} {movie?.title}</p>
                    <p className="text-[10px] text-stone-400 mt-0.5">{timeAgo(activity.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-base">{emoji}</span>
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
    <div className="max-w-2xl mx-auto px-4 py-8 bg-stone-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-stone-900">Feed</h1>
        <p className="text-stone-500 text-sm">What's everyone watching</p>
      </div>
      <FeedContent />
    </div>
  );
}
