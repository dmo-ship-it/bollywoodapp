"use client";

import Link from "next/link";
import FollowButton from "../components/FollowButton";
import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase-browser";

const FLAGS = { IN:"🇮🇳",US:"🇺🇸",GB:"🇬🇧",CA:"🇨🇦",AU:"🇦🇺",AE:"🇦🇪",SG:"🇸🇬",NZ:"🇳🇿",ZA:"🇿🇦",MY:"🇲🇾",QA:"🇶🇦" };

export default function UserProfileHeader({ userId, profile, ratedCount, lovedCount }) {
  const supabase = createClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [following, setFollowing] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      if (user && user.id !== userId) {
        const { data } = await supabase.from("user_follows")
          .select("id").eq("follower_id", user.id).eq("following_id", userId).single();
        setFollowing(!!data);
      }
    }
    load();
  }, [userId]);

  const displayName = profile.display_name || profile.email?.split("@")[0] || "User";
  const handle      = profile.username ? `@${profile.username}` : null;
  const initials    = displayName.slice(0, 2).toUpperCase();
  const location    = [profile.city, profile.country ? FLAGS[profile.country] : null].filter(Boolean).join(" · ");

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 20, padding: 20, marginBottom: 24, boxShadow: "var(--shadow-card)" }}>
      <div className="flex items-start gap-4">
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 20, fontWeight: 900, flexShrink: 0 }}>
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <h1 style={{ fontSize: 20, fontWeight: 900, color: "var(--ink)", lineHeight: 1.2, fontFamily: "var(--font-ui)" }}>{displayName}</h1>
            {(profile.streak_current ?? 0) > 0 && (
              <span style={{ fontSize: 11, background: "rgba(225,75,51,0.07)", border: "1px solid rgba(225,75,51,0.2)", color: "var(--brand)", fontWeight: 700, padding: "2px 8px", borderRadius: 999, fontFamily: "var(--font-ui)" }}>
                {profile.streak_current}wk streak
              </span>
            )}
          </div>

          {/* Handle + location */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-stone-500">
            {handle   && <span>{handle}</span>}
            {location && (
              <span className="flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-stone-400"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                {location}
              </span>
            )}
          </div>

          {/* Language chips */}
          {profile.languages?.length > 0 && (
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {profile.languages.map((l) => (
                <span key={l} className="text-[10px] bg-stone-100 border border-stone-200 text-stone-500 px-2 py-0.5 rounded-full">{l}</span>
              ))}
            </div>
          )}

          {/* Stats row */}
          <div className="flex gap-5 mt-3 text-sm">
            <span><strong className="text-stone-900">{ratedCount}</strong> <span className="text-stone-400">rated</span></span>
            <span><strong className="text-stone-900">{lovedCount}</strong> <span className="text-stone-400">loved</span></span>
          </div>
        </div>

        {/* Follow button */}
        {currentUser && currentUser.id !== userId && (
          <div className="shrink-0">
            <FollowButton userId={userId} initialFollowing={following} size="md" />
          </div>
        )}
      </div>
    </div>
  );
}
