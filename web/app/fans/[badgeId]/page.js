"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "../../../lib/supabase-browser";
import { BADGES } from "../../../lib/badges";

export default function FanCommunityPage() {
  const router = useRouter();
  const params = useParams();
  const supabase = createClient();

  const [users, setUsers] = useState([]);
  const [badge, setBadge] = useState(null);
  const [loading, setLoading] = useState(true);

  const badgeId = typeof params.badgeId === "string" ? params.badgeId : "";

  useEffect(() => {
    async function load() {
      // Find badge definition
      const badgeDef = BADGES.find(b => b.id === badgeId);
      if (!badgeDef) {
        router.push("/community");
        return;
      }
      setBadge(badgeDef);

      // Fetch all users with this badge
      const { data: badgeUsers } = await supabase
        .from("user_badges")
        .select(`
          user_id,
          earned_at,
          user_profiles (
            user_id,
            display_name,
            username,
            dna,
            city,
            country
          ),
          user_reactions (id)
        `)
        .eq("badge_id", badgeId);

      if (badgeUsers) {
        // Enrich with count of rated films
        const enriched = badgeUsers.map(bu => ({
          ...bu,
          filmCount: bu.user_reactions?.length || 0,
        }));
        setUsers(enriched.sort((a, b) => new Date(b.earned_at) - new Date(a.earned_at)));
      }

      setLoading(false);
    }
    load();
  }, [badgeId]);

  if (loading) return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-center text-stone-400">
      <div className="text-4xl mb-4 animate-pulse">🎬</div>
      Loading community…
    </div>
  );

  if (!badge) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 bg-stone-50 min-h-screen">

      {/* Header */}
      <div className="mb-8">
        <Link href="/community" className="text-orange-600 text-sm font-medium hover:underline mb-4 block">
          ← Back to Communities
        </Link>
        <div className="flex items-start gap-4">
          <div className="text-5xl">{badge.icon}</div>
          <div className="flex-1">
            <h1 className="text-3xl font-black text-stone-900 mb-1">{badge.label}</h1>
            <p className="text-stone-500 mb-3">{badge.desc}</p>
            <div className="flex items-center gap-2 text-sm">
              <span className="bg-orange-100 text-orange-600 font-bold px-3 py-1 rounded-full">
                👥 {users.length} fan{users.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Users grid */}
      {users.length === 0 ? (
        <div className="text-center py-20 text-stone-400">
          <p className="text-4xl mb-3">🎭</p>
          <p className="font-medium text-stone-600 mb-1">No one has this badge yet</p>
          <p className="text-sm mb-4">Be the first to unlock "{badge.label}"!</p>
          <Link href="/" className="inline-block bg-orange-600 text-white font-bold text-sm px-6 py-3 rounded-full hover:bg-orange-500 transition-colors">
            Start discovering films →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {users.map(u => {
            const profile = u.user_profiles;
            const displayName = profile?.display_name || "User";
            const initials = displayName.slice(0, 2).toUpperCase();
            const earnedDate = u.earned_at ? new Date(u.earned_at).toLocaleDateString() : "";

            return (
              <div key={u.user_id} className="bg-white border border-stone-200 rounded-xl p-4 hover:shadow-md transition-all">
                <Link href={profile?.username ? `/u/${profile.username}` : "#"} className="group block">
                  <div className="w-full aspect-square rounded-lg bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center text-white text-2xl font-black mb-3">
                    {initials}
                  </div>
                  <h3 className="font-bold text-stone-900 group-hover:text-orange-600 transition-colors truncate">
                    {displayName}
                  </h3>
                  {profile?.username && (
                    <p className="text-xs text-stone-400 truncate">@{profile.username}</p>
                  )}
                  <p className="text-xs text-orange-600 font-bold mt-2">
                    {u.filmCount} films rated
                  </p>
                  <p className="text-[10px] text-stone-400 mt-1">
                    Earned {earnedDate}
                  </p>
                </Link>
              </div>
            );
          })}
        </div>
      )}

      {/* Stats */}
      {users.length > 0 && (
        <div className="mt-12 bg-white border border-stone-200 rounded-2xl p-6 text-center">
          <p className="text-sm text-stone-500 mb-4">Welcome to the {badge.label} community! 🎉</p>
          <p className="text-stone-600 mb-6">
            Join these {users.length} passionate film enthusiasts who share your love for
            <strong className="block text-stone-900 text-lg mt-1">{badge.desc}</strong>
          </p>
          <Link href="/badges" className="inline-block bg-orange-600 text-white font-bold px-6 py-3 rounded-full hover:bg-orange-500 transition-colors">
            Explore more fan cultures →
          </Link>
        </div>
      )}

    </div>
  );
}
