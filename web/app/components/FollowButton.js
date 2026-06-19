"use client";

import { useState } from "react";
import { createClient } from "../../lib/supabase-browser";
import { useRouter } from "next/navigation";
import { awardPoints } from "../../lib/points";
import { checkAndAwardBadges, BADGES } from "../../lib/badges";
import BadgeToast from "./BadgeToast";

export default function FollowButton({ userId, initialFollowing = false, size = "md" }) {
  const supabase = createClient();
  const router   = useRouter();
  const [following,  setFollowing]  = useState(initialFollowing);
  const [pending,    setPending]    = useState(false);
  const [newBadges,  setNewBadges]  = useState([]);

  async function toggleFollow() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    if (user.id === userId) return;
    if (pending) return;

    setPending(true);
    if (following) {
      await supabase.from("user_follows").delete()
        .eq("follower_id", user.id).eq("following_id", userId);
      setFollowing(false);
    } else {
      await supabase.from("user_follows").insert({ follower_id: user.id, following_id: userId });
      setFollowing(true);

      // Award points + check badges
      const [, earnedIds] = await Promise.all([
        awardPoints(supabase, user.id, "FOLLOW_USER"),
        checkAndAwardBadges(supabase, user.id),
      ]);
      if (earnedIds?.length > 0) {
        const earned = BADGES.filter((b) => earnedIds.includes(b.id));
        if (earned.length > 0) setNewBadges(earned);
      }
    }
    setPending(false);
  }

  const sizeClass = size === "sm" ? "text-xs px-2.5 py-1" : "text-sm px-4 py-2";

  return (
    <>
      {newBadges.length > 0 && <BadgeToast badges={newBadges} />}
      <button
        onClick={toggleFollow}
        disabled={pending}
        className={`font-bold rounded-full transition-all ${sizeClass} disabled:opacity-40`}
        style={{
          background: following ? "var(--sunk)" : "var(--brand)",
          color: following ? "var(--ink-soft)" : "#fff",
          border: following ? "1px solid var(--line)" : "none",
          fontFamily: "var(--font-ui)",
        }}
      >
        {following ? "Following" : "+ Follow"}
      </button>
    </>
  );
}
