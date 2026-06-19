"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "../../../../lib/supabase-browser";
import WahWahButton from "../../../components/WahWahButton";
import Link from "next/link";

const RATING_COLORS = { 5: "#E14B33", 4: "#E6A437", 3: "#C07A4E", 2: "#8C8A93", 1: "#8C8A93" };

function timeAgo(d) {
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 86400) return `${Math.floor(s/3600) || 1}h ago`;
  if (s < 604800)return `${Math.floor(s/86400)}d ago`;
  return new Date(d).toLocaleDateString("en",{month:"short",day:"numeric",year:"numeric"});
}

export default function ListPage() {
  const { id }   = useParams();
  const router   = useRouter();
  const supabase = createClient();

  const [user,    setUser]    = useState(null);
  const [list,    setList]    = useState(null);
  const [items,   setItems]   = useState([]);
  const [author,  setAuthor]  = useState(null);
  const [voted,   setVoted]   = useState(false);
  const [ratings, setRatings] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [id]);

  async function load() {
    const [{ data: listData }, { data: { user } }] = await Promise.all([
      supabase.from("community_lists").select("*").eq("id", id).single(),
      supabase.auth.getUser(),
    ]);

    if (!listData) { setLoading(false); return; }
    setList(listData);
    setUser(user);

    const { data: rawItems } = await supabase
      .from("community_list_items")
      .select("movie_id, position, note, movies(id,title,year,poster_url,tmdb_rating,genres,global_score)")
      .eq("list_id", id)
      .order("position");

    const [{ data: profile }, voteRes] = await Promise.all([
      supabase.from("user_profiles").select("user_id,display_name,email").eq("user_id", listData.user_id).single(),
      user ? supabase.from("community_votes").select("id").eq("user_id",user.id).eq("target_type","list").eq("target_id",id).single() : { data: null },
    ]);

    setAuthor(profile);
    setVoted(!!voteRes.data);
    setItems((rawItems ?? []).map(i => ({ ...i.movies, note: i.note, position: i.position })).filter(Boolean));

    if (user) {
      const movieIds = (rawItems ?? []).map(i => i.movie_id);
      const { data: reactions } = await supabase.from("user_reactions")
        .select("movie_id,rating").eq("user_id", user.id).in("movie_id", movieIds);
      setRatings(Object.fromEntries((reactions ?? []).map(r => [r.movie_id, r.rating])));
    }

    setLoading(false);
  }

  async function toggleVote() {
    if (!user) { router.push("/login"); return; }
    if (voted) {
      await supabase.from("community_votes").delete().eq("user_id",user.id).eq("target_type","list").eq("target_id",id);
      await supabase.from("community_lists").update({ upvotes: Math.max(0,list.upvotes-1) }).eq("id",id);
      setList(l => ({ ...l, upvotes: Math.max(0, l.upvotes-1) }));
      setVoted(false);
    } else {
      await supabase.from("community_votes").insert({ user_id: user.id, target_type: "list", target_id: id });
      await supabase.from("community_lists").update({ upvotes: list.upvotes+1 }).eq("id",id);
      setList(l => ({ ...l, upvotes: l.upvotes+1 }));
      setVoted(true);
    }
  }

  const seenCount = items.filter(m => ratings[m.id]).length;

  if (loading) return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 rounded-xl shimmer"/>)}</div>
    </div>
  );
  if (!list) return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center" style={{ color: "var(--ink-mute)" }}>
      <p style={{ fontFamily: "var(--font-serif)", fontSize: 18, color: "var(--ink-soft)", marginBottom: 12 }}>List not found</p>
      <Link href="/community" style={{ color: "var(--brand)", textDecoration: "none", fontSize: 13 }}>← Community</Link>
    </div>
  );

  const authorName = author?.display_name || author?.email?.split("@")[0] || "Someone";
  const initials   = authorName.slice(0,2).toUpperCase();

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 min-h-screen" style={{ background: "var(--paper)" }}>
      <Link href="/community" style={{ color: "var(--ink-mute)", fontSize: 13, textDecoration: "none", display: "block", marginBottom: 24 }}>← Community</Link>

      {/* List header */}
      <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 16, padding: 20, marginBottom: 20, boxShadow: "var(--shadow-card)" }}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {list.is_ranked && <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">Ranked</span>}
              <span style={{ fontSize: 10, color: "var(--ink-mute)" }}>{items.length} films</span>
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 900, color: "var(--ink)", marginBottom: 4, fontFamily: "var(--font-ui)" }}>{list.title}</h1>
            {list.description && <p style={{ color: "var(--ink-soft)", fontSize: 13, lineHeight: 1.5, marginBottom: 12 }}>{list.description}</p>}

            <div className="flex items-center gap-3">
              <Link href={`/people/${list.user_id}`} className="flex items-center gap-2 group">
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 9, fontWeight: 900 }}>{initials}</div>
                <span style={{ fontSize: 11, color: "var(--ink-soft)", fontWeight: 500 }}>{authorName}</span>
              </Link>
              <span style={{ fontSize: 10, color: "var(--ink-mute)" }}>{timeAgo(list.created_at)}</span>
              {user && seenCount > 0 && (
                <span style={{ fontSize: 10, color: "var(--brand)", fontWeight: 500 }}>{seenCount} seen by you</span>
              )}
            </div>
          </div>

          <div className="shrink-0">
            <WahWahButton targetType="list" targetId={id} initialCount={list.upvotes} initialVoted={voted} size="sm" />
          </div>
        </div>
      </div>

      {/* Films */}
      {list.is_ranked ? (
        <div className="space-y-2">
          {items.map((movie, i) => {
            const userRating = ratings[movie.id];
            const score      = movie.global_score ? Math.round(movie.global_score) : null;
            return (
              <Link key={movie.id} href={`/movies/${movie.id}`}
                style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--card)", border: "1px solid var(--line)", borderRadius: 16, padding: 12, textDecoration: "none", transition: "all 0.15s" }}
                className="group hover:shadow-sm">
                <span style={{ color: "var(--ink-mute)", fontWeight: 700, fontSize: 13, width: 24, textAlign: "center", flexShrink: 0, fontFamily: "var(--font-mono)" }}>#{i+1}</span>
                <div style={{ width: 40, height: 56, borderRadius: 8, overflow: "hidden", background: "var(--sunk)", flexShrink: 0 }}>
                  {movie.poster_url ? <img src={movie.poster_url} alt={movie.title} className="w-full h-full object-cover"/> : null}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "var(--font-ui)" }}>{movie.title}</p>
                  <p style={{ fontSize: 11, color: "var(--ink-mute)" }}>{movie.year}{movie.genres?.length ? ` · ${movie.genres.slice(0,2).join(", ")}` : ""}</p>
                  {movie.note && <p style={{ fontSize: 11, color: "var(--ink-soft)", fontStyle: "italic", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>"{movie.note}"</p>}
                </div>
                <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 8 }}>
                  {userRating && <div style={{ width: 8, height: 8, borderRadius: "28%", background: RATING_COLORS[userRating] ?? "var(--ink-mute)" }} />}
                  {score && <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-mute)", fontFamily: "var(--font-mono)" }}>{score}</span>}
                  {!score && movie.tmdb_rating > 0 && <span style={{ fontSize: 10, color: "var(--ink-mute)", fontFamily: "var(--font-mono)" }}>{Math.round(movie.tmdb_rating * 10)}</span>}
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {items.map(movie => {
            const userRating = ratings[movie.id];
            return (
              <Link key={movie.id} href={`/movies/${movie.id}`} className="group block" style={{ textDecoration: "none" }}>
                <div style={{ position: "relative", aspectRatio: "2/3", borderRadius: 12, overflow: "hidden", background: "var(--sunk)", boxShadow: "0 2px 8px rgba(0,0,0,0.08)", marginBottom: 6 }}>
                  {movie.poster_url
                    ? <img src={movie.poster_url} alt={movie.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy"/>
                    : null
                  }
                  {userRating && <div style={{ position: "absolute", top: 6, right: 6, width: 8, height: 8, borderRadius: "28%", background: RATING_COLORS[userRating] ?? "var(--ink-mute)", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />}
                </div>
                <p style={{ fontSize: 11, fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "var(--font-ui)" }}>{movie.title}</p>
                <p style={{ fontSize: 10, color: "var(--ink-mute)" }}>{movie.year}</p>
                {movie.note && <p style={{ fontSize: 10, color: "var(--ink-mute)", fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>"{movie.note}"</p>}
              </Link>
            );
          })}
        </div>
      )}

      {/* Add to watchlist CTA */}
      {user && items.filter(m => !ratings[m.id]).length > 0 && (
        <div style={{ marginTop: 32, textAlign: "center", background: "rgba(225,75,51,0.04)", border: "1px solid rgba(225,75,51,0.12)", borderRadius: 16, padding: 16 }}>
          <p style={{ fontSize: 13, color: "var(--ink-soft)", fontWeight: 500, marginBottom: 2 }}>
            {items.filter(m => !ratings[m.id]).length} films you haven't rated
          </p>
          <p style={{ fontSize: 11, color: "var(--ink-mute)" }}>Click any film to rate it</p>
        </div>
      )}
    </div>
  );
}
