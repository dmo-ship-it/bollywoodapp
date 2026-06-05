"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import MovieCard from "./components/MovieCard";
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

const DECADES = [
  { label: "2020s",    min: 2020, max: 2029 },
  { label: "2010s",    min: 2010, max: 2019 },
  { label: "2000s",    min: 2000, max: 2009 },
  { label: "90s",      min: 1990, max: 1999 },
  { label: "Classics", min: 1900, max: 1989 },
];

const SECTIONS = [
  { id: "popular", label: "Most Loved",  sort: "tmdb_popularity", ascending: false },
  { id: "rated",   label: "Top Rated",   sort: "tmdb_rating",     ascending: false },
  { id: "newest",  label: "New",         sort: "year",            ascending: false },
  { id: "classic", label: "Classics",    sort: "year",            ascending: true  },
];

export default function HomePage() {
  const [hero,    setHero]    = useState(null);
  const [movies,  setMovies]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [vibe,    setVibe]    = useState(null);
  const [decade,  setDecade]  = useState(null);
  const [section, setSection] = useState(SECTIONS[0]);

  useEffect(() => {
    supabase
      .from("movies")
      .select("id, title, year, overview, backdrop_url, poster_url, tmdb_rating, genres, ott_platforms, mood_tags, tone")
      .not("backdrop_url", "is", null)
      .order("tmdb_popularity", { ascending: false })
      .limit(8)
      .then(({ data }) => {
        if (data?.length) setHero(data[Math.floor(Math.random() * data.length)]);
      });
  }, []);

  const fetchMovies = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("movies")
      .select("id, title, year, poster_url, tmdb_rating, tmdb_popularity, genres, verdict, tone, mood_tags")
      .limit(60);

    if (search) query = query.ilike("title", `%${search}%`);
    if (decade) query = query.gte("year", decade.min).lte("year", decade.max);
    if (vibe)   query = query.overlaps("tone", [vibe.tag]).or(`mood_tags.ov.{${vibe.tag}}`);
    query = query.order(section.sort, { ascending: section.ascending });

    const { data } = await query;
    setMovies(data ?? []);
    setLoading(false);
  }, [search, vibe, decade, section]);

  useEffect(() => {
    const t = setTimeout(fetchMovies, 150);
    return () => clearTimeout(t);
  }, [fetchMovies]);

  const isFiltered = search || vibe || decade;

  return (
    <div className="min-h-screen bg-stone-50">

      {!isFiltered && hero && <HeroMovie movie={hero} />}

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
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-stone-200 rounded-xl pl-10 pr-10 py-3 text-stone-900 placeholder-stone-400 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all text-sm shadow-sm"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          )}
        </div>

        {/* Vibe filters — horizontal scroll */}
        <div className="flex gap-2 overflow-x-auto scroll-hide pb-1 mb-5 -mx-4 px-4">
          {VIBES.map((v) => (
            <button
              key={v.tag}
              onClick={() => setVibe(vibe?.tag === v.tag ? null : v)}
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

        {/* Section + Decade row */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-1">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => setSection(s)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  section.id === s.id
                    ? "text-stone-900 bg-stone-200"
                    : "text-stone-400 hover:text-stone-700"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1 overflow-x-auto scroll-hide">
            {DECADES.map((d) => (
              <button
                key={d.label}
                onClick={() => setDecade(decade?.label === d.label ? null : d)}
                className={`shrink-0 px-2.5 py-1 text-[11px] font-medium rounded-md transition-all ${
                  decade?.label === d.label
                    ? "text-orange-600 bg-orange-50"
                    : "text-stone-400 hover:text-stone-600"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results count */}
        {!loading && isFiltered && (
          <div className="flex items-center justify-between mb-4">
            <p className="text-stone-400 text-xs">{movies.length} film{movies.length !== 1 ? "s" : ""}</p>
            <button onClick={() => { setSearch(""); setVibe(null); setDecade(null); }} className="text-xs text-orange-600 hover:text-orange-500 transition-colors font-medium">
              Clear filters
            </button>
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3 md:gap-4">
            {Array.from({ length: 21 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] rounded-xl shimmer" />
            ))}
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
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
