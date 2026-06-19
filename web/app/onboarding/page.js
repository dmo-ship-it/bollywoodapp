"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase-browser";

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
  { code: "KW", label: "Kuwait" },
  { code: "BH", label: "Bahrain" },
  { code: "OM", label: "Oman" },
  { code: "DE", label: "Germany" },
  { code: "NL", label: "Netherlands" },
  { code: "FR", label: "France" },
  { code: "IT", label: "Italy" },
  { code: "SE", label: "Sweden" },
  { code: "NO", label: "Norway" },
  { code: "IE", label: "Ireland" },
  { code: "JP", label: "Japan" },
  { code: "OTHER", label: "Other" },
];

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
];

const RATINGS = [
  { emoji: "❤️", label: "Loved",       value: 5 },
  { emoji: "👍", label: "Liked",       value: 4 },
  { emoji: "😐", label: "Okay",        value: 3 },
  { emoji: "👎", label: "Didn't like", value: 2 },
  { emoji: "💔", label: "Hated",       value: 1 },
];

const INITIAL_SCORES = { 5: 90, 4: 70, 3: 50, 2: 30, 1: 10 };
const BUCKET_RANGES  = { 5: [80, 100], 4: [60, 79], 3: [40, 59], 2: [20, 39], 1: [0, 19] };

const AVATAR_GRADIENTS = [
  "from-amber-400 to-orange-500",
  "from-purple-500 to-pink-500",
  "from-blue-500 to-cyan-500",
  "from-emerald-500 to-teal-500",
  "from-rose-500 to-pink-600",
  "from-indigo-500 to-purple-500",
];

const ALL_DECADE_BUCKETS = [
  { min: 1900, max: 1979, limit: 8  },
  { min: 1980, max: 1989, limit: 8  },
  { min: 1990, max: 1999, limit: 10 },
  { min: 2000, max: 2009, limit: 10 },
  { min: 2010, max: 2019, limit: 12 },
  { min: 2020, max: 2030, limit: 8  },
];

function avatarGradient(userId = "") {
  const n = userId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_GRADIENTS[n % AVATAR_GRADIENTS.length];
}

function buildDNA(selected) {
  const rated = selected.filter((s) => s.rating > 0);
  const avg   = rated.length ? rated.reduce((s, r) => s + r.rating, 0) / rated.length : 0;
  const arcs  = [];
  if (avg >= 4)
    arcs.push({ label: "Cinephile",        pct: 35, icon: "🎬" });
  if (rated.some((r) => r.movie.genres?.includes("Action")))
    arcs.push({ label: "Mass Action Fan",  pct: 30, icon: "🔥" });
  if (rated.some((r) => r.movie.genres?.includes("Romance")))
    arcs.push({ label: "Romance Lover",    pct: 25, icon: "💑" });
  if (rated.some((r) => r.movie.genres?.includes("Drama")))
    arcs.push({ label: "Drama Seeker",     pct: 20, icon: "🎭" });
  arcs.push(    { label: "Hidden Gem Hunter", pct: 15, icon: "💎" });
  return arcs.slice(0, 4);
}

function generatePairs(selected) {
  const buckets = {};
  selected.filter((s) => s.rating != null).forEach((s) => {
    if (!buckets[s.rating]) buckets[s.rating] = [];
    buckets[s.rating].push(s.movie);
  });
  const pairs = [];
  Object.values(buckets).forEach((movies) => {
    for (let i = 0; i < movies.length - 1; i++) {
      pairs.push([movies[i], movies[i + 1]]);
    }
  });
  return pairs;
}

function computeScores(selected, compResults) {
  const buckets = {};
  selected.filter((s) => s.rating != null).forEach((s) => {
    if (!buckets[s.rating]) buckets[s.rating] = [];
    buckets[s.rating].push({ id: s.movie.id, rating: s.rating, wins: 0 });
  });

  compResults.forEach(({ winnerId }) => {
    Object.values(buckets).forEach((bucket) => {
      const m = bucket.find((b) => b.id === winnerId);
      if (m) m.wins++;
    });
  });

  const scores = {};
  Object.entries(buckets).forEach(([rating, movies]) => {
    const [min, max] = BUCKET_RANGES[Number(rating)];
    const sorted = [...movies].sort((a, b) => b.wins - a.wins);
    sorted.forEach((m, i) => {
      scores[m.id] = sorted.length === 1
        ? INITIAL_SCORES[Number(rating)]
        : Math.round(max - (i / (sorted.length - 1)) * (max - min));
    });
  });
  return scores;
}

