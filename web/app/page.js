"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { createClient } from "../lib/supabase-browser";
import MovieCard from "./components/MovieCard";
import MovieRow from "./components/MovieRow";
import HeroMovie from "./components/HeroMovie";

const VIBES = [
  { label: "🔥 Hype",        tag: "High-energy"                  },
  { label: "😭 Emotional",   tag: "Emotional"                    },
  { label: "😂 Comedy",      tag: "laugh-out-loud comedy"        },
  { label: "🫶 Feel-Good",   tag: "feel-good"                    },
  { label: "😰 Thriller",    tag: "edge-of-your-seat thriller"   },
  { label: "🌑 Dark",        tag: "dark"                         },
  { label: "💑 Date Night",  tag: "perfect date night"           },
  { label: "👨‍👩‍👧 Family",      tag: "watch with family"            },
  { label: "💎 Hidden Gem",  tag: "underrated"                   },
];

const TODAY = new Date().toISOString().split("T")[0];
// New releases = released in the last ~120 days
const NEW_CUTOFF = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

const MOVIE_COLS = "id, title, year, release_date, poster_url, tmdb_rating, tmdb_popularity, genres, verdict, tone, mood_tags";

export default function HomePage() {
  const [hero,          setHero]          = useState(null);
  const [recommended,   setRecommended]   = useState([]);
  const [newReleases,   setNewReleases]   = useState([]);
  const [trending,      setTrending]      = useState([]);
  const [comingSoon,    setComingSoon]    = useState([]);
  const [curatedLoading,setCuratedLoading]= useState(true);

  const [movies,        setMovies]        = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [search,        setSearch]        = useState("");
  const [vibe,          setVibe]          = useState(null);
  const [seeAll,        setSeeAll]        = useState(null); // "new" | "trending" | null
  const [userScores,    setUserScores]    = useState({});
  const [userWatchlist, setUserWatchlist] = useState(new Set());

  // Initial load — hero, curated sections, user data
  useEffect(() => {
    async function loadCurated() {
      const [heroRes, newRes, trendRes, soonRes] = await Promise.all([
        supabase.from("movies").select("id, title, year, overview, backdrop_url, poster_url, tmdb_rating, genres, ott_platforms, mood_tags, tone")
          .not("backdrop_url", "is", null).order("tmdb_popularity", { ascending: false }).limit(8),
        // New releases — recent, by release date
        supabase.from("movies").select(MOVIE_COLS)
          .lte("release_date", TODAY).gte("release_date", NEW_CUTOFF)
          .order("release_date", { ascending: false }).limit(20),
        // Trending — older films, high popularity
        supabase.from("movies").select(MOVIE_COLS)
          .lt("release_date", NEW_CUTOFF)
          .order("tmdb_popularity", { ascending: false }).limit(20),
        // Coming soon — future releases (with trailers)
        supabase.from("movies").select(MOVIE_COLS + ", trailer_url")
          .gt("release_date", TODAY)
          .order("release_date", { ascending: true }).limit(20),
      ]);

      if (heroRes.data?.length) setHero(heroRes.data[Math.floor(Math.random() * heroRes.data.length)]);
      setNewReleases(newRes.data ?? []);
      setTrending(trendRes.data ?? []);
      setComingSoon(soonRes.data ?? []);
      setCuratedLoading(false);
    }
    loadCurated();

    const browserSupabase = createClient();
    browserSupabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const [{ data: reactions }, { data: watchlist }, { data: profile }] = await Promise.all([
        browserSupabase.from("user_reactions").select("movie_id, rating, score, movies(genres, language)").eq("user_id", data.user.id),
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
    // Try precomputed matrix-factorization recommendations first
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

    // Fallback: simple genre/language-based recommendations
    const genreCount = {};
    reactions.filter((r) => r.rating >= 4).forEach((r) => {
      (r.movies?.genres ?? []).forEach((g) => { genreCount[g] = (genreCount[g] ?? 0) + 1; });
    });
    const topGenres = Object.entries(genreCount).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([g]) => g);
    const langs = profile?.language_preferences ?? [];

    // Not enough signal yet — skip personalized row
    if (topGenres.length === 0 && langs.length === 0) {
      setRecommended([]);
      return;
    }

    let q = supabase.from("movies").select(MOVIE_COLS)
      .lte("release_date", TODAY)
      .order("tmdb_popularity", { ascending: false })
      .limit(40);

    if (topGenres.length > 0) q = q.overlaps("genres", topGenres);

    const { data } = await q;
    // Exclude already-rated, prefer preferred languages, cap at 20
    const filtered = (data ?? [])
      .filter((m) => !ratedIds.has(m.id))
      .sort((a, b) => {
        const aLang = langs.includes(a.language) ? 1 : 0;
        const bLang = langs.includes(b.language) ? 1 : 0;
        return bLang - aLang;
      })
      .slice(0, 20);

    setRecommended(filtered);
  }

  // Grid fetch — only when searching, filtering by vibe, or "see all"
  const fetchMovies = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("movies").select(MOVIE_COLS).limit(60);

    if (search) query = query.ilike("title", `%${search}%`);
    if (vibe)   query = query.overlaps("tone", [vibe.tag]).or(`mood_tags.ov.{${vibe.tag}}`);

    if (seeAll === "new") {
      query = query.lte("release_date", TODAY).gte("release_date", NEW_CUTOFF).order("release_date", { ascending: false });
    } else if (seeAll === "trending") {
      query = query.lt("release_date", NEW_CUTOFF).order("tmdb_popularity", { ascending: false });
    } else {
      query = query.order("tmdb_popularity", { ascending: false });
    }

    const { data } = await query;
    setMovies(data ?? []);
    setLoading(false);
  }, [search, vibe, seeAll]);

  const isGridMode = search || vibe || seeAll;

  useEffect(() => {
    if (!isGridMode) return;
    const t = setTimeout(fetchMovies, 150);
    return () => clearTimeout(t);
  }, [fetchMovies, isGridMode]);

  function clearAll() {
    setSearch(""); setVibe(null); setSeeAll(null);
  }

  return (
    <div className="min-h-screen bg-stone-50">

      {!isGridMode && hero && <HeroMovie movie={hero} />}

      <div className="max-w-7xl mx-auto px-4 pt-6 pb-4">

        {/* Search */}
        <div className="relative mb-5">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Search any Indian film…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setSeeAll(null); }}
            className="w-full bg-white border border-stone-200 rounded-xl pl-10 pr-10 py-3 text-stone-900 placeholder-stone-400 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all text-sm shadow-sm"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          )}
        </div>

        {/* Vibe filters */}
        <div className="flex gap-2 overflow-x-auto scroll-hide pb-1 mb-6 -mx-4 px-4">
          {VIBES.map((v) => (
            <button
              key={v.tag}
              onClick={() => { setVibe(vibe?.tag === v.tag ? null : v); setSeeAll(null); }}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all border ${
                vibe?.tag === v.tag
                  ? "bg-orange-600 text-white border-orange-600 shadow-sm"
                  : "bg-white text-stone-600 border-stone-200 hover:border-stone-300 hover:text-stone-900 shadow-sm"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>

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
                  userScores={userScores}
                  userWatchlist={userWatchlist}
                />
                <MovieRow
                  title="New Releases"
                  subtitle="Fresh in cinemas"
                  movies={newReleases}
                  userScores={userScores}
                  userWatchlist={userWatchlist}
                  onSeeAll={newReleases.length >= 20 ? () => setSeeAll("new") : null}
                />
                <MovieRow
                  title="Trending"
                  subtitle="What everyone's watching"
                  movies={trending}
                  userScores={userScores}
                  userWatchlist={userWatchlist}
                  onSeeAll={() => setSeeAll("trending")}
                />
                <MovieRow
                  title="Coming Soon"
                  subtitle="On the way"
                  movies={comingSoon}
                  userWatchlist={userWatchlist}
                  comingSoon
                />
              </>
            )}
          </>
        )}

        {/* ── Grid view (search / vibe / see all) ── */}
        {isGridMode && (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-stone-500 text-sm font-medium">
                {seeAll === "new" ? "New Releases" : seeAll === "trending" ? "Trending" : `${movies.length} film${movies.length !== 1 ? "s" : ""}`}
              </p>
              <button onClick={clearAll} className="text-xs text-orange-600 hover:text-orange-500 transition-colors font-medium">
                ← Back to Discover
              </button>
            </div>

            {loading ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3 md:gap-4">
                {Array.from({ length: 21 }).map((_, i) => <div key={i} className="aspect-[2/3] rounded-xl shimmer" />)}
              </div>
            ) : movies.length === 0 ? (
              <div className="text-center py-28">
                <p className="text-4xl mb-3">🎬</p>
                <p className="text-stone-500 font-medium">No films found</p>
                <p className="text-stone-400 text-sm mt-1">Try a different mood or search term</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3 md:gap-4">
                {movies.map((movie) => (
                  <MovieCard key={movie.id} movie={movie} userScore={userScores[movie.id]} isWatchlisted={userWatchlist.has(movie.id)} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
