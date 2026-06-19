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
  language:     null,
  decade:       null,
  actorId:      null,
  actorName:    "",
  directorId:   null,
  directorName: "",
  seenFilter:   null,
};

export function countActiveFilters(filters) {
  return [filters.language, filters.decade, filters.actorId, filters.directorId, filters.seenFilter]
    .filter(Boolean).length;
}

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

  const first = [...idSets[0]];
  return first.filter((id) => idSets.every((s) => s.has(id)));
}

// ─── Pill button helper ───────────────────────────────────────────────────────

function Pill({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 14px",
        borderRadius: "var(--radius-pill)",
        border: "1.5px solid",
        borderColor: active ? "var(--brand)" : "var(--line)",
        background: active ? "var(--brand)" : "transparent",
        color: active ? "#fff" : "var(--ink-soft)",
        fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: active ? 600 : 400,
        cursor: "pointer", transition: "all 0.15s",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function FilterPanel({ open, onClose, filters, onChange }) {
  const supabase = createClient();

  const [actorQuery,          setActorQuery]          = useState(filters.actorName  || "");
  const [directorQuery,       setDirectorQuery]       = useState(filters.directorName || "");
  const [actorSuggestions,    setActorSuggestions]    = useState([]);
  const [directorSuggestions, setDirectorSuggestions] = useState([]);

  useEffect(() => { if (!filters.actorId)    setActorQuery(""); },    [filters.actorId]);
  useEffect(() => { if (!filters.directorId) setDirectorQuery(""); }, [filters.directorId]);

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

  const inputStyle = {
    width: "100%", background: "var(--sunk)", border: "1.5px solid var(--line)",
    borderRadius: 10, padding: "10px 14px",
    fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--ink)",
    outline: "none", boxSizing: "border-box",
  };

  const sectionLabel = {
    fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.16em",
    textTransform: "uppercase", color: "var(--ink-mute)",
    marginBottom: 10, display: "block",
  };

  return (
    <>
      {/* Backdrop */}
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 40 }} onClick={onClose} />

      {/* Modal */}
      <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
        <div style={{
          background: "var(--card)", borderRadius: "var(--radius)",
          boxShadow: "var(--shadow-card-elevated)",
          width: "100%", maxWidth: 380,
          display: "flex", flexDirection: "column", maxHeight: "85vh",
        }}>

          {/* Header */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "16px 20px", borderBottom: "1px solid var(--line)", flexShrink: 0,
          }}>
            <h2 style={{ fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 16, color: "var(--ink)", margin: 0 }}>Filter</h2>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              {hasAny && (
                <button
                  onClick={clearAll}
                  style={{ fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600, color: "var(--brand)", background: "none", border: "none", cursor: "pointer" }}
                >
                  Clear all
                </button>
              )}
              <button
                onClick={onClose}
                style={{ color: "var(--ink-mute)", background: "none", border: "none", cursor: "pointer", display: "flex" }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Scrollable body */}
          <div style={{ overflowY: "auto", flex: 1, padding: "20px", display: "flex", flexDirection: "column", gap: 24 }}>

            {/* Seen / Unseen */}
            <section>
              <span style={sectionLabel}>Watched</span>
              <div style={{ display: "flex", gap: 8 }}>
                {[
                  { value: "seen",   label: "Only Rated" },
                  { value: "unseen", label: "Not Rated"  },
                ].map(({ value, label }) => (
                  <Pill
                    key={value}
                    active={filters.seenFilter === value}
                    onClick={() => patch({ seenFilter: filters.seenFilter === value ? null : value })}
                  >
                    {label}
                  </Pill>
                ))}
              </div>
            </section>

            {/* Language */}
            <section>
              <span style={sectionLabel}>Language</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {FILTER_LANGUAGES.map((l) => (
                  <Pill
                    key={l.code}
                    active={filters.language === l.code}
                    onClick={() => patch({ language: filters.language === l.code ? null : l.code })}
                  >
                    {l.label}
                  </Pill>
                ))}
              </div>
            </section>

            {/* Decade */}
            <section>
              <span style={sectionLabel}>Decade</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {FILTER_DECADES.map((d) => (
                  <Pill
                    key={d.label}
                    active={filters.decade?.label === d.label}
                    onClick={() => patch({ decade: filters.decade?.label === d.label ? null : d })}
                  >
                    {d.label}
                  </Pill>
                ))}
              </div>
            </section>

            {/* Actor */}
            <section>
              <span style={sectionLabel}>Actor</span>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  placeholder="Search actor…"
                  value={actorQuery}
                  onChange={(e) => {
                    setActorQuery(e.target.value);
                    if (!e.target.value) patch({ actorId: null, actorName: "" });
                  }}
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = "var(--brand)"}
                  onBlur={e => e.target.style.borderColor = "var(--line)"}
                />
                {actorQuery && (
                  <button
                    onClick={() => { setActorQuery(""); setActorSuggestions([]); patch({ actorId: null, actorName: "" }); }}
                    style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--ink-mute)", background: "none", border: "none", cursor: "pointer", display: "flex" }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12" /></svg>
                  </button>
                )}
                {actorSuggestions.length > 0 && (
                  <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4, background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, boxShadow: "var(--shadow-card)", zIndex: 10, overflow: "hidden" }}>
                    {actorSuggestions.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => { setActorQuery(p.name); setActorSuggestions([]); patch({ actorId: p.id, actorName: p.name }); }}
                        style={{ width: "100%", textAlign: "left", padding: "10px 14px", fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--ink)", background: "none", border: "none", borderBottom: "1px solid var(--line)", cursor: "pointer" }}
                        onMouseEnter={e => e.currentTarget.style.background = "var(--sunk)"}
                        onMouseLeave={e => e.currentTarget.style.background = "none"}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {filters.actorId && (
                <p style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--brand)", marginTop: 6, fontWeight: 500 }}>
                  {filters.actorName}
                </p>
              )}
            </section>

            {/* Director */}
            <section>
              <span style={sectionLabel}>Director</span>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  placeholder="Search director…"
                  value={directorQuery}
                  onChange={(e) => {
                    setDirectorQuery(e.target.value);
                    if (!e.target.value) patch({ directorId: null, directorName: "" });
                  }}
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = "var(--brand)"}
                  onBlur={e => e.target.style.borderColor = "var(--line)"}
                />
                {directorQuery && (
                  <button
                    onClick={() => { setDirectorQuery(""); setDirectorSuggestions([]); patch({ directorId: null, directorName: "" }); }}
                    style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--ink-mute)", background: "none", border: "none", cursor: "pointer", display: "flex" }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12" /></svg>
                  </button>
                )}
                {directorSuggestions.length > 0 && (
                  <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4, background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, boxShadow: "var(--shadow-card)", zIndex: 10, overflow: "hidden" }}>
                    {directorSuggestions.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => { setDirectorQuery(p.name); setDirectorSuggestions([]); patch({ directorId: p.id, directorName: p.name }); }}
                        style={{ width: "100%", textAlign: "left", padding: "10px 14px", fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--ink)", background: "none", border: "none", borderBottom: "1px solid var(--line)", cursor: "pointer" }}
                        onMouseEnter={e => e.currentTarget.style.background = "var(--sunk)"}
                        onMouseLeave={e => e.currentTarget.style.background = "none"}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {filters.directorId && (
                <p style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--brand)", marginTop: 6, fontWeight: 500 }}>
                  {filters.directorName}
                </p>
              )}
            </section>
          </div>

          {/* Done button */}
          <div style={{ padding: "12px 20px 20px", flexShrink: 0, borderTop: "1px solid var(--line)" }}>
            <button
              onClick={onClose}
              style={{
                width: "100%", background: "var(--brand)", color: "#fff",
                border: "none", borderRadius: "var(--radius-pill)",
                padding: "13px 20px",
                fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 14,
                cursor: "pointer", boxShadow: "var(--shadow-brand)",
              }}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