export default function OnboardingPage() {
  const router   = useRouter();
  const supabase = createClient();

  const [step,            setStep]            = useState(0);
  const [user,            setUser]            = useState(null);
  // Step 0: Identity
  const [displayName,     setDisplayName]     = useState("");
  const [username,        setUsername]        = useState("");
  // Step 1: Location
  const [country,         setCountry]         = useState("");
  const [city,            setCity]            = useState("");
  const [countrySearch,   setCountrySearch]   = useState("");
  const [showCountryDrop, setShowCountryDrop] = useState(false);
  // Step 2: Languages
  const [languageRanking, setLanguageRanking] = useState([]);
  // Step 3: Selection grid
  const [gridMovies,      setGridMovies]      = useState([]);
  const [gridLoading,     setGridLoading]     = useState(false);
  const [selected,        setSelected]        = useState(new Set());
  // Step 4: Rating
  const [ratedFilms,      setRatedFilms]      = useState([]);
  // Step 5: Compare
  const [pairs,           setPairs]           = useState([]);
  const [pairIdx,         setPairIdx]         = useState(0);
  const [compResults,     setCompResults]     = useState([]);
  const [saving,          setSaving]          = useState(false);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      setUser(user);

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("onboarding_complete, display_name, username")
        .eq("user_id", user.id)
        .single();

      if (profile?.onboarding_complete) { router.replace("/"); return; }

      const meta = user.user_metadata || {};
      const nameFromMeta = meta.full_name || meta.name || "";
      const nameFromEmail = user.email?.split("@")[0] ?? "";
      const defaultName = profile?.display_name || nameFromMeta || nameFromEmail;
      const defaultUsername = profile?.username ||
        (nameFromMeta || nameFromEmail).toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20);

      setDisplayName(defaultName);
      setUsername(defaultUsername);
    }
    init();
  }, []);

  async function fetchStratified(buckets, langCodes) {
    const results = await Promise.all(
      buckets.map(({ min, max, limit }) => {
        let q = supabase
          .from("movies")
          .select("id, title, year, poster_url, genres")
          .gte("year", min)
          .lte("year", max)
          .gte("tmdb_rating", 6.5)
          .order("tmdb_rating", { ascending: false })
          .limit(limit);
        if (langCodes.length > 0) q = q.in("language", langCodes);
        return q;
      })
    );
    return results.flatMap(r => r.data ?? []);
  }

  function handleIdentityContinue() { setStep(1); }
  function handleLocationContinue() { setStep(2); }

  async function handleLanguageContinue() {
    setStep(3);
    setGridLoading(true);
    let movies = await fetchStratified(ALL_DECADE_BUCKETS, languageRanking);
    if (movies.length < 20) {
      movies = await fetchStratified(ALL_DECADE_BUCKETS, []);
    }
    movies.sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
    setGridMovies(movies);
    setGridLoading(false);
  }

  function handleGridContinue() {
    const selectedMovies = gridMovies.filter(m => selected.has(m.id));
    setRatedFilms(selectedMovies.map(m => ({ movie: m, rating: null })));
    setStep(4);
  }

  function setRating(movieId, rating) {
    setRatedFilms(prev => prev.map(s => s.movie.id === movieId ? { ...s, rating } : s));
  }

  function handleRatingContinue() {
    const rated = ratedFilms.filter(s => s.rating != null);
    const p = generatePairs(rated);
    if (p.length > 0) {
      setPairs(p);
      setStep(5);
    } else {
      handleFinish(rated, []);
    }
  }

  function handleCompare(winnerId, currentCompResults) {
    const updatedCompResults = winnerId != null
      ? [...currentCompResults, { winnerId, loserId: pairs[pairIdx].find((m) => m.id !== winnerId)?.id }]
      : currentCompResults;

    if (pairIdx < pairs.length - 1) {
      setCompResults(updatedCompResults);
      setPairIdx(i => i + 1);
    } else {
      handleFinish(ratedFilms, updatedCompResults);
    }
  }

  async function handleFinish(sel = ratedFilms, cr = compResults) {
    setSaving(true);
    const currentUser = user || (await supabase.auth.getUser()).data.user;
    if (currentUser) {
      const scores    = computeScores(sel, cr);
      const reactions = sel
        .filter((s) => s.rating != null)
        .map((s) => ({
          user_id:  currentUser.id,
          movie_id: s.movie.id,
          rating:   s.rating,
          score:    scores[s.movie.id] ?? INITIAL_SCORES[s.rating],
        }));
      if (reactions.length) {
        const { error: reactErr } = await supabase
          .from("user_reactions")
          .upsert(reactions, { onConflict: "user_id,movie_id" });
        if (reactErr) console.error("user_reactions upsert failed:", reactErr);
      }

      const { error: profileErr } = await supabase.from("user_profiles").upsert(
        {
          user_id:             currentUser.id,
          display_name:        displayName.trim() || null,
          username:            username.trim().toLowerCase() || null,
          dna:                 buildDNA(sel),
          onboarding_complete: true,
          email:               currentUser.email,
          country:             country || null,
          city:                city.trim() || null,
        },
        { onConflict: "user_id" }
      );
      if (profileErr) console.error("user_profiles core upsert failed:", profileErr);

      const meta = currentUser.user_metadata || {};
      await supabase.from("user_profiles").upsert(
        {
          user_id:             currentUser.id,
          full_name:           meta.full_name || meta.name || displayName.trim() || null,
          profile_picture_url: meta.avatar_url || meta.picture || null,
          preferred_languages: languageRanking.length > 0 ? languageRanking : null,
        },
        { onConflict: "user_id" }
      );
    }
    router.push("/");
  }

  // ── Step 0: Identity ──
  if (step === 0) {
    const initials  = displayName.slice(0, 2).toUpperCase() || "?";
    const gradient  = user ? avatarGradient(user.id) : "from-amber-400 to-orange-500";
    const canContinue = displayName.trim().length >= 2 && username.trim().length >= 2;

    return (
      <div className="max-w-lg mx-auto px-4 py-10">
        <div className="mb-6">
          <p className="text-orange-500 text-xs font-semibold uppercase tracking-widest mb-2">Step 1 of 4</p>
          <h1 className="text-2xl font-black text-stone-900 mb-1">Create your profile</h1>
          <p className="text-stone-500 text-sm">How you'll appear to others on Bolly</p>
        </div>

        <div className="flex justify-center mb-8">
          <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-2xl font-black select-none`}>
            {initials}
          </div>
        </div>

        <div className="space-y-4 mb-8">
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-widest mb-2">
              Display name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="How you want to be known"
              maxLength={32}
              className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-stone-900 placeholder-stone-400 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all shadow-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-widest mb-2">
              Username
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 text-sm select-none">@</span>
              <input
                type="text"
                value={username}
                onChange={(e) =>
                  setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
                }
                placeholder="yourhandle"
                maxLength={20}
                className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 pl-8 text-stone-900 placeholder-stone-400 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all shadow-sm"
              />
            </div>
            <p className="text-[10px] text-stone-400 mt-1.5">Letters, numbers and underscores only</p>
          </div>
        </div>

        <button
          onClick={handleIdentityContinue}
          disabled={!canContinue}
          className="w-full bg-orange-600 text-white font-bold py-3.5 rounded-full hover:bg-orange-500 transition-colors text-sm disabled:opacity-40 shadow-sm"
        >
          Continue →
        </button>
      </div>
    );
  }

  // ── Step 1: Location ──
  if (step === 1) {
    const filteredCountries = countrySearch.trim()
      ? COUNTRIES.filter((c) => c.label.toLowerCase().includes(countrySearch.toLowerCase()))
      : COUNTRIES;
    const selectedCountryLabel = COUNTRIES.find((c) => c.code === country)?.label;

    return (
      <div className="max-w-lg mx-auto px-4 py-10">
        <div className="mb-6">
          <p className="text-orange-500 text-xs font-semibold uppercase tracking-widest mb-2">Step 2 of 4</p>
          <h1 className="text-2xl font-black text-stone-900 mb-1">Where are you based?</h1>
          <p className="text-stone-500 text-sm">Helps us surface locally relevant films and showtimes.</p>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-semibold text-stone-500 uppercase tracking-widest mb-2">Country</label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowCountryDrop((v) => !v)}
              className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-left flex items-center justify-between shadow-sm hover:border-stone-300 transition-colors"
            >
              <span className={selectedCountryLabel ? "text-stone-900 font-medium" : "text-stone-400"}>
                {selectedCountryLabel || "Select your country"}
              </span>
              <span className="text-stone-400 text-xs">▾</span>
            </button>

            {showCountryDrop && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-stone-200 rounded-xl overflow-hidden z-50 shadow-lg">
                <div className="p-2 border-b border-stone-100">
                  <input
                    autoFocus
                    type="text"
                    value={countrySearch}
                    onChange={(e) => setCountrySearch(e.target.value)}
                    placeholder="Search…"
                    className="w-full bg-stone-50 rounded-lg px-3 py-2 text-sm text-stone-900 placeholder-stone-400 focus:outline-none"
                  />
                </div>
                <div className="max-h-52 overflow-y-auto">
                  {filteredCountries.map((c) => (
                    <button
                      key={c.code}
                      onMouseDown={() => {
                        setCountry(c.code);
                        setCountrySearch("");
                        setShowCountryDrop(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-stone-50 transition-colors ${
                        country === c.code ? "text-orange-600 font-semibold" : "text-stone-700"
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mb-8">
          <label className="block text-xs font-semibold text-stone-500 uppercase tracking-widest mb-2">
            City <span className="text-stone-300 normal-case font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="e.g. Mumbai, London, Toronto…"
            className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-stone-900 placeholder-stone-400 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all shadow-sm"
          />
        </div>

        <button
          onClick={handleLocationContinue}
          disabled={!country}
          className="w-full bg-orange-600 text-white font-bold py-3.5 rounded-full hover:bg-orange-500 transition-colors text-sm disabled:opacity-40 shadow-sm"
        >
          Continue →
        </button>

        <button
          onClick={handleLocationContinue}
          className="w-full mt-3 text-stone-400 text-xs hover:text-stone-600 transition-colors"
        >
          Skip for now
        </button>
      </div>
    );
  }

  // ── Step 2: Language Ranking ──
  if (step === 2) {
    const toggleLanguage = (code) => {
      setLanguageRanking((prev) =>
        prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
      );
    };

    return (
      <div className="max-w-lg mx-auto px-4 py-10">
        <div className="mb-6">
          <p className="text-orange-500 text-xs font-semibold uppercase tracking-widest mb-2">Step 3 of 4</p>
          <h1 className="text-2xl font-black text-stone-900 mb-1">Which languages do you watch most?</h1>
          <p className="text-stone-500 text-sm">Select in order — most-watched first. We'll show those films at the top of your feed.</p>
        </div>

        {languageRanking.length > 0 && (
          <div className="mb-6 p-4 bg-white border border-stone-200 rounded-2xl shadow-sm">
            <p className="text-xs text-stone-400 mb-3 uppercase tracking-widest font-medium">Your order</p>
            <div className="space-y-2">
              {languageRanking.map((code, idx) => {
                const lang = LANGUAGES.find((l) => l.code === code);
                return (
                  <div key={code} className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-orange-500 text-white text-xs font-black flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-sm font-semibold text-stone-800">{lang?.label}</span>
                    <button
                      onClick={() => toggleLanguage(code)}
                      className="ml-auto text-stone-400 hover:text-stone-600 text-lg leading-none transition-colors"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 mb-8">
          {LANGUAGES.map((lang) => {
            const rank = languageRanking.indexOf(lang.code);
            const isSelected = rank !== -1;
            return (
              <button
                key={lang.code}
                onClick={() => toggleLanguage(lang.code)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                  isSelected
                    ? "border-orange-400 bg-orange-50 text-stone-900"
                    : "border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:text-stone-900"
                }`}
              >
                <span className="text-sm font-semibold">{lang.label}</span>
                {isSelected && (
                  <span className="ml-auto w-5 h-5 rounded-full bg-orange-500 text-white text-xs font-black flex items-center justify-center shrink-0">
                    {rank + 1}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={handleLanguageContinue}
          disabled={languageRanking.length === 0}
          className="w-full bg-orange-600 text-white font-bold py-3.5 rounded-full hover:bg-orange-500 transition-colors text-sm disabled:opacity-40 shadow-sm"
        >
          {languageRanking.length > 0
            ? `Continue with ${languageRanking.length} language${languageRanking.length !== 1 ? "s" : ""} →`
            : "Select at least one language"}
        </button>

        <button
          onClick={handleLanguageContinue}
          className="w-full mt-3 text-stone-400 text-xs hover:text-stone-600 transition-colors"
        >
          Skip for now
        </button>
      </div>
    );
  }

  // ── Step 3: Selection Grid ──
  if (step === 3) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-10 pb-36">
        <div className="mb-6">
          <p className="text-orange-500 text-xs font-semibold uppercase tracking-widest mb-2">Step 4 of 4</p>
          <h1 className="text-2xl font-black text-stone-900 mb-1">Which of these have you seen?</h1>
          <p className="text-stone-500 text-sm">Tap any film you've watched — we'll show you the greatest movies of each era</p>
        </div>

        {gridLoading ? (
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 18 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] rounded-xl bg-stone-100 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {gridMovies.map(movie => {
              const seen = selected.has(movie.id);
              return (
                <button
                  key={movie.id}
                  onClick={() => {
                    const next = new Set(selected);
                    if (next.has(movie.id)) next.delete(movie.id); else next.add(movie.id);
                    setSelected(next);
                  }}
                  className={`relative aspect-[2/3] rounded-xl overflow-hidden bg-stone-100 transition-all ${
                    seen
                      ? "ring-2 ring-orange-500 ring-offset-1 scale-[0.97]"
                      : "hover:ring-1 hover:ring-stone-300 hover:scale-[1.02]"
                  }`}
                >
                  {movie.poster_url ? (
                    <img
                      src={movie.poster_url}
                      alt={movie.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-stone-300 text-2xl">🎬</div>
                  )}

                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent px-1.5 pb-1.5 pt-6">
                    <p className="text-[9px] text-white font-semibold leading-tight line-clamp-2">{movie.title}</p>
                  </div>

                  {seen && (
                    <div className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center shadow-sm">
                      <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  )}

                  {seen && (
                    <div className="absolute inset-0 bg-orange-500/10 pointer-events-none" />
                  )}
                </button>
              );
            })}
          </div>
        )}

        <div className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-4 bg-white/95 backdrop-blur-sm border-t border-stone-100">
          <div className="max-w-lg mx-auto">
            {selected.size > 0 && (
              <p className="text-center text-xs text-stone-400 mb-3">
                {selected.size} film{selected.size !== 1 ? "s" : ""} selected
              </p>
            )}
            <button
              onClick={handleGridContinue}
              disabled={selected.size === 0}
              className="w-full bg-orange-600 text-white font-bold py-3.5 rounded-full hover:bg-orange-500 transition-colors text-sm disabled:opacity-40 shadow-sm"
            >
              {selected.size > 0
                ? `Rate ${selected.size} film${selected.size !== 1 ? "s" : ""} →`
                : "Tap films you've watched"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 4: Rating ──
  if (step === 4) {
    const ratedCount = ratedFilms.filter(s => s.rating != null).length;

    return (
      <div className="max-w-lg mx-auto px-4 pt-10 pb-36">
        <div className="mb-6">
          <p className="text-orange-500 text-xs font-semibold uppercase tracking-widest mb-2">Last step</p>
          <h1 className="text-2xl font-black text-stone-900 mb-1">How did you feel about them?</h1>
          <p className="text-stone-500 text-sm">
            {ratedCount === 0
              ? `Rate the ${ratedFilms.length} films you've seen`
              : `${ratedCount} of ${ratedFilms.length} rated`}
          </p>
        </div>

        <div className="space-y-3">
          {ratedFilms.map(({ movie, rating }) => (
            <div
              key={movie.id}
              className={`bg-white border rounded-2xl p-4 shadow-sm transition-colors ${
                rating != null ? "border-stone-200" : "border-orange-200"
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-14 rounded-lg overflow-hidden bg-stone-100 shrink-0">
                  {movie.poster_url
                    ? <img src={movie.poster_url} alt={movie.title} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-lg">🎬</div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-stone-900 truncate">{movie.title}</p>
                  <p className="text-xs text-stone-400">{movie.year}</p>
                  {rating == null && (
                    <p className="text-[10px] text-orange-500 mt-0.5">Tap to rate ↓</p>
                  )}
                </div>
              </div>
              <div className="flex gap-1.5">
                {RATINGS.map(r => (
                  <button
                    key={r.value}
                    onClick={() => setRating(movie.id, r.value)}
                    className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl border transition-all ${
                      rating === r.value
                        ? "border-orange-400 bg-orange-50"
                        : "border-stone-200 bg-stone-50 hover:border-stone-300"
                    }`}
                  >
                    <span className="text-base">{r.emoji}</span>
                    <span className="text-[9px] text-stone-500 leading-tight text-center">{r.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-4 bg-white/95 backdrop-blur-sm border-t border-stone-100">
          <div className="max-w-lg mx-auto">
            <button
              onClick={handleRatingContinue}
              disabled={ratedCount === 0}
              className="w-full bg-orange-600 text-white font-bold py-3.5 rounded-full hover:bg-orange-500 transition-colors text-sm disabled:opacity-40 shadow-sm"
            >
              {ratedCount > 0
                ? `Continue with ${ratedCount} rating${ratedCount !== 1 ? "s" : ""} →`
                : "Rate at least one film"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 5: Pairwise Compare ──
  if (step === 7) {
    const pair = pairs[pairIdx];

    return (
      <div className="max-w-lg mx-auto px-4 py-10 text-center">
        <p className="text-orange-500 text-xs font-semibold uppercase tracking-widest mb-2">Final refinement</p>
        <h1 className="text-2xl font-black text-stone-900 mb-1">Refine your ranking</h1>
        <p className="text-stone-500 text-sm mb-1">You rated these the same — which did you prefer?</p>
        <p className="text-stone-400 text-xs mb-8">{pairIdx + 1} of {pairs.length}</p>

        <div className="flex justify-center gap-2 mb-8">
          {pairs.map((_, i) => (
            <div key={i} className={`w-2 h-2 rounded-full transition-all ${
              i < pairIdx ? "bg-orange-500" : i === pairIdx ? "bg-stone-800" : "bg-stone-200"
            }`} />
          ))}
        </div>

        {pair && (
          <div className="flex items-center gap-3">
            <button
              key={pair[0].id}
              onClick={() => handleCompare(pair[0].id, compResults)}
              className="flex-1 flex flex-col items-center gap-3 bg-white border border-stone-200 hover:border-orange-400 hover:shadow-md rounded-2xl p-4 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm"
            >
              <div className="w-full aspect-[2/3] rounded-xl overflow-hidden bg-stone-100">
                {pair[0].poster_url
                  ? <img src={pair[0].poster_url} alt={pair[0].title} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-4xl">🎬</div>
                }
              </div>
              <p className="font-semibold text-sm text-stone-900">{pair[0].title}</p>
              <p className="text-stone-400 text-xs">{pair[0].year}</p>
            </button>

            <div className="shrink-0 text-stone-400 font-black text-lg">VS</div>

            <button
              key={pair[1].id}
              onClick={() => handleCompare(pair[1].id, compResults)}
              className="flex-1 flex flex-col items-center gap-3 bg-white border border-stone-200 hover:border-orange-400 hover:shadow-md rounded-2xl p-4 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm"
            >
              <div className="w-full aspect-[2/3] rounded-xl overflow-hidden bg-stone-100">
                {pair[1].poster_url
                  ? <img src={pair[1].poster_url} alt={pair[1].title} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-4xl">🎬</div>
                }
              </div>
              <p className="font-semibold text-sm text-stone-900">{pair[1].title}</p>
              <p className="text-stone-400 text-xs">{pair[1].year}</p>
            </button>
          </div>
        )}

        <button
          onClick={() => handleCompare(null, compResults)}
          className="mt-6 text-stone-400 text-xs hover:text-stone-600 transition-colors"
        >
          Too close to call — skip
        </button>

        {saving && (
          <p className="mt-4 text-stone-400 text-xs">Saving your taste profile…</p>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-10 text-center">
      <p className="text-stone-400 text-sm">Setting up your profile…</p>
    </div>
  );
}
