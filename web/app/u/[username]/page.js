import { supabase } from "../../../lib/supabase";
import Link from "next/link";

const FLAGS = { IN:"🇮🇳",US:"🇺🇸",GB:"🇬🇧",CA:"🇨🇦",AU:"🇦🇺",AE:"🇦🇪",SG:"🇸🇬",NZ:"🇳🇿",ZA:"🇿🇦",MY:"🇲🇾",QA:"🇶🇦" };

export default async function ProfileCardPage({ params }) {
  const { username } = await params;

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("user_id, display_name, username, country, city, languages, dna, streak_current")
    .eq("username", username)
    .single();

  if (!profile) {
    return (
      <div style={{ textAlign: "center", padding: "128px 16px", color: "var(--ink-mute)" }}>
        <p style={{ fontFamily: "var(--font-serif)", fontSize: 20, color: "var(--ink-soft)", marginBottom: 8 }}>Profile not found</p>
        <Link href="/" style={{ color: "var(--brand)", fontWeight: 600 }}>← Home</Link>
      </div>
    );
  }

  const { data: reactions } = await supabase
    .from("user_reactions")
    .select("rating, score")
    .eq("user_id", profile.user_id)
    .gt("rating", 0);

  const rated = reactions ?? [];
  const loved = rated.filter(r => r.rating === 5).length;
  const scored = rated.filter(r => r.score != null);
  const avgScore = scored.length ? Math.round(scored.reduce((s, r) => s + r.score, 0) / scored.length) : 0;

  const displayName = profile.display_name || profile.username || "User";
  const initials = displayName.slice(0, 2).toUpperCase();
  const location = [profile.city, profile.country ? FLAGS[profile.country] : null].filter(Boolean).join(" · ");

  return (
    <div className="max-w-md mx-auto px-4 py-12 min-h-screen flex items-center justify-center" style={{ background: "var(--paper)" }}>

      {/* Card */}
      <div style={{ width: "100%", background: "var(--brand)", borderRadius: 28, padding: 32, boxShadow: "0 20px 60px rgba(225,75,51,0.3)", color: "#fff" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 900, margin: "0 auto 16px", fontFamily: "var(--font-ui)" }}>
            {initials}
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 900, fontFamily: "var(--font-serif)" }}>{displayName}</h1>
          {profile.username && <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, marginTop: 4 }}>@{profile.username}</p>}
        </div>

        {/* Location */}
        {location && (
          <p style={{ textAlign: "center", color: "rgba(255,255,255,0.7)", fontSize: 13, marginBottom: 24 }}>{location}</p>
        )}

        {/* Stats grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
          <div style={{ background: "rgba(255,255,255,0.12)", borderRadius: 14, padding: 16, textAlign: "center" }}>
            <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 11, marginBottom: 4, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Films Watched</p>
            <p style={{ fontSize: 28, fontWeight: 900, fontFamily: "var(--font-ui)" }}>{rated.length}</p>
          </div>
          <div style={{ background: "rgba(255,255,255,0.12)", borderRadius: 14, padding: 16, textAlign: "center" }}>
            <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 11, marginBottom: 4, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Avg Score</p>
            <p style={{ fontSize: 28, fontWeight: 900, fontFamily: "var(--font-ui)" }}>{avgScore}</p>
          </div>
          <div style={{ background: "rgba(255,255,255,0.12)", borderRadius: 14, padding: 16, textAlign: "center" }}>
            <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 11, marginBottom: 4, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Loved</p>
            <p style={{ fontSize: 28, fontWeight: 900, fontFamily: "var(--font-ui)" }}>{loved}</p>
          </div>
          <div style={{ background: "rgba(255,255,255,0.12)", borderRadius: 14, padding: 16, textAlign: "center" }}>
            <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 11, marginBottom: 4, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Streak</p>
            <p style={{ fontSize: 28, fontWeight: 900, fontFamily: "var(--font-ui)" }}>{profile.streak_current ?? 0}w</p>
          </div>
        </div>

        {/* DNA */}
        {profile.dna?.length > 0 && (
          <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 16, padding: 20, marginBottom: 20 }}>
            <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 12, fontFamily: "var(--font-mono)", fontWeight: 500 }}>Entertainment DNA</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {profile.dna.slice(0, 3).map((arc, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 3 }}>{arc.label}</p>
                    <div style={{ height: 4, background: "rgba(255,255,255,0.2)", borderRadius: 999 }}>
                      <div style={{ height: 4, background: "rgba(255,255,255,0.6)", borderRadius: 999, width: `${arc.pct}%` }} />
                    </div>
                  </div>
                  <span style={{ fontSize: 11, width: 28, textAlign: "right", color: "rgba(255,255,255,0.7)" }}>{arc.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Languages */}
        {profile.languages?.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 8, fontFamily: "var(--font-mono)", fontWeight: 500 }}>Languages</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {profile.languages.map(l => (
                <span key={l} style={{ background: "rgba(255,255,255,0.2)", color: "#fff", fontSize: 11, fontWeight: 500, padding: "4px 10px", borderRadius: 999 }}>
                  {l}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div style={{ paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.2)" }}>
          <Link href={`/people/${profile.user_id}`} style={{ display: "block", width: "100%", background: "#fff", color: "var(--brand)", fontWeight: 700, textAlign: "center", padding: "12px 0", borderRadius: "var(--radius-pill)", fontSize: 14, textDecoration: "none", fontFamily: "var(--font-ui)" }}>
            View Full Profile →
          </Link>
        </div>
      </div>
    </div>
  );
}
