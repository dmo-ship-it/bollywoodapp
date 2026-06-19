"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase-browser";
import { languageName } from "../../lib/languages";
import { getTastePercentiles } from "../../lib/taste";
import Link from "next/link";

const AGE_RANGES   = ["Under 18", "18–24", "25–34", "35–44", "45–54", "55+"];
const GENDERS      = ["Male", "Female", "Other", "Prefer not to say"];
const FREQUENCIES  = [
  { value: "daily",        label: "Every day" },
  { value: "weekly",       label: "Few times a week" },
  { value: "weekends",     label: "Weekends" },
  { value: "occasionally", label: "Occasionally" },
];
const PLATFORMS = ["Netflix", "Amazon Prime", "Disney+ Hotstar", "Zee5", "SonyLIV", "Jio Cinema", "Cinema hall", "Other"];

const LANGUAGES = [
  { code: "hi", label: "Hindi"     },
  { code: "ta", label: "Tamil"     },
  { code: "te", label: "Telugu"    },
  { code: "ml", label: "Malayalam" },
  { code: "kn", label: "Kannada"   },
  { code: "mr", label: "Marathi"   },
  { code: "bn", label: "Bengali"   },
  { code: "pa", label: "Punjabi"   },
  { code: "gu", label: "Gujarati"  },
  { code: "en", label: "English"   },
];

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

