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
    <div className="max-w-2xl mx-auto px-4 py-10 bg-stone-50 min-h-screen">

      <div className="mb-6">
        <h1 className="text-2xl font-black text-stone-900 mb-1">🎭 Taste Twins</h1>
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
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-stone-200 bg-white text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent shadow-sm"
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
        <div className="bg-white border border-stone-200 rounded-2xl p-5 mb-6 text-center shadow-sm">
          <p className="font-bold text-sm text-stone-900 mb-1">See how you compare</p>
          <p className="text-stone-500 text-xs mb-4">Sign in to get your % match with every member</p>
          <Link href="/login" className="inline-block bg-orange-600 text-white font-bold text-sm px-6 py-2.5 rounded-full hover:bg-orange-500 transition-colors">
            Sign in →
          </Link>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4].map((i) => <div key={i} className="h-20 rounded-2xl shimmer" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-stone-400">
          <p className="text-4xl mb-3">🎭</p>
          {search ? (
            <>
              <p className="mb-1 font-medium text-stone-600">No one found for "{search}"</p>
              <button onClick={() => setSearch("")} className="text-sm text-orange-600 hover:underline mt-1">Clear search</button>
            </>
          ) : (
            <>
              <p className="mb-1 font-medium text-stone-600">No other members yet</p>
              <p className="text-sm">Invite friends to compare taste!</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((person, i) => {
            const sim      = person.similarity;
            const initials = person.displayName.slice(0, 2).toUpperCase();
            const simColor = !sim ? "" : sim.pct >= 80 ? "text-emerald-600" : sim.pct >= 65 ? "text-orange-600" : "text-stone-500";
            const cardBg   = !sim ? "border-stone-200 bg-white" : sim.pct >= 80 ? "border-emerald-200 bg-emerald-50" : sim.pct >= 65 ? "border-orange-200 bg-orange-50" : "border-stone-200 bg-white";

            return (
              <div
                key={person.user_id}
                className={`flex items-center gap-3 rounded-2xl p-4 border transition-all ${cardBg}`}
              >
                {/* Rank */}
                <span className="text-stone-400 text-sm font-bold w-5 shrink-0 text-center">{i + 1}</span>

                {/* Clickable profile area */}
                <Link
                  href={`/people/${person.user_id}`}
                  className="flex items-center gap-3 flex-1 min-w-0 group"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center text-white text-sm font-black shrink-0">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-stone-900 group-hover:text-orange-600 transition-colors truncate">{person.displayName}</p>
                    <p className="text-xs text-stone-400 mt-0.5 truncate">
                      {person.handle && <span>{person.handle} · </span>}
                      {person.ratedCount} films
                      {sim ? ` · ${sim.shared} in common` : ""}
                      {person.location && <span> · {person.location}</span>}
                    </p>
                  </div>
                  {person.topFilm?.poster_url && (
                    <div className="w-8 h-11 rounded-md overflow-hidden bg-stone-100 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                      <img src={person.topFilm.poster_url} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                </Link>

                {/* Similarity score */}
                <div className="shrink-0 text-right w-14">
                  {sim ? (
                    <>
                      <p className={`text-xl font-black ${simColor}`}>{sim.pct}%</p>
                      <p className="text-[10px] text-stone-400">alike</p>
                    </>
                  ) : user ? (
                    <p className="text-xs text-stone-400 leading-tight">Not enough overlap</p>
                  ) : <p className="text-xs text-stone-400">—</p>}
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
