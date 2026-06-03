"use client";

import { useState } from "react";
import { createClient } from "../../lib/supabase-browser";
import { awardPoints } from "../../lib/points";

export default function WahWahButton({ targetType, targetId, initialCount = 0, initialVoted = false, size = "md" }) {
  const supabase = createClient();
  const [count,   setCount]   = useState(initialCount);
  const [voted,   setVoted]   = useState(initialVoted);
  const [pending, setPending] = useState(false);

  async function toggleWahWah() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = "/login"; return; }
    if (pending) return;

    setPending(true);
    const table = targetType === "post" ? "community_posts" : targetType === "activity" ? "activity_feed" : "community_lists";

    if (voted) {
      await supabase.from("wah_wahs").delete()
        .eq("user_id", user.id).eq("target_type", targetType).eq("target_id", targetId);
      await supabase.from(table).update({ wah_wah_count: Math.max(0, count - 1) }).eq("id", targetId);
      setCount(Math.max(0, count - 1));
      setVoted(false);
    } else {
      await supabase.from("wah_wahs").insert({ user_id: user.id, target_type: targetType, target_id: targetId });
      await supabase.from(table).update({ wah_wah_count: count + 1 }).eq("id", targetId);
      setCount(count + 1);
      setVoted(true);

      // Award points
      await awardPoints(supabase, user.id, "RECEIVE_WAH");
    }
    setPending(false);
  }

  const sizeClass = size === "sm" ? "text-xs px-2 py-1 gap-1" : "text-sm px-3 py-1.5 gap-1.5";

  return (
    <button
      onClick={toggleWahWah}
      disabled={pending}
      className={`flex items-center gap-1 border rounded-full font-medium transition-all ${sizeClass} ${
        voted
          ? "bg-orange-50 border-orange-400 text-orange-600"
          : "bg-white border-stone-200 text-stone-500 hover:border-orange-300 hover:text-orange-600"
      } disabled:opacity-40`}
    >
      👏 {count > 0 ? count : "Wah"}
    </button>
  );
}
