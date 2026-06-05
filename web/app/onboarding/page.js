"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase-browser";

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
  const [languageRanking, setLanguageRanking] = useState([]); // ordered array of lang codes
  const [query,           setQuery]           = useState("");
  const [results,         setResults]         = useState([]);
  const [searching,       setSearching]       = useState(false);
  const [showDropdown,    setShowDropdown]     = useState(false);
  const [selected,        setSelected]        = useState([]); // [{ movie, rating }]
  const [pairs,           setPairs]           = useState([]);
  const [pairIdx,         setPairIdx]         = useState(0);
  const [compResults,     setCompResults]     = useState([]);
  const [dna,             setDna]             = useState([]);
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

  function handleLanguageContinue() {
    setStep(1);
  }

  function handleContinue() {
    const rated = selected.filter((s) => s.rating != null);
    const p = generatePairs(rated);
    if (p.length > 0) {
      setPairs(p);
      setStep(2);
    } else {
      setDna(buildDNA(rated));
      setStep(3);
    }
  }

  function handleCompare(winnerId) {
    if (winnerId != null) {
      const pair    = pairs[pairIdx];
      const loserId = pair.find((m) => m.id !== winnerId)?.id;
      setCompResults((prev) => [...prev, { winnerId, loserId }]);
    }
    if (pairIdx < pairs.length - 1) {
      setPairIdx((i) => i + 1);
    } else {
      setDna(buildDNA(selected));
      setStep(3);
    }
  }

  async function handleFinish() {
    setSaving(true);
    if (user) {
      const scores    = computeScores(selected, compResults);
      const reactions = selected
        .filter((s) => s.rating != null)
        .map((s) => ({
          user_id:  user.id,
          movie_id: s.movie.id,
          rating:   s.rating,
          score:    scores[s.movie.id] ?? INITIAL_SCORES[s.rating],
        }));
      if (reactions.length) {
        await supabase.from("user_reactions").upsert(reactions, { onConflict: "user_id,movie_id" });
      }
      await supabase.from("user_profiles").upsert(
        {
          user_id: user.id,
          dna,
          onboarding_complete: true,
          email: user.email,
          language_preferences: languageRanking, // ordered array e.g. ["hi","ta","ml"]
        },
        { onConflict: "user_id" }
      );
    }
    router.push("/");
  }

  // ── Step 0: Language Ranking ──
  if (step === 0) {
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
          <p className="text-amber-400 text-xs font-semibold uppercase tracking-widest mb-2">Step 1 of 4</p>
          <h1 className="text-2xl font-black mb-1">Which film languages do you watch?</h1>
          <p className="text-zinc-400 text-sm">Tap to select in order — your first pick is your primary language</p>
        </div>

        {/* Selected ranking display */}
        {languageRanking.length > 0 && (
          <div className="mb-6 p-4 bg-zinc-900 border border-white/10 rounded-2xl">
            <p className="text-xs text-zinc-500 mb-3 uppercase tracking-widest">Your ranking</p>
            <div className="space-y-2">
              {languageRanking.map((code, idx) => {
                const lang = LANGUAGES.find((l) => l.code === code);
                return (
                  <div key={code} className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-amber-400 text-black text-xs font-black flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-sm font-semibold text-white">{lang?.label}</span>
                    <button
                      onClick={() => toggleLanguage(code)}
                      className="ml-auto text-zinc-600 hover:text-zinc-300 text-lg leading-none"
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
                    ? "border-amber-400 bg-amber-400/10 text-white"
                    : "border-white/10 bg-zinc-900 text-zinc-400 hover:border-white/30 hover:text-white"
                }`}
              >
                <span className="text-sm font-semibold">{lang.label}</span>
                {isSelected && (
                  <span className="ml-auto w-5 h-5 rounded-full bg-amber-400 text-black text-xs font-black flex items-center justify-center shrink-0">
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
          className="w-full bg-amber-400 text-black font-bold py-3.5 rounded-full hover:bg-amber-300 transition-colors text-sm disabled:opacity-40"
        >
          {languageRanking.length > 0
            ? `Continue with ${languageRanking.length} language${languageRanking.length !== 1 ? "s" : ""} →`
            : "Select at least one language"}
        </button>

        <button
          onClick={handleLanguageContinue}
          className="w-full mt-3 text-zinc-600 text-xs hover:text-zinc-400 transition-colors"
        >
          Skip for now
        </button>
      </div>
    );
  }

  // ── Step 1: Search + Rate ──
  if (step === 1) {
    const ratedCount = selected.filter((s) => s.rating != null).length;
    const allRated   = selected.length > 0 && selected.every((s) => s.rating != null);

    return (
      <div className="max-w-lg mx-auto px-4 py-10">

        <div className="mb-6">
          <p className="text-amber-400 text-xs font-semibold uppercase tracking-widest mb-2">Step 2 of 4</p>
          <h1 className="text-2xl font-black mb-1">Pick films you've seen</h1>
          <p className="text-zinc-500 text-sm">Search for up to 5 films and rate each one</p>
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
              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-amber-400/50 transition-colors pr-24"
            />
            {searching && (
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 text-xs">
                searching…
              </span>
            )}

            {showDropdown && results.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-white/10 rounded-xl overflow-hidden z-50 shadow-2xl">
                {results.map((movie) => {
                  const already = !!selected.find((s) => s.movie.id === movie.id);
                  return (
                    <button
                      key={movie.id}
                      onMouseDown={() => addMovie(movie)}
                      disabled={already}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-800 transition-colors text-left disabled:opacity-40"
                    >
                      <div className="w-8 h-11 rounded-md overflow-hidden bg-zinc-800 shrink-0">
                        {movie.poster_url
                          ? <img src={movie.poster_url} alt={movie.title} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-xs">🎬</div>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{movie.title}</p>
                        <p className="text-xs text-zinc-500">{movie.year}</p>
                      </div>
                      {already && <span className="text-xs text-zinc-600 shrink-0">Added</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {selected.length === 0 && (
          <div className="text-center py-14 text-zinc-700 border border-dashed border-zinc-800 rounded-2xl">
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-sm">Search for films you've already seen</p>
            <p className="text-xs text-zinc-800 mt-1">e.g. "Sholay", "3 Idiots", "Gangs of Wasseypur"</p>
          </div>
        )}

        {/* Selected + rate inline */}
        {selected.length > 0 && (
          <div className="space-y-3 mb-6">
            {selected.map(({ movie, rating }) => (
              <div key={movie.id} className={`bg-zinc-900 border rounded-2xl p-4 transition-colors ${
                rating != null ? "border-white/10" : "border-amber-400/20"
              }`}>
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-14 rounded-lg overflow-hidden bg-zinc-800 shrink-0">
                    {movie.poster_url
                      ? <img src={movie.poster_url} alt={movie.title} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-lg">🎬</div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{movie.title}</p>
                    <p className="text-xs text-zinc-500">{movie.year}</p>
                    {rating == null && (
                      <p className="text-[10px] text-amber-400/70 mt-0.5">Rate this film ↓</p>
                    )}
                  </div>
                  <button
                    onClick={() => removeMovie(movie.id)}
                    className="text-zinc-600 hover:text-zinc-300 text-xl leading-none shrink-0 transition-colors"
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
                          ? "border-amber-400 bg-amber-400/10"
                          : "border-white/5 bg-zinc-800 hover:border-white/20"
                      }`}
                    >
                      <span className="text-base">{r.emoji}</span>
                      <span className="text-[9px] text-zinc-500 leading-tight text-center">{r.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {ratedCount > 0 && (
          <button
            onClick={handleContinue}
            className="w-full bg-amber-400 text-black font-bold py-3.5 rounded-full hover:bg-amber-300 transition-colors text-sm"
          >
            {allRated
              ? `Continue with ${ratedCount} film${ratedCount !== 1 ? "s" : ""} →`
              : `Continue with ${ratedCount} rated →`}
          </button>
        )}

        {selected.length > 0 && selected.length < 5 && ratedCount === 0 && (
          <p className="text-center text-xs text-zinc-700 mt-4">Rate at least one film to continue</p>
        )}
      </div>
    );
  }

  // ── Step 2: Compare within same bucket ──
  if (step === 2) {
    const pair = pairs[pairIdx];

    return (
      <div className="max-w-lg mx-auto px-4 py-10 text-center">
        <p className="text-amber-400 text-xs font-semibold uppercase tracking-widest mb-2">Step 3 of 4</p>
        <h1 className="text-2xl font-black mb-1">Refine your ranking</h1>
        <p className="text-zinc-400 text-sm mb-1">You rated these the same — which did you prefer?</p>
        <p className="text-zinc-600 text-xs mb-8">{pairIdx + 1} of {pairs.length}</p>

        <div className="flex justify-center gap-2 mb-8">
          {pairs.map((_, i) => (
            <div key={i} className={`w-2 h-2 rounded-full transition-all ${
              i < pairIdx ? "bg-amber-400" : i === pairIdx ? "bg-white" : "bg-zinc-700"
            }`} />
          ))}
        </div>

        {pair && (
          <div className="flex gap-4 items-center">
            {pair.map((film) => (
              <button
                key={film.id}
                onClick={() => handleCompare(film.id)}
                className="flex-1 flex flex-col items-center gap-3 bg-zinc-900 border border-white/5 hover:border-amber-400/50 rounded-2xl p-4 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <div className="w-full aspect-[2/3] rounded-xl overflow-hidden bg-zinc-800">
                  {film.poster_url
                    ? <img src={film.poster_url} alt={film.title} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-4xl">🎬</div>
                  }
                </div>
                <p className="font-semibold text-sm">{film.title}</p>
                <p className="text-zinc-500 text-xs">{film.year}</p>
              </button>
            ))}

            <div className="shrink-0 text-zinc-600 font-black text-lg">VS</div>
          </div>
        )}

        <button
          onClick={() => handleCompare(null)}
          className="mt-6 text-zinc-600 text-xs hover:text-zinc-400 transition-colors"
        >
          Too close to call — skip
        </button>
      </div>
    );
  }

  // ── Step 3: DNA ──
  return (
    <div className="max-w-sm mx-auto px-4 py-10 text-center">
      <p className="text-amber-400 text-xs font-semibold uppercase tracking-widest mb-2">Step 4 of 4</p>
      <div className="text-5xl mb-4">🧬</div>
      <h1 className="text-2xl font-black mb-2">Your Entertainment DNA</h1>
      <p className="text-zinc-400 text-sm mb-8">Based on your taste — evolves as you rate and compare more</p>

      <div className="space-y-3 mb-8 text-left">
        {dna.map((arc, i) => (
          <div key={i} className="bg-zinc-900 border border-white/5 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-sm">{arc.icon} {arc.label}</span>
              <span className="text-amber-400 text-sm font-bold">{arc.pct}%</span>
            </div>
            <div className="h-1.5 bg-zinc-800 rounded-full">
              <div className="h-1.5 bg-amber-400 rounded-full" style={{ width: `${arc.pct}%` }} />
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={handleFinish}
        disabled={saving}
        className="w-full bg-amber-400 text-black font-bold py-3.5 rounded-full hover:bg-amber-300 transition-colors text-sm disabled:opacity-50"
      >
        {saving ? "Saving…" : "Start discovering →"}
      </button>
    </div>
  );
}
