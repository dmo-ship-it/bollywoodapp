"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "../../lib/supabase-browser";
import { BADGES } from "../../lib/badges";
import WatchlistButton from "../components/WatchlistButton";
import PointsCard from "../components/PointsCard";

const RATING_LABELS = { 5: "Loved", 4: "Liked", 3: "Okay", 2: "Didn't like", 1: "Disliked" };
const RATING_EMOJI  = { 5: "❤️", 4: "👍", 3: "😐", 2: "👎", 1: "💔" };
const TABS = ["Films", "Watchlist", "Rankings", "DNA", "Stats"];
const COUNTRY_FLAGS = { IN:"🇮🇳",US:"🇺🇸",GB:"🇬🇧",CA:"🇨🇦",AU:"🇦🇺",AE:"🇦🇪",SG:"🇸🇬",NZ:"🇳🇿",ZA:"🇿🇦",MY:"🇲🇾",QA:"🇶🇦" };

export default function ProfilePage() {
  const router   = useRouter();
  const supabase = createClient();

  const [user,        setUser]        = useState(null);
  const [profile,     setProfile]     = useState(null);
  const [reactions,   setReactions]   = useState([]);
  const [comparisons, setComparisons] = useState([]);
  const [watchlist,   setWatchlist]   = useState([]);
  const [badges,      setBadges]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [tab,         setTab]         = useState("Films");
  const [filter,      setFilter]      = useState(0);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUser(user);

      const [profileRes, reactionsRes, comparisonsRes, watchlistRes, badgesRes] = await Promise.all([
        supabase.from("user_profiles").select("*").eq("user_id", user.id).single(),
        supabase.from("user_reactions").select("rating, score, created_at, movies(id, title, year, poster_url, genres, tmdb_rating)").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("user_comparisons").select("id, comparison_type, created_at").eq("user_id", user.id),
        supabase.from("user_watchlist").select("created_at, movies(id, title, year, poster_url, tmdb_rating)").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("user_badges").select("badge_id, earned_at").eq("user_id", user.id),
      ]);

      setProfile(profileRes.data);
      setReactions(reactionsRes.data ?? []);
      setComparisons(comparisonsRes.data ?? []);
      setWatchlist(watchlistRes.data ?? []);
      setBadges(badgesRes.data ?? []);
      setLoading(false);

      if (!profileRes.data?.email) {
        await supabase.from("user_profiles").upsert({ user_id: user.id, email: user.email }, { onConflict: "user_id" });
      }
    }
    load();
  }, []);

  if (loading) return (
    <div className="max-w-3xl mx-auto px-4 py-16 text-center text-stone-400">
      <div className="text-4xl mb-4 animate-pulse">🎬</div>
      Loading your profile…
    </div>
  );
  if (!user) return null;

  const rated      = reactions.filter((r) => r.rating > 0);
  const loved      = rated.filter((r) => r.rating === 5).length;
  const avgRating  = rated.length ? (rated.reduce((s, r) => s + r.rating, 0) / rated.length).toFixed(1) : "—";

  const displayName  = profile?.display_name || user.email?.split("@")[0] || "You";
  const username     = profile?.username ? `@${profile.username}` : null;
  const initials     = displayName.slice(0, 2).toUpperCase();
  const locationStr  = [profile?.city, profile?.country ? COUNTRY_FLAGS[profile.country] : null].filter(Boolean).join(" · ");
  const streak       = profile?.streak_current ?? 0;
  const earnedBadgeIds = new Set(badges.map((b) => b.badge_id));
  const filteredReactions = filter === 0 ? rated : rated.filter((r) => r.rating === filter);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 bg-stone-50 min-h-screen">

      {/* Quick actions */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <Link href="/wrapped" className="flex items-center gap-2 bg-gradient-to-r from-orange-400 to-rose-400 text-white font-bold text-sm px-5 py-3 rounded-full hover:shadow-lg transition-all">
          <span>✨</span> Your 2026 Wrapped
        </Link>
        <Link href="/taste-profile" className="flex items-center gap-2 bg-white border-2 border-orange-400 text-orange-600 font-bold text-sm px-5 py-3 rounded-full hover:bg-orange-50 transition-all">
          <span>🧬</span> Taste Profile
        </Link>
        {profile?.username && (
          <Link href={`/u/${profile.username}`} className="flex items-center gap-2 bg-white border-2 border-stone-200 text-stone-700 font-bold text-sm px-5 py-3 rounded-full hover:bg-stone-50 transition-all">
            <span>🔗</span> Share Profile
          </Link>
        )}
      </div>

      {/* Points & Referral */}
      <div className="mb-8">
        <PointsCard userId={user.id} displayName={displayName} />
      </div>

      {/* Badges showcase */}
      {badges.length > 0 && (
        <div className="mb-8 bg-gradient-to-r from-orange-50 to-rose-50 border border-orange-200 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-stone-900 mb-4 flex items-center gap-2">
            <span>🏆</span> Achievements ({badges.length})
          </h2>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
            {badges.map(b => {
              const badge = BADGES.find(bd => bd.id === b.badge_id);
              return badge ? (
                <div key={b.badge_id} title={badge.label} className="flex flex-col items-center gap-1">
                  <div className="text-2xl">{badge.icon}</div>
                  <p className="text-[8px] text-center text-stone-600 leading-tight font-semibold">{badge.label}</p>
                </div>
              ) : null;
            })}
          </div>
        </div>
      )}

      {/* Profile header */}
      <div className="flex items-start gap-4 mb-8">
        <div className="w-18 h-18 w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center text-white text-xl font-black shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-black text-stone-900">{displayName}</h1>
            {streak > 0 && (
              <span className="flex items-center gap-1 bg-orange-50 border border-orange-200 text-orange-600 text-xs font-bold px-2.5 py-1 rounded-full">
                🔥 {streak} week streak
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap text-sm text-stone-500">
            {username && <span>{username}</span>}
            {locationStr && <span>{locationStr}</span>}
          </div>
          {profile?.languages?.length > 0 && (
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {profile.languages.map((l) => (
                <span key={l} className="text-[10px] bg-white border border-stone-200 text-stone-500 px-2 py-0.5 rounded-full">{l}</span>
              ))}
            </div>
          )}
          <div className="flex gap-5 mt-3 text-sm">
            <span><strong className="text-stone-900">{rated.length}</strong> <span className="text-stone-400">rated</span></span>
            <span><strong className="text-stone-900">{watchlist.length}</strong> <span className="text-stone-400">watchlist</span></span>
            <span><strong className="text-stone-900">{comparisons.length}</strong> <span className="text-stone-400">comparisons</span></span>
          </div>
        </div>
        <Link href="/compare" className="shrink-0 bg-orange-600 text-white text-xs font-bold px-4 py-2 rounded-full hover:bg-orange-500 transition-colors">
          + Compare
        </Link>
      </div>

      {/* Tabs — scrollable */}
      <div className="flex gap-1 overflow-x-auto scroll-hide mb-6 -mx-4 px-4 pb-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t ? "bg-stone-900 text-white" : "text-stone-500 hover:text-stone-800 hover:bg-stone-100"
            }`}
          >
            {t}
            {t === "Watchlist" && watchlist.length > 0 && (
              <span className="ml-1.5 text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full font-bold">{watchlist.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Films ── */}
      {tab === "Films" && (
        <div>
          <div className="flex gap-2 mb-5 overflow-x-auto scroll-hide -mx-4 px-4 pb-1">
            <button onClick={() => setFilter(0)} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${filter === 0 ? "bg-orange-600 text-white border-orange-600" : "bg-white border-stone-200 text-stone-500 hover:border-stone-300"}`}>
              All ({rated.length})
            </button>
            {[5, 4, 3, 2].map((v) => {
              const count = rated.filter((r) => r.rating === v).length;
              if (!count) return null;
              return (
                <button key={v} onClick={() => setFilter(filter === v ? 0 : v)} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${filter === v ? "bg-orange-600 text-white border-orange-600" : "bg-white border-stone-200 text-stone-500 hover:border-stone-300"}`}>
                  {RATING_EMOJI[v]} {RATING_LABELS[v]} ({count})
                </button>
              );
            })}
          </div>

          {filteredReactions.length === 0 ? (
            <div className="text-center py-20 text-stone-400">
              <p className="text-4xl mb-3">🎬</p><p>No films rated yet</p>
              <Link href="/onboarding" className="text-orange-600 text-sm hover:underline mt-2 block">Start rating →</Link>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {filteredReactions.map((r) => {
                const movie = r.movies;
                if (!movie) return null;
                return (
                  <Link key={movie.id} href={`/movies/${movie.id}`} className="group block">
                    <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-stone-200 shadow-sm">
                      {movie.poster_url
                        ? <img src={movie.poster_url} alt={movie.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                        : <div className="w-full h-full flex items-center justify-center text-3xl">🎬</div>
                      }
                      <div className="absolute top-1.5 right-1.5 text-sm leading-none drop-shadow">{RATING_EMOJI[r.rating]}</div>
                    </div>
                    <p className="mt-1.5 text-[10px] text-stone-500 truncate group-hover:text-orange-600 transition-colors">{movie.title}</p>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Watchlist ── */}
      {tab === "Watchlist" && (
        <div>
          {watchlist.length === 0 ? (
            <div className="text-center py-20 text-stone-400">
              <p className="text-4xl mb-3">🔖</p>
              <p className="font-medium text-stone-600 mb-1">Your watchlist is empty</p>
              <p className="text-sm mb-4">Bookmark films you want to watch later</p>
              <Link href="/" className="text-orange-600 text-sm hover:underline">Browse films →</Link>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {watchlist.map((w) => {
                const movie = w.movies;
                if (!movie) return null;
                return (
                  <div key={movie.id} className="group relative block">
                    <Link href={`/movies/${movie.id}`} className="block">
                      <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-stone-200 shadow-sm mb-1.5">
                        {movie.poster_url
                          ? <img src={movie.poster_url} alt={movie.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                          : <div className="w-full h-full flex items-center justify-center text-3xl">🎬</div>
                        }
                        <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="bg-white/90 rounded-lg p-1 shadow-sm">
                            <WatchlistButton movieId={movie.id} movieTitle={movie.title} />
                          </div>
                        </div>
                      </div>
                      <p className="text-[10px] text-stone-500 truncate group-hover:text-orange-600 transition-colors">{movie.title}</p>
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Rankings ── */}
      {tab === "Rankings" && (
        <div>
          {rated.filter((r) => r.score != null).length === 0 ? (
            <div className="text-center py-20 text-stone-400">
              <p className="text-4xl mb-3">🏆</p><p className="mb-3">No rankings yet</p>
              <Link href="/onboarding" className="text-orange-600 text-sm hover:underline">Start rating →</Link>
            </div>
          ) : (
            <div className="space-y-2">
              {[...rated].filter((r) => r.score != null).sort((a, b) => b.score - a.score).map((r, i) => {
                const movie = r.movies;
                if (!movie) return null;
                const score = Math.round(r.score);
                const scoreColor = r.rating === 5 ? "text-rose-600" : r.rating === 4 ? "text-orange-600" : "text-stone-500";
                const barColor   = r.rating === 5 ? "bg-rose-500"  : r.rating === 4 ? "bg-orange-500"  : "bg-stone-300";
                return (
                  <Link key={movie.id} href={`/movies/${movie.id}`} className="flex items-center gap-4 bg-white border border-stone-200 rounded-2xl p-3 hover:border-stone-300 hover:shadow-sm transition-all group">
                    <span className="text-stone-400 text-sm font-bold w-6 text-center shrink-0">#{i + 1}</span>
                    <div className="w-10 h-14 rounded-lg overflow-hidden bg-stone-100 shrink-0">
                      {movie.poster_url ? <img src={movie.poster_url} alt={movie.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center">🎬</div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-stone-900 group-hover:text-orange-600 transition-colors truncate">{movie.title}</p>
                      <p className="text-xs text-stone-400">{movie.year}</p>
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-1.5">
                      <p className={`text-lg font-black ${scoreColor}`}>{score}</p>
                      <div className="w-16 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${score}%` }} />
                      </div>
                    </div>
                  </Link>
                );
              })}
              <div className="text-center pt-4">
                <Link href="/compare" className="inline-block bg-orange-600 text-white font-bold text-sm px-6 py-2.5 rounded-full hover:bg-orange-500 transition-colors">
                  Compare films to refine rankings →
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── DNA ── */}
      {tab === "DNA" && (
        <div>
          <div className="flex items-center gap-3 mb-6">
            <span className="text-3xl">🧬</span>
            <div>
              <h2 className="font-bold text-lg text-stone-900">Your Entertainment DNA</h2>
              <p className="text-stone-500 text-sm">Evolves as you rate and compare more films</p>
            </div>
          </div>
          {profile?.dna?.length > 0 ? (
            <div className="space-y-3 mb-8">
              {profile.dna.map((arc, i) => (
                <div key={i} className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold text-stone-900 flex items-center gap-2"><span className="text-xl">{arc.icon}</span>{arc.label}</span>
                    <span className="text-orange-600 font-bold">{arc.pct}%</span>
                  </div>
                  <div className="h-2 bg-stone-100 rounded-full">
                    <div className="h-2 bg-gradient-to-r from-orange-400 to-rose-400 rounded-full transition-all duration-700" style={{ width: `${arc.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-stone-400 bg-white border border-stone-200 rounded-2xl">
              <p className="text-4xl mb-3">🧬</p>
              <p className="font-medium mb-2 text-stone-600">No DNA yet</p>
              <p className="text-sm mb-4">Complete onboarding to generate your taste profile</p>
              <Link href="/onboarding" className="bg-orange-600 text-white font-bold text-sm px-6 py-2.5 rounded-full hover:bg-orange-500 transition-colors">
                Start onboarding →
              </Link>
            </div>
          )}
          {rated.length > 0 && (() => {
            const genreCounts = {};
            rated.forEach((r) => (r.movies?.genres ?? []).forEach((g) => { genreCounts[g] = (genreCounts[g] ?? 0) + 1; }));
            const top = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);
            return top.length > 0 ? (
              <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm">
                <p className="text-xs text-stone-400 uppercase tracking-widest mb-4 font-medium">Favourite Genres</p>
                <div className="space-y-2">
                  {top.map(([genre, count]) => (
                    <div key={genre} className="flex items-center gap-3">
                      <span className="text-sm text-stone-700 w-24 shrink-0">{genre}</span>
                      <div className="flex-1 h-1.5 bg-stone-100 rounded-full">
                        <div className="h-1.5 bg-stone-400 rounded-full" style={{ width: `${(count / top[0][1]) * 100}%` }} />
                      </div>
                      <span className="text-xs text-stone-400 w-6 text-right">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null;
          })()}
        </div>
      )}

      {/* ── Stats ── */}
      {tab === "Stats" && (
        <div className="space-y-4">

          {/* Streak */}
          {(streak > 0 || profile?.streak_longest > 0) && (
            <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm">
              <p className="text-xs text-stone-400 uppercase tracking-widest mb-4 font-medium">Watch Streak</p>
              <div className="flex gap-4">
                <div className="flex-1 text-center">
                  <p className="text-3xl font-black text-orange-600">🔥 {streak}</p>
                  <p className="text-xs text-stone-400 mt-1">Current weeks</p>
                </div>
                <div className="w-px bg-stone-100" />
                <div className="flex-1 text-center">
                  <p className="text-3xl font-black text-stone-700">⚡ {profile?.streak_longest ?? 0}</p>
                  <p className="text-xs text-stone-400 mt-1">Longest ever</p>
                </div>
              </div>
            </div>
          )}

          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Films Rated",  value: rated.length,       icon: "🎬" },
              { label: "Loved",        value: loved,              icon: "❤️" },
              { label: "Comparisons",  value: comparisons.length, icon: "⚖️" },
              { label: "Avg Rating",   value: avgRating,          icon: "⭐" },
            ].map((s) => (
              <div key={s.label} className="bg-white border border-stone-200 rounded-2xl p-4 text-center shadow-sm">
                <div className="text-2xl mb-1">{s.icon}</div>
                <div className="text-2xl font-black text-stone-900">{s.value}</div>
                <div className="text-xs text-stone-400 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Watch goal */}
          {profile?.watch_goal > 0 && (
            <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-stone-400 uppercase tracking-widest font-medium">🎯 {new Date().getFullYear()} Goal</p>
                <span className="text-sm font-bold text-orange-600">{rated.length} / {profile.watch_goal}</span>
              </div>
              <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-orange-400 to-rose-400 rounded-full transition-all duration-700" style={{ width: `${Math.min(100, (rated.length / profile.watch_goal) * 100)}%` }} />
              </div>
              <p className="text-xs text-stone-400 mt-2">{rated.length >= profile.watch_goal ? "🎉 Goal complete!" : `${profile.watch_goal - rated.length} films to go`}</p>
            </div>
          )}

          {/* Rating distribution */}
          {rated.length > 0 && (
            <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm">
              <p className="text-xs text-stone-400 uppercase tracking-widest mb-4 font-medium">Rating Breakdown</p>
              <div className="space-y-2.5">
                {[5, 4, 3, 2, 1].map((v) => {
                  const count = rated.filter((r) => r.rating === v).length;
                  const pct   = rated.length ? (count / rated.length) * 100 : 0;
                  return (
                    <div key={v} className="flex items-center gap-3">
                      <span className="text-sm w-4">{RATING_EMOJI[v]}</span>
                      <div className="flex-1 h-2 bg-stone-100 rounded-full">
                        <div className="h-2 bg-orange-400 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-stone-400 w-6 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {rated.length < 10 && (
            <div className="bg-orange-50 border border-orange-100 rounded-2xl p-6 text-center">
              <p className="font-bold text-stone-900 mb-1">Rate more to unlock deeper insights</p>
              <p className="text-stone-500 text-sm mb-4">You've rated {rated.length} film{rated.length !== 1 ? "s" : ""}. Rate 10+ for full stats.</p>
              <Link href="/" className="bg-orange-600 text-white font-bold text-sm px-6 py-2.5 rounded-full hover:bg-orange-500 transition-colors">
                Discover films →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
