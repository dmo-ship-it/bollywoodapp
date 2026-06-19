"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "../../../lib/supabase-browser";
import { awardPoints } from "../../../lib/points";
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
  const [pollSubject,  setPollSubject]  = useState("movies"); // "movies" | "people" | "other"
  const [pollOptions,  setPollOptions]  = useState(["", ""]); // for "other" polls
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
        await Promise.all([
          supabase.from("community_list_items").insert(
            listMovies.map((m, i) => ({ list_id: list.id, movie_id: m.id, position: i, note: m.note || null }))
          ),
          awardPoints(supabase, user.id, "CREATE_LIST"),
        ]);
        router.push(`/community/lists/${list.id}`);
      }
    } else if (type === "poll") {
      const options = pollSubject === "other"
        ? pollOptions.map(o => o.trim()).filter(Boolean)
        : null;
      if (pollSubject === "other" && (!options || options.length < 2)) {
        setSaving(false); return;
      }
      const { data: poll, error } = await supabase.from("community_polls").insert({
        user_id: user.id, title: title.trim(),
        description: description.trim() || null,
        max_picks: maxPicks,
        poll_subject: pollSubject,
        options,
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
    <div className="max-w-xl mx-auto px-4 py-8 min-h-screen" style={{ background: "var(--paper)" }}>
      <Link href="/community" style={{ color: "var(--ink-mute)", fontSize: 13, textDecoration: "none", display: "block", marginBottom: 24 }}>← Community</Link>

      <h1 style={{ fontSize: 22, fontWeight: 900, color: "var(--ink)", fontFamily: "var(--font-ui)", marginBottom: 24 }}>Create</h1>

      {/* Type tabs */}
      <div style={{ display: "flex", gap: 4, background: "var(--sunk)", borderRadius: 12, padding: 4, marginBottom: 24 }}>
        {[
          { id: "discussion", label: "Discussion" },
          { id: "review",     label: "Review"     },
          { id: "list",       label: "List"       },
          { id: "poll",       label: "Poll"       },
        ].map(t => (
          <button key={t.id} onClick={() => setType(t.id)}
            style={{
              flex: 1, padding: "8px 0", borderRadius: 8, fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer", transition: "all 0.15s",
              background: type === t.id ? "var(--card)" : "transparent",
              color: type === t.id ? "var(--ink)" : "var(--ink-mute)",
              boxShadow: type === t.id ? "var(--shadow-card)" : "none",
            }}>
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
              <div style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: 12 }}>
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
                  style={{ width: "100%", background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "12px 16px", color: "var(--ink)", fontSize: 13, fontFamily: "var(--font-ui)", outline: "none", boxSizing: "border-box" }}/>
                {movieResults.length > 0 && (
                  <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4, background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden", zIndex: 10, boxShadow: "var(--shadow-card)" }}>
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

        {/* Poll: subject picker comes FIRST, before the title */}
        {type === "poll" && (
          <div>
            <label className="text-xs text-stone-500 uppercase tracking-widest block mb-2">People pick from…</label>
            <div className="flex gap-2">
              {[
                { id: "movies", label: "Films"  },
                { id: "people", label: "People" },
                { id: "other",  label: "Other"  },
              ].map(s => (
                <button key={s.id} type="button" onClick={() => setPollSubject(s.id)}
                  style={{ flex: 1, padding: "8px 0", borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s", background: pollSubject === s.id ? "#7c3aed" : "var(--card)", color: pollSubject === s.id ? "#fff" : "var(--ink-soft)", border: `1px solid ${pollSubject === s.id ? "#7c3aed" : "var(--line)"}` }}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Title */}
        <div>
          <label className="text-xs text-stone-500 uppercase tracking-widest block mb-2">
            {type === "list" ? "List title" : "Title"}
          </label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} required
            placeholder={
              type === "poll"
                ? pollSubject === "people" ? "e.g. Who are your top 3 Bollywood actors?"
                : pollSubject === "other"  ? "e.g. What is the best theater in Houston to watch Indian movies?"
                : "e.g. What are your top 3 90s Bollywood films?"
              : type === "review" ? "My thoughts on…"
              : type === "list"   ? "e.g. Essential 90s Bollywood"
              : "What's on your mind?"
            }
            style={{ width: "100%", background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "12px 16px", color: "var(--ink)", fontSize: 14, fontFamily: "var(--font-ui)", outline: "none", boxSizing: "border-box" }}/>
        </div>

        {/* Content or Description */}
        {type !== "list" && type !== "poll" ? (
          <div>
            <label className="text-xs text-stone-500 uppercase tracking-widest block mb-2">
              {type === "review" ? "Your review" : "Content"}
            </label>
            <textarea value={content} onChange={e => setContent(e.target.value)} required rows={6}
              placeholder={type === "review" ? "Share what you thought…" : "Start the conversation…"}
              style={{ width: "100%", background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "12px 16px", color: "var(--ink)", fontSize: 14, fontFamily: "var(--font-ui)", outline: "none", resize: "none", boxSizing: "border-box" }}/>
          </div>
        ) : type === "list" ? (
          <>
            <div>
              <label className="text-xs text-stone-500 uppercase tracking-widest block mb-2">Description <span className="text-stone-300 normal-case tracking-normal">(optional)</span></label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
                placeholder="What makes these films special?"
                style={{ width: "100%", background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "12px 16px", color: "var(--ink)", fontSize: 14, fontFamily: "var(--font-ui)", outline: "none", resize: "none", boxSizing: "border-box" }}/>
            </div>

            {/* Ranked toggle */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "12px 16px" }}>
              <div>
                <p className="text-sm font-medium text-stone-900">Ranked list</p>
                <p className="text-xs text-stone-400">Films are numbered #1, #2…</p>
              </div>
              <button type="button" onClick={() => setIsRanked(r => !r)}
                style={{ width: 44, height: 24, borderRadius: 999, transition: "background 0.2s", position: "relative", background: isRanked ? "var(--brand)" : "var(--sunk)", border: "none", cursor: "pointer" }}>
                <span style={{ position: "absolute", top: 2, left: 2, width: 20, height: 20, background: "#fff", borderRadius: "50%", boxShadow: "0 1px 3px rgba(0,0,0,0.2)", transition: "transform 0.2s", transform: isRanked ? "translateX(20px)" : "translateX(0)" }}/>
              </button>
            </div>

            {/* Add films */}
            <div>
              <label className="text-xs text-stone-500 uppercase tracking-widest block mb-2">Films</label>
              <div className="relative mb-3">
                <input type="text" placeholder="Search and add films…" value={movieQuery} onChange={e => setMovieQuery(e.target.value)}
                  style={{ width: "100%", background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "12px 16px", color: "var(--ink)", fontSize: 13, fontFamily: "var(--font-ui)", outline: "none", boxSizing: "border-box" }}/>
                {movieResults.length > 0 && (
                  <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4, background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden", zIndex: 10, boxShadow: "var(--shadow-card)" }}>
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
                    <div key={m.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: 12 }}>
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
                        style={{ width: "100%", fontSize: 11, color: "var(--ink-soft)", background: "var(--sunk)", border: "1px solid var(--line)", borderRadius: 8, padding: "6px 12px", outline: "none", boxSizing: "border-box" }}/>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null}

        {/* Poll-specific fields */}
        {type === "poll" && (
          <>
            <div>
              <label className="text-xs text-stone-500 uppercase tracking-widest block mb-2">Description <span className="text-stone-300 normal-case tracking-normal">(optional)</span></label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
                placeholder="Any extra context for the poll…"
                style={{ width: "100%", background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "12px 16px", color: "var(--ink)", fontSize: 14, fontFamily: "var(--font-ui)", outline: "none", resize: "none", boxSizing: "border-box" }}/>
            </div>

            {/* Custom options builder for "Other" polls */}
            {pollSubject === "other" && (
              <div>
                <label className="text-xs text-stone-500 uppercase tracking-widest block mb-2">
                  Options <span className="text-stone-300 normal-case tracking-normal">(min 2)</span>
                </label>
                <div className="space-y-2">
                  {pollOptions.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={opt}
                        onChange={e => {
                          const next = [...pollOptions];
                          next[i] = e.target.value;
                          setPollOptions(next);
                        }}
                        placeholder={`Option ${i + 1}…`}
                        style={{ flex: 1, background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "10px 16px", fontSize: 13, color: "var(--ink)", fontFamily: "var(--font-ui)", outline: "none", boxSizing: "border-box" }}/>
                      {pollOptions.length > 2 && (
                        <button type="button" onClick={() => setPollOptions(prev => prev.filter((_, j) => j !== i))}
                          className="text-stone-300 hover:text-rose-500 text-xl px-1">×</button>
                      )}
                    </div>
                  ))}
                </div>
                {pollOptions.length < 8 && (
                  <button type="button" onClick={() => setPollOptions(prev => [...prev, ""])}
                    className="mt-2 text-xs text-violet-600 hover:text-violet-700 font-semibold">
                    + Add option
                  </button>
                )}
              </div>
            )}

            {/* Max picks */}
            <div>
              <label className="text-xs text-stone-500 uppercase tracking-widest block mb-2">
                How many {pollSubject === "people" ? "people" : pollSubject === "other" ? "options" : "films"} can each person pick?
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 5, 10].map(n => (
                  <button key={n} type="button" onClick={() => setMaxPicks(n)}
                    style={{ flex: 1, padding: "8px 0", borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 0.15s", background: maxPicks === n ? "#7c3aed" : "var(--card)", color: maxPicks === n ? "#fff" : "var(--ink-soft)", border: `1px solid ${maxPicks === n ? "#7c3aed" : "var(--line)"}` }}>
                    {n}
                  </button>
                ))}
              </div>
              <p className="text-xs text-stone-400 mt-2">Results show the most-picked {pollSubject === "people" ? "people" : pollSubject === "other" ? "options" : "films"} across all voters.</p>
            </div>
          </>
        )}

        <button type="submit" disabled={saving || (type === "list" && listMovies.length === 0) || !title.trim()}
          style={{ width: "100%", background: "var(--brand)", color: "#fff", fontWeight: 700, padding: "12px 0", borderRadius: 999, border: "none", cursor: "pointer", fontSize: 13, fontFamily: "var(--font-ui)", opacity: (saving || (type === "list" && listMovies.length === 0) || !title.trim()) ? 0.4 : 1 }}>
          {saving ? "Saving…" : type === "list" ? `Publish list (${listMovies.length} films)` : "Publish"}
        </button>
      </form>
    </div>
  );
}
