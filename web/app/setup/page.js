"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase-browser";

const COUNTRIES = [
  { code: "IN",    name: "India",          flag: "🇮🇳" },
  { code: "US",    name: "United States",  flag: "🇺🇸" },
  { code: "GB",    name: "United Kingdom", flag: "🇬🇧" },
  { code: "CA",    name: "Canada",         flag: "🇨🇦" },
  { code: "AU",    name: "Australia",      flag: "🇦🇺" },
  { code: "AE",    name: "UAE",            flag: "🇦🇪" },
  { code: "SG",    name: "Singapore",      flag: "🇸🇬" },
  { code: "NZ",    name: "New Zealand",    flag: "🇳🇿" },
  { code: "ZA",    name: "South Africa",   flag: "🇿🇦" },
  { code: "MY",    name: "Malaysia",       flag: "🇲🇾" },
  { code: "QA",    name: "Qatar",          flag: "🇶🇦" },
  { code: "OTHER", name: "Other",          flag: "🌍" },
];

const LANGUAGES = [
  { id: "Hindi",     label: "Hindi",     native: "हिंदी"      },
  { id: "Tamil",     label: "Tamil",     native: "தமிழ்"     },
  { id: "Telugu",    label: "Telugu",    native: "తెలుగు"    },
  { id: "Malayalam", label: "Malayalam", native: "മലയാളം"    },
  { id: "Kannada",   label: "Kannada",   native: "ಕನ್ನಡ"    },
  { id: "Bengali",   label: "Bengali",   native: "বাংলা"     },
  { id: "Marathi",   label: "Marathi",   native: "मराठी"     },
  { id: "Punjabi",   label: "Punjabi",   native: "ਪੰਜਾਬੀ"   },
];

const VIBES = [
  { id: "Masala",      emoji: "🔥", label: "Masala"      },
  { id: "Emotional",   emoji: "😭", label: "Emotional"   },
  { id: "Comedy",      emoji: "😂", label: "Comedy"      },
  { id: "Thriller",    emoji: "😰", label: "Thriller"    },
  { id: "Art House",   emoji: "🌙", label: "Art House"   },
  { id: "Family",      emoji: "👨‍👩‍👧", label: "Family"      },
  { id: "Romance",     emoji: "💑", label: "Romance"     },
  { id: "Music-heavy", emoji: "🎶", label: "Music-heavy" },
];

const WATCH_GOALS = [
  { value: 25,  label: "25",  sub: "Casual"      },
  { value: 50,  label: "50",  sub: "Regular"     },
  { value: 100, label: "100", sub: "Enthusiast"  },
  { value: 200, label: "200", sub: "Cinephile"   },
];

const STEP_LABELS = ["Identity", "Location", "Languages", "Vibe"];

// Deterministic avatar gradient from user id
function avatarGradient(userId = "") {
  const n = userId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return [
    "from-amber-400 to-orange-500",
    "from-purple-500 to-pink-500",
    "from-blue-500 to-cyan-500",
    "from-emerald-500 to-teal-500",
    "from-rose-500 to-pink-600",
    "from-indigo-500 to-purple-500",
  ][n % 6];
}

