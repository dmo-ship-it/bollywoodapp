"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../../lib/supabase-browser";
import Link from "next/link";

const EMOJI_MAP = { 5: "😍", 4: "😊", 3: "😐", 2: "😕", 1: "😡" };
const COMMUNITY_THRESHOLD = 10;

export default function FriendsOnThisFilm({ movieId }) {
  const supabase = createClient();
  const [friends,      setFriends]      = useState([]);   // [{userId, name, rating}]
  const [totalRatings, setTotalRatings] = useState(0);
  const [ready,        setReady]        = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();

      // Always fetch total community rating count
      const { count } = await supabase
        .from("user_reactions")
        .select("*", { count: "exact", head: true })
        .eq("movie_id", movieId)
        .gt("rating", 0);
      setTotalRatings(count ?? 0);

      if (!user) { setReady(true); return; }

      // Who does the current user follow?
      const { data: follows } = await supabase
        .from("user_follows")
        .select("following_id")
        .eq("follower_id", user.id);

      if (!follows?.length) { setReady(true); return; }

      const friendIds = follows.map(f => f.following_id);

      // Which friends have rated this film?
      const { data: reactions } = await supabase
        .from("user_reactions")
        .select("user_id, rating, user_profiles(display_name, email)")
        .eq("movie_id", movieId)
        .in("user_id", friendIds)
        .gt("rating", 0);

      setFriends(
        (reactions ?? []).map(r => ({
          userId: r.user_id,
          name: r.user_profiles?.display_name || r.user_profiles?.email?.split("@")[0] || "Friend",
          rating: r.rating,
        }))
      );
      setReady(true);
    }
    load();
  }, [movieId]);

  if (!ready) return null;

  const showFriends = friends.length > 0;
  const showCount   = totalRatings >= COMMUNITY_THRESHOLD;

  // Nothing to display
  if (!showFriends && !showCount) return null;

  // Summarise friend names
  const friendSummary = (() => {
    if (friends.length === 0) return null;
    if (friends.length === 1) return `${friends[0].name} has seen this`;
    if (friends.length === 2) return `${friends[0].name} and ${friends[1].name} have seen this`;
    return `${friends[0].name} and ${friends.length - 1} others have seen this`;
  })();

  return (
    <div className="mt-5 pt-5 border-t border-stone-100">
      {showFriends && (
        <div className="mb-3">
          {/* Avatar row */}
          <div className="flex items-center gap-2 mb-1.5">
            <div className="flex -space-x-2">
              {friends.slice(0, 5).map(f => {
                const initials = f.name.slice(0, 2).toUpperCase();
                return (
                  <Link
                    key={f.userId}
                    href={`/people/${f.userId}`}
                    title={`${f.name} · ${EMOJI_MAP[f.rating]}`}
                    className="relative shrink-0 group"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center text-white text-[10px] font-black ring-2 ring-white">
                      {initials}
                    </div>
                    {/* Emoji badge */}
                    <span className="absolute -bottom-0.5 -right-0.5 text-[11px] leading-none">
                      {EMOJI_MAP[f.rating]}
                    </span>
                  </Link>
                );
              })}
            </div>
            {friends.length > 5 && (
              <span className="text-xs text-stone-400">+{friends.length - 5} more</span>
            )}
          </div>

          {/* Friend summary text */}
          <p className="text-xs text-stone-500">{friendSummary}</p>
        </div>
      )}

      {showCount && (
        <p className="text-xs text-stone-400">
          {totalRatings.toLocaleString()} {totalRatings === 1 ? "person" : "people"} have rated this on Bolly
        </p>
      )}
    </div>
  );
}
