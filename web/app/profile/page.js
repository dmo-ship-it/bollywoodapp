"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "../../lib/supabase-browser";
import { BADGES } from "../../lib/badges";
import WatchlistButton from "../components/WatchlistButton";
import RatingModal from "../components/RatingModal";
import { languageName } from "../../lib/languages";

const RATING_LABELS = { 5: "Loved", 4: "Liked", 3: "Okay", 2: "Didn't like", 1: "Hated" };
const RATING_EMOJI  = { 5: "😍", 4: "😊", 3: "😐", 2: "😕", 1: "😡" };
const TABS = ["Films", "Watchlist", "Rankings", "Taste", "Stats"];
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
  const [points,      setPoints]      = useState(null);  // { total_points, current_tier }
  const [rank,        setRank]        = useState(null);  // leaderboard rank
  const [loading,     setLoading]     = useState(true);
  const [tab,          setTab]          = useState("Films");
  const [filter,       setFilter]       = useState(0);
  const [badgesOpen,    setBadgesOpen]    = useState(false);
  const [editingMovie,  setEditingMovie]  = useState(null);
  const [editProfile,   setEditProfile]   = useState(false);
  const [editName,      setEditName]      = useState("");
  const [editUsername,  setEditUsername]  = useState("");
  const [profileSaving,   setProfileSaving]   = useState(false);
  const [profileError,    setProfileError]    = useState("");
  const [avatarPreview,   setAvatarPreview]   = useState(null); // data URL for preview
  const [avatarFile,      setAvatarFile]      = useState(null); // File object to upload
  const [deleteOpen,      setDeleteOpen]      = useState(false);
  const [deleteConfirm,   setDeleteConfirm]   = useState("");
  const [deleting,        setDeleting]        = useState(false);
  const [deleteError,     setDeleteError]     = useState("");

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUser(user);

      const [profileRes, reactionsRes, comparisonsRes, watchlistRes, badgesRes, pointsRes] = await Promise.all([
        supabase.from("user_profiles").select("*").eq("user_id", user.id).single(),
        supabase.from("user_reactions").select("rating, score, created_at, movies(id, title, year, poster_url, genres, tmdb_rating)").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("user_comparisons").select("id, comparison_type, created_at").eq("user_id", user.id),
        supabase.from("user_watchlist").select("created_at, movies(id, title, year, poster_url, tmdb_rating)").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("user_badges").select("badge_id, earned_at").eq("user_id", user.id),
        supabase.from("user_points").select("total_points, current_tier, is_founder").eq("user_id", user.id).single(),
      ]);

      setProfile(profileRes.data);
      setReactions(reactionsRes.data ?? []);
      setComparisons(comparisonsRes.data ?? []);
      setWatchlist(watchlistRes.data ?? []);
      setBadges(badgesRes.data ?? []);
      setPoints(pointsRes.data);

      // Compute leaderboard rank
      const { count } = await supabase
        .from("user_points")
        .select("*", { count: "exact", head: true })
        .gt("total_points", pointsRes.data?.total_points ?? 0);
      setRank((count ?? 0) + 1);
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

  async function saveProfile() {
    if (!user) return;
    setProfileSaving(true);
    setProfileError("");
    const name = editName.trim();
    const uname = editUsername.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");

    if (uname && uname !== profile?.username) {
      const { data: existing } = await supabase
        .from("user_profiles").select("user_id").eq("username", uname).single();
      if (existing) {
        setProfileError("That username is already taken.");
        setProfileSaving(false);
        return;
      }
    }

    let pictureUrl = profile?.profile_picture_url ?? null;
    if (avatarFile) {
      const ext = avatarFile.name.split(".").pop();
      const path = `${user.id}.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(path, avatarFile, { upsert: true });
      if (error) {
        setProfileError("Photo upload failed. Please try again.");
        setProfileSaving(false);
        return;
      }
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      pictureUrl = urlData.publicUrl;
    }

    await supabase.from("user_profiles").upsert({
      user_id:             user.id,
      display_name:        name || null,
      username:            uname || null,
      profile_picture_url: pictureUrl,
    }, { onConflict: "user_id" });

    const { data } = await supabase.from("user_profiles").select("*").eq("user_id", user.id).single();
    setProfile(data);
    setAvatarFile(null);
    setAvatarPreview(null);
    setProfileSaving(false);
    setEditProfile(false);
  }

  async function deleteAccount() {
    setDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch("/api/delete-account", { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to delete account");
      await supabase.auth.signOut();
      router.push("/login?deleted=1");
    } catch (err) {
      setDeleteError(err.message);
      setDeleting(false);
    }
  }

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
        {new Date().getMonth() === 11 && (
          <Link href="/wrapped" className="flex items-center gap-2 bg-gradient-to-r from-orange-400 to-rose-400 text-white font-bold text-sm px-5 py-3 rounded-full hover:shadow-lg transition-all">
            <span>✨</span> Your 2026 Wrapped
          </Link>
        )}
        <Link href="/taste-profile" className="flex items-center gap-2 bg-white border-2 border-orange-400 text-orange-600 font-bold text-sm px-5 py-3 rounded-full hover:bg-orange-50 transition-all">
          Taste Profile
        </Link>
        {profile?.username && (
          <Link href={`/u/${profile.username}`} className="flex items-center gap-2 bg-white border-2 border-stone-200 text-stone-700 font-bold text-sm px-5 py-3 rounded-full hover:bg-stone-50 transition-all">
            <span>🔗</span> Share Profile
          </Link>
        )}
      </div>

      {/* Profile header */}
      <div className="flex items-start gap-4 mb-8">
        <div className="w-16 h-16 rounded-full shrink-0 overflow-hidden bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center">
          {profile?.profile_picture_url
            ? <img src={profile.profile_picture_url} alt={displayName} className="w-full h-full object-cover" />
            : <span className="text-white text-xl font-black">{initials}</span>
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-black text-stone-900">{displayName}</h1>
            <button
              onClick={() => { setEditName(profile?.display_name || ""); setEditUsername(profile?.username || ""); setProfileError(""); setEditProfile(true); }}
              className="text-stone-300 hover:text-stone-500 transition-colors"
              title="Edit profile"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
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
          <div className="flex gap-5 mt-3 text-sm flex-wrap">
            <span><strong className="text-stone-900">{rated.length}</strong> <span className="text-stone-400">rated</span></span>
            <span><strong className="text-stone-900">{watchlist.length}</strong> <span className="text-stone-400">watchlist</span></span>
            <Link href="/leaderboards" className="flex items-center gap-1.5 hover:opacity-70 transition-opacity">
              <strong className="text-stone-900">{(points?.total_points ?? 0).toLocaleString()}</strong>
              <span className="text-stone-400">pts</span>
              {rank && (
                <span className="text-stone-400">· <strong className="text-stone-900">#{rank}</strong></span>
              )}
            </Link>
            {badges.length > 0 && (
              <button
                onClick={() => setBadgesOpen((o) => !o)}
                className="flex items-center gap-1 hover:opacity-70 transition-opacity"
              >
                <strong className="text-stone-900">{badges.length}</strong>
                <span className="text-stone-400">badges</span>
                <span className={`text-stone-300 text-xs transition-transform duration-200 ${badgesOpen ? "rotate-180" : ""}`}>▾</span>
              </button>
            )}
          </div>

          {/* Badges slide-down */}
          {badgesOpen && badges.length > 0 && (
            <div className="mt-4 grid grid-cols-4 sm:grid-cols-6 gap-3 animate-fade-in">
              {badges.map(b => {
                const badge = BADGES.find(bd => bd.id === b.badge_id);
                return badge ? (
                  <div key={b.badge_id} className="flex flex-col items-center gap-1 text-center">
                    <div className="text-2xl">{badge.icon}</div>
                    <p className="text-[9px] text-stone-500 leading-tight">{badge.label}</p>
                  </div>
                ) : null;
              })}
            </div>
          )}
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
              {[...reactions].filter((r) => r.score != null).sort((a, b) => b.score - a.score).map((r, i) => {
                const movie = r.movies;
                if (!movie) return null;
                const score      = Math.round(r.score);
                const scoreColor = score >= 80 ? "text-rose-600" : score >= 60 ? "text-orange-600" : "text-stone-500";
                const barColor   = score >= 80 ? "bg-rose-500"   : score >= 60 ? "bg-orange-500"   : "bg-stone-300";
                return (
                  <div key={movie.id} className="flex items-center gap-2 bg-white border border-stone-200 rounded-2xl p-3 hover:border-stone-300 hover:shadow-sm transition-all group">
                    <Link href={`/movies/${movie.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-stone-400 text-sm font-bold w-6 text-center shrink-0">#{i + 1}</span>
                      <div className="w-10 h-14 rounded-lg overflow-hidden bg-stone-100 shrink-0">
                        {movie.poster_url ? <img src={movie.poster_url} alt={movie.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center">🎬</div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-stone-900 group-hover:text-orange-600 transition-colors truncate">{movie.title}</p>
                        <p className="text-xs text-stone-400">{movie.year}{movie.genres?.length > 0 && ` · ${movie.genres.slice(0, 2).join(", ")}`}</p>
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-1.5">
                        <p className={`text-lg font-black ${scoreColor}`}>{score}</p>
                        <div className="w-14 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${score}%` }} />
                        </div>
                      </div>
                    </Link>
                    <button
                      onClick={() => setEditingMovie({ ...movie, currentRating: r.rating })}
                      className="text-stone-300 hover:text-orange-500 transition-colors shrink-0 pl-1"
                      title="Edit rating"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                  </div>
                );
              })}
              <div className="text-center pt-4">
                <Link href="/compare" className="inline-block bg-orange-600 text-white font-bold text-sm px-6 py-2.5 rounded-full hover:bg-orange-500 transition-colors">
                  Compare films to refine rankings →
                </Link>
              </div>
            </div>
          )}

          {editingMovie && (
            <RatingModal
              movieId={editingMovie.id}
              movieTitle={editingMovie.title}
              posterUrl={editingMovie.poster_url}
              onClose={() => setEditingMovie(null)}
              onRated={(newRating) => {
                supabase.from("user_reactions").select("rating, score").eq("user_id", user.id).eq("movie_id", editingMovie.id).single()
                  .then(({ data }) => {
                    if (!data) return;
                    setReactions((prev) => prev.map((r) =>
                      r.movies?.id === editingMovie.id ? { ...r, rating: data.rating, score: data.score } : r
                    ));
                  });
                setEditingMovie(null);
              }}
              onDeleted={() => {
                setReactions((prev) => prev.filter((r) => r.movies?.id !== editingMovie.id));
                setEditingMovie(null);
              }}
            />
          )}
        </div>
      )}

      {/* ── Taste ── */}
      {tab === "Taste" && (
        <div>
          <div className="mb-6">
            <h2 className="font-bold text-lg text-stone-900">Your Taste Profile</h2>
            <p className="text-stone-500 text-sm">Evolves as you rate and compare more films</p>
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
              <p className="text-4xl mb-3">🎬</p>
              <p className="font-medium mb-2 text-stone-600">No taste profile yet</p>
              <p className="text-sm mb-4">Complete onboarding to generate your taste profile</p>
              <Link href="/onboarding" className="bg-orange-600 text-white font-bold text-sm px-6 py-2.5 rounded-full hover:bg-orange-500 transition-colors">
                Start onboarding →
              </Link>
            </div>
          )}
          {profile?.preferred_languages?.length > 0 && (
            <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm mb-3">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs text-stone-400 uppercase tracking-widest font-medium">Language Preferences</p>
                <Link href="/onboarding" className="text-xs text-orange-600 hover:underline">Edit</Link>
              </div>
              <div className="flex flex-wrap gap-2">
                {profile.preferred_languages.map((code, idx) => (
                  <div key={code} className="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-full px-3 py-1.5">
                    <span className="text-[10px] font-bold text-stone-400 w-4 text-center">#{idx + 1}</span>
                    <span className="text-sm font-medium text-stone-700">{languageName(code)}</span>
                  </div>
                ))}
              </div>
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
      {/* Danger zone */}
      <div className="mt-12 pt-8 border-t border-stone-200">
        <button
          onClick={() => { setDeleteOpen(true); setDeleteConfirm(""); setDeleteError(""); }}
          className="text-xs text-stone-400 hover:text-red-500 transition-colors underline underline-offset-2"
        >
          Delete account
        </button>
      </div>

      {/* Delete Account modal */}
      {deleteOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => !deleting && setDeleteOpen(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-stone-900 text-base">Delete account</h2>
                <button
                  onClick={() => setDeleteOpen(false)}
                  disabled={deleting}
                  className="text-stone-400 hover:text-stone-600 transition-colors disabled:opacity-40"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              </div>
              <p className="text-sm text-stone-600 mb-1">This will permanently delete your account and all your data — ratings, watchlist, badges, and points. <strong>This cannot be undone.</strong></p>
              <p className="text-sm text-stone-500 mb-4 mt-3">Type <strong>DELETE</strong> to confirm:</p>
              <input
                type="text"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder="DELETE"
                disabled={deleting}
                className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-900 placeholder-stone-300 focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all disabled:opacity-40"
              />
              {deleteError && <p className="text-xs text-red-500 mt-2">{deleteError}</p>}
              <button
                onClick={deleteAccount}
                disabled={deleteConfirm !== "DELETE" || deleting}
                className="mt-4 w-full bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-500 transition-colors text-sm disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {deleting ? "Deleting…" : "Delete my account"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Edit Profile modal */}
      {editProfile && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => { setEditProfile(false); setAvatarFile(null); setAvatarPreview(null); }} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-bold text-stone-900 text-base">Edit Profile</h2>
                <button onClick={() => { setEditProfile(false); setAvatarFile(null); setAvatarPreview(null); }} className="text-stone-400 hover:text-stone-600 transition-colors">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              </div>

              {/* Avatar picker */}
              <div className="flex justify-center mb-5">
                <label className="relative cursor-pointer group">
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center">
                    {avatarPreview || profile?.profile_picture_url
                      ? <img src={avatarPreview || profile.profile_picture_url} alt="" className="w-full h-full object-cover" />
                      : <span className="text-white text-2xl font-black">{initials}</span>
                    }
                  </div>
                  <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                      <circle cx="12" cy="13" r="4"/>
                    </svg>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setAvatarFile(file);
                      const reader = new FileReader();
                      reader.onload = (ev) => setAvatarPreview(ev.target.result);
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase tracking-widest mb-1.5">Display name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder={user?.email?.split("@")[0]}
                    maxLength={40}
                    className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase tracking-widest mb-1.5">Username</label>
                  <div className="flex items-center border border-stone-200 rounded-xl px-4 py-2.5 focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-100 transition-all">
                    <span className="text-stone-400 text-sm mr-1">@</span>
                    <input
                      type="text"
                      value={editUsername}
                      onChange={(e) => setEditUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                      placeholder="yourhandle"
                      maxLength={30}
                      className="flex-1 text-sm text-stone-900 placeholder-stone-400 focus:outline-none bg-transparent"
                    />
                  </div>
                  <p className="text-xs text-stone-400 mt-1">Letters, numbers, underscores only</p>
                </div>
                {profileError && <p className="text-xs text-red-500">{profileError}</p>}
              </div>

              <button
                onClick={saveProfile}
                disabled={profileSaving}
                className="mt-6 w-full bg-stone-900 text-white font-bold py-3 rounded-xl hover:bg-stone-800 transition-colors text-sm disabled:opacity-40"
              >
                {profileSaving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
