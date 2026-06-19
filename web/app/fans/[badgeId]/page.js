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
      const badgeDef = BADGES.find(b => b.id === badgeId);
      if (!badgeDef) {
        router.push("/community");
        return;
      }
      setBadge(badgeDef);

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
    <div style={{ maxWidth: 896, margin: "0 auto", padding: "64px 16px", textAlign: "center", color: "var(--ink-mute)" }}>
      <div className="shimmer" style={{ width: 48, height: 48, borderRadius: "28%", margin: "0 auto 16px" }} />
      <p style={{ fontFamily: "var(--font-ui)", fontSize: 14 }}>Loading community…</p>
    </div>
  );

  if (!badge) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 min-h-screen" style={{ background: "var(--paper)" }}>

      {/* Header */}
      <div className="mb-8">
        <Link href="/community" style={{ color: "var(--brand)", fontSize: 13, fontWeight: 600, textDecoration: "none", display: "block", marginBottom: 16, fontFamily: "var(--font-ui)" }}>
          ← Back to Communities
        </Link>
        <div className="flex items-start gap-4">
          <div style={{ width: 56, height: 56, borderRadius: "28%", background: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 18, fontWeight: 900, fontFamily: "var(--font-mono)", flexShrink: 0 }}>
            {badge.label.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1">
            <h1 style={{ fontSize: 28, fontWeight: 900, color: "var(--ink)", fontFamily: "var(--font-ui)", marginBottom: 4 }}>{badge.label}</h1>
            <p style={{ color: "var(--ink-mute)", fontSize: 14, marginBottom: 12 }}>{badge.desc}</p>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ background: "rgba(225,75,51,0.08)", border: "1px solid rgba(225,75,51,0.2)", color: "var(--brand)", fontWeight: 700, fontSize: 12, padding: "4px 12px", borderRadius: "var(--radius-pill)", fontFamily: "var(--font-ui)" }}>
                {users.length} fan{users.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Users grid */}
      {users.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 20px", color: "var(--ink-mute)" }}>
          <p style={{ fontFamily: "var(--font-serif)", fontSize: 18, color: "var(--ink-soft)", marginBottom: 8 }}>No one has this badge yet</p>
          <p style={{ fontSize: 14, color: "var(--ink-mute)", marginBottom: 24 }}>Be the first to unlock "{badge.label}"!</p>
          <Link href="/" style={{ display: "inline-block", background: "var(--brand)", color: "#fff", fontWeight: 700, fontSize: 14, padding: "12px 24px", borderRadius: "var(--radius-pill)", textDecoration: "none", fontFamily: "var(--font-ui)", boxShadow: "var(--shadow-brand)" }}>
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
              <div key={u.user_id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 16, padding: 16, transition: "box-shadow 0.15s" }}>
                <Link href={profile?.username ? `/u/${profile.username}` : "#"} className="group block">
                  <div style={{ width: "100%", aspectRatio: "1", borderRadius: 12, background: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 22, fontWeight: 900, marginBottom: 12, fontFamily: "var(--font-mono)" }}>
                    {initials}
                  </div>
                  <h3 style={{ fontWeight: 700, color: "var(--ink)", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "var(--font-ui)" }}>
                    {displayName}
                  </h3>
                  {profile?.username && (
                    <p style={{ fontSize: 11, color: "var(--ink-mute)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>@{profile.username}</p>
                  )}
                  <p style={{ fontSize: 11, color: "var(--brand)", fontWeight: 700, marginTop: 8, fontFamily: "var(--font-mono)" }}>
                    {u.filmCount} films rated
                  </p>
                  <p style={{ fontSize: 10, color: "var(--ink-mute)", marginTop: 4 }}>
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
        <div style={{ marginTop: 48, background: "var(--card)", border: "1px solid var(--line)", borderRadius: 20, padding: 24, textAlign: "center", boxShadow: "var(--shadow-card)" }}>
          <p style={{ fontSize: 14, color: "var(--ink-mute)", marginBottom: 16 }}>Welcome to the {badge.label} community!</p>
          <p style={{ color: "var(--ink-soft)", fontSize: 14, marginBottom: 24, fontFamily: "var(--font-ui)" }}>
            Join these {users.length} passionate film enthusiasts who share your love for
            <strong style={{ display: "block", color: "var(--ink)", fontSize: 18, marginTop: 4, fontFamily: "var(--font-serif)" }}>{badge.desc}</strong>
          </p>
          <Link href="/badges" style={{ display: "inline-block", background: "var(--brand)", color: "#fff", fontWeight: 700, padding: "12px 24px", borderRadius: "var(--radius-pill)", textDecoration: "none", fontFamily: "var(--font-ui)", boxShadow: "var(--shadow-brand)" }}>
            Explore more fan cultures →
          </Link>
        </div>
      )}

    </div>
  );
}
