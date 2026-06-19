"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "../../../../lib/supabase-browser";
import Link from "next/link";

function timeAgo(d) {
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60)    return "just now";
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(d).toLocaleDateString("en", { month: "short", day: "numeric" });
}

export default function PollPage() {
  const { id }      = useParams();
  const router      = useRouter();
  const supabase    = createClient();
  const debounceRef = useRef(null);

  const [user,         setUser]         = useState(null);
  const [poll,         setPoll]         = useState(null);
  const [results,      setResults]      = useState([]);   // [{ subject, count }] sorted desc
  const [myPicks,      setMyPicks]      = useState([]);   // picked items
  const [hasResponded, setHasResponded] = useState(false);
  const [totalVoters,  setTotalVoters]  = useState(0);
  const [query,        setQuery]        = useState("");
  const [queryResults, setQueryResults] = useState([]);
  const [submitting,   setSubmitting]   = useState(false);
  const [loading,      setLoading]      = useState(true);
  const [authorName,   setAuthorName]   = useState("");

  const isMoviePoll  = !poll?.poll_subject || poll?.poll_subject === "movies";
  const isPeoplePoll = poll?.poll_subject === "people";
  const isOtherPoll  = poll?.poll_subject === "other";

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      const { data: pollData } = await supabase
        .from("community_polls").select("*").eq("id", id).single();
      if (!pollData) { setLoading(false); return; }
      setPoll(pollData);

      const { data: profile } = await supabase
        .from("user_profiles").select("display_name, email").eq("user_id", pollData.user_id).single();
      setAuthorName(profile?.display_name || profile?.email?.split("@")[0] || "Someone");

      await loadResults(pollData, user);
      setLoading(false);
    }
    load();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadResults(pollData, currentUser) {
    const isOther  = pollData.poll_subject === "other";
    const isPeople = pollData.poll_subject === "people";

    const selectCols = isOther
      ? "user_id, option_text"
      : isPeople
        ? "user_id, person_id, people(id, name, photo_url, primary_role)"
        : "user_id, movie_id, movies(id, title, poster_url, year)";

    const { data: responses } = await supabase
      .from("community_poll_responses")
      .select(selectCols)
      .eq("poll_id", id);

    if (!responses?.length) return;

    if (isOther) {
      const counts = {};
      responses.forEach(r => {
        const key = r.option_text ?? "—";
        counts[key] = (counts[key] ?? 0) + 1;
      });
      const sorted = Object.entries(counts)
        .map(([text, count]) => ({ subject: { id: text, title: text }, count }))
        .sort((a, b) => b.count - a.count);
      setResults(sorted);
      setTotalVoters(new Set(responses.map(r => r.user_id)).size);
      if (currentUser) {
        const mine = responses.filter(r => r.user_id === currentUser.id);
        if (mine.length > 0) {
          setHasResponded(true);
          setMyPicks(mine.map(r => ({ id: r.option_text, title: r.option_text })));
        }
      }
      return;
    }

    const counts = {}, subjectObjs = {};
    const subjectKey  = isPeople ? "person_id" : "movie_id";
    const subjectData = isPeople ? "people" : "movies";

    responses.forEach(r => {
      const sid = r[subjectKey];
      counts[sid]      = (counts[sid] ?? 0) + 1;
      subjectObjs[sid] = r[subjectData];
    });

    const sorted = Object.entries(counts)
      .map(([sid, count]) => ({ subject: subjectObjs[sid], count }))
      .sort((a, b) => b.count - a.count);

    setResults(sorted);
    setTotalVoters(new Set(responses.map(r => r.user_id)).size);

    if (currentUser) {
      const mine = responses.filter(r => r.user_id === currentUser.id);
      if (mine.length > 0) {
        setHasResponded(true);
        setMyPicks(mine.map(r => r[subjectData]));
      }
    }
  }

  // Search (not used for "other" polls)
  useEffect(() => {
    if (!poll || isOtherPoll || query.length < 2) { setQueryResults([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (isMoviePoll) {
        const { data } = await supabase.from("movies")
          .select("id, title, year, poster_url")
          .ilike("title", `%${query}%`)
          .order("tmdb_popularity", { ascending: false })
          .limit(6);
        setQueryResults(data ?? []);
      } else {
        const { data } = await supabase.from("people")
          .select("id, name, photo_url, primary_role")
          .ilike("name", `%${query}%`)
          .order("name")
          .limit(6);
        setQueryResults(data ?? []);
      }
    }, 300);
  }, [query, poll]); // eslint-disable-line react-hooks/exhaustive-deps

  function addPick(item) {
    if (myPicks.find(p => p.id === item.id)) return;
    if (myPicks.length >= poll.max_picks) return;
    setMyPicks(prev => [...prev, item]);
    setQuery("");
    setQueryResults([]);
  }

  function removePick(itemId) {
    setMyPicks(prev => prev.filter(p => p.id !== itemId));
  }

  async function submitPicks() {
    if (!user) { router.push("/login"); return; }
    if (myPicks.length === 0 || submitting) return;
    setSubmitting(true);

    const isPeople = poll.poll_subject === "people";
    const isOther  = poll.poll_subject === "other";
    await supabase.from("community_poll_responses").insert(
      myPicks.map(item => ({
        poll_id: id,
        user_id: user.id,
        ...(isOther  ? { option_text: item.title } :
            isPeople ? { person_id: item.id } :
                       { movie_id: item.id }),
      }))
    );
    await supabase.from("community_polls")
      .update({ response_count: (poll.response_count ?? 0) + 1 })
      .eq("id", id);

    await loadResults(poll, user);
    setHasResponded(true);
    setSubmitting(false);
  }

  if (loading) return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl shimmer"/>)}</div>
    </div>
  );

  if (!poll) return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center" style={{ color: "var(--ink-mute)" }}>
      <p style={{ fontFamily: "var(--font-serif)", fontSize: 18, color: "var(--ink-soft)", marginBottom: 12 }}>Poll not found</p>
      <Link href="/community" style={{ color: "var(--brand)", textDecoration: "none", fontSize: 13 }}>← Community</Link>
    </div>
  );

  const maxCount      = results[0]?.count ?? 1;
  const subjectLabel  = isMoviePoll ? "film"  : isPeoplePoll ? "person"  : "option";
  const subjectPlural = isMoviePoll ? "films" : isPeoplePoll ? "people" : "options";

  return (
    <div className="max-w-xl mx-auto px-4 py-8 min-h-screen" style={{ background: "var(--paper)" }}>
      <Link href="/community" style={{ color: "var(--ink-mute)", fontSize: 13, textDecoration: "none", display: "block", marginBottom: 24 }}>← Community</Link>

      {/* Poll header */}
      <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 16, padding: 20, marginBottom: 20, boxShadow: "var(--shadow-card)" }}>
        <span className="text-[10px] font-semibold bg-violet-100 text-violet-700 border border-violet-200 px-2 py-0.5 rounded-full">
          Poll · {isMoviePoll ? "Films" : isPeoplePoll ? "People" : "Other"}
        </span>
        <h1 className="text-xl font-black text-stone-900 mt-2 mb-1 leading-snug">{poll.title}</h1>
        {poll.description && <p className="text-stone-500 text-sm mb-3">{poll.description}</p>}
        <div className="flex items-center gap-3 text-xs text-stone-400">
          <span>by {authorName}</span>
          <span>{timeAgo(poll.created_at)}</span>
          <span>{totalVoters} voter{totalVoters !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* Vote section */}
      {!hasResponded && (
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 16, padding: 20, marginBottom: 20, boxShadow: "var(--shadow-card)" }}>
          <h2 className="font-bold text-stone-900 mb-1 text-sm">
            {user
              ? `Pick up to ${poll.max_picks} ${poll.max_picks === 1 ? subjectLabel : subjectPlural}`
              : "Sign in to vote"}
          </h2>
          {!user ? (
            <Link href="/login" style={{ display: "inline-block", marginTop: 8, background: "var(--brand)", color: "#fff", fontWeight: 700, fontSize: 13, padding: "8px 20px", borderRadius: 999, textDecoration: "none" }}>
              Sign in →
            </Link>
          ) : isOtherPoll ? (
            /* Other poll: show option buttons */
            <>
              <div className="space-y-2 mb-3">
                {(poll.options ?? []).map((opt) => {
                  const picked = !!myPicks.find(p => p.id === opt);
                  const maxed  = myPicks.length >= poll.max_picks && !picked;
                  return (
                    <button key={opt} type="button"
                      disabled={maxed}
                      onClick={() => picked ? removePick(opt) : addPick({ id: opt, title: opt })}
                      style={{ width: "100%", textAlign: "left", padding: "12px 16px", borderRadius: 12, fontSize: 13, fontWeight: 500, cursor: maxed ? "not-allowed" : "pointer", transition: "all 0.15s", background: picked ? "#7c3aed" : "var(--sunk)", color: picked ? "#fff" : "var(--ink)", border: `1px solid ${picked ? "#7c3aed" : "var(--line)"}`, opacity: maxed ? 0.4 : 1 }}>
                      {picked && <span className="mr-2">✓</span>}{opt}
                    </button>
                  );
                })}
              </div>
              {myPicks.length >= poll.max_picks && (
                <p className="text-xs text-stone-400 mb-3">Max {poll.max_picks} {poll.max_picks === 1 ? "option" : "options"} selected.</p>
              )}
              <button onClick={submitPicks} disabled={myPicks.length === 0 || submitting}
                className="w-full bg-violet-600 text-white font-bold py-2.5 rounded-full hover:bg-violet-500 transition-colors text-sm disabled:opacity-40">
                {submitting ? "Submitting…" : `Submit${myPicks.length > 0 ? ` (${myPicks.length})` : ""}`}
              </button>
            </>
          ) : (
            /* Films or People poll: search box */
            <>
              <div className="relative mb-3">
                <input
                  type="text"
                  placeholder={isMoviePoll ? "Search for a film…" : "Search for an actor, director…"}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  disabled={myPicks.length >= poll.max_picks}
                  style={{ width: "100%", background: "var(--sunk)", border: "1px solid var(--line)", borderRadius: 12, padding: "10px 16px", fontSize: 13, color: "var(--ink)", fontFamily: "var(--font-ui)", outline: "none", boxSizing: "border-box" }}
                />
                {queryResults.length > 0 && (
                  <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4, background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden", zIndex: 10, boxShadow: "var(--shadow-card)" }}>
                    {queryResults.map(item => (
                      <button key={item.id} type="button" onClick={() => addPick(item)}
                        disabled={!!myPicks.find(p => p.id === item.id) || myPicks.length >= poll.max_picks}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-stone-50 text-left disabled:opacity-40">
                        {isMoviePoll ? (
                          item.poster_url
                            ? <img src={item.poster_url} className="w-6 h-9 rounded object-cover shrink-0" alt=""/>
                            : <div className="w-6 h-9 rounded bg-stone-100 shrink-0"/>
                        ) : (
                          item.photo_url
                            ? <img src={item.photo_url} className="w-8 h-8 rounded-full object-cover shrink-0" alt=""/>
                            : <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 900, flexShrink: 0 }}>{item.name.slice(0,2).toUpperCase()}</div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-stone-900">{isMoviePoll ? item.title : item.name}</p>
                          <p className="text-xs text-stone-400">{isMoviePoll ? item.year : item.primary_role}</p>
                        </div>
                        {myPicks.find(p => p.id === item.id) && <span className="ml-auto text-xs text-stone-400">Added</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {myPicks.length > 0 && (
                <div className="space-y-2 mb-3">
                  {myPicks.map((item, i) => (
                    <div key={item.id} className="flex items-center gap-3 bg-violet-50 border border-violet-200 rounded-xl px-3 py-2">
                      <span className="text-xs font-black text-violet-500 w-4">#{i + 1}</span>
                      {isMoviePoll ? (
                        item.poster_url && <img src={item.poster_url} className="w-7 h-10 rounded-lg object-cover shrink-0" alt=""/>
                      ) : (
                        item.photo_url
                          ? <img src={item.photo_url} className="w-8 h-8 rounded-full object-cover shrink-0" alt=""/>
                          : <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 900, flexShrink: 0 }}>{item.name?.slice(0,2).toUpperCase()}</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-stone-900 truncate">{isMoviePoll ? item.title : item.name}</p>
                        <p className="text-xs text-stone-400">{isMoviePoll ? item.year : item.primary_role}</p>
                      </div>
                      <button onClick={() => removePick(item.id)} className="text-stone-300 hover:text-rose-500 text-lg shrink-0">×</button>
                    </div>
                  ))}
                </div>
              )}

              {myPicks.length >= poll.max_picks && (
                <p className="text-xs text-stone-400 mb-3">Max {poll.max_picks} {poll.max_picks === 1 ? subjectLabel : subjectPlural} selected.</p>
              )}

              <button onClick={submitPicks} disabled={myPicks.length === 0 || submitting}
                className="w-full bg-violet-600 text-white font-bold py-2.5 rounded-full hover:bg-violet-500 transition-colors text-sm disabled:opacity-40">
                {submitting ? "Submitting…" : `Submit${myPicks.length > 0 ? ` (${myPicks.length} ${myPicks.length === 1 ? subjectLabel : subjectPlural})` : ""}`}
              </button>
            </>
          )}
        </div>
      )}

      {/* My picks after voting */}
      {hasResponded && myPicks.length > 0 && (
        <div className="bg-violet-50 border border-violet-200 rounded-2xl p-4 mb-5">
          <p className="text-xs font-semibold text-violet-700 mb-2">✓ Your picks</p>
          {isOtherPoll ? (
            <div className="flex gap-2 flex-wrap">
              {myPicks.map(item => (
                <span key={item?.id} className="bg-violet-200 text-violet-800 text-xs font-semibold px-3 py-1 rounded-full">{item?.title}</span>
              ))}
            </div>
          ) : (
            <div className="flex gap-2 flex-wrap">
              {myPicks.map(item => (
                <div key={item?.id} className="flex items-center gap-2">
                  {isMoviePoll ? (
                    item?.poster_url && <img src={item.poster_url} className="w-8 h-11 rounded-lg object-cover" alt={item.title}/>
                  ) : (
                    item?.photo_url
                      ? <img src={item.photo_url} className="w-9 h-9 rounded-full object-cover" alt={item.name}/>
                      : <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 900 }}>{item?.name?.slice(0,2).toUpperCase()}</div>
                  )}
                </div>
              ))}
              <div className="flex flex-col justify-center gap-0.5">
                {myPicks.map(item => (
                  <p key={item?.id} className="text-xs font-medium text-violet-800">{isMoviePoll ? item?.title : item?.name}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Results */}
      <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 16, padding: 20, boxShadow: "var(--shadow-card)" }}>
        <h2 className="font-bold text-stone-900 mb-4 text-sm">
          Global Results
          {results.length === 0 && <span className="font-normal text-stone-400 ml-2">— no votes yet</span>}
        </h2>

        {results.length === 0 ? (
          <div className="text-center py-8 text-stone-400">
            <p style={{ fontFamily: "var(--font-serif)", fontSize: 15, color: "var(--ink-soft)", marginBottom: 4 }}>No votes yet</p>
            <p style={{ fontSize: 13, color: "var(--ink-mute)" }}>Be the first to vote!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {results.map(({ subject, count }, i) => {
              const pct = Math.round((count / maxCount) * 100);

              if (isOtherPoll) {
                return (
                  <div key={subject?.id ?? i} className="flex items-center gap-3">
                    <span className="text-xs font-black text-stone-400 w-5 shrink-0 text-center">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-stone-900">{subject?.title ?? "Unknown"}</span>
                        <span className="text-xs font-bold text-stone-600 shrink-0 ml-2">{count} pick{count !== 1 ? "s" : ""}</span>
                      </div>
                      <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                        <div className="h-full bg-violet-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }}/>
                      </div>
                    </div>
                  </div>
                );
              }

              const name  = isMoviePoll ? subject?.title : subject?.name;
              const sub   = isMoviePoll ? subject?.year  : subject?.primary_role;
              const thumb = isMoviePoll ? subject?.poster_url : subject?.photo_url;
              const href  = isMoviePoll
                ? (subject?.id ? `/movies/${subject.id}` : "#")
                : (subject?.id ? `/person/${subject.id}` : "#");

              return (
                <div key={subject?.id ?? i} className="flex items-center gap-3">
                  <span className="text-xs font-black text-stone-400 w-5 shrink-0 text-center">#{i + 1}</span>
                  {isMoviePoll ? (
                    thumb
                      ? <img src={thumb} className="w-9 h-12 rounded-lg object-cover shrink-0" alt=""/>
                      : <div className="w-9 h-12 rounded-lg bg-stone-100 shrink-0"/>
                  ) : (
                    thumb
                      ? <img src={thumb} className="w-10 h-10 rounded-full object-cover shrink-0" alt=""/>
                      : <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, fontWeight: 900, flexShrink: 0 }}>{name?.slice(0,2).toUpperCase()}</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <Link href={href} style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", textDecoration: "none" }}>
                          {name ?? "Unknown"}
                        </Link>
                        {sub && <span className="text-xs text-stone-400 ml-1.5">{sub}</span>}
                      </div>
                      <span className="text-xs font-bold text-stone-600 shrink-0 ml-2">
                        {count} pick{count !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                      <div className="h-full bg-violet-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }}/>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {totalVoters > 0 && (
          <p className="text-xs text-stone-400 mt-4 text-center">
            {totalVoters} voter{totalVoters !== 1 ? "s" : ""} · {results.reduce((s, r) => s + r.count, 0)} total picks
          </p>
        )}
      </div>
    </div>
  );
}
