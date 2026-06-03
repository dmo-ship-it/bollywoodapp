"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase-browser";

export default function WatchlistButton({ movieId, movieTitle, className = "" }) {
  const supabase  = createClient();
  const [saved,   setSaved]   = useState(false);
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [pulse,   setPulse]   = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user) {
        supabase.from("user_watchlist").select("id")
          .eq("user_id", data.user.id).eq("movie_id", movieId).single()
          .then(({ data: w }) => setSaved(!!w));
      }
    });
  }, [movieId]);

  async function toggle(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { window.location.href = "/login"; return; }
    if (loading) return;
    setLoading(true);

    if (saved) {
      await supabase.from("user_watchlist").delete()
        .eq("user_id", user.id).eq("movie_id", movieId);
      setSaved(false);
    } else {
      await supabase.from("user_watchlist").insert({ user_id: user.id, movie_id: movieId });
      await supabase.from("activity_feed").insert({
        user_id: user.id, activity_type: "watchlisted", movie_id: movieId,
        metadata: { title: movieTitle },
      });
      setSaved(true);
      setPulse(true);
      setTimeout(() => setPulse(false), 600);
    }
    setLoading(false);
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={saved ? "Remove from watchlist" : "Save to watchlist"}
      className={`transition-all ${pulse ? "scale-125" : "scale-100"} ${className}`}
    >
      {saved ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-orange-600">
          <path d="M5 4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v18l-7-3.5L5 22V4z"/>
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-stone-400 hover:text-orange-500 transition-colors">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
        </svg>
      )}
    </button>
  );
}
