"use client";

import { useState, useEffect } from "react";
import { createClient } from "../../lib/supabase-browser";

export const FILTER_LANGUAGES = [
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

export const FILTER_DECADES = [
  { label: "2020s",    min: 2020, max: 2029 },
  { label: "2010s",    min: 2010, max: 2019 },
  { label: "2000s",    min: 2000, max: 2009 },
  { label: "90s",      min: 1990, max: 1999 },
  { label: "Classics", min: 0,    max: 1989 },
];

export const EMPTY_FILTERS = {
  language:     null,   // language code e.g. "hi"
  decade:       null,   // { label, min, max }
  actorId:      null,   // UUID from people table
  actorName:    "",
  directorId:   null,   // UUID from people table
  directorName: "",
};

export function countActiveFilters(filters) {
  return [filters.language, filters.decade, filters.actorId, filters.directorId]
    .filter(Boolean).length;
}

// Given active filters, resolve the list of movie IDs allowed by actor/director.
// Returns null if no person filter is active (meaning: no restriction).
export async function resolvePersonMovieIds(filters, supabaseClient) {
  const idSets = [];

  if (filters.actorId) {
    const { data } = await supabaseClient
      .from("movie_credits")
      .select("movie_id")
      .eq("person_id", filters.actorId)
      .eq("role", "Actor");
    idSets.push(new Set((data ?? []).map((c) => c.movie_id)));
  }

  if (filters.directorId) {
    const { data } = await supabaseClient
      .from("movie_credits")
      .select("movie_id")
      .eq("person_id", filters.directorId)
      .eq("role", "Director");
    idSets.push(new Set((data ?? []).map((c) => c.movie_id)));
  }

  if (idSets.length === 0) return null;

  // Intersect all sets (movie must satisfy all active person filters)
  const first = [...idSets[0]];
  return first.filter((id) => idSets.every((s) => s.has(id)));
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function FilterPanel({ open, onClose, filters, onChange }) {
  const supabase = createClient();

  const [actorQuery,          setActorQuery]          = useState(filters.actorName  || "");
  const [directorQuery,       setDirectorQuery]       = useState(filters.directorName || "");
  const [actorSuggestions,    setActorSuggestions]    = useState([]);
  const [directorSuggestions, setDirectorSuggestions] = useState([]);

  // Sync input boxes when filters are cleared externally
  useEffect(() => { if (!filters.actorId)    setActorQuery(""); },    [filters.actorId]);
  useEffect(() => { if (!filters.directorId) setDirectorQuery(""); }, [filters.directorId]);

  // Actor autocomplete
  useEffect(() => {
    if (!actorQuery || actorQuery.length < 2 || actorQuery === filters.actorName) {
      setActorSuggestions([]);
      return;
    }
    const t = setTimeout(async () => {
      const { data } = await supabase.from("people").select("id, name").ilike("name", `%${actorQuery}%`).limit(7);
      setActorSuggestions(data ?? []);
    }, 250);
    return () => clearTimeout(t);
  }, [actorQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  // Director autocomplete
  useEffect(() => {
    if (!directorQuery || directorQuery.length < 2 || directorQuery === filters.directorName) {
      setDirectorSuggestions([]);
      return;
    }
    const t = setTimeout(async () => {
      const { data } = await supabase.from("people").select("id, name").ilike("name", `%${directorQuery}%`).limit(7);
      setDirectorSuggestions(data ?? []);
    }, 250);
    return () => clearTimeout(t);
  }, [directorQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  function patch(obj) { onChange({ ...filters, ...obj }); }

  function clearAll() {
    setActorQuery(""); setDirectorQuery("");
    setActorSuggestions([]); setDirectorSuggestions([]);
    onChange(EMPTY_FILTERS);
  }

  const hasAny = countActiveFilters(filters) > 0;

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />

      {/* Bottom sheet */}
      <div className="fixed bottom-0 inset-x-0 bg-white rounded-t-2xl z-50 max-h-[90vh] flex flex-col shadow-2xl">

        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-9 h-1 bg-stone-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-stone-100 shrink-0">
          <h2 className="font-bold text-stone-900 text-base">Filter</h2>
          <div className="flex items-center gap-4">
            {hasAny && (
              <button onClick={clearAll} className="text-sm text-orange-600 font-semibold">
                Clear all
              </button>
            )}
            <button onClick={onClose} className="text-stone-400 hover:text-stone-600 transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 py-5 space-y-7">

          {/* Language */}
          <section>
            <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-widest mb-3">Language</p>
            <div className="flex flex-wrap gap-2">
              {FILTER_LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => patch({ language: filters.language === l.code ? null : l.code })}
                  className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all ${
                    filters.language === l.code
                      ? "bg-orange-600 text-white border-orange-600 shadow-sm"
                      : "bg-white text-stone-600 border-stone-200 hover:border-stone-300"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </section>

          {/* Decade */}
          <section>
            <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-widest mb-3">Decade</p>
            <div className="flex flex-wrap gap-2">
              {FILTER_DECADES.map((d) => (
                <button
                  key={d.label}
                  onClick={() => patch({ decade: filters.decade?.label === d.label ? null : d })}
                  className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all ${
                    filters.decade?.label === d.label
                      ? "bg-stone-900 text-white border-stone-900 shadow-sm"
                      : "bg-white text-stone-600 border-stone-200 hover:border-stone-300"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </section>

          {/* Actor */}
          <section>
            <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-widest mb-3">Actor</p>
            <div className="relative">
              <input
                type="text"
                placeholder="Search actor…"
                value={actorQuery}
                onChange={(e) => {
                  setActorQuery(e.target.value);
                  if (!e.target.value) patch({ actorId: null, actorName: "" });
                }}
                className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all"
              />
              {actorQuery && (
                <button
                  onClick={() => { setActorQuery(""); setActorSuggestions([]); patch({ actorId: null, actorName: "" }); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12" /></svg>
                </button>
              )}
              {actorSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-stone-200 rounded-xl shadow-lg z-10 overflow-hidden">
                  {actorSuggestions.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => { setActorQuery(p.name); setActorSuggestions([]); patch({ actorId: p.id, actorName: p.name }); }}
                      className="w-full text-left px-4 py-2.5 text-sm text-stone-800 hover:bg-stone-50 border-b border-stone-100 last:border-0 transition-colors"
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {filters.actorId && (
              <p className="text-xs text-orange-600 mt-2 font-medium">✓ {filters.actorName}</p>
            )}
          </section>

          {/* Director */}
          <section>
            <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-widest mb-3">Director</p>
            <div className="relative">
              <input
                type="text"
                placeholder="Search director…"
                value={directorQuery}
                onChange={(e) => {
                  setDirectorQuery(e.target.value);
                  if (!e.target.value) patch({ directorId: null, directorName: "" });
                }}
                className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all"
              />
              {directorQuery && (
                <button
                  onClick={() => { setDirectorQuery(""); setDirectorSuggestions([]); patch({ directorId: null, directorName: "" }); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12" /></svg>
                </button>
              )}
              {directorSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-stone-200 rounded-xl shadow-lg z-10 overflow-hidden">
                  {directorSuggestions.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => { setDirectorQuery(p.name); setDirectorSuggestions([]); patch({ directorId: p.id, directorName: p.name }); }}
                      className="w-full text-left px-4 py-2.5 text-sm text-stone-800 hover:bg-stone-50 border-b border-stone-100 last:border-0 transition-colors"
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {filters.directorId && (
              <p className="text-xs text-orange-600 mt-2 font-medium">✓ {filters.directorName}</p>
            )}
          </section>
        </div>

        {/* Done button */}
        <div className="px-5 pb-8 pt-3 shrink-0 border-t border-stone-100">
          <button
            onClick={onClose}
            className="w-full bg-stone-900 text-white font-bold py-3 rounded-xl hover:bg-stone-800 transition-colors text-sm"
          >
            Done
          </button>
        </div>
      </div>
    </>
  );
}
