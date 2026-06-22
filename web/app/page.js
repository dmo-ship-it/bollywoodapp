"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { languageName } from "../lib/languages";
import { supabase } from "../lib/supabase";
import { createClient } from "../lib/supabase-browser";
import { getPersonalizedScoreMap, getTasteBasedRecommendations } from "../lib/taste";
import MovieCard from "./components/MovieCard";
import MovieRow from "./components/MovieRow";
import HeroMovie from "./components/HeroMovie";
import FilterPanel, {
  EMPTY_FILTERS,
  countActiveFilters,
  resolvePersonMovieIds,
} from "./components/FilterPanel";

const TODAY    = new Date().toISOString().split("T")[0];
const NEW_CUTOFF = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

const MOVIE_COLS = "id, title, year, release_date, poster_url, tmdb_rating, tmdb_popularity, genres, verdict, tone, mood_tags";

export default function HomePage() {
  const [hero,           setHero]          = useState(null);
  const [recommended,    setRecommended]   = useState([]);
  const [newReleases,    setNewReleases]   = useState([]);
  const [trending,       setTrending]      = useState([]);
  const [comingSoon,     setComingSoon]    = useState([]);
  const [curatedLoading, setCuratedLoading]= useState(true);

  const [movies,         setMovies]        = useState([]);
  const [loading,        setLoading]       = useState(false);
  const [search,         setSearch]        = useState("");
  const [filters,        setFilters]       = useState(EMPTY_FILTERS);
  const [filterOpen,     setFilterOpen]    = useState(false);
  const [seeAll,         setSeeAll]        = useState(null); // "new" | "trending" | "coming-soon" | "recommended" | null
  const [userScores,     setUserScores]    = useState({});  // user's own rating-derived scores
  const [personalScores, setPersonalScores]= useState({});  // predicted "for you" scores (taste match)
  const [userId,         setUserId]        = useState(null);
  const [userWatchlist,  setUserWatchlist] = useState(new Set());
  const [titleIndex,     setTitleIndex]    = useState([]);

  // The score shown on every card: the user's own score wins where they've rated,
  // otherwise the personalized taste-match prediction. Falls back to global score
  // (inside MovieCard) when the user has no taste signal yet.
  const cardScores = useMemo(() => ({ ...personalScores, ...userScores }), [personalScores, userScores]);

  // Initial load — hero, curated sections, user data
  useEffect(() => {
    // Seed title index from cache immediately so search works before the fetch returns.
    try {
      const cached = localStorage.getItem("rasika_title_index");
      if (cached) setTitleIndex(JSON.parse(cached));
    } catch {}

    async function loadCurated() {
      const [heroRes, newRes, trendRes, soonRes, indexRes] = await Promise.all([
        supabase
          .from("movies")
          .select("id, title, year, overview, backdrop_url, poster_url, tmdb_rating, genres, ott_platforms, mood_tags, tone")
          .not("backdrop_url", "is", null)
          .order("tmdb_popularity", { ascending: false })
          .limit(8),
        supabase.from("movies").select(MOVIE_COLS)
          .lte("release_date", TODAY).gte("release_date", NEW_CUTOFF)
          .order("release_date", { ascending: false }).limit(20),
        supabase.from("movies").select(MOVIE_COLS)
          .lt("release_date", NEW_CUTOFF)
          .order("tmdb_popularity", { ascending: false }).limit(20),
        supabase.from("movies").select(MOVIE_COLS + ", trailer_url")
          .gt("release_date", TODAY)
          .order("release_date", { ascending: true }).limit(20),
        supabase.from("movies").select(MOVIE_COLS)
          .order("tmdb_popularity", { ascending: false })
          .limit(5000),
      ]);

      if (heroRes.data?.length) setHero(heroRes.data[Math.floor(Math.random() * heroRes.data.length)]);
      setNewReleases(newRes.data ?? []);
      setTrending(trendRes.data ?? []);
      setComingSoon(soonRes.data ?? []);
      if (indexRes.data?.length) {
        setTitleIndex(indexRes.data);
        try { localStorage.setItem("rasika_title_index", JSON.stringify(indexRes.data)); } catch {}
      }
      setCuratedLoading(false);
    }
    loadCurated();

    const browserSupabase = createClient();
    browserSupabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      setUserId(data.user.id);
      const [{ data: reactions }, { data: watchlist }, { data: profile }] = await Promise.all([
        browserSupabase
          .from("user_reactions")
          .select("movie_id, rating, score, movies(genres, language)")
          .eq("user_id", data.user.id),
        browserSupabase.from("user_watchlist").select("movie_id").eq("user_id", data.user.id),
        browserSupabase.from("user_profiles").select("language_preferences").eq("user_id", data.user.id).single(),
      ]);

      const ratedIds = new Set();
      if (reactions) {
        const map = {};
        reactions.forEach((r) => {
          ratedIds.add(r.movie_id);
          if (r.score != null) map[r.movie_id] = r.score;
        });
        setUserScores(map);
      }
      if (watchlist) setUserWatchlist(new Set(watchlist.map((w) => w.movie_id)));

      // Build recommendations from taste
      buildRecommendations(reactions ?? [], profile, ratedIds, data.user.id, browserSupabase);
    });
  }, []);

  async function buildRecommendations(reactions, profile, ratedIds, userId, authSupabase) {
    // Primary: precomputed matrix-factorization recommendations (SVD, built weekly
    // by scripts/build_recommendations.py from MovieLens + real user ratings).
    if (userId) {
      const { data: precomputed } = await authSupabase
        .from("user_recommendations")
        .select("movie_id, score, rank, movies(" + MOVIE_COLS + ")")
        .eq("user_id", userId)
        .order("rank", { ascending: true })
        .limit(20);

      if (precomputed?.length) {
        setRecommended(precomputed.map((r) => r.movies).filter(Boolean));
        return;
      }
    }

    // Fallback: taste engine (content-based) when no precomputed recs exist yet.
    if (userId) {
      const tasteRecs = await getTasteBasedRecommendations(userId, { limit: 20 });
      const strong = tasteRecs.filter((m) => m.matchPct >= 60);
      if (strong.length >= 5) {
        setRecommended(strong);
        setPersonalScores((prev) => {
          const next = { ...prev };
          for (const m of strong) if (next[m.id] == null) next[m.id] = m.matchPct;
          return next;
        });
        return;
      }
    }

    // Last resort: simple genre/language-based recommendations
    const genreCount = {};
    reactions.filter((r) => r.rating >= 4).forEach((r) => {
      (r.movies?.genres ?? []).forEach((g) => { genreCount[g] = (genreCount[g] ?? 0) + 1; });
    });
    const topGenres = Object.entries(genreCount).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([g]) => g);
    const langs = profile?.language_preferences ?? [];

    if (topGenres.length === 0 && langs.length === 0) { setRecommended([]); return; }

    let q = supabase.from("movies").select(MOVIE_COLS)
      .lte("release_date", TODAY)
      .order("tmdb_popularity", { ascending: false })
      .limit(40);

    if (topGenres.length > 0) q = q.overlaps("genres", topGenres);

    const { data } = await q;
    const filtered = (data ?? [])
      .filter((m) => !ratedIds.has(m.id))
      .sort((a, b) => (langs.includes(b.language) ? 1 : 0) - (langs.includes(a.language) ? 1 : 0))
      .slice(0, 20);

    setRecommended(filtered);
  }

  // Fetch personalized "for you" scores for every visible movie that doesn't have
  // one yet. Coming-soon films are skipped (their cards don't show a score).
  useEffect(() => {
    if (!userId) return;
    const ids = [...recommended, ...newReleases, ...trending, ...movies]
      .map((m) => m.id)
      .filter((id) => id && !(id in personalScores));
    if (ids.length === 0) return;
    const unique = [...new Set(ids)];
    getPersonalizedScoreMap(userId, unique).then((map) => {
      if (map && Object.keys(map).length) setPersonalScores((prev) => ({ ...prev, ...map }));
    });
  }, [userId, recommended, newReleases, trending, movies]); // eslint-disable-line react-hooks/exhaustive-deps

  // Grid fetch — runs when searching, filtering, or "see all"
  const fetchMovies = useCallback(async (signal) => {
    setLoading(true);

    // Resolve actor/director filters to movie IDs (may require extra DB calls)
    const personIds = await resolvePersonMovieIds(filters, supabase);
    if (signal.aborted) return;
    if (personIds !== null && personIds.length === 0) {
      setMovies([]);
      setLoading(false);
      return;
    }

    let query = supabase.from("movies").select(MOVIE_COLS).limit(60);

    if (search)           query = query.ilike("title", `%${search}%`);
    if (filters.language) query = query.eq("language", filters.language);
    if (filters.decade) {
      query = query.gte("year", filters.decade.min).lte("year", filters.decade.max);
    }
    if (personIds)        query = query.in("id", personIds);

    if (seeAll === "new") {
      query = query.lte("release_date", TODAY).gte("release_date", NEW_CUTOFF).order("release_date", { ascending: false });
    } else if (seeAll === "trending") {
      query = query.lt("release_date", NEW_CUTOFF).order("tmdb_popularity", { ascending: false });
    } else if (seeAll === "coming-soon") {
      query = query.gt("release_date", TODAY).order("release_date", { ascending: true });
    } else if (seeAll === "recommended") {
      query = query.in("id", recommended.map((m) => m.id)).order("tmdb_popularity", { ascending: false });
    } else {
      query = query.order("tmdb_popularity", { ascending: false });
    }

    const { data } = await query.abortSignal(signal);
    if (signal.aborted) return;
    setMovies(data ?? []);
    setLoading(false);
  }, [search, filters.language, filters.decade?.label, filters.actorId, filters.directorId, seeAll]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasActiveFilters = countActiveFilters(filters) > 0;
  const isGridMode       = (search && search.length >= 3) || hasActiveFilters || seeAll;

  // Pure title search is handled client-side — no DB round-trip needed.
  const isSearchOnly  = !!(search && search.length >= 3 && !hasActiveFilters && !seeAll);

  const searchResults = useMemo(() => {
    if (!isSearchOnly) return [];
    const q = search.toLowerCase();
    return titleIndex.filter((m) => m.title.toLowerCase().includes(q));
  }, [isSearchOnly, search, titleIndex]);

  useEffect(() => {
    if (!isGridMode || isSearchOnly) return;
    const controller = new AbortController();
    const t = setTimeout(() => fetchMovies(controller.signal), 150);
    return () => { clearTimeout(t); controller.abort(); };
  }, [fetchMovies, isGridMode, isSearchOnly]);

  const gridMovies = isSearchOnly ? searchResults : movies;

  function clearAll() { setSearch(""); setFilters(EMPTY_FILTERS); setSeeAll(null); }

  const filterCount = countActiveFilters(filters);

  return (
    <div className="min-h-screen" style={{ background: "var(--paper)" }}>

      {!isGridMode && hero && <HeroMovie movie={hero} />}

      <div className="max-w-7xl mx-auto px-4 pt-6 pb-4">

        {/* Search + Filter row */}
        <div className="flex items-center gap-2 mb-6">
          {/* Search */}
          <div className="relative flex-1">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Search any Indian film…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setSeeAll(null); }}
              className="w-full rounded-xl pl-10 pr-10 py-3 text-sm transition-all"
              style={{ background: "var(--card)", border: "1.5px solid var(--line)", color: "var(--ink)", outline: "none", boxShadow: "var(--shadow-card)" }}
              onFocus={e => e.target.style.borderColor = "var(--brand)"}
              onBlur={e => e.target.style.borderColor = "var(--line)"}
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            )}
          </div>

          {/* Filter button */}
          <button
            onClick={() => setFilterOpen(true)}
            className="relative shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-all"
            style={{
              background: filterCount > 0 ? "var(--brand)" : "var(--card)",
              border: `1.5px solid ${filterCount > 0 ? "var(--brand)" : "var(--line)"}`,
              color: filterCount > 0 ? "#fff" : "var(--ink-soft)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            {filterCount > 0 && (
              <span style={{ position: "absolute", top: -6, right: -6, background: "var(--ink)", color: "#fff", fontSize: 10, fontWeight: 700, width: 16, height: 16, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid var(--paper)", fontFamily: "var(--font-mono)" }}>
                {filterCount}
              </span>
            )}
            {/* Sliders icon */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
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

        {/* Active filter chips (when filters are set, show quick-clear chips) */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 mb-4 -mt-2">
            {filters.language && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(225,75,51,0.08)", border: "1px solid rgba(225,75,51,0.25)", color: "var(--brand)", fontSize: 12, fontWeight: 500, padding: "4px 10px", borderRadius: 999, fontFamily: "var(--font-ui)" }}>
                {languageName(filters.language)}
                <button onClick={() => setFilters((f) => ({ ...f, language: null }))} style={{ color: "var(--brand)", background: "none", border: "none", cursor: "pointer", display: "flex", padding: 0 }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              </span>
            )}
            {filters.decade && (
              <span className="inline-flex items-center gap-1.5 bg-stone-100 border border-stone-200 text-stone-700 text-xs font-medium px-3 py-1 rounded-full">
                {filters.decade.label}
                <button onClick={() => setFilters((f) => ({ ...f, decade: null }))} className="hover:text-stone-900">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              </span>
            )}
            {filters.actorName && (
              <span className="inline-flex items-center gap-1.5 bg-stone-100 border border-stone-200 text-stone-700 text-xs font-medium px-3 py-1 rounded-full">
                {filters.actorName}
                <button onClick={() => setFilters((f) => ({ ...f, actorId: null, actorName: "" }))} className="hover:text-stone-900">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              </span>
            )}
            {filters.directorName && (
              <span className="inline-flex items-center gap-1.5 bg-stone-100 border border-stone-200 text-stone-700 text-xs font-medium px-3 py-1 rounded-full">
                Dir: {filters.directorName}
                <button onClick={() => setFilters((f) => ({ ...f, directorId: null, directorName: "" }))} className="hover:text-stone-900">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              </span>
            )}
          </div>
        )}

        {/* ── Curated view ── */}
        {!isGridMode && (
          <>
            {curatedLoading ? (
              <div className="space-y-8">
                {[1, 2].map((s) => (
                  <div key={s}>
                    <div className="h-5 w-40 bg-stone-200 rounded mb-3 shimmer" />
                    <div className="flex gap-3 overflow-hidden">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="shrink-0 w-28 sm:w-32 md:w-36 aspect-[2/3] rounded-xl shimmer" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                <MovieRow
                  title="Recommended for You"
                  subtitle="Based on your taste"
                  movies={recommended}
                  userScores={cardScores}
                  userWatchlist={userWatchlist}
                  onSeeAll={recommended.length > 0 ? () => setSeeAll("recommended") : null}
                />
                <MovieRow
                  title="New Releases"
                  subtitle="Fresh in cinemas"
                  movies={newReleases}
                  userScores={cardScores}
                  userWatchlist={userWatchlist}
                  onSeeAll={newReleases.length >= 20 ? () => setSeeAll("new") : null}
                />
                <MovieRow
                  title="Trending"
                  subtitle="What everyone's watching"
                  movies={trending}
                  userScores={cardScores}
                  userWatchlist={userWatchlist}
                  onSeeAll={() => setSeeAll("trending")}
                />
                <MovieRow
                  title="Coming Soon"
                  subtitle="On the way"
                  movies={comingSoon}
                  userWatchlist={userWatchlist}
                  comingSoon
                  onSeeAll={comingSoon.length > 0 ? () => setSeeAll("coming-soon") : null}
                />
              </>
            )}
          </>
        )}

        {/* ── Grid view (search / filter / see all) ── */}
        {isGridMode && (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-stone-500 text-sm font-medium">
                {seeAll === "new"
                  ? "New Releases"
                  : seeAll === "trending"
                  ? "Trending"
                  : seeAll === "coming-soon"
                  ? "Coming Soon"
                  : seeAll === "recommended"
                  ? "Recommended for You"
                  : `${gridMovies.length} film${gridMovies.length !== 1 ? "s" : ""}`}
              </p>
              <button onClick={clearAll} style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--brand)", background: "none", border: "none", cursor: "pointer", fontWeight: 500 }}>
                ← Back to Discover
              </button>
            </div>

            {(!isSearchOnly && loading && gridMovies.length === 0) ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3 md:gap-4">
                {Array.from({ length: 21 }).map((_, i) => <div key={i} className="aspect-[2/3] rounded-xl shimmer" />)}
              </div>
            ) : gridMovies.length === 0 ? (
              <div className="text-center py-28">
                <p style={{ fontFamily: "var(--font-serif)", fontSize: 18, color: "var(--ink-soft)", marginBottom: 6 }}>No films found</p>
                <p style={{ fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--ink-mute)" }}>Try adjusting your filters or search term</p>
              </div>
            ) : (
              <div
                className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3 md:gap-4"
                style={{ opacity: (!isSearchOnly && loading) ? 0.45 : 1, transition: "opacity 0.15s ease" }}
              >
                {gridMovies.map((movie) => (
                  <MovieCard
                    key={movie.id}
                    movie={movie}
                    userScore={cardScores[movie.id]}
                    isWatchlisted={userWatchlist.has(movie.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Filter panel */}
      <FilterPanel
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        filters={filters}
        onChange={(f) => { setFilters(f); setSeeAll(null); }}
      />
    </div>
  );
}
