import { supabase } from "../../../lib/supabase";
import Link from "next/link";
import RatingPanel from "./RatingPanel";
import TrailerPlayer from "./TrailerPlayer";

const OTT_COLORS = {
  "Netflix":                       "bg-red-600",
  "Amazon Prime Video":            "bg-cyan-600",
  "Amazon Prime Video with Ads":   "bg-cyan-600",
  "Amazon Prime":                  "bg-cyan-600",
  "Prime Video":                   "bg-cyan-600",
  "Disney+ Hotstar":               "bg-blue-600",
  "JioCinema":                     "bg-purple-600",
  "Apple TV+":                     "bg-zinc-700",
  "YouTube":                       "bg-red-500",
};

function ottSearchUrl(platform, title) {
  const q = encodeURIComponent(title);
  switch (platform) {
    case "Netflix":
    case "Netflix basic with Ads":             return `https://www.netflix.com/search?q=${q}`;
    case "Amazon Prime Video":
    case "Amazon Prime Video with Ads":
    case "Amazon Prime":
    case "Prime Video":                        return `https://www.primevideo.com/search/ref=atv_nb_sr?phrase=${q}`;
    case "Disney+ Hotstar":                    return `https://www.hotstar.com/in/search?q=${q}`;
    case "JioCinema":                          return `https://www.jiocinema.com/search/${q}`;
    case "Apple TV+":                          return `https://tv.apple.com/search?term=${q}`;
    case "YouTube":                            return `https://www.youtube.com/results?search_query=${q}+full+movie`;
    case "ZEE5":                               return `https://www.zee5.com/search?q=${q}`;
    case "Sun NXT":                            return `https://www.sunnxt.com/search?q=${q}`;
    case "Mubi":                               return `https://mubi.com/en/in/search?q=${q}`;
    case "Aha":                                return `https://www.aha.video/search?q=${q}`;
    default:                                   return null;
  }
}


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
    <div className="min-h-screen bg-white">

      <div className="max-w-4xl mx-auto px-4 pt-6 pb-16">

        {/* Back */}
        <Link href="/" className="inline-flex items-center gap-1.5 text-stone-400 hover:text-stone-700 text-sm mb-6 transition-colors">
          ← Discover
        </Link>

        {/* Main layout */}
        <div className="flex flex-col md:flex-row gap-6">

          {/* Poster */}
          <div className="w-36 md:w-44 shrink-0">
            <div className="aspect-[2/3] rounded-xl overflow-hidden bg-stone-100 shadow-sm">
              {movie.poster_url
                ? <img src={movie.poster_url} alt={movie.title} className="w-full h-full object-cover object-top" />
                : <div className="w-full h-full flex items-center justify-center text-4xl text-stone-300">🎬</div>
              }
            </div>

            {/* OTT Availability */}
            {movie.ott_platforms?.length > 0 && (
              <div className="mt-3 space-y-1.5">
                <p className="text-[10px] text-stone-400 uppercase tracking-widest">Stream on</p>
                {movie.ott_platforms.slice(0, 3).map((p) => {
                  const url = ottSearchUrl(p, movie.title);
                  return url ? (
                    <a
                      key={p}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`${OTT_COLORS[p] ?? "bg-stone-700"} text-white text-[10px] font-medium px-2.5 py-1 rounded-md text-center block hover:opacity-90 transition-opacity`}
                    >
                      {p}
                    </a>
                  ) : (
                    <div key={p} className={`${OTT_COLORS[p] ?? "bg-stone-700"} text-white text-[10px] font-medium px-2.5 py-1 rounded-md text-center`}>
                      {p}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">

            {/* Title row */}
            <div className="flex flex-wrap items-start gap-2 mb-1.5">
              <h1 className="text-2xl md:text-3xl font-bold text-stone-900 leading-tight">{movie.title}</h1>
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
            <div className="flex flex-wrap items-center gap-2 text-xs text-stone-400 mb-4">
              {movie.year && <span>{movie.year}</span>}
              {movie.runtime_minutes && <><span className="text-stone-200">·</span><span>{Math.floor(movie.runtime_minutes / 60)}h {movie.runtime_minutes % 60}m</span></>}
              {movie.certificate && <><span className="text-stone-200">·</span><span>{movie.certificate}</span></>}
              {directors[0]?.people && (
                <><span className="text-stone-200">·</span>
                <Link href={`/person/${directors[0].people.id}`} className="hover:text-stone-700 transition-colors">
                  dir. {directors[0].people.name}
                </Link></>
              )}
            </div>

            {/* ── Rate + Bookmark ── */}
            <div className="mb-5">
              <RatingPanel movieId={movie.id} movieTitle={movie.title} posterUrl={movie.poster_url} />
            </div>

            {/* Genres */}
            {movie.genres?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {movie.genres.map((g) => (
                  <span key={g} className="bg-stone-100 text-stone-500 text-[11px] px-2.5 py-1 rounded-full">
                    {g}
                  </span>
                ))}
              </div>
            )}

            {/* Overview */}
            {movie.overview && (
              <p className="text-stone-600 text-sm leading-relaxed mb-5">{movie.overview}</p>
            )}

            {/* Trailer */}
            {movie.trailer_url && (
              <TrailerPlayer trailerUrl={movie.trailer_url} />
            )}
          </div>
        </div>

        {/* ───── Vibe Tags ───── */}
        {allTags.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-1.5">
            {allTags.slice(0, 12).map((tag) => (
              <span key={tag} className="bg-stone-50 text-stone-400 text-[11px] px-2.5 py-1 rounded-full border border-stone-100 capitalize">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* ───── Film Details ───── */}
        <section className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3">
          {directors.length > 0 && (
            <div className="p-3 rounded-lg bg-stone-50">
              <p className="text-[10px] text-stone-400 uppercase tracking-widest mb-1">Director</p>
              {directors.map((d) => (
                <Link key={d.people?.id} href={`/person/${d.people?.id}`} className="text-sm text-stone-700 hover:text-stone-900 transition-colors block">
                  {d.people?.name}
                </Link>
              ))}
            </div>
          )}
          {composers.length > 0 && (
            <div className="p-3 rounded-lg bg-stone-50">
              <p className="text-[10px] text-stone-400 uppercase tracking-widest mb-1">Music</p>
              {composers.map((c) => (
                <Link key={c.people?.id} href={`/person/${c.people?.id}`} className="text-sm text-stone-700 hover:text-stone-900 transition-colors block">
                  {c.people?.name}
                </Link>
              ))}
            </div>
          )}
          {movie.production_houses?.length > 0 && (
            <div className="p-3 rounded-lg bg-stone-50">
              <p className="text-[10px] text-stone-400 uppercase tracking-widest mb-1">Production</p>
              <p className="text-sm text-stone-700">{movie.production_houses[0]}</p>
            </div>
          )}
          {movie.box_office_india_crore && (
            <div className="p-3 rounded-lg bg-stone-50">
              <p className="text-[10px] text-stone-400 uppercase tracking-widest mb-1">Box Office</p>
              <p className="text-sm text-stone-700">₹{movie.box_office_india_crore} Cr</p>
            </div>
          )}
        </section>

        {/* ───── Cast ───── */}
        {cast.length > 0 && (
          <section className="mt-8">
            <p className="text-[11px] text-stone-400 uppercase tracking-widest mb-3">Cast</p>
            <div className="flex gap-3 overflow-x-auto pb-2 scroll-hide">
              {cast.map((c) => (
                <Link
                  key={`${c.people?.id}-${c.character_name}`}
                  href={`/person/${c.people?.id}`}
                  className="flex-shrink-0 w-16 text-center group"
                >
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-stone-100 mb-1.5">
                    {c.people?.photo_url
                      ? <img src={c.people.photo_url} alt={c.people.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-xl text-stone-300">👤</div>
                    }
                  </div>
                  <p className="text-[10px] text-stone-600 leading-tight line-clamp-2 group-hover:text-stone-900 transition-colors">{c.people?.name}</p>
                  {c.character_name && (
                    <p className="text-[9px] text-stone-400 truncate mt-0.5">{c.character_name}</p>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ───── Similar Films ───── */}
        {similarMovies?.length > 0 && (
          <section className="mt-8">
            <p className="text-[11px] text-stone-400 uppercase tracking-widest mb-3">More Like This</p>
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-7 gap-2">
              {similarMovies.map((m) => (
                <Link key={m.id} href={`/movies/${m.id}`} className="group block">
                  <div className="aspect-[2/3] rounded-lg overflow-hidden bg-stone-100">
                    {m.poster_url
                      ? <img src={m.poster_url} alt={m.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                      : <div className="w-full h-full flex items-center justify-center text-xl text-stone-300">🎬</div>
                    }
                  </div>
                  <p className="mt-1 text-[10px] text-stone-400 truncate group-hover:text-stone-700 transition-colors">{m.title}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
