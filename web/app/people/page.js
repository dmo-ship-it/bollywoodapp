"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase-browser";
import Link from "next/link";
import FollowButton from "../components/FollowButton";

function computeSimilarity(myScores, theirScores) {
  const shared = Object.keys(myScores).filter((id) => theirScores[id] != null);
  if (shared.length < 3) return null;
  const avg = shared.reduce((sum, id) => sum + (1 - Math.abs(myScores[id] - theirScores[id]) / 100), 0) / shared.length;
  return { pct: Math.round(avg * 100), shared: shared.length };
}

const FLAGS = { IN:"🇮🇳",US:"🇺🇸",GB:"🇬🇧",CA:"🇨🇦",AU:"🇦🇺",AE:"🇦🇪",SG:"🇸🇬",NZ:"🇳🇿",ZA:"🇿🇦",MY:"🇲🇾",QA:"🇶🇦" };

export default function PeoplePage() {
  const supabase = createClient();
  const [user,         setUser]         = useState(null);
  const [people,       setPeople]       = useState([]);
  const [followingSet, setFollowingSet] = useState(new Set());
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState("");

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      const [
        { data: profiles },
        { data: allReactions },
        { data: myFollows },
      ] = await Promise.all([
        supabase.from("user_profiles").select("user_id, email, display_name, username, country, city"),
        supabase.from("user_reactions").select("user_id, movie_id, score, rating, movies(id, title, poster_url)").gt("rating", 0).not("score", "is", null),
        user
          ? supabase.from("user_follows").select("following_id").eq("follower_id", user.id)
          : Promise.resolve({ data: [] }),
      ]);

      if (!profiles || !allReactions) { setLoading(false); return; }

      // Build set of already-followed IDs
      setFollowingSet(new Set((myFollows ?? []).map((f) => f.following_id)));

      const byUser = {}, topFilm = {};
      allReactions.forEach((r) => {
        if (!byUser[r.user_id]) byUser[r.user_id] = {};
        byUser[r.user_id][r.movie_id] = r.score;
        if (!topFilm[r.user_id] || r.score > (topFilm[r.user_id]?.score ?? 0))
          topFilm[r.user_id] = { score: r.score, movie: r.movies };
      });

      const myScores = user ? (byUser[user.id] ?? {}) : {};

      const result = profiles
        .filter((p) => p.user_id !== user?.id && byUser[p.user_id])
        .map((p) => ({
          user_id:     p.user_id,
          displayName: p.display_name || p.email?.split("@")[0] || "User",
          handle:      p.username ? `@${p.username}` : null,
          location:    [p.city, p.country ? FLAGS[p.country] : null].filter(Boolean).join(" "),
          ratedCount:  Object.keys(byUser[p.user_id] ?? {}).length,
          similarity:  user ? computeSimilarity(myScores, byUser[p.user_id]) : null,
          topFilm:     topFilm[p.user_id]?.movie ?? null,
        }))
        .filter((p) => p.ratedCount >= 1)
        .sort((a, b) => (b.similarity?.pct ?? -1) - (a.similarity?.pct ?? -1));

      setPeople(result);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = search.trim()
    ? people.filter((p) => {
        const q = search.toLowerCase();
        return (
          p.displayName.toLowerCase().includes(q) ||
          p.handle?.toLowerCase().includes(q)
        );
      })
    : people;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 min-h-screen" style={{ background: "var(--paper)" }}>

      <div className="mb-6">
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 28, fontWeight: 700, color: "var(--ink)", marginBottom: 4 }}>Taste Twins</h1>
        <p className="text-stone-500 text-sm">
          {user ? "People ranked by how closely their taste matches yours" : "Discover others with similar taste — sign in to see your match %"}
        </p>
      </div>

      {/* Search bar */}
      <div className="relative mb-6">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or @username…"
          style={{ width: "100%", paddingLeft: 36, paddingRight: 16, paddingTop: 10, paddingBottom: 10, borderRadius: 12, border: "1.5px solid var(--line)", background: "var(--card)", fontSize: 14, color: "var(--ink)", outline: "none", boxSizing: "border-box", fontFamily: "var(--font-ui)" }}
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        )}
      </div>

      {!user && (
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 20, padding: 20, marginBottom: 24, textAlign: "center", boxShadow: "var(--shadow-card)" }}>
          <p style={{ fontWeight: 700, fontSize: 14, color: "var(--ink)", marginBottom: 4, fontFamily: "var(--font-ui)" }}>See how you compare</p>
          <p style={{ color: "var(--ink-mute)", fontSize: 12, marginBottom: 16 }}>Sign in to get your % match with every member</p>
          <Link href="/login" style={{ display: "inline-block", background: "var(--brand)", color: "#fff", fontWeight: 700, fontSize: 14, padding: "10px 24px", borderRadius: "var(--radius-pill)", textDecoration: "none", fontFamily: "var(--font-ui)" }}>
            Sign in →
          </Link>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4].map((i) => <div key={i} className="h-20 rounded-2xl shimmer" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 0", color: "var(--ink-mute)" }}>
          {search ? (
            <>
              <p style={{ marginBottom: 4, fontWeight: 500, color: "var(--ink-soft)", fontFamily: "var(--font-ui)" }}>No one found for "{search}"</p>
              <button onClick={() => setSearch("")} style={{ fontSize: 13, color: "var(--brand)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-ui)" }}>Clear search</button>
            </>
          ) : (
            <>
              <p style={{ marginBottom: 4, fontWeight: 500, color: "var(--ink-soft)", fontFamily: "var(--font-ui)" }}>No other members yet</p>
              <p style={{ fontSize: 13 }}>Invite friends to compare taste!</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((person, i) => {
            const sim      = person.similarity;
            const initials = person.displayName.slice(0, 2).toUpperCase();
            const simColor = !sim ? "var(--ink-mute)" : sim.pct >= 80 ? "#22c55e" : sim.pct >= 65 ? "var(--brand)" : "var(--ink-mute)";
            const cardBorder = !sim ? "var(--line)" : sim.pct >= 80 ? "rgba(34,197,94,0.3)" : sim.pct >= 65 ? "rgba(225,75,51,0.25)" : "var(--line)";
            const cardBg = !sim ? "var(--card)" : sim.pct >= 80 ? "rgba(34,197,94,0.04)" : sim.pct >= 65 ? "rgba(225,75,51,0.04)" : "var(--card)";

            return (
              <div
                key={person.user_id}
                style={{ display: "flex", alignItems: "center", gap: 12, borderRadius: 16, padding: 16, border: `1px solid ${cardBorder}`, background: cardBg, transition: "box-shadow 0.15s" }}
              >
                {/* Rank */}
                <span style={{ color: "var(--ink-mute)", fontSize: 13, fontWeight: 700, width: 20, flexShrink: 0, textAlign: "center" }}>{i + 1}</span>

                {/* Clickable profile area */}
                <Link
                  href={`/people/${person.user_id}`}
                  style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0, textDecoration: "none" }}
                >
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14, fontWeight: 900, flexShrink: 0 }}>
                    {initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: 14, color: "var(--ink)", marginBottom: 2, fontFamily: "var(--font-ui)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{person.displayName}</p>
                    <p style={{ fontSize: 12, color: "var(--ink-mute)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {person.handle && <span>{person.handle} · </span>}
                      {person.ratedCount} films
                      {sim ? ` · ${sim.shared} in common` : ""}
                      {person.location && <span> · {person.location}</span>}
                    </p>
                  </div>
                  {person.topFilm?.poster_url && (
                    <div style={{ width: 32, height: 44, borderRadius: 6, overflow: "hidden", background: "var(--sunk)", flexShrink: 0, opacity: 0.7 }}>
                      <img src={person.topFilm.poster_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                  )}
                </Link>

                {/* Similarity score */}
                <div style={{ flexShrink: 0, textAlign: "right", width: 56 }}>
                  {sim ? (
                    <>
                      <p style={{ fontSize: 20, fontWeight: 900, color: simColor, fontFamily: "var(--font-ui)" }}>{sim.pct}%</p>
                      <p style={{ fontSize: 10, color: "var(--ink-mute)" }}>alike</p>
                    </>
                  ) : user ? (
                    <p style={{ fontSize: 11, color: "var(--ink-mute)", lineHeight: 1.3 }}>Not enough overlap</p>
                  ) : <p style={{ fontSize: 11, color: "var(--ink-mute)" }}>—</p>}
                </div>

                {/* Follow button */}
                {user && (
                  <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                    <FollowButton
                      userId={person.user_id}
                      initialFollowing={followingSet.has(person.user_id)}
                      size="sm"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
