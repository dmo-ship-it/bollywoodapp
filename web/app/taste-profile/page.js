"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase-browser";
import { getTastePercentiles } from "../../lib/taste";
import Link from "next/link";

const VIBE_EMOJI = {
  emotional: "💔",
  thoughtful: "🤔",
  masala: "🎬",
  artistic: "🎨",
  light: "😄",
  intense: "⚡",
};

function computeSimilarity(myScores, theirScores) {
  const shared = Object.keys(myScores).filter((id) => theirScores[id] != null);
  if (shared.length < 3) return null;
  const avg = shared.reduce((sum, id) => sum + (1 - Math.abs(myScores[id] - theirScores[id]) / 100), 0) / shared.length;
  return { pct: Math.round(avg * 100), shared: shared.length };
}

export default function TasteProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  const [tab,     setTab]     = useState("taste");
  const [user,    setUser]    = useState(null);
  const [taste,   setTaste]   = useState(null);
  const [people,  setPeople]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [twinsLoading, setTwinsLoading] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUser(user);

      const profile = await getTastePercentiles(user.id);
      setTaste(profile);
      setLoading(false);
    }
    load();
  }, []);

  async function loadTwins() {
    if (people.length > 0) return; // already loaded
    setTwinsLoading(true);

    const [{ data: profiles }, { data: allReactions }] = await Promise.all([
      supabase.from("user_profiles").select("user_id, email, display_name, username, country, city"),
      supabase.from("user_reactions").select("user_id, movie_id, score, rating, movies(id, title, poster_url)").gt("rating", 0).not("score", "is", null),
    ]);

    if (!profiles || !allReactions) { setTwinsLoading(false); return; }

    const byUser = {}, topFilm = {};
    allReactions.forEach((r) => {
      if (!byUser[r.user_id]) byUser[r.user_id] = {};
      byUser[r.user_id][r.movie_id] = r.score;
      if (!topFilm[r.user_id] || r.score > (topFilm[r.user_id]?.score ?? 0))
        topFilm[r.user_id] = { score: r.score, movie: r.movies };
    });

    const myScores = user ? (byUser[user.id] ?? {}) : {};
    const FLAGS = { IN:"🇮🇳",US:"🇺🇸",GB:"🇬🇧",CA:"🇨🇦",AU:"🇦🇺",AE:"🇦🇪",SG:"🇸🇬",NZ:"🇳🇿",ZA:"🇿🇦",MY:"🇲🇾",QA:"🇶🇦" };

    const result = profiles
      .filter((p) => p.user_id !== user?.id && byUser[p.user_id])
      .map((p) => ({
        user_id:     p.user_id,
        displayName: p.display_name || p.email?.split("@")[0] || "User",
        handle:      p.username ? `@${p.username}` : null,
        location:    [p.city, p.country ? FLAGS[p.country] : null].filter(Boolean).join(" "),
        ratedCount:  Object.keys(byUser[p.user_id] ?? {}).length,
        similarity:  computeSimilarity(myScores, byUser[p.user_id]),
        topFilm:     topFilm[p.user_id]?.movie ?? null,
      }))
      .filter((p) => p.ratedCount >= 1)
      .sort((a, b) => (b.similarity?.pct ?? -1) - (a.similarity?.pct ?? -1));

    setPeople(result);
    setTwinsLoading(false);
  }

  function handleTabChange(newTab) {
    setTab(newTab);
    if (newTab === "twins") loadTwins();
  }

  if (!user) return null;
  if (loading) return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-center text-stone-400">
      <div className="text-4xl mb-4 animate-pulse">🧬</div>
      Analyzing your taste…
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 bg-stone-50 min-h-screen">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-black text-stone-900 mb-1">🧬 Taste</h1>
        <p className="text-stone-500 text-sm">Your cinema DNA and people who share it</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-stone-100 rounded-xl p-1 mb-8 w-fit">
        {[
          { id: "taste", label: "Your Taste" },
          { id: "twins", label: "Taste Twins" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => handleTabChange(t.id)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.id
                ? "bg-white text-stone-900 shadow-sm"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Your Taste Tab ── */}
      {tab === "taste" && (
        <>
          {!taste ? (
            <div className="text-center py-20 text-stone-400">
              <p className="text-4xl mb-3">🧬</p>
              <p className="text-stone-600 font-medium">Rate more films to see your taste profile</p>
              <Link href="/" className="text-orange-600 hover:underline mt-3 block">Discover films →</Link>
            </div>
          ) : (
            <>
              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                <div className="bg-white border border-stone-200 rounded-2xl p-4 text-center shadow-sm">
                  <p className="text-3xl font-black text-stone-900">{taste.totalFilmsRated}</p>
                  <p className="text-xs text-stone-400 mt-1">Films Rated</p>
                </div>
                <div className="bg-white border border-stone-200 rounded-2xl p-4 text-center shadow-sm">
                  <p className="text-3xl font-black text-orange-600">{taste.eraBreakdown[0]?.era || "—"}</p>
                  <p className="text-xs text-stone-400 mt-1">Favorite Era</p>
                </div>
                <div className="bg-white border border-stone-200 rounded-2xl p-4 text-center shadow-sm">
                  <p className="text-3xl font-black text-stone-900">{taste.directorAffinities[0]?.name || "—"}</p>
                  <p className="text-xs text-stone-400 mt-1">Top Director</p>
                </div>
                <div className="bg-white border border-stone-200 rounded-2xl p-4 text-center shadow-sm">
                  <p className="text-3xl font-black text-stone-900">{taste.languageBreakdown[0]?.language || "—"}</p>
                  <p className="text-xs text-stone-400 mt-1">Main Language</p>
                </div>
              </div>

              {/* Era Breakdown */}
              <section className="bg-white border border-stone-200 rounded-2xl p-6 mb-6 shadow-sm">
                <h2 className="text-lg font-bold text-stone-900 mb-4">🗓️ Era Breakdown</h2>
                <div className="space-y-3">
                  {taste.eraBreakdown.map((e, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-stone-700">{e.era}</span>
                        <span className="text-sm font-bold text-orange-600">{e.pct}%</span>
                      </div>
                      <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                        <div className="h-2 bg-gradient-to-r from-orange-400 to-rose-400 rounded-full transition-all duration-500" style={{ width: `${e.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                {taste.percentiles?.topEra && (
                  <p className="text-xs text-orange-600 font-medium mt-4 bg-orange-50 border border-orange-100 rounded-lg p-2">
                    🏆 Top {taste.percentiles.topEra.percentile}% for {taste.percentiles.topEra.era} films
                  </p>
                )}
              </section>

              {/* Genre Breakdown */}
              <section className="bg-white border border-stone-200 rounded-2xl p-6 mb-6 shadow-sm">
                <h2 className="text-lg font-bold text-stone-900 mb-4">🎭 Genre Breakdown</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {taste.genreBreakdown.map((g, i) => (
                    <div key={i} className="bg-stone-50 border border-stone-200 rounded-lg p-3 text-center">
                      <p className="text-sm font-bold text-stone-900">{g.genre}</p>
                      <p className="text-lg font-black text-orange-600">{g.pct}%</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Language Breakdown */}
              <section className="bg-white border border-stone-200 rounded-2xl p-6 mb-6 shadow-sm">
                <h2 className="text-lg font-bold text-stone-900 mb-4">🗣️ Language Breakdown</h2>
                <div className="space-y-2">
                  {taste.languageBreakdown.map((l, i) => (
                    <div key={i} className="flex items-center justify-between bg-stone-50 border border-stone-200 rounded-lg p-3">
                      <span className="text-sm font-medium text-stone-700">{l.language}</span>
                      <span className="font-bold text-orange-600">{l.pct}%</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Director Affinities */}
              <section className="bg-white border border-stone-200 rounded-2xl p-6 mb-6 shadow-sm">
                <h2 className="text-lg font-bold text-stone-900 mb-4">🎬 Director Affinities</h2>
                <div className="space-y-3">
                  {taste.directorAffinities.map((d, i) => (
                    <div key={d.id} className="border-l-4 border-orange-400 pl-4 py-2">
                      <div className="flex items-baseline justify-between">
                        <p className="font-semibold text-stone-900">#{i + 1} {d.name}</p>
                        <span className="text-sm text-orange-600 font-bold">{d.avgRating}/5</span>
                      </div>
                      <p className="text-xs text-stone-400 mt-0.5">{d.count} film{d.count !== 1 ? "s" : ""} seen</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Actor Affinities */}
              <section className="bg-white border border-stone-200 rounded-2xl p-6 mb-6 shadow-sm">
                <h2 className="text-lg font-bold text-stone-900 mb-4">⭐ Actor Affinities</h2>
                <div className="space-y-3">
                  {taste.actorAffinities.map((a, i) => (
                    <div key={a.id} className="border-l-4 border-rose-400 pl-4 py-2">
                      <div className="flex items-baseline justify-between">
                        <p className="font-semibold text-stone-900">#{i + 1} {a.name}</p>
                        <span className="text-sm text-rose-600 font-bold">{a.avgRating}/5</span>
                      </div>
                      <p className="text-xs text-stone-400 mt-0.5">{a.count} film{a.count !== 1 ? "s" : ""} seen</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Mood & Vibe */}
              <section className="bg-white border border-stone-200 rounded-2xl p-6 mb-6 shadow-sm">
                <h2 className="text-lg font-bold text-stone-900 mb-4">💭 Mood & Vibe</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {taste.vibeBreakdown.map((v, i) => (
                    <div key={i} className="bg-stone-50 border border-stone-200 rounded-lg p-3 text-center">
                      <p className="text-2xl mb-1">{VIBE_EMOJI[v.vibe] || "✨"}</p>
                      <p className="text-xs font-semibold text-stone-700 capitalize mb-1">{v.vibe}</p>
                      <p className="text-lg font-black text-orange-600">{v.pct}%</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Taste DNA Summary */}
              <section className="bg-gradient-to-r from-orange-50 to-rose-50 border border-orange-100 rounded-2xl p-6 mb-6">
                <h3 className="text-base font-bold text-stone-900 mb-3">🔍 Your Taste DNA</h3>
                <p className="text-sm text-stone-700 leading-relaxed">
                  You're a <strong>{taste.eraBreakdown[0]?.era} enthusiast</strong> who loves <strong>{taste.genreBreakdown.slice(0, 2).map(g => g.genre).join(" and ")}</strong> films,
                  with a strong affinity for <strong>{taste.directorAffinities[0]?.name}</strong>.
                  Your taste is primarily in <strong>{taste.languageBreakdown[0]?.language}</strong>,
                  and you gravitate toward <strong>{taste.vibeBreakdown[0]?.vibe}</strong> cinema.
                </p>
              </section>

              {/* CTA to switch tab */}
              <div className="text-center pb-8">
                <button
                  onClick={() => handleTabChange("twins")}
                  className="bg-orange-600 text-white font-bold px-6 py-3 rounded-full hover:bg-orange-500 transition-colors"
                >
                  Find your Taste Twins →
                </button>
              </div>
            </>
          )}
        </>
      )}

      {/* ── Taste Twins Tab ── */}
      {tab === "twins" && (
        <>
          <p className="text-stone-500 text-sm mb-6">People ranked by how closely their taste matches yours</p>

          {twinsLoading ? (
            <div className="space-y-3">
              {[1,2,3,4].map((i) => <div key={i} className="h-20 rounded-2xl bg-stone-200 animate-pulse" />)}
            </div>
          ) : people.length === 0 ? (
            <div className="text-center py-20 text-stone-400">
              <p className="text-4xl mb-3">🎭</p>
              <p className="mb-1 font-medium text-stone-600">No other members yet</p>
              <p className="text-sm">Invite friends to compare taste!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {people.map((person, i) => {
                const sim      = person.similarity;
                const initials = person.displayName.slice(0, 2).toUpperCase();
                const simColor = !sim ? "" : sim.pct >= 80 ? "text-emerald-600" : sim.pct >= 65 ? "text-orange-600" : "text-stone-500";
                const cardBg   = !sim ? "border-stone-200 bg-white" : sim.pct >= 80 ? "border-emerald-200 bg-emerald-50" : sim.pct >= 65 ? "border-orange-200 bg-orange-50" : "border-stone-200 bg-white";

                return (
                  <Link
                    key={person.user_id}
                    href={`/people/${person.user_id}`}
                    className={`flex items-center gap-4 rounded-2xl p-4 border transition-all group hover:shadow-sm ${cardBg}`}
                  >
                    <span className="text-stone-400 text-sm font-bold w-5 shrink-0 text-center">{i + 1}</span>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center text-white text-sm font-black shrink-0">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-stone-900 group-hover:text-orange-600 transition-colors truncate">{person.displayName}</p>
                      <p className="text-xs text-stone-400 mt-0.5 truncate">
                        {person.handle && <span>{person.handle} · </span>}
                        {person.ratedCount} films
                        {sim ? ` · ${sim.shared} in common` : ""}
                        {person.location && <span> · {person.location}</span>}
                      </p>
                    </div>
                    {person.topFilm?.poster_url && (
                      <div className="w-8 h-11 rounded-md overflow-hidden bg-stone-100 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                        <img src={person.topFilm.poster_url} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="shrink-0 text-right">
                      {sim ? (
                        <>
                          <p className={`text-2xl font-black ${simColor}`}>{sim.pct}%</p>
                          <p className="text-[10px] text-stone-400">alike</p>
                        </>
                      ) : (
                        <p className="text-xs text-stone-400 max-w-16 text-right leading-tight">Not enough overlap</p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
