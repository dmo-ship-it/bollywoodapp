"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "../../../../lib/supabase-browser";
import WahWahButton from "../../../components/WahWahButton";
import Link from "next/link";

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

  const RATING_EMOJI = { 5:"❤️", 4:"👍", 3:"😐", 2:"👎", 1:"💔" };
  const seenCount    = items.filter(m => ratings[m.id]).length;

  if (loading) return <div className="max-w-2xl mx-auto px-4 py-16 text-center text-stone-400"><div className="text-3xl animate-pulse mb-3">📋</div>Loading…</div>;
  if (!list)   return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center text-stone-400">
      <p className="text-4xl mb-3">📋</p><p className="text-stone-600 font-medium">List not found</p>
      <Link href="/community" className="text-orange-600 hover:underline mt-3 block">← Community</Link>
    </div>
  );

  const authorName = author?.display_name || author?.email?.split("@")[0] || "Someone";
  const initials   = authorName.slice(0,2).toUpperCase();

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 bg-stone-50 min-h-screen">
      <Link href="/community" className="text-stone-400 text-sm hover:text-stone-700 transition-colors mb-6 block">← Community</Link>

      {/* List header */}
      <div className="bg-white border border-stone-200 rounded-2xl p-5 mb-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {list.is_ranked && <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">Ranked</span>}
              <span className="text-[10px] text-stone-400">{items.length} films</span>
            </div>
            <h1 className="text-xl font-black text-stone-900 mb-1">{list.title}</h1>
            {list.description && <p className="text-stone-500 text-sm leading-relaxed mb-3">{list.description}</p>}

            <div className="flex items-center gap-3">
              <Link href={`/people/${list.user_id}`} className="flex items-center gap-2 group">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center text-white text-[9px] font-black">{initials}</div>
                <span className="text-xs text-stone-600 group-hover:text-orange-600 transition-colors font-medium">{authorName}</span>
              </Link>
              <span className="text-[10px] text-stone-400">{timeAgo(list.created_at)}</span>
              {user && seenCount > 0 && (
                <span className="text-[10px] text-orange-600 font-medium">{seenCount} seen by you</span>
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
                className="flex items-center gap-3 bg-white border border-stone-200 rounded-2xl p-3 hover:border-stone-300 hover:shadow-sm transition-all group">
                <span className="text-stone-400 font-bold text-sm w-6 text-center shrink-0">#{i+1}</span>
                <div className="w-10 h-14 rounded-lg overflow-hidden bg-stone-100 shrink-0">
                  {movie.poster_url ? <img src={movie.poster_url} alt={movie.title} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center">🎬</div>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-stone-900 group-hover:text-orange-600 transition-colors truncate">{movie.title}</p>
                  <p className="text-xs text-stone-400">{movie.year}{movie.genres?.length ? ` · ${movie.genres.slice(0,2).join(", ")}` : ""}</p>
                  {movie.note && <p className="text-xs text-stone-500 italic mt-0.5 line-clamp-1">"{movie.note}"</p>}
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  {userRating && <span className="text-base">{RATING_EMOJI[userRating]}</span>}
                  {score && <span className="text-xs font-bold text-stone-500">{score}</span>}
                  {!score && movie.tmdb_rating > 0 && <span className="text-[10px] text-stone-400">{Math.round(movie.tmdb_rating * 10)}</span>}
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
              <Link key={movie.id} href={`/movies/${movie.id}`} className="group block">
                <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-stone-200 shadow-sm mb-1.5">
                  {movie.poster_url
                    ? <img src={movie.poster_url} alt={movie.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy"/>
                    : <div className="w-full h-full flex items-center justify-center text-stone-400 text-3xl">🎬</div>
                  }
                  {userRating && <div className="absolute top-1.5 right-1.5 text-sm drop-shadow">{RATING_EMOJI[userRating]}</div>}
                </div>
                <p className="text-[11px] font-semibold text-stone-800 line-clamp-1 group-hover:text-orange-600 transition-colors">{movie.title}</p>
                <p className="text-[10px] text-stone-400">{movie.year}</p>
                {movie.note && <p className="text-[10px] text-stone-400 italic line-clamp-1">"{movie.note}"</p>}
              </Link>
            );
          })}
        </div>
      )}

      {/* Add to watchlist CTA */}
      {user && items.filter(m => !ratings[m.id]).length > 0 && (
        <div className="mt-8 text-center bg-orange-50 border border-orange-100 rounded-2xl p-4">
          <p className="text-sm text-stone-700 font-medium mb-0.5">
            {items.filter(m => !ratings[m.id]).length} films you haven't rated
          </p>
          <p className="text-xs text-stone-500">Click any film to rate it</p>
        </div>
      )}
    </div>
  );
}
