"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase-browser";
import { languageName } from "../../lib/languages";
import Link from "next/link";
import RankingsShareCard from "../components/RankingsShareCard";
import RatingModal from "../components/RatingModal";
import FilterPanel, {
  EMPTY_FILTERS,
  countActiveFilters,
  resolvePersonMovieIds,
} from "../components/FilterPanel";

export default function RankingsPage() {
  const supabase = createClient();

  const [user,         setUser]         = useState(null);
  const [mode,         setMode]         = useState("my"); // "my" | "friends" | "twins" | "global"
  const [movies,       setMovies]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [filters,      setFilters]      = useState(EMPTY_FILTERS);
  const [filterOpen,   setFilterOpen]   = useState(false);
  const [totalRatings, setTotalRatings] = useState(0);
  const [personalTotal,setPersonalTotal]= useState(0);
  const [showShareCard,setShowShareCard]= useState(false);
  const [editingMovie, setEditingMovie] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (!data.user) setMode("global");
    });
  }, []);

  useEffect(() => {
    // Don't run until we know whether the user is logged in
    if (user === null && mode !== "global") return;
    fetchRankings();
  }, [user, mode, filters]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchRankings() {
    setLoading(true);

    // Resolve actor/director filters → movie IDs (null = no restriction)
    const personIds = await resolvePersonMovieIds(filters, supabase);
    const personSet = personIds ? new Set(personIds) : null;

    if (personIds !== null && personIds.length === 0) {
      setMovies([]);
      setLoading(false);
      return;
    }

    // Pre-fetch seen movie IDs for seen/unseen filter (not needed for "my" since those are all rated)
    let seenSet = null;
    if (filters.seenFilter && user && mode !== "my") {
      const { data: seen } = await supabase
        .from("user_reactions")
        .select("movie_id")
        .eq("user_id", user.id)
        .gt("rating", 0);
      seenSet = new Set((seen ?? []).map((r) => r.movie_id));
    }

    if (mode === "my" && user) {
      await fetchMyRankings(personSet);
    } else if (mode === "friends" && user) {
      await fetchFriendsRankings(personSet, seenSet);
    } else if (mode === "twins" && user) {
      await fetchTasteTwinsRankings(personSet, seenSet);
    } else {
      await fetchGlobalRankings(personIds, seenSet);
    }

    setLoading(false);
  }

  // ── My Rankings ─────────────────────────────────────────────────────────────
  async function fetchMyRankings(personSet) {
    const { data } = await supabase
      .from("user_reactions")
      .select("score, rating, movies(id, title, year, poster_url, genres, language, global_score)")
      .eq("user_id", user.id)
      .gt("rating", 0)
      .not("score", "is", null)
      .order("score", { ascending: false })
      .limit(200);

    let results = (data ?? [])
      .map((r) => ({ ...r.movies, userScore: r.score, userRating: r.rating }))
      .filter(Boolean);

    setPersonalTotal(results.length);

    // Apply filters in memory
    results = applyInMemoryFilters(results, personSet);

    setMovies(results);
  }

  // ── Friends Rankings ─────────────────────────────────────────────────────────
  async function fetchFriendsRankings(personSet, seenSet) {
    const { data: follows } = await supabase
      .from("user_follows")
      .select("following_id")
      .eq("follower_id", user.id);

    const friendIds = (follows ?? []).map((f) => f.following_id);

    if (friendIds.length === 0) {
      setMovies([]);
      return;
    }

    const { data: reactions } = await supabase
      .from("user_reactions")
      .select("movie_id, score, rating, movies(id, title, year, poster_url, genres, language, global_score)")
      .in("user_id", friendIds)
      .gt("rating", 0)
      .not("score", "is", null)
      .limit(500);

    // Aggregate by movie: average friend score
    const agg = {};
    (reactions ?? []).forEach((r) => {
      if (!r.movies) return;
      if (!agg[r.movie_id]) agg[r.movie_id] = { ...r.movies, total: 0, count: 0 };
      agg[r.movie_id].total  += r.score;
      agg[r.movie_id].count  += 1;
    });

    let results = Object.values(agg)
      .map((m) => ({ ...m, friendScore: Math.round(m.total / m.count), friendCount: m.count }))
      .sort((a, b) => b.friendScore - a.friendScore);

    results = applyInMemoryFilters(results, personSet, seenSet);
    setMovies(results.slice(0, 100));
  }

  // ── Taste Twins Rankings ─────────────────────────────────────────────────────
  async function fetchTasteTwinsRankings(personSet, seenSet) {
    // Step 1: get my top-rated movie IDs
    const { data: myRatings } = await supabase
      .from("user_reactions")
      .select("movie_id, score")
      .eq("user_id", user.id)
      .gt("rating", 0)
      .not("score", "is", null)
      .order("score", { ascending: false })
      .limit(30);

    const myMovieIds = (myRatings ?? []).map((r) => r.movie_id);
    if (myMovieIds.length === 0) { setMovies([]); return; }

    // Step 2: find other users who rated those same movies
    const { data: overlaps } = await supabase
      .from("user_reactions")
      .select("user_id, movie_id, score")
      .in("movie_id", myMovieIds)
      .neq("user_id", user.id)
      .gt("rating", 0)
      .not("score", "is", null);

    // Count overlap per user and pick top 20 taste twins
    const userOverlap = {};
    (overlaps ?? []).forEach((r) => {
      if (!userOverlap[r.user_id]) userOverlap[r.user_id] = 0;
      userOverlap[r.user_id] += 1;
    });
    const twinIds = Object.entries(userOverlap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([id]) => id);

    if (twinIds.length === 0) { setMovies([]); return; }

    // Step 3: get all ratings from those twins
    const { data: twinRatings } = await supabase
      .from("user_reactions")
      .select("movie_id, score, movies(id, title, year, poster_url, genres, language, global_score)")
      .in("user_id", twinIds)
      .gt("rating", 0)
      .not("score", "is", null)
      .limit(1000);

    // Aggregate: average twin score per movie
    const agg = {};
    (twinRatings ?? []).forEach((r) => {
      if (!r.movies) return;
      if (!agg[r.movie_id]) agg[r.movie_id] = { ...r.movies, total: 0, count: 0 };
      agg[r.movie_id].total += r.score;
      agg[r.movie_id].count += 1;
    });

    let results = Object.values(agg)
      .map((m) => ({ ...m, twinScore: Math.round(m.total / m.count), twinCount: m.count }))
      .sort((a, b) => b.twinScore - a.twinScore);

    results = applyInMemoryFilters(results, personSet, seenSet);
    setMovies(results.slice(0, 100));
  }

  // ── Global Rankings ──────────────────────────────────────────────────────────
  async function fetchGlobalRankings(personIds, seenSet) {
    let q = supabase
      .from("movies")
      .select("id, title, year, poster_url, genres, global_score, tmdb_rating, language")
      .not("global_score", "is", null)
      .order("global_score", { ascending: false })
      .limit(200);

    if (filters.decade) {
      q = q.gte("year", filters.decade.min).lte("year", filters.decade.max);
    }
    if (filters.language) q = q.eq("language", filters.language);
    if (personIds)         q = q.in("id", personIds);

    const [{ data }, { count }] = await Promise.all([
      q,
      supabase.from("user_reactions").select("*", { count: "exact", head: true }).not("score", "is", null),
    ]);

    let results = data ?? [];
    if (seenSet && filters.seenFilter === "unseen") results = results.filter((m) => !seenSet.has(m.id));
    if (seenSet && filters.seenFilter === "seen")   results = results.filter((m) =>  seenSet.has(m.id));

    setMovies(results.slice(0, 100));
    setTotalRatings(count ?? 0);
  }

  // ── Shared in-memory filter for personal + friends + twins ──────────────────
  function applyInMemoryFilters(results, personSet, seenSet = null) {
    if (filters.decade) {
      const { min, max } = filters.decade;
      results = results.filter((m) => m.year >= min && m.year <= max);
    }
    if (filters.language) {
      results = results.filter((m) => m.language === filters.language);
    }
    if (personSet) {
      results = results.filter((m) => personSet.has(m.id));
    }
    if (filters.seenFilter && seenSet) {
      if (filters.seenFilter === "unseen") results = results.filter((m) => !seenSet.has(m.id));
      if (filters.seenFilter === "seen")   results = results.filter((m) =>  seenSet.has(m.id));
    }
    return results;
  }

  function handleRated(movieId, newRating) {
    // Re-fetch updated score for this movie after editing
    supabase
      .from("user_reactions")
      .select("score, rating")
      .eq("user_id", user.id)
      .eq("movie_id", movieId)
      .single()
      .then(({ data }) => {
        if (!data) return;
        setMovies((prev) =>
          prev
            .map((m) => m.id === movieId ? { ...m, userScore: data.score, userRating: data.rating } : m)
            .sort((a, b) => b.userScore - a.userScore)
        );
      });
    setEditingMovie(null);
  }

  const isMy     = mode === "my"      && !!user;
  const isFriends = mode === "friends" && !!user;
  const isTwins  = mode === "twins"   && !!user;
  const isGlobal = mode === "global";

  const filterCount = countActiveFilters(filters);

  const tabs = [
    ...(user ? [{ id: "my",      label: "My Rankings"  }] : []),
    ...(user ? [{ id: "friends", label: "Friends"       }] : []),
    ...(user ? [{ id: "twins",   label: "Taste Twins"   }] : []),
    {            id: "global",   label: "Global"         },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 bg-stone-50 min-h-screen">

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-stone-900 mb-1">Rankings</h1>
          <p className="text-stone-500 text-sm">
            {isMy      ? "Your films ranked by personal score"
             : isFriends ? "What your friends love most"
             : isTwins  ? "Top picks from people with your taste"
             : `Community's top films${totalRatings > 0 ? ` · ${totalRatings.toLocaleString()} ratings` : ""}`}
          </p>
        </div>
        {movies.length > 0 && isMy && (
          <button
            onClick={() => setShowShareCard(true)}
            className="flex items-center gap-1.5 text-xs text-stone-500 border border-stone-200 bg-white rounded-lg px-3 py-1.5 hover:bg-stone-50 transition-colors shrink-0"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Share
          </button>
        )}
      </div>

      {/* Mode tabs + Filter icon */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex gap-1 bg-stone-100 rounded-xl p-1 flex-1 overflow-x-auto scroll-hide">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setMode(t.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                mode === t.id
                  ? "bg-white text-stone-900 shadow-sm"
                  : "text-stone-500 hover:text-stone-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Filter button */}
        <button
          onClick={() => setFilterOpen(true)}
          className={`relative shrink-0 w-10 h-10 rounded-xl border flex items-center justify-center transition-all ${
            filterCount > 0
              ? "bg-orange-600 border-orange-600 text-white shadow-sm"
              : "bg-white border-stone-200 text-stone-500 hover:border-stone-300 shadow-sm"
          }`}
        >
          {filterCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-stone-900 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-white leading-none">
              {filterCount}
            </span>
          )}
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="4"  y1="21" x2="4"  y2="14"/>
            <line x1="4"  y1="10" x2="4"  y2="3"/>
            <line x1="12" y1="21" x2="12" y2="12"/>
            <line x1="12" y1="8"  x2="12" y2="3"/>
            <line x1="20" y1="21" x2="20" y2="16"/>
            <line x1="20" y1="12" x2="20" y2="3"/>
            <line x1="1"  y1="14" x2="7"  y2="14"/>
            <line x1="9"  y1="8"  x2="15" y2="8"/>
            <line x1="17" y1="16" x2="23" y2="16"/>
          </svg>
        </button>
      </div>

      {/* Active filter chips */}
      {filterCount > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {filters.language && (
            <span className="inline-flex items-center gap-1.5 bg-orange-50 border border-orange-200 text-orange-700 text-xs font-medium px-3 py-1 rounded-full">
              {languageName(filters.language)}
              <button onClick={() => setFilters((f) => ({ ...f, language: null }))}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </span>
          )}
          {filters.decade && (
            <span className="inline-flex items-center gap-1.5 bg-stone-100 border border-stone-200 text-stone-700 text-xs font-medium px-3 py-1 rounded-full">
              {filters.decade.label}
              <button onClick={() => setFilters((f) => ({ ...f, decade: null }))}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </span>
          )}
          {filters.actorName && (
            <span className="inline-flex items-center gap-1.5 bg-stone-100 border border-stone-200 text-stone-700 text-xs font-medium px-3 py-1 rounded-full">
              {filters.actorName}
              <button onClick={() => setFilters((f) => ({ ...f, actorId: null, actorName: "" }))}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </span>
          )}
          {filters.directorName && (
            <span className="inline-flex items-center gap-1.5 bg-stone-100 border border-stone-200 text-stone-700 text-xs font-medium px-3 py-1 rounded-full">
              Dir: {filters.directorName}
              <button onClick={() => setFilters((f) => ({ ...f, directorId: null, directorName: "" }))}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </span>
          )}
          {filters.seenFilter && (
            <span className="inline-flex items-center gap-1.5 bg-stone-100 border border-stone-200 text-stone-700 text-xs font-medium px-3 py-1 rounded-full">
              {filters.seenFilter === "seen" ? "Only Rated" : "Not Rated"}
              <button onClick={() => setFilters((f) => ({ ...f, seenFilter: null }))}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </span>
          )}
          <button
            onClick={() => setFilters(EMPTY_FILTERS)}
            className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
          >
            Clear all
          </button>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => <div key={i} className="h-16 rounded-2xl shimmer" />)}
        </div>
      ) : movies.length === 0 ? (
        <div className="text-center py-20 text-stone-400 bg-white border border-stone-200 rounded-2xl">
          <p className="text-4xl mb-3">
            {isMy ? "🏆" : isFriends ? "👥" : isTwins ? "🧬" : "🌐"}
          </p>
          <p className="font-medium text-stone-600 mb-1">
            {isMy
              ? (filterCount > 0 ? "No matches for these filters" : "No personal rankings yet")
              : isFriends
              ? (filterCount > 0 ? "No matches for these filters" : "No friend ratings yet")
              : isTwins
              ? (filterCount > 0 ? "No matches for these filters" : "No taste twins found yet")
              : (filterCount > 0 ? "No matches for these filters" : "No global rankings yet")}
          </p>
          <p className="text-sm mb-4">
            {isMy
              ? (filterCount > 0 ? "Try clearing some filters" : "Rate films to build your list")
              : isFriends
              ? (filterCount > 0 ? "Try clearing some filters" : "Follow people to see what they love")
              : isTwins
              ? (filterCount > 0 ? "Try clearing some filters" : "Rate more films to find your taste twins")
              : "Be the first to rate films"}
          </p>
          {isMy && !filterCount && (
            <Link href="/onboarding" className="text-orange-600 text-sm hover:underline">Start rating →</Link>
          )}
          {isFriends && !filterCount && (
            <Link href="/taste-profile" className="text-orange-600 text-sm hover:underline">Find people to follow →</Link>
          )}
          {isTwins && !filterCount && (
            <Link href="/onboarding" className="text-orange-600 text-sm hover:underline">Rate more films →</Link>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {movies.map((movie, i) => {
            const score = isMy
              ? movie.userScore
              : isFriends
              ? movie.friendScore
              : isTwins
              ? movie.twinScore
              : movie.global_score;

            const roundScore = score ? Math.round(score) : null;
            const rank       = i + 1;
            const scoreColor = !roundScore ? "text-stone-400"
              : roundScore >= 80 ? "text-rose-600"
              : roundScore >= 60 ? "text-orange-600"
              : "text-stone-500";
            const barColor = !roundScore ? "bg-stone-200"
              : roundScore >= 80 ? "bg-rose-500"
              : roundScore >= 60 ? "bg-orange-500"
              : "bg-stone-300";

            return (
              <div
                key={movie.id}
                className="flex items-center gap-2 bg-white border border-stone-200 rounded-2xl p-3 hover:border-stone-300 hover:shadow-sm transition-all group"
              >
                {/* Navigable area */}
                <Link href={`/movies/${movie.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Rank */}
                  <div className="w-8 text-center shrink-0">
                    <span className="text-stone-400 text-sm font-bold">#{rank}</span>
                  </div>

                  {/* Poster */}
                  <div className="w-10 h-14 rounded-lg overflow-hidden bg-stone-100 shrink-0">
                    {movie.poster_url
                      ? <img src={movie.poster_url} alt={movie.title} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-stone-300">🎬</div>
                    }
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-stone-900 group-hover:text-orange-600 transition-colors truncate">
                      {movie.title}
                    </p>
                    <p className="text-xs text-stone-400 mt-0.5">
                      {movie.year}
                      {movie.genres?.length > 0 && ` · ${movie.genres.slice(0, 2).join(", ")}`}
                      {isFriends && movie.friendCount > 1 && ` · ${movie.friendCount} friends`}
                      {isTwins && movie.twinCount > 1 && ` · ${movie.twinCount} twins`}
                    </p>
                  </div>

                  {/* Score */}
                  {roundScore != null && (
                    <div className="shrink-0 flex flex-col items-end gap-1.5">
                      <p className={`text-lg font-black ${scoreColor}`}>{roundScore}</p>
                      <div className="w-14 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${roundScore}%` }} />
                      </div>
                    </div>
                  )}
                </Link>

                {/* Edit — My Rankings only */}
                {isMy && (
                  <button
                    onClick={() => setEditingMovie(movie)}
                    className="text-stone-300 hover:text-orange-500 transition-colors shrink-0 pl-1"
                    title="Edit rating"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                )}
              </div>
            );
          })}

          {/* CTAs at bottom */}
          {isMy && movies.length > 0 && (
            <div className="pt-4 text-center">
              <Link href="/compare" className="inline-block bg-orange-600 text-white font-bold text-sm px-6 py-2.5 rounded-full hover:bg-orange-500 transition-colors">
                Compare films to refine rankings →
              </Link>
            </div>
          )}
          {isGlobal && !user && (
            <div className="pt-4 bg-orange-50 border border-orange-100 rounded-2xl p-5 text-center">
              <p className="font-semibold text-stone-900 text-sm mb-1">See your personal ranking</p>
              <p className="text-stone-500 text-xs mb-3">Sign in to rank films based on your own taste</p>
              <Link href="/login" className="inline-block bg-orange-600 text-white font-bold text-sm px-5 py-2 rounded-full hover:bg-orange-500 transition-colors">
                Sign in →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Share card */}
      {showShareCard && (
        <RankingsShareCard
          movies={movies}
          totalRated={personalTotal}
          isPersonal={isMy}
          language={filters.language}
          onClose={() => setShowShareCard(false)}
        />
      )}

      {/* Edit rating modal */}
      {editingMovie && (
        <RatingModal
          movieId={editingMovie.id}
          movieTitle={editingMovie.title}
          posterUrl={editingMovie.poster_url}
          onClose={() => setEditingMovie(null)}
          onRated={(rating) => handleRated(editingMovie.id, rating)}
          onDeleted={() => {
            setMovies((prev) => prev.filter((m) => m.id !== editingMovie.id));
            setEditingMovie(null);
          }}
        />
      )}

      {/* Filter panel */}
      <FilterPanel
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        filters={filters}
        onChange={setFilters}
      />
    </div>
  );
}