export default function SetupPage() {
  const router   = useRouter();
  const supabase = createClient();

  const [step,        setStep]        = useState(0);
  const [user,        setUser]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);

  // Form fields
  const [displayName, setDisplayName] = useState("");
  const [username,    setUsername]    = useState("");
  const [country,     setCountry]     = useState("");
  const [city,        setCity]        = useState("");
  const [languages,   setLanguages]   = useState(["Hindi"]);
  const [vibes,       setVibes]       = useState([]);
  const [watchGoal,   setWatchGoal]   = useState(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUser(user);

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("setup_complete")
        .eq("user_id", user.id)
        .single();

      if (profile?.setup_complete) { router.replace("/"); return; }

      const emailPrefix = user.email?.split("@")[0] ?? "";
      setDisplayName(emailPrefix);
      setUsername(emailPrefix.toLowerCase().replace(/[^a-z0-9_]/g, ""));
      setLoading(false);
    }
    load();
  }, []);

  function toggleLanguage(id) {
    setLanguages((prev) =>
      prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id]
    );
  }

  function toggleVibe(id) {
    setVibes((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  }

  function canAdvance() {
    if (step === 0) return displayName.trim().length >= 2 && username.trim().length >= 2;
    if (step === 2) return languages.length >= 1;
    return true;
  }

  async function handleFinish() {
    if (saving) return;
    setSaving(true);
    await supabase.from("user_profiles").upsert(
      {
        user_id:        user.id,
        email:          user.email,
        display_name:   displayName.trim(),
        username:       username.trim().toLowerCase(),
        country:        country || null,
        city:           city.trim() || null,
        languages,
        vibe_prefs:     vibes,
        watch_goal:     watchGoal || null,
        setup_complete: true,
      },
      { onConflict: "user_id" }
    );
    router.push("/onboarding");
  }

  if (loading) return (
    <div className="max-w-sm mx-auto px-4 py-16 text-center text-zinc-600">
      <div className="text-4xl mb-4 animate-pulse">🎬</div>
      Setting up your profile…
    </div>
  );

  const progress  = ((step + 1) / STEP_LABELS.length) * 100;
  const initials  = displayName.slice(0, 2).toUpperCase() || "?";
  const gradient  = user ? avatarGradient(user.id) : "from-amber-400 to-orange-500";

  return (
    <div className="max-w-sm mx-auto px-4 py-10 min-h-[calc(100vh-65px)] flex flex-col">

      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex justify-between text-xs text-zinc-600 mb-2">
          <span className="font-medium">{STEP_LABELS[step]}</span>
          <span>{step + 1} of {STEP_LABELS.length}</span>
        </div>
        <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-1 bg-amber-400 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* ── Step 0: Identity ── */}
      {step === 0 && (
        <div className="flex-1">
          <h1 className="text-2xl font-black mb-1">Create your profile</h1>
          <p className="text-zinc-500 text-sm mb-8">How you'll appear to others on Bolly</p>

          {/* Avatar preview */}
          <div className="flex justify-center mb-8">
            <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-black text-2xl font-black`}>
              {initials}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-widest block mb-2">
                Display name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="How you want to be known"
                maxLength={32}
                className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-amber-400/50 transition-colors"
              />
            </div>

            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-widest block mb-2">
                Username
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm select-none">@</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) =>
                    setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
                  }
                  placeholder="yourhandle"
                  maxLength={20}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 pl-8 text-white placeholder-zinc-600 focus:outline-none focus:border-amber-400/50 transition-colors"
                />
              </div>
              <p className="text-[10px] text-zinc-600 mt-1.5">Letters, numbers and underscores only</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 1: Location ── */}
      {step === 1 && (
        <div className="flex-1">
          <h1 className="text-2xl font-black mb-1">Where are you from?</h1>
          <p className="text-zinc-500 text-sm mb-8">
            Helps us surface what's playing near you and local leaderboards
          </p>

          <div className="grid grid-cols-2 gap-2 mb-6">
            {COUNTRIES.map((c) => (
              <button
                key={c.code}
                onClick={() => setCountry(country === c.code ? "" : c.code)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm text-left transition-all ${
                  country === c.code
                    ? "border-amber-400 bg-amber-400/10 text-white"
                    : "border-white/5 bg-zinc-900 text-zinc-400 hover:border-white/20"
                }`}
              >
                <span className="text-base shrink-0">{c.flag}</span>
                <span className="truncate">{c.name}</span>
              </button>
            ))}
          </div>

          <div>
            <label className="text-xs text-zinc-500 uppercase tracking-widest block mb-2">
              City{" "}
              <span className="text-zinc-700 normal-case tracking-normal font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Mumbai, London, Toronto"
              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-amber-400/50 transition-colors"
            />
          </div>
        </div>
      )}

      {/* ── Step 2: Languages ── */}
      {step === 2 && (
        <div className="flex-1">
          <h1 className="text-2xl font-black mb-1">What do you watch?</h1>
          <p className="text-zinc-500 text-sm mb-8">
            Select all the film industries you watch — we'll personalise your feed
          </p>

          <div className="grid grid-cols-2 gap-3">
            {LANGUAGES.map((l) => {
              const active = languages.includes(l.id);
              return (
                <button
                  key={l.id}
                  onClick={() => toggleLanguage(l.id)}
                  className={`flex flex-col items-center gap-1 py-4 rounded-2xl border transition-all ${
                    active
                      ? "border-amber-400 bg-amber-400/10"
                      : "border-white/5 bg-zinc-900 hover:border-white/20"
                  }`}
                >
                  <span className={`text-sm font-bold ${active ? "text-white" : "text-zinc-300"}`}>
                    {l.label}
                  </span>
                  <span className={`text-xs ${active ? "text-amber-400" : "text-zinc-600"}`}>
                    {l.native}
                  </span>
                </button>
              );
            })}
          </div>

          <p className="text-xs text-zinc-600 mt-4 text-center">
            Select at least one · you can change this in settings later
          </p>
        </div>
      )}

      {/* ── Step 3: Vibe + Goal ── */}
      {step === 3 && (
        <div className="flex-1">
          <h1 className="text-2xl font-black mb-1">What's your vibe?</h1>
          <p className="text-zinc-500 text-sm mb-6">
            The kinds of films you gravitate toward
          </p>

          <div className="grid grid-cols-2 gap-2 mb-8">
            {VIBES.map((v) => {
              const active = vibes.includes(v.id);
              return (
                <button
                  key={v.id}
                  onClick={() => toggleVibe(v.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                    active
                      ? "border-amber-400 bg-amber-400/10 text-white"
                      : "border-white/5 bg-zinc-900 text-zinc-400 hover:border-white/20"
                  }`}
                >
                  <span className="text-xl">{v.emoji}</span>
                  <span className="text-sm font-medium">{v.label}</span>
                </button>
              );
            })}
          </div>

          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">
              Films to watch this year{" "}
              <span className="text-zinc-700 normal-case tracking-normal font-normal">(optional)</span>
            </p>
            <div className="grid grid-cols-4 gap-2">
              {WATCH_GOALS.map((g) => (
                <button
                  key={g.value}
                  onClick={() => setWatchGoal(watchGoal === g.value ? null : g.value)}
                  className={`flex flex-col items-center py-3 rounded-xl border transition-all ${
                    watchGoal === g.value
                      ? "border-amber-400 bg-amber-400/10"
                      : "border-white/5 bg-zinc-900 hover:border-white/20"
                  }`}
                >
                  <span className={`text-lg font-black ${watchGoal === g.value ? "text-amber-400" : "text-white"}`}>
                    {g.label}
                  </span>
                  <span className="text-[10px] text-zinc-600 mt-0.5">{g.sub}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="mt-10 space-y-3">
        <div className="flex gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="px-5 py-3 rounded-full border border-white/10 text-zinc-400 text-sm hover:border-white/30 transition-colors"
            >
              ← Back
            </button>
          )}

          {step < STEP_LABELS.length - 1 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canAdvance()}
              className="flex-1 bg-amber-400 text-black font-bold py-3 rounded-full text-sm hover:bg-amber-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continue →
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={saving}
              className="flex-1 bg-amber-400 text-black font-bold py-3 rounded-full text-sm hover:bg-amber-300 transition-colors disabled:opacity-50"
            >
              {saving ? "Saving…" : "Start discovering →"}
            </button>
          )}
        </div>

        {/* Skip links for optional steps */}
        {step === 1 && (
          <button
            onClick={() => setStep((s) => s + 1)}
            className="w-full text-zinc-600 text-xs hover:text-zinc-400 transition-colors py-1"
          >
            Skip for now →
          </button>
        )}
        {step === 3 && (
          <button
            onClick={handleFinish}
            disabled={saving}
            className="w-full text-zinc-600 text-xs hover:text-zinc-400 transition-colors py-1"
          >
            Skip for now →
          </button>
        )}
      </div>
    </div>
  );
}
