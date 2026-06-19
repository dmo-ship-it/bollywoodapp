import { supabase } from "../../../lib/supabase";
import UserProfileHeader from "../UserProfileHeader";
import Link from "next/link";

const RATING_COLORS = { 5: "#E14B33", 4: "#E6A437", 3: "#C07A4E", 2: "#8C8A93", 1: "#8C8A93" };
const RATING_LABEL  = { 5: "Loved", 4: "Liked", 3: "Okay", 2: "Didn't like", 1: "Disliked" };
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
      <div style={{ textAlign: "center", padding: "128px 16px", color: "var(--ink-mute)" }}>
        <p style={{ fontFamily: "var(--font-serif)", fontSize: 20, color: "var(--ink-soft)", marginBottom: 8 }}>User not found</p>
        <Link href="/people" style={{ color: "var(--brand)", fontWeight: 600 }}>← People</Link>
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
    <div className="max-w-2xl mx-auto px-4 py-8 min-h-screen" style={{ background: "var(--paper)" }}>

      <Link href="/people" className="inline-flex items-center gap-1.5 text-stone-400 text-sm hover:text-stone-700 transition-colors mb-6">
        ← Taste Twins
      </Link>

      {/* Profile header */}
      <UserProfileHeader userId={userId} profile={profile} ratedCount={rated.length} lovedCount={loved} />

      {/* DNA */}
      {profile.dna?.length > 0 && (
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 20, padding: 20, marginBottom: 24, boxShadow: "var(--shadow-card)" }}>
          <p style={{ fontSize: 11, color: "var(--ink-mute)", textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 16, fontWeight: 500, fontFamily: "var(--font-mono)" }}>Entertainment DNA</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {profile.dna.map((arc, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink-soft)", fontFamily: "var(--font-ui)" }}>{arc.label}</span>
                    <span style={{ color: "var(--brand)", fontSize: 13, fontWeight: 700, fontFamily: "var(--font-ui)" }}>{arc.pct}%</span>
                  </div>
                  <div style={{ height: 6, background: "var(--sunk)", borderRadius: 999 }}>
                    <div style={{ height: 6, background: "var(--brand)", borderRadius: 999, width: `${arc.pct}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Films — tabs between grid and ranked list */}
      {rated.length === 0 ? (
        <div style={{ textAlign: "center", padding: "64px 20px", color: "var(--ink-mute)", background: "var(--card)", border: "1px solid var(--line)", borderRadius: 20 }}>
          <p style={{ fontFamily: "var(--font-serif)", fontSize: 16, color: "var(--ink-soft)" }}>No films rated yet</p>
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
                    : <div className="w-full h-full" style={{ background: "var(--sunk)" }} />
                  }
                  <div style={{ position: "absolute", top: 6, right: 6, background: RATING_COLORS[r.rating], borderRadius: "28%", width: 8, height: 8 }} />
                </div>
                <p style={{ fontSize: 10, color: "var(--ink-mute)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1.35 }}>{movie.title}</p>
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
              const scoreColor = RATING_COLORS[r.rating] ?? "var(--ink-mute)";
              return (
                <Link key={movie.id} href={`/movies/${movie.id}`} style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--card)", border: "1px solid var(--line)", borderRadius: 16, padding: 12, textDecoration: "none" }}>
                  <span style={{ color: "var(--ink-mute)", fontSize: 13, fontWeight: 700, width: 24, textAlign: "center", flexShrink: 0 }}>#{i + 1}</span>
                  <div style={{ width: 36, height: 48, borderRadius: 8, overflow: "hidden", background: "var(--sunk)", flexShrink: 0 }}>
                    {movie.poster_url
                      ? <img src={movie.poster_url} alt={movie.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <div style={{ width: "100%", height: "100%", background: "var(--sunk)" }} />
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "var(--font-ui)" }}>{movie.title}</p>
                    <p style={{ fontSize: 11, color: "var(--ink-mute)", fontFamily: "var(--font-ui)" }}>{movie.year} · {RATING_LABEL[r.rating]}</p>
                  </div>
                  <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                    <p style={{ fontSize: 16, fontWeight: 900, color: scoreColor, fontFamily: "var(--font-ui)" }}>{score}</p>
                    <div style={{ width: 48, height: 6, background: "var(--sunk)", borderRadius: 999, overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 999, background: scoreColor, width: `${score}%` }} />
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