// Reusable pill button for About You tab
function SurveyPill({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "7px 16px",
        borderRadius: "var(--radius-pill)",
        border: "1.5px solid",
        borderColor: active ? "var(--brand)" : "var(--line)",
        background: active ? "var(--brand)" : "var(--sunk)",
        color: active ? "#fff" : "var(--ink-soft)",
        fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: active ? 600 : 400,
        cursor: "pointer", transition: "all 0.15s",
      }}
    >
      {children}
    </button>
  );
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
  const [surveyActors,    setSurveyActors]    = useState([]);
  const [surveyDirectors, setSurveyDirectors] = useState([]);
  const [surveyFrequency, setSurveyFrequency] = useState("");
  const [surveyLanguages, setSurveyLanguages] = useState([]);
  const [surveyPlatforms, setSurveyPlatforms] = useState([]);
  const [personQuery,     setPersonQuery]     = useState("");
  const [personResults,   setPersonResults]   = useState([]);
  const [personTarget,    setPersonTarget]    = useState("actors");
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
        setSurveyLanguages(profile.preferred_languages || []);
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
      preferred_languages: surveyLanguages.length ? surveyLanguages : null,
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
    <div className="max-w-4xl mx-auto px-4 py-16 text-center" style={{ color: "var(--ink-mute)" }}>
      Loading your taste profile…
    </div>
  );

  const completeness = computeCompleteness(profile);

  const cardStyle = { background: "var(--card)", border: "1px solid var(--line)", borderRadius: 20, boxShadow: "var(--shadow-card)" };
  const sectionLabel = { fontSize: 11, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--ink-mute)", fontWeight: 500, marginBottom: 8, display: "block" };
  const inputStyle = { width: "100%", background: "var(--sunk)", border: "1.5px solid var(--line)", borderRadius: 12, padding: "10px 14px", fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--ink)", outline: "none", boxSizing: "border-box" };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 min-h-screen" style={{ background: "var(--paper)" }}>

      {/* Header */}
      <div className="mb-6">
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 32, fontWeight: 700, color: "var(--ink)", marginBottom: 4 }}>Taste</h1>
        <p style={{ color: "var(--ink-soft)", fontSize: 14 }}>Your cinema profile and people who share it</p>
      </div>

      {/* Completeness nudge */}
      {tab !== "about" && completeness < 80 && (
        <button
          onClick={() => handleTabChange("about")}
          style={{ ...cardStyle, width: "100%", marginBottom: 24, padding: 16, display: "flex", alignItems: "center", gap: 16, textAlign: "left", cursor: "pointer" }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", marginBottom: 6, fontFamily: "var(--font-ui)" }}>Complete your taste profile</p>
            <div style={{ height: 6, background: "var(--sunk)", borderRadius: 999, overflow: "hidden" }}>
              <div style={{ height: 6, background: "var(--brand)", borderRadius: 999, width: `${completeness}%`, transition: "width 0.5s" }} />
            </div>
            <p style={{ fontSize: 12, color: "var(--ink-mute)", marginTop: 4, fontFamily: "var(--font-ui)" }}>{completeness}% complete — better data means better recommendations</p>
          </div>
          <span style={{ color: "var(--brand)", fontSize: 14, fontWeight: 600, flexShrink: 0, fontFamily: "var(--font-ui)" }}>Fill in →</span>
        </button>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, background: "var(--sunk)", borderRadius: 12, padding: 4, marginBottom: 32, width: "fit-content" }}>
        {[
          { id: "taste",  label: "Your Taste" },
          { id: "twins",  label: "Taste Twins" },
          { id: "about",  label: "About You" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => handleTabChange(t.id)}
            style={{
              padding: "8px 20px", borderRadius: 9, fontSize: 14, fontWeight: 500,
              fontFamily: "var(--font-ui)", border: "none", cursor: "pointer", transition: "all 0.15s",
              background: tab === t.id ? "var(--card)" : "transparent",
              color: tab === t.id ? "var(--ink)" : "var(--ink-soft)",
              boxShadow: tab === t.id ? "var(--shadow-card)" : "none",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Your Taste Tab ── */}
      {tab === "taste" && (
        <>
          {!taste ? (
            <div className="text-center py-20">
              <p style={{ fontFamily: "var(--font-serif)", fontSize: 20, color: "var(--ink-soft)", marginBottom: 12 }}>Rate more films to see your taste profile</p>
              <Link href="/" style={{ color: "var(--brand)", fontSize: 14, fontWeight: 600 }}>Discover films →</Link>
            </div>
          ) : (
            <>
              {/* Stat cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 32 }}>
                <div style={{ ...cardStyle, padding: 16, textAlign: "center" }}>
                  <p style={{ fontSize: 28, fontWeight: 900, color: "var(--ink)", fontFamily: "var(--font-ui)" }}>{taste.totalFilmsRated}</p>
                  <p style={{ fontSize: 11, color: "var(--ink-mute)", marginTop: 4 }}>Films Rated</p>
                </div>
                <div style={{ ...cardStyle, padding: 16, textAlign: "center" }}>
                  <p style={{ fontSize: 28, fontWeight: 900, color: "var(--brand)", fontFamily: "var(--font-ui)" }}>{taste.eraBreakdown[0]?.era || "—"}</p>
                  <p style={{ fontSize: 11, color: "var(--ink-mute)", marginTop: 4 }}>Favourite Era</p>
                </div>
                <div style={{ ...cardStyle, padding: 16, textAlign: "center" }}>
                  <p style={{ fontSize: 18, fontWeight: 900, color: "var(--ink)", fontFamily: "var(--font-ui)", lineHeight: 1.2 }}>{taste.directorAffinities[0]?.name || "—"}</p>
                  <p style={{ fontSize: 11, color: "var(--ink-mute)", marginTop: 4 }}>Top Director</p>
                </div>
                <div style={{ ...cardStyle, padding: 16, textAlign: "center" }}>
                  <p style={{ fontSize: 18, fontWeight: 900, color: "var(--ink)", fontFamily: "var(--font-ui)", lineHeight: 1.2 }}>{languageName(taste.languageBreakdown[0]?.language) || "—"}</p>
                  <p style={{ fontSize: 11, color: "var(--ink-mute)", marginTop: 4 }}>Main Language</p>
                </div>
              </div>

              {/* Era Breakdown */}
              <section style={{ ...cardStyle, padding: 24, marginBottom: 20 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)", marginBottom: 16, fontFamily: "var(--font-ui)" }}>Era Breakdown</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {taste.eraBreakdown.map((e, i) => (
                    <div key={i}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink-soft)", fontFamily: "var(--font-ui)" }}>{e.era}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--brand)", fontFamily: "var(--font-ui)" }}>{e.pct}%</span>
                      </div>
                      <div style={{ height: 8, background: "var(--sunk)", borderRadius: 999, overflow: "hidden" }}>
                        <div style={{ height: 8, background: "var(--brand)", borderRadius: 999, width: `${e.pct}%`, transition: "width 0.5s" }} />
                      </div>
                    </div>
                  ))}
                </div>
                {taste.percentiles?.topEra && (
                  <p style={{ fontSize: 12, color: "var(--brand)", fontWeight: 500, marginTop: 16, background: "rgba(225,75,51,0.06)", border: "1px solid rgba(225,75,51,0.15)", borderRadius: 10, padding: "8px 12px", fontFamily: "var(--font-ui)" }}>
                    Top {taste.percentiles.topEra.percentile}% for {taste.percentiles.topEra.era} films
                  </p>
                )}
              </section>

              {/* Genre Breakdown */}
              <section style={{ ...cardStyle, padding: 24, marginBottom: 20 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)", marginBottom: 16, fontFamily: "var(--font-ui)" }}>Genre Breakdown</h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10 }}>
                  {taste.genreBreakdown.map((g, i) => (
                    <div key={i} style={{ background: "var(--sunk)", border: "1px solid var(--line)", borderRadius: 12, padding: 12, textAlign: "center" }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", fontFamily: "var(--font-ui)" }}>{g.genre}</p>
                      <p style={{ fontSize: 20, fontWeight: 900, color: "var(--brand)", fontFamily: "var(--font-ui)" }}>{g.pct}%</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Language Breakdown */}
              <section style={{ ...cardStyle, padding: 24, marginBottom: 20 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)", marginBottom: 16, fontFamily: "var(--font-ui)" }}>Language Breakdown</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {taste.languageBreakdown.map((l, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--sunk)", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 14px" }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink-soft)", fontFamily: "var(--font-ui)" }}>{languageName(l.language)}</span>
                      <span style={{ fontWeight: 700, color: "var(--brand)", fontFamily: "var(--font-ui)" }}>{l.pct}%</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Director Affinities */}
              <section style={{ ...cardStyle, padding: 24, marginBottom: 20 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)", marginBottom: 16, fontFamily: "var(--font-ui)" }}>Director Affinities</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {taste.directorAffinities.map((d, i) => (
                    <div key={d.id} style={{ borderLeft: "3px solid var(--brand)", paddingLeft: 16, paddingTop: 4, paddingBottom: 4 }}>
                      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                        <p style={{ fontWeight: 600, color: "var(--ink)", fontFamily: "var(--font-ui)", fontSize: 14 }}>#{i + 1} {d.name}</p>
                        <span style={{ fontSize: 13, color: "var(--brand)", fontWeight: 700, fontFamily: "var(--font-ui)" }}>{d.avgRating}/5</span>
                      </div>
                      <p style={{ fontSize: 12, color: "var(--ink-mute)", marginTop: 2 }}>{d.count} film{d.count !== 1 ? "s" : ""} seen</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Actor Affinities */}
              <section style={{ ...cardStyle, padding: 24, marginBottom: 20 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)", marginBottom: 16, fontFamily: "var(--font-ui)" }}>Actor Affinities</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {taste.actorAffinities.map((a, i) => (
                    <div key={a.id} style={{ borderLeft: "3px solid var(--saffron)", paddingLeft: 16, paddingTop: 4, paddingBottom: 4 }}>
                      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                        <p style={{ fontWeight: 600, color: "var(--ink)", fontFamily: "var(--font-ui)", fontSize: 14 }}>#{i + 1} {a.name}</p>
                        <span style={{ fontSize: 13, color: "var(--saffron)", fontWeight: 700, fontFamily: "var(--font-ui)" }}>{a.avgRating}/5</span>
                      </div>
                      <p style={{ fontSize: 12, color: "var(--ink-mute)", marginTop: 2 }}>{a.count} film{a.count !== 1 ? "s" : ""} seen</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Mood & Vibe */}
              <section style={{ ...cardStyle, padding: 24, marginBottom: 20 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)", marginBottom: 16, fontFamily: "var(--font-ui)" }}>Mood & Vibe</h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 10 }}>
                  {taste.vibeBreakdown.map((v, i) => (
                    <div key={i} style={{ background: "var(--sunk)", border: "1px solid var(--line)", borderRadius: 12, padding: "12px 8px", textAlign: "center" }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-soft)", textTransform: "capitalize", marginBottom: 4, fontFamily: "var(--font-ui)" }}>{v.vibe}</p>
                      <p style={{ fontSize: 20, fontWeight: 900, color: "var(--brand)", fontFamily: "var(--font-ui)" }}>{v.pct}%</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Taste Summary */}
              <section style={{ background: "rgba(225,75,51,0.05)", border: "1px solid rgba(225,75,51,0.12)", borderRadius: 20, padding: 24, marginBottom: 24 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)", marginBottom: 10, fontFamily: "var(--font-ui)" }}>Your Taste Summary</h3>
                <p style={{ fontSize: 14, color: "var(--ink-soft)", lineHeight: 1.65, fontFamily: "var(--font-ui)" }}>
                  You're a <strong style={{ color: "var(--ink)" }}>{taste.eraBreakdown[0]?.era} enthusiast</strong> who loves <strong style={{ color: "var(--ink)" }}>{taste.genreBreakdown.slice(0, 2).map(g => g.genre).join(" and ")}</strong> films,
                  with a strong affinity for <strong style={{ color: "var(--ink)" }}>{taste.directorAffinities[0]?.name}</strong>.
                  Your taste is primarily in <strong style={{ color: "var(--ink)" }}>{languageName(taste.languageBreakdown[0]?.language)}</strong>,
                  and you gravitate toward <strong style={{ color: "var(--ink)" }}>{taste.vibeBreakdown[0]?.vibe}</strong> cinema.
                </p>
              </section>

              <div style={{ textAlign: "center", paddingBottom: 32 }}>
                <button
                  onClick={() => handleTabChange("twins")}
                  style={{
                    background: "var(--brand)", color: "#fff", fontWeight: 700,
                    padding: "12px 28px", borderRadius: "var(--radius-pill)", border: "none",
                    fontFamily: "var(--font-ui)", fontSize: 14, cursor: "pointer",
                    boxShadow: "var(--shadow-brand)",
                  }}
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
          <p style={{ color: "var(--ink-soft)", fontSize: 14, marginBottom: 24 }}>People ranked by how closely their taste matches yours</p>
          {twinsLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[1,2,3,4].map((i) => <div key={i} style={{ height: 72, borderRadius: 16, background: "var(--sunk)", animation: "pulse 1.5s ease-in-out infinite" }} />)}
            </div>
          ) : people.length === 0 ? (
            <div style={{ textAlign: "center", padding: "80px 0", color: "var(--ink-mute)" }}>
              <p style={{ fontFamily: "var(--font-serif)", fontSize: 20, color: "var(--ink-soft)", marginBottom: 6 }}>No other members yet</p>
              <p style={{ fontSize: 14 }}>Invite friends to compare taste!</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {people.map((person, i) => {
                const sim      = person.similarity;
                const initials = person.displayName.slice(0, 2).toUpperCase();
                const simColor = !sim ? "var(--ink-mute)" : sim.pct >= 80 ? "#22c55e" : sim.pct >= 65 ? "var(--brand)" : "var(--ink-mute)";
                const cardBorder = !sim ? "var(--line)" : sim.pct >= 80 ? "rgba(34,197,94,0.3)" : sim.pct >= 65 ? "rgba(225,75,51,0.25)" : "var(--line)";
                const cardBg = !sim ? "var(--card)" : sim.pct >= 80 ? "rgba(34,197,94,0.04)" : sim.pct >= 65 ? "rgba(225,75,51,0.04)" : "var(--card)";
                return (
                  <Link
                    key={person.user_id}
                    href={`/people/${person.user_id}`}
                    style={{ display: "flex", alignItems: "center", gap: 16, borderRadius: 16, padding: 16, border: `1px solid ${cardBorder}`, background: cardBg, transition: "box-shadow 0.15s", textDecoration: "none" }}
                  >
                    <span style={{ color: "var(--ink-mute)", fontSize: 13, fontWeight: 700, width: 20, flexShrink: 0, textAlign: "center" }}>{i + 1}</span>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14, fontWeight: 900, flexShrink: 0 }}>
                      {initials}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 600, fontSize: 14, color: "var(--ink)", marginBottom: 2, fontFamily: "var(--font-ui)" }}>{person.displayName}</p>
                      <p style={{ fontSize: 12, color: "var(--ink-mute)", fontFamily: "var(--font-ui)" }}>
                        {person.handle && <span>{person.handle} · </span>}
                        {person.ratedCount} films
                        {sim ? ` · ${sim.shared} in common` : ""}
                        {person.location && <span> · {person.location}</span>}
                      </p>
                    </div>
                    {person.topFilm?.poster_url && (
                      <div style={{ width: 32, height: 44, borderRadius: 6, overflow: "hidden", background: "var(--sunk)", flexShrink: 0, opacity: 0.7 }}>
                        <img src={person.topFilm.poster_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                    )}
                    <div style={{ flexShrink: 0, textAlign: "right" }}>
                      {sim ? (
                        <>
                          <p style={{ fontSize: 22, fontWeight: 900, color: simColor, fontFamily: "var(--font-ui)" }}>{sim.pct}%</p>
                          <p style={{ fontSize: 10, color: "var(--ink-mute)" }}>alike</p>
                        </>
                      ) : (
                        <p style={{ fontSize: 12, color: "var(--ink-mute)", maxWidth: 64, textAlign: "right", lineHeight: 1.3 }}>Not enough overlap</p>
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
        <div style={{ display: "flex", flexDirection: "column", gap: 20, paddingBottom: 32 }}>

          {/* Completeness bar */}
          <div style={{ ...cardStyle, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", fontFamily: "var(--font-ui)" }}>Profile completeness</p>
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--brand)", fontFamily: "var(--font-ui)" }}>{completeness}%</span>
            </div>
            <div style={{ height: 6, background: "var(--sunk)", borderRadius: 999, overflow: "hidden" }}>
              <div style={{ height: 6, background: "var(--brand)", borderRadius: 999, width: `${completeness}%`, transition: "width 0.5s" }} />
            </div>
            <p style={{ fontSize: 12, color: "var(--ink-mute)", marginTop: 8, fontFamily: "var(--font-ui)" }}>The more you share, the better your recommendations get.</p>
          </div>

          {/* Basic info */}
          <section style={{ ...cardStyle, padding: 24 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)", marginBottom: 20, fontFamily: "var(--font-ui)" }}>About you</h2>

            <div style={{ marginBottom: 20 }}>
              <span style={sectionLabel}>Age group</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {AGE_RANGES.map((r) => (
                  <SurveyPill key={r} active={surveyAge === r} onClick={() => setSurveyAge(surveyAge === r ? "" : r)}>
                    {r}
                  </SurveyPill>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <span style={sectionLabel}>Gender <span style={{ textTransform: "none", fontWeight: 400, opacity: 0.6 }}>(optional)</span></span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {GENDERS.map((g) => (
                  <SurveyPill key={g} active={surveyGender === g} onClick={() => setSurveyGender(surveyGender === g ? "" : g)}>
                    {g}
                  </SurveyPill>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <span style={sectionLabel}>Languages you watch</span>
              <p style={{ fontSize: 12, color: "var(--ink-mute)", marginBottom: 10, fontFamily: "var(--font-ui)" }}>Select in order of preference — first selected = #1.</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {LANGUAGES.map((l) => {
                  const rank = surveyLanguages.indexOf(l.code);
                  const selected = rank !== -1;
                  return (
                    <button
                      key={l.code}
                      onClick={() => setSurveyLanguages((prev) =>
                        selected ? prev.filter((c) => c !== l.code) : [...prev, l.code]
                      )}
                      style={{
                        display: "flex", alignItems: "center", gap: 6,
                        padding: "7px 14px", borderRadius: "var(--radius-pill)",
                        border: "1.5px solid", borderColor: selected ? "var(--brand)" : "var(--line)",
                        background: selected ? "var(--brand)" : "var(--sunk)",
                        color: selected ? "#fff" : "var(--ink-soft)",
                        fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: selected ? 600 : 400,
                        cursor: "pointer", transition: "all 0.15s",
                      }}
                    >
                      {selected && <span style={{ fontSize: 10, fontWeight: 700, opacity: 0.75 }}>#{rank + 1}</span>}
                      {l.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <span style={sectionLabel}>Country</span>
                <select
                  value={surveyCountry}
                  onChange={(e) => setSurveyCountry(e.target.value)}
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = "var(--brand)"}
                  onBlur={e => e.target.style.borderColor = "var(--line)"}
                >
                  <option value="">Select…</option>
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <span style={sectionLabel}>City <span style={{ textTransform: "none", fontWeight: 400, opacity: 0.6 }}>(optional)</span></span>
                <input
                  type="text"
                  value={surveyCity}
                  onChange={(e) => setSurveyCity(e.target.value)}
                  placeholder="e.g. Mumbai"
                  style={{ ...inputStyle, color: "var(--ink)" }}
                  onFocus={e => e.target.style.borderColor = "var(--brand)"}
                  onBlur={e => e.target.style.borderColor = "var(--line)"}
                />
              </div>
            </div>
          </section>

          {/* Favourite people */}
          <section style={{ ...cardStyle, padding: 24 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)", marginBottom: 4, fontFamily: "var(--font-ui)" }}>Favourite people</h2>
            <p style={{ fontSize: 12, color: "var(--ink-mute)", marginBottom: 20, fontFamily: "var(--font-ui)" }}>Search for actors, actresses, and directors you love.</p>

            {/* Actors */}
            <div style={{ marginBottom: 20 }}>
              <span style={sectionLabel}>Actors & actresses</span>
              {surveyActors.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                  {surveyActors.map((a) => (
                    <span key={a.name} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(225,75,51,0.07)", border: "1px solid rgba(225,75,51,0.2)", color: "var(--brand)", fontSize: 12, fontWeight: 500, padding: "6px 12px", borderRadius: 999, fontFamily: "var(--font-ui)" }}>
                      {a.photo_url && <img src={a.photo_url} alt="" style={{ width: 16, height: 16, borderRadius: "50%", objectFit: "cover" }} />}
                      {a.name}
                      <button onClick={() => removePerson(a.name, "actors")} style={{ color: "var(--brand)", opacity: 0.6, background: "none", border: "none", cursor: "pointer", lineHeight: 1, padding: 0 }}>×</button>
                    </span>
                  ))}
                </div>
              )}
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  value={personTarget === "actors" ? personQuery : ""}
                  onChange={(e) => { setPersonTarget("actors"); setPersonQuery(e.target.value); }}
                  onFocus={() => { setPersonTarget("actors"); personResults.length > 0 && setShowPersonDrop(true); }}
                  onBlur={() => setTimeout(() => setShowPersonDrop(false), 150)}
                  placeholder="Search actors…"
                  style={inputStyle}
                  onFocus2={e => e.target.style.borderColor = "var(--brand)"}
                />
                {showPersonDrop && personTarget === "actors" && personResults.length > 0 && (
                  <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4, background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden", zIndex: 50, boxShadow: "var(--shadow-card-elevated)" }}>
                    {personResults.map((p) => (
                      <button
                        key={p.id}
                        onMouseDown={() => addPerson(p)}
                        style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", background: "none", border: "none", borderBottom: "1px solid var(--line)", cursor: "pointer", textAlign: "left" }}
                        onMouseEnter={e => e.currentTarget.style.background = "var(--sunk)"}
                        onMouseLeave={e => e.currentTarget.style.background = "none"}
                      >
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--sunk)", overflow: "hidden", flexShrink: 0 }}>
                          {p.photo_url
                            ? <img src={p.photo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            : <div style={{ width: "100%", height: "100%", background: "var(--sunk)" }} />
                          }
                        </div>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)", fontFamily: "var(--font-ui)" }}>{p.name}</p>
                          <p style={{ fontSize: 11, color: "var(--ink-mute)", fontFamily: "var(--font-ui)" }}>{p.primary_role}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Directors */}
            <div>
              <span style={sectionLabel}>Directors</span>
              {surveyDirectors.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                  {surveyDirectors.map((d) => (
                    <span key={d.name} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(230,164,55,0.08)", border: "1px solid rgba(230,164,55,0.25)", color: "var(--saffron)", fontSize: 12, fontWeight: 500, padding: "6px 12px", borderRadius: 999, fontFamily: "var(--font-ui)" }}>
                      {d.photo_url && <img src={d.photo_url} alt="" style={{ width: 16, height: 16, borderRadius: "50%", objectFit: "cover" }} />}
                      {d.name}
                      <button onClick={() => removePerson(d.name, "directors")} style={{ color: "var(--saffron)", opacity: 0.6, background: "none", border: "none", cursor: "pointer", lineHeight: 1, padding: 0 }}>×</button>
                    </span>
                  ))}
                </div>
              )}
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  value={personTarget === "directors" ? personQuery : ""}
                  onChange={(e) => { setPersonTarget("directors"); setPersonQuery(e.target.value); }}
                  onFocus={() => { setPersonTarget("directors"); personResults.length > 0 && setShowPersonDrop(true); }}
                  onBlur={() => setTimeout(() => setShowPersonDrop(false), 150)}
                  placeholder="Search directors…"
                  style={inputStyle}
                />
                {showPersonDrop && personTarget === "directors" && personResults.length > 0 && (
                  <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4, background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden", zIndex: 50, boxShadow: "var(--shadow-card-elevated)" }}>
                    {personResults.map((p) => (
                      <button
                        key={p.id}
                        onMouseDown={() => addPerson(p)}
                        style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", background: "none", border: "none", borderBottom: "1px solid var(--line)", cursor: "pointer", textAlign: "left" }}
                        onMouseEnter={e => e.currentTarget.style.background = "var(--sunk)"}
                        onMouseLeave={e => e.currentTarget.style.background = "none"}
                      >
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--sunk)", overflow: "hidden", flexShrink: 0 }}>
                          {p.photo_url
                            ? <img src={p.photo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            : <div style={{ width: "100%", height: "100%", background: "var(--sunk)" }} />
                          }
                        </div>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)", fontFamily: "var(--font-ui)" }}>{p.name}</p>
                          <p style={{ fontSize: 11, color: "var(--ink-mute)", fontFamily: "var(--font-ui)" }}>{p.primary_role}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Watching habits */}
          <section style={{ ...cardStyle, padding: 24 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)", marginBottom: 20, fontFamily: "var(--font-ui)" }}>Watching habits</h2>

            <div style={{ marginBottom: 20 }}>
              <span style={sectionLabel}>How often do you watch films?</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {FREQUENCIES.map((f) => (
                  <SurveyPill key={f.value} active={surveyFrequency === f.value} onClick={() => setSurveyFrequency(surveyFrequency === f.value ? "" : f.value)}>
                    {f.label}
                  </SurveyPill>
                ))}
              </div>
            </div>

            <div>
              <span style={sectionLabel}>Where do you watch?</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {PLATFORMS.map((p) => (
                  <SurveyPill key={p} active={surveyPlatforms.includes(p)} onClick={() => togglePlatform(p)}>
                    {p}
                  </SurveyPill>
                ))}
              </div>
            </div>
          </section>

          {/* Save */}
          <button
            onClick={saveSurvey}
            disabled={surveySaving}
            style={{
              width: "100%", background: "var(--brand)", color: "#fff", fontWeight: 700,
              padding: "14px 20px", borderRadius: "var(--radius-pill)", border: "none",
              fontFamily: "var(--font-ui)", fontSize: 14, cursor: "pointer",
              boxShadow: "var(--shadow-brand)", opacity: surveySaving ? 0.6 : 1,
            }}
          >
            {surveySaving ? "Saving…" : surveySaved ? "Saved" : "Save changes"}
          </button>
        </div>
      )}
    </div>
  );
}
