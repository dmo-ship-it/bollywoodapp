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

  const [user,          setUser]          = useState(null);
  const [poll,          setPoll]          = useState(null);
  const [results,       setResults]       = useState([]);  // [{ movie, count }] sorted desc
  const [myPicks,       setMyPicks]       = useState([]);  // movie objects I've picked
  const [hasResponded,  setHasResponded]  = useState(false);
  const [totalVoters,   setTotalVoters]   = useState(0);
  const [movieQuery,    setMovieQuery]    = useState("");
  const [movieResults,  setMovieResults]  = useState([]);
  const [submitting,    setSubmitting]    = useState(false);
  const [loading,       setLoading]       = useState(true);
  const [authorName,    setAuthorName]    = useState("");

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      // Load poll
      const { data: pollData } = await supabase
        .from("community_polls")
        .select("*")
        .eq("id", id)
        .single();

      if (!pollData) { setLoading(false); return; }
      setPoll(pollData);

      // Load author name
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("display_name, email")
        .eq("user_id", pollData.user_id)
        .single();
      setAuthorName(profile?.display_name || profile?.email?.split("@")[0] || "Someone");

      // Load all responses with movie details
      const { data: responses } = await supabase
        .from("community_poll_responses")
        .select("user_id, movie_id, movies(id, title, poster_url, year)")
        .eq("poll_id", id);

      if (responses?.length) {
        // Aggregate by movie
        const counts = {};
        const movieObjs = {};
        responses.forEach(r => {
          counts[r.movie_id]    = (counts[r.movie_id] ?? 0) + 1;
          movieObjs[r.movie_id] = r.movies;
        });

        const sorted = Object.entries(counts)
          .map(([movieId, count]) => ({ movie: movieObjs[movieId], count }))
          .sort((a, b) => b.count - a.count);

        setResults(sorted);

        const uniqueVoters = new Set(responses.map(r => r.user_id)).size;
        setTotalVoters(uniqueVoters);

        // Check if current user has responded
        if (user) {
          const myResponses = responses.filter(r => r.user_id === user.id);
          if (myResponses.length > 0) {
            setHasResponded(true);
            setMyPicks(myResponses.map(r => r.movies));
          }
        }
      }

      setLoading(false);
    }
    load();
  }, [id]);

  // Movie search
  useEffect(() => {
    if (movieQuery.length < 2) { setMovieResults([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const { data } = await supabase.from("movies")
        .select("id, title, year, poster_url")
        .ilike("title", `%${movieQuery}%`)
        .order("tmdb_popularity", { ascending: false })
        .limit(6);
      setMovieResults(data ?? []);
    }, 300);
  }, [movieQuery]);

  function addPick(movie) {
    if (myPicks.find(m => m.id === movie.id)) return;
    if (myPicks.length >= poll.max_picks) return;
    setMyPicks(prev => [...prev, movie]);
    setMovieQuery("");
    setMovieResults([]);
  }

  function removePick(id) {
    setMyPicks(prev => prev.filter(m => m.id !== id));
  }

  async function submitPicks() {
    if (!user) { router.push("/login"); return; }
    if (myPicks.length === 0 || submitting) return;
    setSubmitting(true);

    await supabase.from("community_poll_responses").insert(
      myPicks.map(m => ({ poll_id: id, user_id: user.id, movie_id: m.id }))
    );

    // Update response_count
    await supabase.from("community_polls")
      .update({ response_count: (poll.response_count ?? 0) + 1 })
      .eq("id", id);

    // Reload results
    const { data: responses } = await supabase
      .from("community_poll_responses")
      .select("user_id, movie_id, movies(id, title, poster_url, year)")
      .eq("poll_id", id);

    if (responses?.length) {
      const counts = {}, movieObjs = {};
      responses.forEach(r => {
        counts[r.movie_id]    = (counts[r.movie_id] ?? 0) + 1;
        movieObjs[r.movie_id] = r.movies;
      });
      const sorted = Object.entries(counts)
        .map(([movieId, count]) => ({ movie: movieObjs[movieId], count }))
        .sort((a, b) => b.count - a.count);
      setResults(sorted);
      setTotalVoters(new Set(responses.map(r => r.user_id)).size);
    }

    setHasResponded(true);
    setSubmitting(false);
  }

  if (loading) return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl shimmer"/>)}</div>
    </div>
  );

  if (!poll) return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center text-stone-400">
      <p className="text-4xl mb-4">📊</p>
      <p className="font-medium text-stone-600">Poll not found</p>
      <Link href="/community" className="text-orange-600 hover:underline mt-4 block">← Community</Link>
    </div>
  );

  const maxCount = results[0]?.count ?? 1;

  return (
    <div className="max-w-xl mx-auto px-4 py-8 bg-stone-50 min-h-screen">
      <Link href="/community" className="text-stone-400 text-sm hover:text-stone-700 transition-colors mb-6 block">← Community</Link>

      {/* Poll header */}
      <div className="bg-white border border-stone-200 rounded-2xl p-5 mb-5 shadow-sm">
        <span className="text-[10px] font-semibold bg-violet-100 text-violet-700 border border-violet-200 px-2 py-0.5 rounded-full">📊 Poll</span>
        <h1 className="text-xl font-black text-stone-900 mt-2 mb-1 leading-snug">{poll.title}</h1>
        {poll.description && <p className="text-stone-500 text-sm mb-3">{poll.description}</p>}
        <div className="flex items-center gap-3 text-xs text-stone-400">
          <span>by {authorName}</span>
          <span>{timeAgo(poll.created_at)}</span>
          <span>{totalVoters} voter{totalVoters !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* Vote section — only if logged in and hasn't voted */}
      {!hasResponded && (
        <div className="bg-white border border-stone-200 rounded-2xl p-5 mb-5 shadow-sm">
          <h2 className="font-bold text-stone-900 mb-1 text-sm">
            {user ? `Pick up to ${poll.max_picks} film${poll.max_picks !== 1 ? "s" : ""}` : "Sign in to vote"}
          </h2>
          {!user ? (
            <Link href="/login" className="inline-block mt-2 bg-orange-600 text-white font-bold text-sm px-5 py-2 rounded-full hover:bg-orange-500 transition-colors">
              Sign in →
            </Link>
          ) : (
            <>
              {/* Movie search */}
              <div className="relative mb-3">
                <input
                  type="text"
                  placeholder="Search for a film…"
                  value={movieQuery}
                  onChange={e => setMovieQuery(e.target.value)}
                  disabled={myPicks.length >= poll.max_picks}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:border-violet-400 transition-all disabled:opacity-40"
                />
                {movieResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-stone-200 rounded-xl overflow-hidden z-10 shadow-lg">
                    {movieResults.map(m => (
                      <button key={m.id} type="button" onClick={() => addPick(m)}
                        disabled={!!myPicks.find(x => x.id === m.id) || myPicks.length >= poll.max_picks}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-stone-50 text-left disabled:opacity-40">
                        {m.poster_url && <img src={m.poster_url} className="w-6 h-9 rounded object-cover shrink-0" alt=""/>}
                        <div>
                          <p className="text-sm font-medium text-stone-900">{m.title}</p>
                          <p className="text-xs text-stone-400">{m.year}</p>
                        </div>
                        {myPicks.find(x => x.id === m.id) && <span className="ml-auto text-xs text-stone-400">Added</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected picks */}
              {myPicks.length > 0 && (
                <div className="space-y-2 mb-3">
                  {myPicks.map((m, i) => (
                    <div key={m.id} className="flex items-center gap-3 bg-violet-50 border border-violet-200 rounded-xl px-3 py-2">
                      <span className="text-xs font-black text-violet-500 w-4">#{i + 1}</span>
                      {m.poster_url && <img src={m.poster_url} className="w-7 h-10 rounded-lg object-cover shrink-0" alt=""/>}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-stone-900 truncate">{m.title}</p>
                        <p className="text-xs text-stone-400">{m.year}</p>
                      </div>
                      <button onClick={() => removePick(m.id)} className="text-stone-300 hover:text-rose-500 text-lg shrink-0">×</button>
                    </div>
                  ))}
                </div>
              )}

              {myPicks.length >= poll.max_picks && (
                <p className="text-xs text-stone-400 mb-3">Max {poll.max_picks} film{poll.max_picks !== 1 ? "s" : ""} selected.</p>
              )}

              <button
                onClick={submitPicks}
                disabled={myPicks.length === 0 || submitting}
                className="w-full bg-violet-600 text-white font-bold py-2.5 rounded-full hover:bg-violet-500 transition-colors text-sm disabled:opacity-40"
              >
                {submitting ? "Submitting…" : `Submit ${myPicks.length > 0 ? `(${myPicks.length} film${myPicks.length !== 1 ? "s" : ""})` : ""}`}
              </button>
            </>
          )}
        </div>
      )}

      {/* My picks (after voting) */}
      {hasResponded && myPicks.length > 0 && (
        <div className="bg-violet-50 border border-violet-200 rounded-2xl p-4 mb-5">
          <p className="text-xs font-semibold text-violet-700 mb-2">✓ Your picks</p>
          <div className="flex gap-2 flex-wrap">
            {myPicks.map(m => (
              <div key={m.id} className="flex items-center gap-2">
                {m?.poster_url && <img src={m.poster_url} className="w-8 h-11 rounded-lg object-cover" alt=""/>}
              </div>
            ))}
            <div className="flex flex-col justify-center">
              {myPicks.map(m => (
                <p key={m.id} className="text-xs font-medium text-violet-800">{m?.title}</p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm">
        <h2 className="font-bold text-stone-900 mb-4 text-sm">
          Global Results
          {results.length === 0 && <span className="font-normal text-stone-400 ml-2">— no votes yet</span>}
        </h2>

        {results.length === 0 ? (
          <div className="text-center py-8 text-stone-400">
            <p className="text-3xl mb-2">🗳️</p>
            <p className="text-sm">Be the first to vote!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {results.map(({ movie, count }, i) => {
              const pct = Math.round((count / maxCount) * 100);
              return (
                <div key={movie?.id ?? i} className="flex items-center gap-3">
                  <span className="text-xs font-black text-stone-400 w-5 shrink-0 text-center">#{i + 1}</span>
                  {movie?.poster_url
                    ? <img src={movie.poster_url} className="w-9 h-12 rounded-lg object-cover shrink-0" alt=""/>
                    : <div className="w-9 h-12 rounded-lg bg-stone-100 shrink-0"/>}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <Link href={movie?.id ? `/movies/${movie.id}` : "#"}
                        className="text-sm font-semibold text-stone-900 hover:text-orange-600 transition-colors truncate">
                        {movie?.title ?? "Unknown"}
                      </Link>
                      <span className="text-xs font-bold text-stone-600 shrink-0 ml-2">
                        {count} pick{count !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-violet-500 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {totalVoters > 0 && (
          <p className="text-xs text-stone-400 mt-4 text-center">{totalVoters} voter{totalVoters !== 1 ? "s" : ""} · {results.reduce((s, r) => s + r.count, 0)} total picks</p>
        )}
      </div>
    </div>
  );
}
