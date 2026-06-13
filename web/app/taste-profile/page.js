"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase-browser";
import { languageName } from "../../lib/languages";
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

const AGE_RANGES   = ["Under 18", "18–24", "25–34", "35–44", "45–54", "55+"];
const GENDERS      = ["Male", "Female", "Other", "Prefer not to say"];
const FREQUENCIES  = [
  { value: "daily",        label: "Every day" },
  { value: "weekly",       label: "Few times a week" },
  { value: "weekends",     label: "Weekends" },
  { value: "occasionally", label: "Occasionally" },
];
const PLATFORMS = ["Netflix", "Amazon Prime", "Disney+ Hotstar", "Zee5", "SonyLIV", "Jio Cinema", "Cinema hall", "Other"];

const COUNTRIES = [
  { code: "IN", label: "India" },
  { code: "US", label: "United States" },
  { code: "GB", label: "United Kingdom" },
  { code: "CA", label: "Canada" },
  { code: "AU", label: "Australia" },
  { code: "AE", label: "UAE" },
  { code: "SG", label: "Singapore" },
  { code: "NZ", label: "New Zealand" },
  { code: "ZA", label: "South Africa" },
  { code: "MY", label: "Malaysia" },
  { code: "PK", label: "Pakistan" },
  { code: "BD", label: "Bangladesh" },
  { code: "LK", label: "Sri Lanka" },
  { code: "NP", label: "Nepal" },
  { code: "QA", label: "Qatar" },
  { code: "OTHER", label: "Other" },
];

function computeSimilarity(myScores, theirScores) {
  const shared = Object.keys(myScores).filter((id) => theirScores[id] != null);
  if (shared.length < 3) return null;
  const avg = shared.reduce((sum, id) => sum + (1 - Math.abs(myScores[id] - theirScores[id]) / 100), 0) / shared.length;
  return { pct: Math.round(avg * 100), shared: shared.length };
}

