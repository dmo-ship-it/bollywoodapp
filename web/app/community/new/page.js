"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "../../../lib/supabase-browser";
import Link from "next/link";

export default function NewCommunityPost() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const supabase     = createClient();
  const debounceRef  = useRef(null);

  const [user,         setUser]         = useState(null);
  const [type,         setType]         = useState(searchParams.get("type") ?? "discussion");
  const [title,        setTitle]        = useState("");
  const [content,      setContent]      = useState("");
  const [description,  setDescription]  = useState("");
  const [isRanked,     setIsRanked]     = useState(false);
  const [maxPicks,     setMaxPicks]     = useState(3);     // for polls
  const [pollSubject,  setPollSubject]  = useState("movies"); // "movies" | "people"
  const [movieQuery,   setMovieQuery]   = useState("");
  const [movieResults, setMovieResults] = useState([]);
  const [linkedMovie,  setLinkedMovie]  = useState(null);  // for reviews
  const [listMovies,   setListMovies]   = useState([]);    // for lists
  const [saving,       setSaving]       = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push("/login"); return; }
      setUser(data.user);
    });
  }, []);

  // Movie search debounce
  useEffect(() => {
    if (movieQuery.length < 2) { setMovieResults([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const { data } = await supabase.from("movies").select("id,title,year,poster_url")
        .ilike("title", `%${movieQuery}%`).order("tmdb_popularity", { ascending: false }).limit(6);
      setMovieResults(data ?? []);
    }, 300);
  }, [movieQuery]);

  function addToList(movie) {
    if (listMovies.find(m => m.id === movie.id)) return;
    setListMovies(prev => [...prev, { ...movie, note: "" }]);
    setMovieQuery("");
    setMovieResults([]);
  }

  function removeFromList(id) {
    setListMovies(prev => prev.filter(m => m.id !== id));
  }

  function updateNote(id, note) {
    setListMovies(prev => prev.map(m => m.id === id ? { ...m, note } : m));
  }

  function moveItem(id, dir) {
    setListMovies(prev => {
      const idx  = prev.findIndex(m => m.id === id);
      const next = idx + dir;
      if (next < 0 || next >= prev.length) return prev;
      const arr = [...prev];
      [arr[idx], arr[next]] = [arr[next], arr[idx]];
      return arr;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!user || saving) return;
    if (!title.trim()) return;

    setSaving(true);

    if (type === "list") {
      if (listMovies.length === 0) { setSaving(false); return; }
      const { data: list, error } = await supabase.from("community_lists").insert({
        user_id: user.id, title: title.trim(), description: description.trim() || null, is_ranked: isRanked,
      }).select("id").single();
      if (!error && list) {
        await supabase.from("community_list_items").insert(
          listMovies.map((m, i) => ({ list_id: list.id, movie_id: m.id, position: i, note: m.note || null }))
        );
        router.push(`/community/lists/${list.id}`);
      }
    } else if (type === "poll") {
      const { data: poll, error } = await supabase.from("community_polls").insert({
        user_id: user.id, title: title.trim(),
        description: description.trim() || null,
        max_picks: maxPicks,
        poll_subject: pollSubject,
      }).select("id").single();
      if (!error && poll) router.push(`/community/polls/${poll.id}`);
    } else {
      const { data: post, error } = await supabase.from("community_posts").insert({
        user_id: user.id, title: title.trim(), content: content.trim(),
        post_type: type, movie_id: linkedMovie?.id ?? null,
      }).select("id").single();
      if (!error && post) router.push(`/community/posts/${post.id}`);
    }
    setSaving(false);
  }

  if (!user) return null;

  return (
    <div className="max-w-xl mx-auto px-4 py-8 bg-stone-50 min-h-screen">
      <Link href="/community" className="text-stone-400 text-sm hover:text-stone-700 transition-colors mb-6 block">← Community</Link>

      <h1 className="text-2xl font-black text-stone-900 mb-6">Create</h1>

      {/* Type tabs */}
      <div className="flex gap-1 bg-stone-100 rounded-xl p-1 mb-6">
        {[
          { id: "discussion", label: "💬 Discussion" },
          { id: "review",     label: "⭐ Review"     },
          { id: "list",       label: "📋 List"       },
          { id: "poll",       label: "📊 Poll"       },
        ].map(t => (
          <button key={t.id} onClick={() => setType(t.id)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${type === t.id ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-700"}`}>
            {t.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Link a movie (for reviews) */}
        {type === "review" && (
          <div>
            <label className="text-xs text-stone-500 uppercase tracking-widest block mb-2">Film</label>
            {linkedMovie ? (
              <div className="flex items-center gap-3 bg-white border border-stone-200 rounded-xl p-3">
                {linkedMovie.poster_url && <img src={linkedMovie.poster_url} className="w-8 h-11 rounded-lg object-cover" alt=""/>}
                <div className="flex-1">
                  <p className="text-sm font-semibold text-stone-900">{linkedMovie.title}</p>
                  <p className="text-xs text-stone-400">{linkedMovie.year}</p>
                </div>
                <button type="button" onClick={() => setLinkedMovie(null)} className="text-stone-400 hover:text-stone-700 text-lg">×</button>
              </div>
            ) : (
              <div className="relative">
                <input type="text" placeholder="Search for a film…" value={movieQuery} onChange={e => setMovieQuery(e.target.value)}
                  className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:border-orange-400 transition-all"/>
                {movieResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-stone-200 rounded-xl overflow-hidden z-10 shadow-lg">
                    {movieResults.map(m => (
                      <button type="button" key={m.id} onClick={() => { setLinkedMovie(m); setMovieQuery(""); setMovieResults([]); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-stone-50 text-left">
                        {m.poster_url && <img src={m.poster_url} className="w-6 h-9 rounded object-cover" alt=""/>}
                        <div><p className="text-sm font-medium text-stone-900">{m.title}</p><p className="text-xs text-stone-400">{m.year}</p></div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Title */}
        <div>
          <label className="text-xs text-stone-500 uppercase tracking-widest block mb-2">
            {type === "list" ? "List title" : "Title"}
          </label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} required
            placeholder={type === "review" ? "My thoughts on…" : type === "list" ? "e.g. Essential 90s Bollywood" : "What's on your mind?"}
            className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-stone-900 placeholder-stone-400 focus:outline-none focus:border-orange-400 transition-all text-sm"/>
        </div>

        {/* Content or Description */}
        {type !== "list" && type !== "poll" ? (
          <div>
            <label className="text-xs text-stone-500 uppercase tracking-widest block mb-2">
              {type === "review" ? "Your review" : "Content"}
            </label>
            <textarea value={content} onChange={e => setContent(e.target.value)} required rows={6}
              placeholder={type === "review" ? "Share what you thought…" : "Start the conversation…"}
              className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-stone-900 placeholder-stone-400 focus:outline-none focus:border-orange-400 transition-all text-sm resize-none"/>
          </div>
        ) : (
          <>
            <div>
              <label className="text-xs text-stone-500 uppercase tracking-widest block mb-2">Description <span className="text-stone-300 normal-case tracking-normal">(optional)</span></label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
                placeholder="What makes these films special?"
                className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-stone-900 placeholder-stone-400 focus:outline-none focus:border-orange-400 transition-all text-sm resize-none"/>
            </div>

            {/* Ranked toggle */}
            <div className="flex items-center justify-between bg-white border border-stone-200 rounded-xl px-4 py-3">
              <div>
                <p className="text-sm font-medium text-stone-900">Ranked list</p>
                <p className="text-xs text-stone-400">Films are numbered #1, #2…</p>
              </div>
              <button type="button" onClick={() => setIsRanked(r => !r)}
                className={`w-11 h-6 rounded-full transition-colors relative ${isRanked ? "bg-orange-600" : "bg-stone-200"}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isRanked ? "translate-x-5" : "translate-x-0"}`}/>
              </button>
            </div>

            {/* Add films */}
            <div>
              <label className="text-xs text-stone-500 uppercase tracking-widest block mb-2">Films</label>
              <div className="relative mb-3">
                <input type="text" placeholder="Search and add films…" value={movieQuery} onChange={e => setMovieQuery(e.target.value)}
                  className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:border-orange-400 transition-all"/>
                {movieResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-stone-200 rounded-xl overflow-hidden z-10 shadow-lg">
                    {movieResults.map(m => (
                      <button type="button" key={m.id} onClick={() => addToList(m)} disabled={!!listMovies.find(x => x.id === m.id)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-stone-50 text-left disabled:opacity-40">
                        {m.poster_url && <img src={m.poster_url} className="w-6 h-9 rounded object-cover" alt=""/>}
                        <div><p className="text-sm font-medium text-stone-900">{m.title}</p><p className="text-xs text-stone-400">{m.year}</p></div>
                        {listMovies.find(x => x.id === m.id) && <span className="ml-auto text-xs text-stone-400">Added</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {listMovies.length > 0 && (
                <div className="space-y-2">
                  {listMovies.map((m, i) => (
                    <div key={m.id} className="bg-white border border-stone-200 rounded-xl p-3">
                      <div className="flex items-center gap-3 mb-2">
                        {isRanked && <span className="text-stone-400 text-sm font-bold w-5 shrink-0">#{i+1}</span>}
                        {m.poster_url && <img src={m.poster_url} className="w-8 h-11 rounded-lg object-cover shrink-0" alt=""/>}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-stone-900 truncate">{m.title}</p>
                          <p className="text-xs text-stone-400">{m.year}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          {isRanked && <>
                            <button type="button" onClick={() => moveItem(m.id,-1)} disabled={i===0} className="text-stone-300 hover:text-stone-600 disabled:opacity-20 text-base px-1">↑</button>
                            <button type="button" onClick={() => moveItem(m.id,1)} disabled={i===listMovies.length-1} className="text-stone-300 hover:text-stone-600 disabled:opacity-20 text-base px-1">↓</button>
                          </>}
                          <button type="button" onClick={() => removeFromList(m.id)} className="text-stone-300 hover:text-rose-500 text-lg px-1">×</button>
                        </div>
                      </div>
                      <input type="text" placeholder="Add a note about this film (optional)" value={m.note}
                        onChange={e => updateNote(m.id, e.target.value)}
                        className="w-full text-xs text-stone-600 bg-stone-50 border border-stone-100 rounded-lg px-3 py-1.5 placeholder-stone-300 focus:outline-none focus:border-stone-300"/>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Poll-specific fields */}
        {type === "poll" && (
          <>
            <div>
              <label className="text-xs text-stone-500 uppercase tracking-widest block mb-2">Description <span className="text-stone-300 normal-case tracking-normal">(optional)</span></label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
                placeholder="Any extra context for the poll…"
                className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-stone-900 placeholder-stone-400 focus:outline-none focus:border-orange-400 transition-all text-sm resize-none"/>
            </div>

            {/* Subject type */}
            <div>
              <label className="text-xs text-stone-500 uppercase tracking-widest block mb-2">People pick from…</label>
              <div className="flex gap-2">
                {[
                  { id: "movies", label: "🎬 Films"  },
                  { id: "people", label: "🎭 People" },
                ].map(s => (
                  <button key={s.id} type="button" onClick={() => setPollSubject(s.id)}
                    className={`flex-1 py-2 rounded-xl border text-sm font-semibold transition-all ${pollSubject === s.id ? "bg-violet-600 text-white border-violet-600" : "bg-white border-stone-200 text-stone-600 hover:border-stone-300"}`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Max picks */}
            <div>
              <label className="text-xs text-stone-500 uppercase tracking-widest block mb-2">
                How many {pollSubject === "people" ? "people" : "films"} can each person pick?
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 5, 10].map(n => (
                  <button key={n} type="button" onClick={() => setMaxPicks(n)}
                    className={`flex-1 py-2 rounded-xl border text-sm font-bold transition-all ${maxPicks === n ? "bg-violet-600 text-white border-violet-600" : "bg-white border-stone-200 text-stone-600 hover:border-stone-300"}`}>
                    {n}
                  </button>
                ))}
              </div>
              <p className="text-xs text-stone-400 mt-2">Results show the most-picked {pollSubject === "people" ? "people" : "films"} across all voters.</p>
            </div>
          </>
        )}

        <button type="submit" disabled={saving || (type === "list" && listMovies.length === 0) || !title.trim()}
          className="w-full bg-orange-600 text-white font-bold py-3 rounded-full hover:bg-orange-500 transition-colors text-sm disabled:opacity-40">
          {saving ? "Saving…" : type === "list" ? `Publish list (${listMovies.length} films)` : "Publish"}
        </button>
      </form>
    </div>
  );
}
