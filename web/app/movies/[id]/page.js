import { supabase } from "../../../lib/supabase";
import Link from "next/link";
import RatingPanel from "./RatingPanel";

const OTT_COLORS = {
  "Netflix":        "bg-red-600",
  "Amazon Prime":   "bg-cyan-600",
  "Prime Video":    "bg-cyan-600",
  "Disney+ Hotstar":"bg-blue-600",
  "JioCinema":      "bg-purple-600",
  "Apple TV+":      "bg-zinc-700",
  "YouTube":        "bg-red-500",
};


export default async function MoviePage({ params }) {
  const { id } = await params;

  const { data: movie } = await supabase
    .from("movies")
    .select("*")
    .eq("id", id)
    .single();

  const { data: credits } = await supabase
    .from("movie_credits")
    .select("role, character_name, billing_order, people(id, name, photo_url)")
    .eq("movie_id", id)
    .order("billing_order");

  const { data: similarMovies } = await supabase
    .from("movies")
    .select("id, title, year, poster_url, tmdb_rating, genres")
    .overlaps("genres", movie?.genres ?? [])
    .neq("id", id)
    .order("tmdb_popularity", { ascending: false })
    .limit(7);

  if (!movie) {
    return (
      <div className="text-center py-32 text-zinc-500">
        <p className="text-5xl mb-4">🎬</p>
        <p className="text-lg">Film not found</p>
        <Link href="/" className="text-amber-400 hover:underline mt-4 block">← Back</Link>
      </div>
    );
  }

  const directors = credits?.filter((c) => c.role === "Director") ?? [];
  const cast      = credits?.filter((c) => c.role === "Actor").slice(0, 10) ?? [];
  const composers = credits?.filter((c) => c.role === "Music") ?? [];


  const allTags = [
    ...(movie.themes ?? []),
    ...(movie.tone ?? []),
    ...(movie.notable_elements ?? []),
    ...(movie.mood_tags ?? []),
    ...(movie.vibe_tags ?? []),
  ].filter(Boolean);

  const director = directors[0]?.people?.name;

  return (
    <div className="min-h-screen">

      {/* Backdrop Hero */}
      {movie.backdrop_url && (
        <div className="relative w-full h-72 md:h-96 overflow-hidden">
          <img
            src={movie.backdrop_url}
            alt={movie.title}
            className="w-full h-full object-cover object-top"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-zinc-950/10" />
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/60 to-transparent" />
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 pb-16" style={{ marginTop: movie.backdrop_url ? "-6rem" : "2rem" }}>

        {/* Back */}
        <Link href="/" className="inline-flex items-center gap-2 text-zinc-500 hover:text-amber-400 text-sm mb-6 transition-colors">
          ← Discover
        </Link>

        {/* Main layout */}
        <div className="flex flex-col md:flex-row gap-8">

          {/* Poster */}
          <div className="w-44 md:w-52 shrink-0">
            <div className="aspect-[2/3] rounded-2xl overflow-hidden bg-zinc-800 shadow-2xl ring-1 ring-white/10">
              {movie.poster_url
                ? <img src={movie.poster_url} alt={movie.title} className="w-full h-full object-cover object-top" />
                : <div className="w-full h-full flex items-center justify-center text-5xl">🎬</div>
              }
            </div>

            {/* OTT Availability */}
            {movie.ott_platforms?.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-[10px] text-zinc-600 uppercase tracking-widest">Stream on</p>
                {movie.ott_platforms.slice(0, 3).map((p) => (
                  <div key={p} className={`${OTT_COLORS[p] ?? "bg-zinc-800"} text-white text-xs font-medium px-3 py-1.5 rounded-lg text-center`}>
                    {p}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">

            {/* Title row */}
            <div className="flex flex-wrap items-start gap-3 mb-2">
              <h1 className="text-3xl md:text-4xl font-black leading-tight tracking-tight">{movie.title}</h1>
              {movie.verdict && (
                <span className={`mt-2 text-xs font-bold px-2.5 py-1 rounded-full ${
                  movie.verdict === "Blockbuster" ? "bg-green-500/20 text-green-400 border border-green-500/30" :
                  movie.verdict === "Hit"         ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                  movie.verdict === "Flop"        ? "bg-red-500/20 text-red-400 border border-red-500/30" :
                  "bg-zinc-800 text-zinc-400 border border-zinc-700"
                }`}>
                  {movie.verdict}
                </span>
              )}
            </div>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-400 mb-5">
              {movie.year && <span>{movie.year}</span>}
              {movie.runtime_minutes && <span>{Math.floor(movie.runtime_minutes / 60)}h {movie.runtime_minutes % 60}m</span>}
              {movie.certificate && <span className="border border-zinc-700 px-1.5 py-0.5 rounded text-xs">{movie.certificate}</span>}
              {movie.tmdb_rating > 0 && (
                <span className="flex items-center gap-1 text-amber-400 font-bold text-base">
                  ★ {movie.tmdb_rating?.toFixed(1)}
                  <span className="text-zinc-600 font-normal text-xs">/ 10</span>
                </span>
              )}
              {directors[0]?.people && (
                <Link href={`/person/${directors[0].people.id}`} className="text-stone-500 hover:text-orange-600 transition-colors">
                  dir. <span className="text-stone-700">{directors[0].people.name}</span>
                </Link>
              )}
            </div>

            {/* ── Rate + Bookmark ── */}
            <div className="mb-6">
              <RatingPanel movieId={movie.id} movieTitle={movie.title} posterUrl={movie.poster_url} />
            </div>

            {/* Genres */}
            {movie.genres?.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-5">
                {movie.genres.map((g) => (
                  <span key={g} className="bg-zinc-800/80 text-zinc-300 text-xs px-3 py-1 rounded-full border border-white/5">
                    {g}
                  </span>
                ))}
              </div>
            )}

            {/* Overview */}
            {movie.overview && (
              <p className="text-zinc-300 text-sm leading-relaxed mb-6">{movie.overview}</p>
            )}

            {/* Trailer button */}
            {movie.trailer_url && (
              <a
                href={movie.trailer_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-white text-black text-sm font-bold px-5 py-2.5 rounded-full hover:bg-zinc-200 transition-colors mb-6"
              >
                ▶ Watch Trailer
              </a>
            )}
          </div>
        </div>

        {/* ───── Vibe Tags ───── */}
        {allTags.length > 0 && (
          <section className="mt-10">
            <div className="flex flex-wrap gap-2">
              {allTags.slice(0, 14).map((tag) => (
                <span key={tag} className="bg-stone-100 text-stone-600 text-xs px-3 py-1.5 rounded-full border border-stone-200 capitalize">
                  {tag}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* ───── Film Details ───── */}
        <section className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4">
          {directors.length > 0 && (
            <div className="bg-stone-50 rounded-xl p-4 border border-stone-200">
              <p className="text-[10px] text-stone-400 uppercase tracking-widest mb-1">Director</p>
              {directors.map((d) => (
                <Link key={d.people?.id} href={`/person/${d.people?.id}`} className="text-sm font-medium text-stone-900 hover:text-orange-600 transition-colors block">
                  {d.people?.name}
                </Link>
              ))}
            </div>
          )}
          {composers.length > 0 && (
            <div className="bg-stone-50 rounded-xl p-4 border border-stone-200">
              <p className="text-[10px] text-stone-400 uppercase tracking-widest mb-1">Music</p>
              {composers.map((c) => (
                <Link key={c.people?.id} href={`/person/${c.people?.id}`} className="text-sm font-medium text-stone-900 hover:text-orange-600 transition-colors block">
                  {c.people?.name}
                </Link>
              ))}
            </div>
          )}
          {movie.production_houses?.length > 0 && (
            <div className="bg-stone-50 rounded-xl p-4 border border-stone-200">
              <p className="text-[10px] text-stone-400 uppercase tracking-widest mb-1">Production</p>
              <p className="text-sm font-medium text-stone-900">{movie.production_houses[0]}</p>
            </div>
          )}
          {movie.box_office_india_crore && (
            <div className="bg-stone-50 rounded-xl p-4 border border-stone-200">
              <p className="text-[10px] text-stone-400 uppercase tracking-widest mb-1">Box Office</p>
              <p className="text-sm font-medium text-stone-900">₹{movie.box_office_india_crore} Cr</p>
            </div>
          )}
        </section>

        {/* ───── Cast ───── */}
        {cast.length > 0 && (
          <section className="mt-10">
            <h2 className="text-lg font-bold text-stone-900 mb-5">Cast</h2>
            <div className="flex gap-4 overflow-x-auto pb-3 scroll-hide">
              {cast.map((c) => (
                <Link
                  key={`${c.people?.id}-${c.character_name}`}
                  href={`/person/${c.people?.id}`}
                  className="flex-shrink-0 w-20 text-center group"
                >
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-stone-200 mb-2 ring-2 ring-stone-200 group-hover:ring-orange-300 transition-all">
                    {c.people?.photo_url
                      ? <img src={c.people.photo_url} alt={c.people.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-2xl">👤</div>
                    }
                  </div>
                  <p className="text-xs text-stone-800 font-medium leading-tight line-clamp-2 group-hover:text-orange-600 transition-colors">{c.people?.name}</p>
                  {c.character_name && (
                    <p className="text-[10px] text-stone-400 truncate mt-0.5">{c.character_name}</p>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ───── Similar Films ───── */}
        {similarMovies?.length > 0 && (
          <section className="mt-12">
            <h2 className="text-lg font-bold mb-5">You Might Also Like</h2>
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-7 gap-3">
              {similarMovies.map((m) => (
                <Link key={m.id} href={`/movies/${m.id}`} className="group block">
                  <div className="aspect-[2/3] rounded-xl overflow-hidden bg-zinc-800">
                    {m.poster_url
                      ? <img src={m.poster_url} alt={m.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                      : <div className="w-full h-full flex items-center justify-center text-2xl">🎬</div>
                    }
                  </div>
                  <p className="mt-1.5 text-[10px] text-zinc-500 truncate group-hover:text-zinc-300 transition-colors">{m.title}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