function computeCompleteness(profile) {
  const checks = [
    !!(profile?.country),
    !!(profile?.age_range),
    !!(profile?.preferred_languages?.length),
    !!(profile?.favorite_actors?.length),
    !!(profile?.watching_frequency),
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export default function TasteProfilePage() {
  const router   = useRouter();
  const supabase = createClient();

  const [tab,          setTab]          = useState("taste");
  const [user,         setUser]         = useState(null);
  const [taste,        setTaste]        = useState(null);
  const [profile,      setProfile]      = useState(null);
  const [people,       setPeople]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [twinsLoading, setTwinsLoading] = useState(false);

  // About You form state
  const [surveyAge,       setSurveyAge]       = useState("");
  const [surveyGender,    setSurveyGender]    = useState("");
  const [surveyCountry,   setSurveyCountry]   = useState("");
  const [surveyCity,      setSurveyCity]      = useState("");
  const [surveyActors,    setSurveyActors]    = useState([]); // [{id, name, photo_url}]
  const [surveyDirectors, setSurveyDirectors] = useState([]);
  const [surveyFrequency, setSurveyFrequency] = useState("");
  const [surveyPlatforms, setSurveyPlatforms] = useState([]);
  const [personQuery,     setPersonQuery]     = useState("");
  const [personResults,   setPersonResults]   = useState([]);
  const [personTarget,    setPersonTarget]    = useState("actors"); // "actors" | "directors"
  const [showPersonDrop,  setShowPersonDrop]  = useState(false);
  const [surveySaving,    setSurveySaving]    = useState(false);
  const [surveySaved,     setSurveySaved]     = useState(false);

  const personDebounceRef = useRef(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUser(user);

      const [profile, tasteProfile] = await Promise.all([
        supabase.from("user_profiles").select("*").eq("user_id", user.id).single().then(r => r.data),
        getTastePercentiles(user.id),
      ]);

      setTaste(tasteProfile);
      setProfile(profile);

      if (profile) {
        setSurveyAge(profile.age_range || "");
        setSurveyGender(profile.gender || "");
        setSurveyCountry(profile.country || "");
        setSurveyCity(profile.city || "");
        setSurveyFrequency(profile.watching_frequency || "");
        setSurveyPlatforms(profile.preferred_platforms || []);
        if (profile.favorite_actors?.length)
          setSurveyActors(profile.favorite_actors.map((name) => ({ name })));
        if (profile.favorite_directors?.length)
          setSurveyDirectors(profile.favorite_directors.map((name) => ({ name })));
      }

      setLoading(false);
    }
    load();
  }, []);

  // Debounced people search
  useEffect(() => {
    if (personQuery.length < 2) { setPersonResults([]); setShowPersonDrop(false); return; }
    clearTimeout(personDebounceRef.current);
    personDebounceRef.current = setTimeout(async () => {
      const role = personTarget === "directors" ? "Director" : "Actor";
      const { data } = await supabase
        .from("people")
        .select("id, name, photo_url, primary_role")
        .ilike("name", `%${personQuery}%`)
        .or(`primary_role.eq.${role},primary_role.eq.Actress`)
        .order("name")
        .limit(8);
      setPersonResults(data ?? []);
      setShowPersonDrop(true);
    }, 150);
  }, [personQuery, personTarget]);

  async function loadTwins() {
    if (people.length > 0) return;
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

  function addPerson(person) {
    if (personTarget === "actors") {
      if (!surveyActors.find((a) => a.name === person.name))
        setSurveyActors((prev) => [...prev, { id: person.id, name: person.name, photo_url: person.photo_url }]);
    } else {
      if (!surveyDirectors.find((d) => d.name === person.name))
        setSurveyDirectors((prev) => [...prev, { id: person.id, name: person.name, photo_url: person.photo_url }]);
    }
    setPersonQuery("");
    setPersonResults([]);
    setShowPersonDrop(false);
  }

  function removePerson(name, target) {
    if (target === "actors") setSurveyActors((prev) => prev.filter((a) => a.name !== name));
    else setSurveyDirectors((prev) => prev.filter((d) => d.name !== name));
  }

  function togglePlatform(p) {
    setSurveyPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  }

  async function saveSurvey() {
    if (!user) return;
    setSurveySaving(true);
    await supabase.from("user_profiles").upsert({
      user_id:             user.id,
      age_range:           surveyAge || null,
      gender:              surveyGender || null,
      country:             surveyCountry || null,
      city:                surveyCity.trim() || null,
      favorite_actors:     surveyActors.length  ? surveyActors.map((a) => a.name)  : null,
      favorite_directors:  surveyDirectors.length ? surveyDirectors.map((d) => d.name) : null,
      watching_frequency:  surveyFrequency || null,
      preferred_platforms: surveyPlatforms.length ? surveyPlatforms : null,
    }, { onConflict: "user_id" });
    const { data } = await supabase.from("user_profiles").select("*").eq("user_id", user.id).single();
    setProfile(data);
    setSurveySaving(false);
    setSurveySaved(true);
    setTimeout(() => setSurveySaved(false), 2500);
  }

  if (!user) return null;
  if (loading) return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-center text-stone-400">
      Loading your taste profile…
    </div>
  );

  const completeness = computeCompleteness(profile);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 bg-stone-50 min-h-screen">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-black text-stone-900 mb-1">Taste</h1>
        <p className="text-stone-500 text-sm">Your cinema profile and people who share it</p>
      </div>

      {/* Completeness nudge — shown if < 80% and not on the about tab */}
      {tab !== "about" && completeness < 80 && (
        <button
          onClick={() => handleTabChange("about")}
          className="w-full mb-6 bg-white border border-stone-200 rounded-2xl p-4 flex items-center gap-4 hover:border-orange-300 hover:shadow-sm transition-all text-left shadow-sm"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-stone-900 mb-1">Complete your taste profile</p>
            <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
              <div className="h-1.5 bg-orange-500 rounded-full transition-all duration-500" style={{ width: `${completeness}%` }} />
            </div>
            <p className="text-xs text-stone-400 mt-1">{completeness}% complete — better data means better recommendations</p>
          </div>
          <span className="text-orange-600 text-sm font-semibold shrink-0">Fill in →</span>
        </button>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-stone-100 rounded-xl p-1 mb-8 w-fit">
        {[
          { id: "taste",  label: "Your Taste" },
          { id: "twins",  label: "Taste Twins" },
          { id: "about",  label: "About You" },
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
              <p className="text-4xl mb-3">🎬</p>
              <p className="text-stone-600 font-medium">Rate more films to see your taste profile</p>
              <Link href="/" className="text-orange-600 hover:underline mt-3 block">Discover films →</Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                <div className="bg-white border border-stone-200 rounded-2xl p-4 text-center shadow-sm">
                  <p className="text-3xl font-black text-stone-900">{taste.totalFilmsRated}</p>
                  <p className="text-xs text-stone-400 mt-1">Films Rated</p>
                </div>
                <div className="bg-white border border-stone-200 rounded-2xl p-4 text-center shadow-sm">
                  <p className="text-3xl font-black text-orange-600">{taste.eraBreakdown[0]?.era || "—"}</p>
                  <p className="text-xs text-stone-400 mt-1">Favourite Era</p>
                </div>
                <div className="bg-white border border-stone-200 rounded-2xl p-4 text-center shadow-sm">
                  <p className="text-3xl font-black text-stone-900">{taste.directorAffinities[0]?.name || "—"}</p>
                  <p className="text-xs text-stone-400 mt-1">Top Director</p>
                </div>
                <div className="bg-white border border-stone-200 rounded-2xl p-4 text-center shadow-sm">
                  <p className="text-3xl font-black text-stone-900">{languageName(taste.languageBreakdown[0]?.language) || "—"}</p>
                  <p className="text-xs text-stone-400 mt-1">Main Language</p>
                </div>
              </div>

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

              <section className="bg-white border border-stone-200 rounded-2xl p-6 mb-6 shadow-sm">
                <h2 className="text-lg font-bold text-stone-900 mb-4">🗣️ Language Breakdown</h2>
                <div className="space-y-2">
                  {taste.languageBreakdown.map((l, i) => (
                    <div key={i} className="flex items-center justify-between bg-stone-50 border border-stone-200 rounded-lg p-3">
                      <span className="text-sm font-medium text-stone-700">{languageName(l.language)}</span>
                      <span className="font-bold text-orange-600">{l.pct}%</span>
                    </div>
                  ))}
                </div>
              </section>

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

              <section className="bg-orange-50 border border-orange-100 rounded-2xl p-6 mb-6">
                <h3 className="text-base font-bold text-stone-900 mb-3">Your Taste Summary</h3>
                <p className="text-sm text-stone-700 leading-relaxed">
                  You're a <strong>{taste.eraBreakdown[0]?.era} enthusiast</strong> who loves <strong>{taste.genreBreakdown.slice(0, 2).map(g => g.genre).join(" and ")}</strong> films,
                  with a strong affinity for <strong>{taste.directorAffinities[0]?.name}</strong>.
                  Your taste is primarily in <strong>{languageName(taste.languageBreakdown[0]?.language)}</strong>,
                  and you gravitate toward <strong>{taste.vibeBreakdown[0]?.vibe}</strong> cinema.
                </p>
              </section>

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

      {/* ── About You Tab ── */}
      {tab === "about" && (
        <div className="space-y-6 pb-8">

          {/* Completeness bar */}
          <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-stone-900">Profile completeness</p>
              <span className="text-sm font-bold text-orange-600">{completeness}%</span>
            </div>
            <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
              <div className="h-2 bg-orange-500 rounded-full transition-all duration-500" style={{ width: `${completeness}%` }} />
            </div>
            <p className="text-xs text-stone-400 mt-2">The more you share, the better your recommendations get.</p>
          </div>

          {/* Basic info */}
          <section className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-base font-bold text-stone-900 mb-4">About you</h2>

            <div className="mb-5">
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-widest mb-2">Age group</p>
              <div className="flex flex-wrap gap-2">
                {AGE_RANGES.map((r) => (
                  <button
                    key={r}
                    onClick={() => setSurveyAge(surveyAge === r ? "" : r)}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                      surveyAge === r
                        ? "border-orange-400 bg-orange-50 text-orange-700"
                        : "border-stone-200 bg-stone-50 text-stone-600 hover:border-stone-300"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-5">
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-widest mb-2">
                Gender <span className="text-stone-300 normal-case font-normal">(optional)</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {GENDERS.map((g) => (
                  <button
                    key={g}
                    onClick={() => setSurveyGender(surveyGender === g ? "" : g)}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                      surveyGender === g
                        ? "border-orange-400 bg-orange-50 text-orange-700"
                        : "border-stone-200 bg-stone-50 text-stone-600 hover:border-stone-300"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-widest mb-2">Country</p>
                <select
                  value={surveyCountry}
                  onChange={(e) => setSurveyCountry(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-900 focus:outline-none focus:border-orange-400 transition-colors"
                >
                  <option value="">Select…</option>
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-widest mb-2">
                  City <span className="text-stone-300 normal-case font-normal">(optional)</span>
                </p>
                <input
                  type="text"
                  value={surveyCity}
                  onChange={(e) => setSurveyCity(e.target.value)}
                  placeholder="e.g. Mumbai"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:border-orange-400 transition-colors"
                />
              </div>
            </div>
          </section>

          {/* Favourite people */}
          <section className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-base font-bold text-stone-900 mb-1">Favourite people</h2>
            <p className="text-xs text-stone-400 mb-4">Search for actors, actresses, and directors you love.</p>

            {/* Actors */}
            <div className="mb-5">
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-widest mb-2">Actors & actresses</p>
              {surveyActors.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {surveyActors.map((a) => (
                    <span key={a.name} className="inline-flex items-center gap-1.5 bg-orange-50 border border-orange-200 text-orange-800 text-xs font-medium px-3 py-1.5 rounded-full">
                      {a.photo_url && <img src={a.photo_url} alt="" className="w-4 h-4 rounded-full object-cover" />}
                      {a.name}
                      <button onClick={() => removePerson(a.name, "actors")} className="text-orange-400 hover:text-orange-700 leading-none ml-0.5">×</button>
                    </span>
                  ))}
                </div>
              )}
              <div className="relative">
                <input
                  type="text"
                  value={personTarget === "actors" ? personQuery : ""}
                  onChange={(e) => { setPersonTarget("actors"); setPersonQuery(e.target.value); }}
                  onFocus={() => { setPersonTarget("actors"); personResults.length > 0 && setShowPersonDrop(true); }}
                  onBlur={() => setTimeout(() => setShowPersonDrop(false), 150)}
                  placeholder="Search actors…"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:border-orange-400 transition-colors"
                />
                {showPersonDrop && personTarget === "actors" && personResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-stone-200 rounded-xl overflow-hidden z-50 shadow-lg">
                    {personResults.map((p) => (
                      <button
                        key={p.id}
                        onMouseDown={() => addPerson(p)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-stone-50 transition-colors text-left"
                      >
                        <div className="w-7 h-7 rounded-full bg-stone-100 overflow-hidden shrink-0">
                          {p.photo_url
                            ? <img src={p.photo_url} alt="" className="w-full h-full object-cover" />
                            : <span className="w-full h-full flex items-center justify-center text-xs">👤</span>
                          }
                        </div>
                        <div>
                          <p className="text-sm font-medium text-stone-900">{p.name}</p>
                          <p className="text-xs text-stone-400">{p.primary_role}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Directors */}
            <div>
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-widest mb-2">Directors</p>
              {surveyDirectors.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {surveyDirectors.map((d) => (
                    <span key={d.name} className="inline-flex items-center gap-1.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium px-3 py-1.5 rounded-full">
                      {d.photo_url && <img src={d.photo_url} alt="" className="w-4 h-4 rounded-full object-cover" />}
                      {d.name}
                      <button onClick={() => removePerson(d.name, "directors")} className="text-rose-400 hover:text-rose-700 leading-none ml-0.5">×</button>
                    </span>
                  ))}
                </div>
              )}
              <div className="relative">
                <input
                  type="text"
                  value={personTarget === "directors" ? personQuery : ""}
                  onChange={(e) => { setPersonTarget("directors"); setPersonQuery(e.target.value); }}
                  onFocus={() => { setPersonTarget("directors"); personResults.length > 0 && setShowPersonDrop(true); }}
                  onBlur={() => setTimeout(() => setShowPersonDrop(false), 150)}
                  placeholder="Search directors…"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:border-orange-400 transition-colors"
                />
                {showPersonDrop && personTarget === "directors" && personResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-stone-200 rounded-xl overflow-hidden z-50 shadow-lg">
                    {personResults.map((p) => (
                      <button
                        key={p.id}
                        onMouseDown={() => addPerson(p)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-stone-50 transition-colors text-left"
                      >
                        <div className="w-7 h-7 rounded-full bg-stone-100 overflow-hidden shrink-0">
                          {p.photo_url
                            ? <img src={p.photo_url} alt="" className="w-full h-full object-cover" />
                            : <span className="w-full h-full flex items-center justify-center text-xs">👤</span>
                          }
                        </div>
                        <div>
                          <p className="text-sm font-medium text-stone-900">{p.name}</p>
                          <p className="text-xs text-stone-400">{p.primary_role}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Watching habits */}
          <section className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-base font-bold text-stone-900 mb-4">Watching habits</h2>

            <div className="mb-5">
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-widest mb-2">How often do you watch films?</p>
              <div className="flex flex-wrap gap-2">
                {FREQUENCIES.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setSurveyFrequency(surveyFrequency === f.value ? "" : f.value)}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                      surveyFrequency === f.value
                        ? "border-orange-400 bg-orange-50 text-orange-700"
                        : "border-stone-200 bg-stone-50 text-stone-600 hover:border-stone-300"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-widest mb-2">Where do you watch?</p>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map((p) => (
                  <button
                    key={p}
                    onClick={() => togglePlatform(p)}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                      surveyPlatforms.includes(p)
                        ? "border-orange-400 bg-orange-50 text-orange-700"
                        : "border-stone-200 bg-stone-50 text-stone-600 hover:border-stone-300"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Save */}
          <button
            onClick={saveSurvey}
            disabled={surveySaving}
            className="w-full bg-orange-600 text-white font-bold py-3.5 rounded-full hover:bg-orange-500 transition-colors text-sm disabled:opacity-50 shadow-sm"
          >
            {surveySaving ? "Saving…" : surveySaved ? "Saved ✓" : "Save changes"}
          </button>
        </div>
      )}
    </div>
  );
}
