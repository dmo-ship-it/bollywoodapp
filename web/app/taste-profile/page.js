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

export default function TasteProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState(null);
  const [taste, setTaste] = useState(null);
  const [loading, setLoading] = useState(true);

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

  if (!user) return null;
  if (loading) return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-center text-stone-400">
      <div className="text-4xl mb-4 animate-pulse">🧬</div>
      Analyzing your taste…
    </div>
  );
  if (!taste) return (
    <div className="max-w-4xl mx-auto px-4 py-20 text-center text-stone-400">
      <p className="text-4xl mb-3">🧬</p>
      <p className="text-stone-600 font-medium">Rate more films to see your taste profile</p>
      <Link href="/" className="text-orange-600 hover:underline mt-3 block">Discover films →</Link>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 bg-stone-50 min-h-screen">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-stone-900 mb-1">Your Taste Profile</h1>
        <p className="text-stone-500">What {taste.totalFilmsRated} films reveal about you</p>
      </div>

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

      {/* 1. Era Breakdown */}
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

      {/* 2. Genre Breakdown */}
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

      {/* 3. Language Breakdown */}
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

      {/* 4. Top Directors */}
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
        {taste.directorAffinities.length > 0 && (
          <p className="text-xs text-stone-400 text-center mt-4">
            You're obsessed with {taste.directorAffinities[0].name} films
          </p>
        )}
      </section>

      {/* 5. Top Actors */}
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

      {/* 6. Mood/Vibe Profile */}
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

      {/* Insights */}
      <section className="bg-gradient-to-r from-orange-50 to-rose-50 border border-orange-100 rounded-2xl p-6 mb-8">
        <h3 className="text-base font-bold text-stone-900 mb-3">🔍 Your Taste DNA</h3>
        <p className="text-sm text-stone-700 leading-relaxed">
          You're a <strong>{taste.eraBreakdown[0]?.era} enthusiast</strong> who loves <strong>{taste.genreBreakdown.slice(0, 2).map(g => g.genre).join(" and ")}</strong> films,
          with a strong affinity for <strong>{taste.directorAffinities[0]?.name}</strong>.
          Your taste is primarily in <strong>{taste.languageBreakdown[0]?.language}</strong>,
          and you gravitate toward <strong>{taste.vibeBreakdown[0]?.vibe}</strong> cinema.
        </p>
      </section>

      {/* CTA */}
      <div className="flex gap-3 justify-center pb-8">
        <Link href="/taste-discovery" className="bg-orange-600 text-white font-bold px-6 py-3 rounded-full hover:bg-orange-500 transition-colors">
          Discover Films For Your Taste →
        </Link>
        <Link href="/profile" className="bg-white text-stone-900 font-bold px-6 py-3 rounded-full border border-stone-200 hover:bg-stone-50 transition-colors">
          Back to Profile
        </Link>
      </div>
    </div>
  );
}
