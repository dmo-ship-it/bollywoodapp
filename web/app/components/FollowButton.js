"use client";

import { useState } from "react";
import { createClient } from "../../lib/supabase-browser";
import { useRouter } from "next/navigation";
import { awardPoints } from "../../lib/points";

export default function FollowButton({ userId, initialFollowing = false, size = "md" }) {
  const supabase = createClient();
  const router   = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [pending,   setPending]   = useState(false);

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

      // Award points
      await awardPoints(supabase, user.id, "FOLLOW_USER");
    }
    setPending(false);
  }

  const sizeClass = size === "sm" ? "text-xs px-2.5 py-1" : "text-sm px-4 py-2";

  return (
    <button
      onClick={toggleFollow}
      disabled={pending}
      className={`font-bold rounded-full transition-all ${sizeClass} ${
        following
          ? "bg-stone-100 text-stone-700 border border-stone-200 hover:bg-stone-200"
          : "bg-orange-600 text-white hover:bg-orange-500 border border-orange-600"
      } disabled:opacity-40`}
    >
      {following ? "Following" : "+ Follow"}
    </button>
  );
}
