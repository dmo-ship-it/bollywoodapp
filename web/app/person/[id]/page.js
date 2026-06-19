"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "../../../lib/supabase-browser";
import Link from "next/link";
import WatchlistButton from "../../components/WatchlistButton";

const RATING_COLORS = { 5: "#E14B33", 4: "#E6A437", 3: "#C07A4E", 2: "#8C8A93", 1: "#8C8A93" };
const RATING_TEXT   = { 5: "Loved", 4: "Liked", 3: "Okay", 2: "Meh", 1: "Hated" };
const ROLE_ORDER    = ["Director", "Actor", "Music", "Producer", "Writer"];
const ROLE_LABELS   = { Director: "Directed", Actor: "Acted in", Music: "Music for", Producer: "Produced", Writer: "Written" };

export default function PersonPage() {
  const { id } = useParams();
  const supabase = createClient();

  const [person,      setPerson]      = useState(null);
  const [filmsByRole, setFilmsByRole] = useState({});
  const [userRatings, setUserRatings] = useState({});
  const [user,        setUser]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [activeRole,  setActiveRole]  = useState(null);

  useEffect(() => {
    async function load() {
      // Person info
      const { data: personData } = await supabase
        .from("people")
        .select("id, name, photo_url, primary_role, birthplace, born_on, bio")
        .eq("id", id)
        .single();

      if (!personData) { setLoading(false); return; }
      setPerson(personData);

      // All credits for this person
      const { data: credits } = await supabase
        .from("movie_credits")
        .select("role, character_name, movie_id")
        .eq("person_id", id);

      if (!credits?.length) { setLoading(false); return; }

      // Unique movie IDs
      const movieIds = [...new Set(credits.map((c) => c.movie_id))];

      // Fetch movies
      const { data: movies } = await supabase
        .from("movies")
        .select("id, title, year, poster_url, tmdb_rating, tmdb_popularity, genres, global_score, overview")
        .in("id", movieIds)
        .order("year", { ascending: false });

      const movieMap = Object.fromEntries((movies ?? []).map((m) => [m.id, m]));

      // Group by role, attach movie data
      const grouped = {};
      credits.forEach((c) => {
        const movie = movieMap[c.movie_id];
        if (!movie) return;
        const role = c.role ?? "Other";
        if (!grouped[role]) grouped[role] = [];
        // Avoid duplicates (same movie, same role)
        if (!grouped[role].find((f) => f.id === movie.id)) {
          grouped[role].push({ ...movie, character: c.character_name });
        }
      });

      // Sort each group by year desc
      Object.keys(grouped).forEach((role) => {
        grouped[role].sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
      });

      setFilmsByRole(grouped);

      // Set initial active role
      const firstRole = ROLE_ORDER.find((r) => grouped[r]?.length) ?? Object.keys(grouped)[0];
      setActiveRole(firstRole);

      // Fetch user ratings
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        const { data: ratings } = await supabase
          .from("user_reactions")
          .select("movie_id, rating")
          .eq("user_id", user.id)
          .in("movie_id", movieIds);
        setUserRatings(Object.fromEntries((ratings ?? []).map((r) => [r.movie_id, r.rating])));
      }

      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-center" style={{ color: "var(--ink-mute)" }}>
      Loading…
    </div>
  );

  if (!person) return (
    <div className="max-w-4xl mx-auto px-4 py-20 text-center" style={{ color: "var(--ink-mute)" }}>
      <p style={{ fontFamily: "var(--font-serif)", fontSize: 20, color: "var(--ink-soft)", marginBottom: 8 }}>Person not found</p>
      <Link href="/" style={{ color: "var(--brand)", fontWeight: 600 }}>← Home</Link>
    </div>
  );

  const allRoles   = ROLE_ORDER.filter((r) => filmsByRole[r]?.length > 0);
  const extraRoles = Object.keys(filmsByRole).filter((r) => !ROLE_ORDER.includes(r) && filmsByRole[r]?.length > 0);
  const roles      = [...allRoles, ...extraRoles];

  const totalFilms = [...new Set(Object.values(filmsByRole).flat().map((f) => f.id))].length;
  const seenCount  = Object.values(filmsByRole).flat().filter((f) => userRatings[f.id]).length;
  const activeFilms = (activeRole && filmsByRole[activeRole]) ?? [];
  const initials   = person.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 min-h-screen" style={{ background: "var(--paper)" }}>

      {/* Hero */}
      <div className="flex items-start gap-6 mb-8">
        {/* Photo */}
        <div className="shrink-0">
          {person.photo_url ? (
            <img
              src={person.photo_url}
              alt={person.name}
              className="w-24 h-24 md:w-32 md:h-32 rounded-2xl object-cover shadow-md"
            />
          ) : (
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl flex items-center justify-center text-white text-3xl font-black shadow-md" style={{ background: "var(--brand)" }}>
              {initials}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-3 flex-wrap mb-1">
            <h1 className="text-2xl md:text-3xl font-black text-stone-900 leading-tight">{person.name}</h1>
            {person.primary_role && (
              <span style={{ marginTop: 4, fontSize: 11, fontWeight: 600, background: "rgba(225,75,51,0.08)", color: "var(--brand)", border: "1px solid rgba(225,75,51,0.2)", padding: "4px 10px", borderRadius: 999, fontFamily: "var(--font-ui)" }}>
                {person.primary_role}
              </span>
            )}
          </div>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-stone-500 mb-4">
            {person.birthplace && (
              <span className="flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                {person.birthplace}
              </span>
            )}
            {person.born_on && (
              <span>{new Date(person.born_on).getFullYear()}</span>
            )}
          </div>

          {/* Stats */}
          <div className="flex gap-5 text-sm flex-wrap">
            <div>
              <span className="font-black text-stone-900 text-lg">{totalFilms}</span>
              <span className="text-stone-400 ml-1">films</span>
            </div>
            {user && seenCount > 0 && (
              <div>
                <span style={{ fontWeight: 900, color: "var(--brand)", fontSize: 18 }}>{seenCount}</span>
                <span className="text-stone-400 ml-1">you've seen</span>
              </div>
            )}
            {roles.length > 1 && (
              <div className="flex gap-1.5 flex-wrap">
                {roles.map((r) => (
                  <span key={r} className="text-xs bg-stone-100 text-stone-500 border border-stone-200 px-2 py-0.5 rounded-full">
                    <RoleIcon role={r} /> {r}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Role tabs */}
      {roles.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto scroll-hide -mx-4 px-4 pb-1 mb-6">
          {roles.map((role) => (
            <button
              key={role}
              onClick={() => setActiveRole(role)}
              style={{
                flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 6,
                padding: "8px 16px", borderRadius: "var(--radius-pill)", fontSize: 14, fontWeight: 500,
                fontFamily: "var(--font-ui)", border: "1.5px solid", cursor: "pointer", transition: "all 0.15s",
                background: activeRole === role ? "var(--brand)" : "var(--card)",
                color: activeRole === role ? "#fff" : "var(--ink-soft)",
                borderColor: activeRole === role ? "var(--brand)" : "var(--line)",
              }}
            >
              {role}
              <span style={{ fontSize: 11, color: activeRole === role ? "rgba(255,255,255,0.65)" : "var(--ink-mute)" }}>
                {filmsByRole[role].length}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Section title */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-bold text-stone-700">
          {ROLE_LABELS[activeRole] ?? activeRole} · {activeFilms.length} film{activeFilms.length !== 1 ? "s" : ""}
        </h2>
        {user && seenCount > 0 && activeRole && (
          <span className="text-xs text-stone-400">
            {activeFilms.filter((f) => userRatings[f.id]).length} seen by you
          </span>
        )}
      </div>

      {/* Film grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 md:gap-4">
        {activeFilms.map((film) => {
          const userRating = userRatings[film.id];
          const score      = film.global_score ? Math.round(film.global_score) : null;

          return (
            <div key={film.id} className="group relative">
              <Link href={`/movies/${film.id}`} className="block">

                {/* Poster */}
                <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-stone-200 shadow-sm mb-2">
                  {film.poster_url ? (
                    <img
                      src={film.poster_url}
                      alt={film.title}
                      className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full" style={{ background: "var(--sunk)" }} />
                  )}

                  {/* User rating badge */}
                  {userRating && (
                    <div style={{ position: "absolute", top: 6, right: 6, background: RATING_COLORS[userRating], color: "#fff", fontSize: 9, fontWeight: 700, padding: "3px 5px", borderRadius: "28%", fontFamily: "var(--font-ui)", lineHeight: 1 }}>
                      {RATING_TEXT[userRating]}
                    </div>
                  )}

                  {/* Community score */}
                  {score && !userRating && (
                    <div className="absolute bottom-1.5 left-1.5 bg-black/60 backdrop-blur-sm text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                      {score}
                    </div>
                  )}

                  {/* Watchlist on hover */}
                  <div className="absolute top-1.5 left-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <div className="bg-white/90 backdrop-blur-sm rounded-lg p-1 shadow-sm">
                      <WatchlistButton movieId={film.id} movieTitle={film.title} />
                    </div>
                  </div>
                </div>

                {/* Title + year */}
                <p style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-soft)", lineHeight: 1.35, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical" }}>
                  {film.title}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] text-stone-400">{film.year}</span>
                  {film.tmdb_rating > 0 && (
                    <>
                      <span className="text-stone-300 text-[10px]">·</span>
                      <span className="text-[10px] text-stone-400 font-semibold">{Math.round(film.tmdb_rating * 10)}</span>
                    </>
                  )}
                </div>
                {/* Character name for actors */}
                {activeRole === "Actor" && film.character && (
                  <p className="text-[10px] text-stone-400 truncate mt-0.5 italic">{film.character}</p>
                )}
              </Link>
            </div>
          );
        })}
      </div>

      {/* Seen / unseen CTA */}
      {user && activeFilms.length > 0 && (
        <div className="mt-8 text-center text-sm text-stone-400">
          {activeFilms.filter((f) => !userRatings[f.id]).length > 0 ? (
            <p>
              {activeFilms.filter((f) => !userRatings[f.id]).length} film{activeFilms.filter((f) => !userRatings[f.id]).length !== 1 ? "s" : ""} you haven't rated yet
            </p>
          ) : (
            <p style={{ color: "var(--brand)", fontWeight: 600 }}>You've seen everything!</p>
          )}
        </div>
      )}
    </div>
  );
}
