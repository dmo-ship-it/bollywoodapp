import { supabase } from "../../../lib/supabase";
import UserProfileHeader from "../UserProfileHeader";
import Link from "next/link";

const RATING_EMOJI = { 5: "❤️", 4: "👍", 3: "😐", 2: "👎", 1: "💔" };
const RATING_LABEL = { 5: "Loved", 4: "Liked", 3: "Okay", 2: "Didn't like", 1: "Disliked" };
const FLAGS = { IN:"🇮🇳",US:"🇺🇸",GB:"🇬🇧",CA:"🇨🇦",AU:"🇦🇺",AE:"🇦🇪",SG:"🇸🇬",NZ:"🇳🇿",ZA:"🇿🇦",MY:"🇲🇾",QA:"🇶🇦" };

export default async function UserProfilePage({ params }) {
  const { userId } = await params;

  const [{ data: profile }, { data: reactions }] = await Promise.all([
    supabase
      .from("user_profiles")
      .select("email, display_name, username, country, city, languages, dna, streak_current")
      .eq("user_id", userId)
      .single(),
    supabase
      .from("user_reactions")
      .select("rating, score, created_at, movies(id, title, year, poster_url, genres)")
      .eq("user_id", userId)
      .gt("rating", 0)
      .order("created_at", { ascending: false }),
  ]);

  if (!profile) {
    return (
      <div className="text-center py-32 text-stone-400">
        <p className="text-4xl mb-4">🎭</p>
        <p className="text-stone-600 font-medium">User not found</p>
        <Link href="/people" className="text-orange-600 hover:underline mt-4 block">← People</Link>
      </div>
    );
  }

  const displayName = profile.display_name || profile.email?.split("@")[0] || "User";
  const handle      = profile.username ? `@${profile.username}` : null;
  const initials    = displayName.slice(0, 2).toUpperCase();
  const rated       = reactions ?? [];
  const loved       = rated.filter((r) => r.rating === 5).length;
  const location    = [profile.city, profile.country ? FLAGS[profile.country] : null].filter(Boolean).join(" · ");

  // Split into scored (for rankings) and all (for grid)
  const scored = [...rated].filter((r) => r.score != null).sort((a, b) => b.score - a.score);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 bg-stone-50 min-h-screen">

      <Link href="/people" className="inline-flex items-center gap-1.5 text-stone-400 text-sm hover:text-stone-700 transition-colors mb-6">
        ← Taste Twins
      </Link>

      {/* Profile header */}
      <UserProfileHeader userId={userId} profile={profile} ratedCount={rated.length} lovedCount={loved} />

      {/* DNA */}
      {profile.dna?.length > 0 && (
        <div className="bg-white border border-stone-200 rounded-2xl p-5 mb-6 shadow-sm">
          <p className="text-xs text-stone-400 uppercase tracking-widest mb-4 font-medium">🧬 Entertainment DNA</p>
          <div className="space-y-3">
            {profile.dna.map((arc, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-lg w-7 shrink-0">{arc.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-stone-700">{arc.label}</span>
                    <span className="text-orange-600 text-sm font-bold">{arc.pct}%</span>
                  </div>
                  <div className="h-1.5 bg-stone-100 rounded-full">
                    <div className="h-1.5 bg-gradient-to-r from-orange-400 to-rose-400 rounded-full" style={{ width: `${arc.pct}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Films — tabs between grid and ranked list */}
      {rated.length === 0 ? (
        <div className="text-center py-16 text-stone-400 bg-white border border-stone-200 rounded-2xl">
          <p className="text-3xl mb-3">🎬</p>
          <p>No films rated yet</p>
        </div>
      ) : (
        <FilmsTabs rated={rated} scored={scored} />
      )}
    </div>
  );
}

// Client tabs component — inline as a server-renderable section
// (using URL search param would be ideal, but for simplicity render both and use CSS)
function FilmsTabs({ rated, scored }) {
  return (
    <div>
      {/* Films grid */}
      <div className="mb-8">
        <h2 className="text-base font-bold text-stone-900 mb-4">
          Films Rated <span className="text-stone-400 font-normal text-sm">({rated.length})</span>
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {rated.map((r) => {
            const movie = r.movies;
            if (!movie) return null;
            return (
              <Link key={movie.id} href={`/movies/${movie.id}`} className="group block">
                <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-stone-200 shadow-sm mb-1.5">
                  {movie.poster_url
                    ? <img src={movie.poster_url} alt={movie.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                    : <div className="w-full h-full flex items-center justify-center text-2xl">🎬</div>
                  }
                  <div className="absolute top-1.5 right-1.5 text-sm leading-none drop-shadow">
                    {RATING_EMOJI[r.rating]}
                  </div>
                </div>
                <p className="text-[10px] text-stone-500 truncate group-hover:text-orange-600 transition-colors leading-tight">{movie.title}</p>
                <p className="text-[10px] text-stone-400">{movie.year}</p>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Rankings list — only if scores exist */}
      {scored.length > 0 && (
        <div>
          <h2 className="text-base font-bold text-stone-900 mb-4">
            Their Rankings <span className="text-stone-400 font-normal text-sm">({scored.length})</span>
          </h2>
          <div className="space-y-2">
            {scored.map((r, i) => {
              const movie      = r.movies;
              if (!movie) return null;
              const score      = Math.round(r.score);
              const scoreColor = r.rating === 5 ? "text-rose-600" : r.rating === 4 ? "text-orange-600" : "text-stone-500";
              const barColor   = r.rating === 5 ? "bg-rose-500"  : r.rating === 4 ? "bg-orange-500"  : "bg-stone-300";
              return (
                <Link key={movie.id} href={`/movies/${movie.id}`} className="flex items-center gap-3 bg-white border border-stone-200 rounded-2xl p-3 hover:border-stone-300 hover:shadow-sm transition-all group">
                  <span className="text-stone-400 text-sm font-bold w-6 text-center shrink-0">#{i + 1}</span>
                  <div className="w-9 h-12 rounded-lg overflow-hidden bg-stone-100 shrink-0">
                    {movie.poster_url
                      ? <img src={movie.poster_url} alt={movie.title} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-lg">🎬</div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-stone-900 group-hover:text-orange-600 transition-colors truncate">{movie.title}</p>
                    <p className="text-xs text-stone-400">{movie.year} · {RATING_LABEL[r.rating]}</p>
                  </div>
                  <div className="shrink-0 flex items-center gap-3">
                    <span>{RATING_EMOJI[r.rating]}</span>
                    <div className="flex flex-col items-end gap-1">
                      <p className={`text-base font-black ${scoreColor}`}>{score}</p>
                      <div className="w-12 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${score}%` }} />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
