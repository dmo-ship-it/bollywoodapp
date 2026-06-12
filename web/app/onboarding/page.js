"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase-browser";

// Indian diaspora + subcontinent countries shown first
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

// Ordered by popularity / audience size
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

// Only compare movies within the same rating bucket
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
  const [country,         setCountry]         = useState("");
  const [city,            setCity]            = useState("");
  const [countrySearch,   setCountrySearch]   = useState("");
  const [showCountryDrop, setShowCountryDrop] = useState(false);
  const [languageRanking, setLanguageRanking] = useState([]); // ordered array of lang codes
  const [query,           setQuery]           = useState("");
  const [results,         setResults]         = useState([]);
  const [searching,       setSearching]       = useState(false);
  const [showDropdown,    setShowDropdown]     = useState(false);
  const [selected,        setSelected]        = useState([]); // [{ movie, rating }]
  const [pairs,           setPairs]           = useState([]);
  const [pairIdx,         setPairIdx]         = useState(0);
  const [compResults,     setCompResults]     = useState([]);
  const [saving,          setSaving]          = useState(false);

  const debounceRef = useRef(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  // Debounced search
  useEffect(() => {
    if (query.length < 2) { setResults([]); setShowDropdown(false); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const { data } = await supabase
        .from("movies")
        .select("id, title, year, poster_url, genres")
        .ilike("title", `%${query}%`)
        .order("tmdb_popularity", { ascending: false })
        .limit(8);
      setResults(data ?? []);
      setShowDropdown(true);
      setSearching(false);
    }, 150);
  }, [query]);

  function addMovie(movie) {
    if (selected.length >= 5 || selected.find((s) => s.movie.id === movie.id)) return;
    setSelected((prev) => [...prev, { movie, rating: null }]);
    setQuery("");
    setResults([]);
    setShowDropdown(false);
  }

  function removeMovie(movieId) {
    setSelected((prev) => prev.filter((s) => s.movie.id !== movieId));
  }

  function setRating(movieId, rating) {
    setSelected((prev) =>
      prev.map((s) => s.movie.id === movieId ? { ...s, rating } : s)
    );
  }

  function handleLocationContinue() {
    setStep(1);
  }

  function handleLanguageContinue() {
    setStep(2);
  }

  function handleContinue() {
    const rated = selected.filter((s) => s.rating != null);
    const p = generatePairs(rated);
    if (p.length > 0) {
      setPairs(p);
      setStep(3);
    } else {
      handleFinish(selected, []);
    }
  }

  function handleCompare(winnerId, currentCompResults) {
    const updatedCompResults = winnerId != null
      ? [...currentCompResults, { winnerId, loserId: pairs[pairIdx].find((m) => m.id !== winnerId)?.id }]
      : currentCompResults;

    if (pairIdx < pairs.length - 1) {
      setCompResults(updatedCompResults);
      setPairIdx((i) => i + 1);
    } else {
      handleFinish(selected, updatedCompResults);
    }
  }

  async function handleFinish(sel = selected, cr = compResults) {
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
        await supabase.from("user_reactions").upsert(reactions, { onConflict: "user_id,movie_id" });
      }
      const userMetadata = currentUser.user_metadata || {};

      await supabase.from("user_profiles").upsert(
        {
          user_id: currentUser.id,
          dna: buildDNA(sel),
          onboarding_complete: true,
          email: currentUser.email,
          full_name: userMetadata.full_name || userMetadata.name || currentUser.email?.split("@")[0],
          profile_picture_url: userMetadata.avatar_url || userMetadata.picture,
          country: country || null,
          city: city.trim() || null,
          preferred_languages: languageRanking.length > 0 ? languageRanking : null,
        },
        { onConflict: "user_id" }
      );
    }
    router.push("/");
  }

  // ── Step 0: Location ──
  if (step === 0) {
    const filteredCountries = countrySearch.trim()
      ? COUNTRIES.filter((c) => c.label.toLowerCase().includes(countrySearch.toLowerCase()))
      : COUNTRIES;
    const selectedCountryLabel = COUNTRIES.find((c) => c.code === country)?.label;

    return (
      <div className="max-w-lg mx-auto px-4 py-10">
        <div className="mb-6">
          <p className="text-orange-500 text-xs font-semibold uppercase tracking-widest mb-2">Step 1 of 3</p>
          <h1 className="text-2xl font-black text-stone-900 mb-1">Where are you based?</h1>
          <p className="text-stone-500 text-sm">Helps us surface locally relevant films and showtimes.</p>
        </div>

        {/* Country picker */}
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

        {/* City (optional) */}
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

  // ── Step 1: Language Ranking ──
  if (step === 1) {
    const toggleLanguage = (code) => {
      setLanguageRanking((prev) => {
        if (prev.includes(code)) {
          return prev.filter((c) => c !== code);
        } else {
          return [...prev, code];
        }
      });
    };

    return (
      <div className="max-w-lg mx-auto px-4 py-10">
        <div className="mb-6">
          <p className="text-orange-500 text-xs font-semibold uppercase tracking-widest mb-2">Step 2 of 3</p>
          <h1 className="text-2xl font-black text-stone-900 mb-1">Which languages do you watch most?</h1>
          <p className="text-stone-500 text-sm">Select in order — most-watched first. We'll show those films at the top of your feed.</p>
        </div>

        {/* Selected ranking display */}
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

        {/* All languages in one grid */}
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

  // ── Step 2: Search + Rate ──
  if (step === 2) {
    const ratedCount = selected.filter((s) => s.rating != null).length;
    const allRated   = selected.length > 0 && selected.every((s) => s.rating != null);

    return (
      <div className="max-w-lg mx-auto px-4 py-10">

        <div className="mb-6">
          <p className="text-orange-500 text-xs font-semibold uppercase tracking-widest mb-2">Step 3 of 3</p>
          <h1 className="text-2xl font-black text-stone-900 mb-1">Pick films you've seen</h1>
          <p className="text-stone-500 text-sm">Search for up to 5 films and rate each one</p>
        </div>

        {/* Search box */}
        {selected.length < 5 && (
          <div className="relative mb-6">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => results.length > 0 && setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
              placeholder="Search for a film…"
              className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-stone-900 placeholder-stone-400 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all pr-24 shadow-sm"
            />
            {searching && (
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 text-xs">
                searching…
              </span>
            )}

            {showDropdown && results.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-stone-200 rounded-xl overflow-hidden z-50 shadow-lg">
                {results.map((movie) => {
                  const already = !!selected.find((s) => s.movie.id === movie.id);
                  return (
                    <button
                      key={movie.id}
                      onMouseDown={() => addMovie(movie)}
                      disabled={already}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-stone-50 transition-colors text-left disabled:opacity-40"
                    >
                      <div className="w-8 h-11 rounded-md overflow-hidden bg-stone-100 shrink-0">
                        {movie.poster_url
                          ? <img src={movie.poster_url} alt={movie.title} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-xs">🎬</div>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-stone-900 truncate">{movie.title}</p>
                        <p className="text-xs text-stone-400">{movie.year}</p>
                      </div>
                      {already && <span className="text-xs text-stone-400 shrink-0">Added</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {selected.length === 0 && (
          <div className="text-center py-14 text-stone-400 border border-dashed border-stone-200 rounded-2xl">
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-sm">Search for films you've already seen</p>
            <p className="text-xs text-stone-300 mt-1">e.g. "Sholay", "3 Idiots", "Gangs of Wasseypur"</p>
          </div>
        )}

        {/* Selected + rate inline */}
        {selected.length > 0 && (
          <div className="space-y-3 mb-6">
            {selected.map(({ movie, rating }) => (
              <div key={movie.id} className={`bg-white border rounded-2xl p-4 shadow-sm transition-colors ${
                rating != null ? "border-stone-200" : "border-orange-200"
              }`}>
                <div className="flex items-start gap-3 mb-3">
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
                      <p className="text-[10px] text-orange-500 mt-0.5">Rate this film ↓</p>
                    )}
                  </div>
                  <button
                    onClick={() => removeMovie(movie.id)}
                    className="text-stone-300 hover:text-stone-500 text-xl leading-none shrink-0 transition-colors"
                  >
                    ×
                  </button>
                </div>
                <div className="flex gap-1.5">
                  {RATINGS.map((r) => (
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
        )}

        {ratedCount >= 5 && (
          <button
            onClick={handleContinue}
            className="w-full bg-orange-600 text-white font-bold py-3.5 rounded-full hover:bg-orange-500 transition-colors text-sm shadow-sm"
          >
            Continue →
          </button>
        )}

        {ratedCount > 0 && ratedCount < 5 && (
          <div className="text-center mt-2">
            <p className="text-xs text-stone-400 mb-1">
              {5 - ratedCount} more film{5 - ratedCount !== 1 ? "s" : ""} to go — the more you rate, the better your recommendations
            </p>
            <button
              onClick={handleContinue}
              className="text-xs text-stone-400 hover:text-stone-600 underline underline-offset-2 transition-colors"
            >
              Skip — continue with {ratedCount} rated
            </button>
          </div>
        )}

        {selected.length > 0 && ratedCount === 0 && (
          <p className="text-center text-xs text-stone-400 mt-4">Rate at least one film to continue</p>
        )}
      </div>
    );
  }

  // ── Step 3: Compare within same bucket ──
  if (step === 3) {
    const pair = pairs[pairIdx];

    return (
      <div className="max-w-lg mx-auto px-4 py-10 text-center">
        <p className="text-orange-500 text-xs font-semibold uppercase tracking-widest mb-2">Almost there</p>
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

  // Saving / redirect fallback
  return (
    <div className="max-w-sm mx-auto px-4 py-10 text-center">
      <p className="text-stone-400 text-sm">Setting up your profile…</p>
    </div>
  );
}
