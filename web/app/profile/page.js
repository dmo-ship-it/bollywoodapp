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
const RATING_COLORS = { 5: "#E14B33", 4: "#E6A437", 3: "#C07A4E", 2: "#8C8A93", 1: "#8C8A93" };
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
    <div className="max-w-3xl mx-auto px-4 py-16 text-center" style={{ color: "var(--ink-mute)", fontFamily: "var(--font-ui)" }}>
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
    <div className="max-w-3xl mx-auto px-4 py-8 min-h-screen" style={{ background: "var(--paper)" }}>

      {/* Quick actions */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {new Date().getMonth() === 11 && (
          <Link href="/wrapped" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "var(--brand)", color: "#fff", fontWeight: 700, fontSize: 14, padding: "10px 20px", borderRadius: 999, textDecoration: "none", fontFamily: "var(--font-ui)", boxShadow: "var(--shadow-brand)" }}>
            Your 2026 Wrapped
          </Link>
        )}
        <Link href="/taste-profile" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "transparent", border: "2px solid var(--brand)", color: "var(--brand)", fontWeight: 700, fontSize: 14, padding: "10px 20px", borderRadius: 999, textDecoration: "none", fontFamily: "var(--font-ui)" }}>
          Taste Profile
        </Link>
        {profile?.username && (
          <Link href={`/u/${profile.username}`} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "transparent", border: "2px solid var(--line)", color: "var(--ink-soft)", fontWeight: 700, fontSize: 14, padding: "10px 20px", borderRadius: 999, textDecoration: "none", fontFamily: "var(--font-ui)" }}>
            Share Profile
          </Link>
        )}
      </div>

      {/* Profile header */}
      <div className="flex items-start gap-4 mb-8">
        <div className="w-16 h-16 rounded-full shrink-0 overflow-hidden flex items-center justify-center" style={{ background: "var(--brand)" }}>
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
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(225,75,51,0.08)", border: "1px solid rgba(225,75,51,0.2)", color: "var(--brand)", fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 999, fontFamily: "var(--font-mono)" }}>
                {streak}w streak
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
        <Link href="/compare" style={{ flexShrink: 0, background: "var(--brand)", color: "#fff", fontSize: 12, fontWeight: 700, padding: "8px 16px", borderRadius: 999, textDecoration: "none", fontFamily: "var(--font-ui)", boxShadow: "var(--shadow-brand)" }}>
          + Compare
        </Link>
      </div>

      {/* Tabs — scrollable */}
      <div className="flex gap-1 overflow-x-auto scroll-hide mb-6 -mx-4 px-4 pb-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flexShrink: 0, padding: "8px 16px", borderRadius: 8,
              fontSize: 14, fontWeight: 500,
              background: tab === t ? "var(--brand)" : "transparent",
              color: tab === t ? "#fff" : "var(--ink-mute)",
              border: "none", cursor: "pointer", fontFamily: "var(--font-ui)",
              transition: "all 0.15s",
            }}
          >
            {t}
            {t === "Watchlist" && watchlist.length > 0 && (
              <span style={{ marginLeft: 6, fontSize: 10, background: "rgba(225,75,51,0.1)", color: "var(--brand)", padding: "2px 6px", borderRadius: 999, fontWeight: 700 }}>{watchlist.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Films ── */}
      {tab === "Films" && (
        <div>
          <div className="flex gap-2 mb-5 overflow-x-auto scroll-hide -mx-4 px-4 pb-1">
            <button
              onClick={() => setFilter(0)}
              style={{ flexShrink: 0, padding: "6px 12px", borderRadius: 999, fontSize: 12, fontWeight: 500, border: "1.5px solid", borderColor: filter === 0 ? "var(--brand)" : "var(--line)", background: filter === 0 ? "var(--brand)" : "transparent", color: filter === 0 ? "#fff" : "var(--ink-mute)", cursor: "pointer", fontFamily: "var(--font-ui)" }}
            >
              All ({rated.length})
            </button>
            {[5, 4, 3, 2].map((v) => {
              const count = rated.filter((r) => r.rating === v).length;
              if (!count) return null;
              return (
                <button key={v} onClick={() => setFilter(filter === v ? 0 : v)} style={{ flexShrink: 0, padding: "6px 12px", borderRadius: 999, fontSize: 12, fontWeight: 500, border: "1.5px solid", borderColor: filter === v ? "var(--brand)" : "var(--line)", background: filter === v ? "var(--brand)" : "transparent", color: filter === v ? "#fff" : "var(--ink-mute)", cursor: "pointer", fontFamily: "var(--font-ui)" }}>
                  {RATING_LABELS[v]} ({count})
                </button>
              );
            })}
          </div>

          {filteredReactions.length === 0 ? (
            <div className="text-center py-20" style={{ color: "var(--ink-mute)", fontFamily: "var(--font-ui)" }}>
              <p style={{ fontFamily: "var(--font-serif)", fontSize: 18, color: "var(--ink-soft)", marginBottom: 8 }}>No films rated yet</p>
              <Link href="/onboarding" style={{ color: "var(--brand)", fontSize: 14, textDecoration: "none" }}>Start rating →</Link>
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
                        : <div className="w-full h-full" style={{ background: "var(--sunk)" }} />
                      }
                      <div style={{ position: "absolute", top: 6, right: 6, width: 20, height: 20, borderRadius: "28%", background: RATING_COLORS[r.rating], display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, color: r.rating === 4 ? "#261E19" : "#fff" }}>{r.rating * 20}</span>
                      </div>
                    </div>
                    <p className="mt-1.5 text-[10px] truncate transition-colors" style={{ color: "var(--ink-mute)", fontFamily: "var(--font-ui)" }}>{movie.title}</p>
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
            <div className="text-center py-20" style={{ fontFamily: "var(--font-ui)" }}>
              <p style={{ fontFamily: "var(--font-serif)", fontSize: 18, color: "var(--ink-soft)", marginBottom: 6 }}>Your watchlist is empty</p>
              <p style={{ fontSize: 14, color: "var(--ink-mute)", marginBottom: 16 }}>Bookmark films you want to watch later</p>
              <Link href="/" style={{ color: "var(--brand)", fontSize: 14, textDecoration: "none" }}>Browse films →</Link>
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
                          : <div className="w-full h-full" style={{ background: "var(--sunk)" }} />
                        }
                        <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="bg-white/90 rounded-lg p-1 shadow-sm">
                            <WatchlistButton movieId={movie.id} movieTitle={movie.title} />
                          </div>
                        </div>
                      </div>
                      <p style={{ fontSize: 10, color: "var(--ink-mute)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "var(--font-ui)" }}>{movie.title}</p>
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
            <div className="text-center py-20" style={{ fontFamily: "var(--font-ui)" }}>
              <p style={{ fontFamily: "var(--font-serif)", fontSize: 18, color: "var(--ink-soft)", marginBottom: 8 }}>No rankings yet</p>
              <Link href="/onboarding" style={{ color: "var(--brand)", fontSize: 14, textDecoration: "none" }}>Start rating →</Link>
            </div>
          ) : (
            <div className="space-y-2">
              {[...reactions].filter((r) => r.score != null).sort((a, b) => b.score - a.score).map((r, i) => {
                const movie = r.movies;
                if (!movie) return null;
                const score      = Math.round(r.score);
                const scoreColor = score >= 90 ? "#E14B33" : score >= 70 ? "#E6A437" : score >= 50 ? "#C07A4E" : "#8C8A93";
                const barColor  = scoreColor;
                return (
                  <div key={movie.id} className="flex items-center gap-2 rounded-2xl p-3 transition-all group" style={{ background: "var(--card)", border: "1px solid var(--line)" }}>
                    <Link href={`/movies/${movie.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-stone-400 text-sm font-bold w-6 text-center shrink-0">#{i + 1}</span>
                      <div className="w-10 h-14 rounded-lg overflow-hidden bg-stone-100 shrink-0">
                        {movie.poster_url ? <img src={movie.poster_url} alt={movie.title} className="w-full h-full object-cover" /> : <div className="w-full h-full" style={{ background: "var(--sunk)" }} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate transition-colors" style={{ color: "var(--ink)", fontFamily: "var(--font-ui)" }}>{movie.title}</p>
                        <p className="text-xs text-stone-400">{movie.year}{movie.genres?.length > 0 && ` · ${movie.genres.slice(0, 2).join(", ")}`}</p>
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-1.5">
                        <p style={{ fontSize: 18, fontWeight: 800, color: scoreColor, fontFamily: "var(--font-ui)" }}>{score}</p>
                        <div style={{ width: 56, height: 6, background: "var(--line)", borderRadius: 999, overflow: "hidden" }}>
                          <div style={{ height: "100%", borderRadius: 999, background: barColor, width: `${score}%` }} />
                        </div>
                      </div>
                    </Link>
                    <button
                      onClick={() => setEditingMovie({ ...movie, currentRating: r.rating })}
                      style={{ color: "var(--line)", flexShrink: 0, paddingLeft: 4, background: "none", border: "none", cursor: "pointer" }}
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
                <Link href="/compare" style={{ display: "inline-block", background: "var(--brand)", color: "#fff", fontWeight: 700, fontSize: 14, padding: "10px 24px", borderRadius: 999, textDecoration: "none", fontFamily: "var(--font-ui)", boxShadow: "var(--shadow-brand)" }}>
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
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 32 }}>
              {profile.dna.map((arc, i) => (
                <div key={i} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 20, padding: 20, boxShadow: "var(--shadow-card)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ fontWeight: 600, color: "var(--ink)", fontFamily: "var(--font-ui)", fontSize: 14 }}>{arc.label}</span>
                    <span style={{ color: "var(--brand)", fontWeight: 700, fontFamily: "var(--font-ui)" }}>{arc.pct}%</span>
                  </div>
                  <div style={{ height: 8, background: "var(--sunk)", borderRadius: 999 }}>
                    <div style={{ height: 8, background: "var(--brand)", borderRadius: 999, width: `${arc.pct}%`, transition: "width 0.7s" }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "64px 20px", color: "var(--ink-mute)", background: "var(--card)", border: "1px solid var(--line)", borderRadius: 20 }}>
              <p style={{ fontFamily: "var(--font-serif)", fontSize: 18, color: "var(--ink-soft)", marginBottom: 8 }}>No taste profile yet</p>
              <p style={{ fontSize: 14, marginBottom: 16 }}>Complete onboarding to generate your taste profile</p>
              <Link href="/onboarding" style={{ display: "inline-block", background: "var(--brand)", color: "#fff", fontWeight: 700, fontSize: 14, padding: "10px 24px", borderRadius: "var(--radius-pill)", textDecoration: "none", fontFamily: "var(--font-ui)" }}>
                Start onboarding →
              </Link>
            </div>
          )}
          {profile?.preferred_languages?.length > 0 && (
            <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm mb-3">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs text-stone-400 uppercase tracking-widest font-medium">Language Preferences</p>
                <Link href="/onboarding" style={{ fontSize: 12, color: "var(--brand)", textDecoration: "none", fontFamily: "var(--font-ui)" }}>Edit</Link>
              </div>
              <div className="flex flex-wrap gap-2">
                {profile.preferred_languages.map((code, idx) => (
                  <div key={code} style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--sunk)", border: "1px solid var(--line)", borderRadius: 999, padding: "6px 12px" }}>
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
            <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: 20 }}>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--ink-mute)", marginBottom: 16 }}>Watch Streak</p>
              <div className="flex gap-4">
                <div className="flex-1 text-center">
                  <p style={{ fontSize: 28, fontWeight: 800, color: "var(--brand)", fontFamily: "var(--font-ui)" }}>{streak}</p>
                  <p style={{ fontSize: 11, color: "var(--ink-mute)", marginTop: 4, fontFamily: "var(--font-mono)" }}>Current weeks</p>
                </div>
                <div style={{ width: 1, background: "var(--line)" }} />
                <div className="flex-1 text-center">
                  <p style={{ fontSize: 28, fontWeight: 800, color: "var(--ink-soft)", fontFamily: "var(--font-ui)" }}>{profile?.streak_longest ?? 0}</p>
                  <p style={{ fontSize: 11, color: "var(--ink-mute)", marginTop: 4, fontFamily: "var(--font-mono)" }}>Longest ever</p>
                </div>
              </div>
            </div>
          )}

          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Films Rated",  value: rated.length       },
              { label: "Loved",        value: loved               },
              { label: "Comparisons",  value: comparisons.length  },
              { label: "Avg Rating",   value: avgRating           },
            ].map((s) => (
              <div key={s.label} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: 16, textAlign: "center" }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: "var(--ink)", fontFamily: "var(--font-ui)", marginBottom: 2 }}>{s.value}</div>
                <div style={{ fontSize: 11, color: "var(--ink-mute)", fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Watch goal */}
          {profile?.watch_goal > 0 && (
            <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 20, padding: 20, boxShadow: "var(--shadow-card)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <p style={{ fontSize: 11, color: "var(--ink-mute)", textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 500, fontFamily: "var(--font-mono)" }}>{new Date().getFullYear()} Goal</p>
                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--brand)", fontFamily: "var(--font-ui)" }}>{rated.length} / {profile.watch_goal}</span>
              </div>
              <div style={{ height: 8, background: "var(--sunk)", borderRadius: 999, overflow: "hidden" }}>
                <div style={{ height: 8, background: "var(--brand)", borderRadius: 999, width: `${Math.min(100, (rated.length / profile.watch_goal) * 100)}%`, transition: "width 0.7s" }} />
              </div>
              <p style={{ fontSize: 12, color: "var(--ink-mute)", marginTop: 8, fontFamily: "var(--font-ui)" }}>{rated.length >= profile.watch_goal ? "Goal complete!" : `${profile.watch_goal - rated.length} films to go`}</p>
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
                    <div key={v} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--ink-mute)", width: 56, flexShrink: 0 }}>{RATING_LABELS[v]}</span>
                      <div style={{ flex: 1, height: 6, background: "var(--line)", borderRadius: 999, overflow: "hidden" }}>
                        <div style={{ height: "100%", background: RATING_COLORS[v], borderRadius: 999, width: `${pct}%`, transition: "width 0.5s" }} />
                      </div>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-mute)", width: 20, textAlign: "right" }}>{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {rated.length < 10 && (
            <div style={{ background: "rgba(225,75,51,0.05)", border: "1px solid rgba(225,75,51,0.15)", borderRadius: "var(--radius)", padding: 24, textAlign: "center" }}>
              <p style={{ fontFamily: "var(--font-serif)", fontSize: 18, color: "var(--ink)", marginBottom: 8 }}>Rate more to unlock deeper insights</p>
              <p style={{ fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--ink-soft)", marginBottom: 16 }}>You've rated {rated.length} film{rated.length !== 1 ? "s" : ""}. Rate 10+ for full stats.</p>
              <Link href="/" style={{ display: "inline-block", background: "var(--brand)", color: "#fff", fontWeight: 700, fontSize: 14, padding: "10px 24px", borderRadius: 999, textDecoration: "none", fontFamily: "var(--font-ui)" }}>
                Discover films →
              </Link>
            </div>
          )}
        </div>
      )}
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
                  <div className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center" style={{ background: "var(--brand)" }}>
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
                    style={{ width: "100%", border: "1.5px solid var(--line)", borderRadius: 12, padding: "10px 16px", fontSize: 14, color: "var(--ink)", outline: "none", boxSizing: "border-box", background: "var(--sunk)", fontFamily: "var(--font-ui)" }}
                    onFocus={e => e.target.style.borderColor = "var(--brand)"}
                    onBlur={e => e.target.style.borderColor = "var(--line)"}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase tracking-widest mb-1.5">Username</label>
                  <div style={{ display: "flex", alignItems: "center", border: "1.5px solid var(--line)", borderRadius: 12, padding: "10px 16px", background: "var(--sunk)" }}>
                    <span style={{ color: "var(--ink-mute)", fontSize: 14, marginRight: 4 }}>@</span>
                    <input
                      type="text"
                      value={editUsername}
                      onChange={(e) => setEditUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                      placeholder="yourhandle"
                      maxLength={30}
                      style={{ flex: 1, fontSize: 14, color: "var(--ink)", outline: "none", background: "transparent", border: "none", fontFamily: "var(--font-ui)" }}
                    />
                  </div>
                  <p className="text-xs text-stone-400 mt-1">Letters, numbers, underscores only</p>
                </div>
                {profileError && <p className="text-xs text-red-500">{profileError}</p>}
              </div>

              <button
                onClick={saveProfile}
                disabled={profileSaving}
                style={{ marginTop: 24, width: "100%", background: "var(--brand)", color: "#fff", fontWeight: 700, padding: "12px", borderRadius: "var(--radius-pill)", border: "none", cursor: "pointer", fontFamily: "var(--font-ui)", fontSize: 14, boxShadow: "var(--shadow-brand)" }}
              >
                {profileSaving ? "Saving…" : "Save"}
              </button>
              <div className="mt-4 pt-4 border-t border-stone-100 text-center">
                <button
                  onClick={() => { setEditProfile(false); setDeleteOpen(true); setDeleteConfirm(""); setDeleteError(""); }}
                  className="text-xs text-stone-400 hover:text-red-500 transition-colors underline underline-offset-2"
                >
                  Delete account
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
