"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "../../lib/supabase-browser";

/* ─── Score badge for demo ─── */
function DemoScore({ value, size = 52 }) {
  const fill  = value >= 90 ? "#E14B33" : value >= 70 ? "#E6A437" : value >= 50 ? "#C07A4E" : "#8C8A93";
  const color = value >= 70 && value < 90 ? "#261E19" : "#fff";
  return (
    <div style={{
      width: size, height: size, borderRadius: "28%",
      background: fill, color,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "var(--font-ui)", fontWeight: 800,
      fontSize: size * 0.35, letterSpacing: "-0.02em",
      boxShadow: value >= 90 ? "0 6px 20px rgba(225,75,51,.45)" : "0 4px 12px rgba(0,0,0,.3)",
      flexShrink: 0,
    }}>
      {value}
    </div>
  );
}

/* ─── Poster card — real image with gradient overlay ─── */
function PosterCard({ score, rotate = 0, title, year, posterUrl, zIndex = 1 }) {
  return (
    <div style={{
      position: "absolute",
      width: 210, aspectRatio: "2/3",
      borderRadius: "var(--radius)",
      background: "var(--dark-card)",
      border: "1px solid var(--dark-border)",
      boxShadow: "var(--shadow-dark-card)",
      transform: `rotate(${rotate}deg)`,
      zIndex,
      overflow: "hidden",
      display: "flex", flexDirection: "column", justifyContent: "flex-end",
      padding: 10,
    }}>
      {/* Poster image or striped fallback */}
      {posterUrl ? (
        <img src={posterUrl} alt={title} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <div style={{
          position: "absolute", inset: 0,
          background: "repeating-linear-gradient(135deg, var(--poster-dark-1) 0px, var(--poster-dark-1) 10px, var(--poster-dark-2) 10px, var(--poster-dark-2) 20px)",
        }} />
      )}
      {/* Gradient overlay so text is legible */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,.85) 0%, rgba(0,0,0,.2) 50%, transparent 100%)" }} />
      <div style={{ position: "relative", zIndex: 2 }}>
        <div style={{ fontFamily: "var(--font-serif)", fontSize: 12, color: "#fff", lineHeight: 1.2, marginBottom: 3 }}>{title}</div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--cream-caption)", letterSpacing: "0.08em" }}>{year}</div>
      </div>
      {/* Score badge */}
      <div style={{ position: "absolute", top: 8, right: 8, zIndex: 3 }}>
        <DemoScore value={score} size={36} />
      </div>
    </div>
  );
}

/* ─── Step card ─── */
function StepCard({ num, title, body }) {
  return (
    <div style={{
      background: "var(--card)", border: "1px solid var(--line)",
      borderRadius: "var(--radius)", padding: "28px 28px 32px",
      boxShadow: "var(--shadow-card)",
    }}>
      <div style={{
        fontFamily: "var(--font-serif)", fontSize: 52, color: "var(--brand)",
        lineHeight: 1, marginBottom: 16, fontWeight: 400,
      }}>0{num}</div>
      <div style={{ fontFamily: "var(--font-serif)", fontSize: 22, color: "var(--ink)", marginBottom: 10 }}>{title}</div>
      <div style={{ fontFamily: "var(--font-ui)", fontSize: 15, color: "var(--ink-soft)", lineHeight: 1.6 }}>{body}</div>
    </div>
  );
}

export default function LoginPage() {
  const [email,       setEmail]       = useState("");
  const [sent,        setSent]        = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");
  const [heroMovies,  setHeroMovies]  = useState([]);
  const [demoMovie,   setDemoMovie]   = useState(null);
  const supabase = createClient();
  const searchParams = useSearchParams();
  const deleted = searchParams.get("deleted") === "1";

  useEffect(() => {
    // Fetch a pool and pick 3 from distinct decades
    supabase
      .from("movies")
      .select("id, title, year, poster_url, tmdb_rating")
      .not("poster_url", "is", null)
      .not("year", "is", null)
      .gte("tmdb_rating", 7.0)
      .order("tmdb_popularity", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (!data?.length) return;
        // Group by decade, keep top-popularity film per decade
        const byDecade = {};
        for (const movie of data) {
          const decade = Math.floor(movie.year / 10) * 10;
          if (!byDecade[decade]) byDecade[decade] = movie;
        }
        const decades = Object.keys(byDecade).map(Number).sort((a, b) => a - b);
        // Pick from old, middle, and recent third
        const pick = (idx) => byDecade[decades[idx]];
        const selected = [
          pick(0),
          pick(Math.floor((decades.length - 1) / 2)),
          pick(decades.length - 1),
        ].filter(Boolean);
        setHeroMovies(selected);
      });

    // Demo card: top popular film
    supabase
      .from("movies")
      .select("id, title, year, poster_url, tmdb_rating")
      .not("poster_url", "is", null)
      .gte("tmdb_rating", 7.5)
      .order("tmdb_popularity", { ascending: false })
      .limit(1)
      .then(({ data }) => { if (data?.[0]) setDemoMovie(data[0]); });
  }, []);

  async function handleMagicLink(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback?next=/onboarding` },
    });
    if (error) setError(error.message);
    else setSent(true);
    setLoading(false);
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback?next=/onboarding` },
    });
  }

  return (
    <div style={{ fontFamily: "var(--font-ui)", background: "var(--paper)", minHeight: "100vh" }}>

      {/* ═══ HERO — dark theater ═══ */}
      <section style={{ background: "var(--surface-dark)", position: "relative", overflow: "hidden", minHeight: "100vh", display: "flex", flexDirection: "column" }}>

        {/* Radial glows */}
        <div className="glow-pulse" style={{
          position: "absolute", top: -120, right: -120,
          width: 520, height: 520, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(225,75,51,.50) 0%, transparent 70%)",
          filter: "blur(24px)", pointerEvents: "none",
        }} />
        <div className="glow-pulse" style={{
          position: "absolute", bottom: -120, left: -80,
          width: 440, height: 440, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(230,164,55,.26) 0%, transparent 70%)",
          filter: "blur(24px)", pointerEvents: "none",
          animationDelay: "3s",
        }} />

        {/* Nav */}
        <nav style={{ position: "relative", zIndex: 10, maxWidth: 1200, margin: "0 auto", padding: "20px 36px", display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 13, textDecoration: "none" }}>
            <div style={{
              width: 38, height: 38, borderRadius: "22%",
              background: "var(--brand)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "var(--shadow-brand-glow)",
            }}>
              <span style={{ fontFamily: "var(--font-serif)", fontSize: 26, color: "#fff", lineHeight: 1, marginTop: -2 }}>R</span>
            </div>
            <span style={{ fontFamily: "var(--font-serif)", fontSize: 26, color: "var(--cream-ui)", letterSpacing: "0.01em" }}>
              Rasika<span style={{ color: "var(--brand)" }}>.</span>
            </span>
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <Link href="/" style={{ fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--cream-nav)", textDecoration: "none" }}>Back to app</Link>
          </div>
        </nav>

        {/* Hero content */}
        <div style={{
          position: "relative", zIndex: 10,
          flex: 1, display: "flex", alignItems: "center",
          maxWidth: 1200, margin: "0 auto", padding: "40px 36px 80px",
          width: "100%",
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, alignItems: "center", width: "100%" }}>

            {/* Left column */}
            <div style={{ maxWidth: 540 }}>
              {/* Eyebrow pill */}
              <div style={{
                display: "inline-flex", alignItems: "center",
                padding: "8px 16px", marginBottom: 28,
                border: "1px solid rgba(230,164,55,.4)", borderRadius: "var(--radius-pill)",
                fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.14em",
                textTransform: "uppercase", color: "#F0C98A",
                background: "rgba(240,201,138,.05)",
              }}>
                Taste-driven Indian cinema
              </div>

              {deleted && (
                <div style={{
                  background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)",
                  borderRadius: "var(--radius)", padding: "12px 18px", marginBottom: 24,
                  fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--cream-body)",
                }}>
                  Your account has been deleted. Sorry to see you go.
                </div>
              )}

              <h1 style={{
                fontFamily: "var(--font-serif)", fontWeight: 400,
                fontSize: "clamp(42px, 6vw, 82px)",
                lineHeight: 0.96, letterSpacing: "-0.01em",
                color: "var(--cream-light)", margin: "0 0 24px",
              }}>
                Discover stories<br />
                you'll love<span style={{ color: "var(--brand)" }}>.</span>
              </h1>

              <p style={{
                fontFamily: "var(--font-ui)", fontSize: 18, lineHeight: 1.6,
                color: "var(--cream-body)", margin: "0 0 36px", maxWidth: 460,
              }}>
                A film-ranking home for the curious. Instead of one global score, Rasika predicts how much <em style={{ fontStyle: "italic", color: "var(--cream-ui)" }}>you</em> will love a film — and connects you with people who share your taste.
              </p>

              {/* Auth form */}
              {sent ? (
                <div style={{
                  background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.12)",
                  borderRadius: "var(--radius)", padding: "32px",
                }}>
                  <div style={{ fontFamily: "var(--font-serif)", fontSize: 24, color: "var(--cream-light)", marginBottom: 10 }}>
                    Check your inbox.
                  </div>
                  <p style={{ fontFamily: "var(--font-ui)", fontSize: 15, color: "var(--cream-body)", lineHeight: 1.6 }}>
                    We sent a magic link to <strong style={{ color: "var(--cream-ui)" }}>{email}</strong>. Click it to sign in — no password needed.
                  </p>
                </div>
              ) : (
                <div>
                  {/* Google button */}
                  <button
                    onClick={handleGoogle}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
                      background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.16)",
                      borderRadius: "var(--radius-pill)", padding: "13px 24px", marginBottom: 16,
                      fontFamily: "var(--font-ui)", fontWeight: 600, fontSize: 15,
                      color: "var(--cream-ui)", cursor: "pointer",
                      transition: "background 0.2s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,.13)"}
                    onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,.08)"}
                  >
                    <GoogleIcon />
                    Continue with Google
                  </button>

                  {/* Divider */}
                  <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                    <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,.12)" }} />
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--cream-caption)", letterSpacing: "0.1em" }}>OR</span>
                    <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,.12)" }} />
                  </div>

                  {/* Email form */}
                  <form onSubmit={handleMagicLink} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        style={{
                          flex: 1, background: "rgba(255,255,255,.06)",
                          border: "1px solid rgba(255,255,255,.16)",
                          borderRadius: "var(--radius-pill)", padding: "13px 20px",
                          fontFamily: "var(--font-ui)", fontSize: 15,
                          color: "var(--cream-ui)", outline: "none",
                        }}
                        onFocus={e => { e.target.style.borderColor = "var(--brand)"; e.target.style.boxShadow = "0 0 0 3px rgba(225,75,51,.2)"; }}
                        onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,.16)"; e.target.style.boxShadow = "none"; }}
                      />
                      <button
                        type="submit"
                        disabled={loading}
                        style={{
                          background: "var(--brand)", color: "#fff",
                          border: "none", borderRadius: "var(--radius-pill)",
                          padding: "13px 22px",
                          fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 14,
                          cursor: "pointer", whiteSpace: "nowrap",
                          boxShadow: "var(--shadow-brand-dark)",
                          opacity: loading ? 0.6 : 1,
                          transition: "all 0.2s",
                        }}
                      >
                        {loading ? "Sending…" : "Get started"}
                      </button>
                    </div>
                    {error && <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "#f87171" }}>{error}</p>}
                  </form>

                  {/* Trust line */}
                  <p style={{
                    fontFamily: "var(--font-mono)", fontSize: 11.5, letterSpacing: "0.06em",
                    color: "var(--cream-caption)", marginTop: 14,
                  }}>
                    Free forever · No ads · 4,200+ films
                  </p>
                </div>
              )}
            </div>

            {/* Right column — poster cluster */}
            <div className="hidden md:flex" style={{ justifyContent: "center", alignItems: "center" }}>
              <div style={{ position: "relative", width: 400, height: 520 }}>
                <PosterCard
                  score={heroMovies[0] ? Math.round(heroMovies[0].tmdb_rating * 10) : 91}
                  rotate={-6} zIndex={1}
                  title={heroMovies[0]?.title ?? "Dilwale Dulhania Le Jayenge"}
                  year={heroMovies[0]?.year ?? "1995"}
                  posterUrl={heroMovies[0]?.poster_url}
                />
                <div style={{ position: "absolute", left: 92, top: 30, zIndex: 3 }}>
                  <PosterCard
                    score={heroMovies[1] ? Math.round(heroMovies[1].tmdb_rating * 10) : 88}
                    rotate={4} zIndex={3}
                    title={heroMovies[1]?.title ?? "Lagaan"}
                    year={heroMovies[1]?.year ?? "2001"}
                    posterUrl={heroMovies[1]?.poster_url}
                  />
                </div>
                <div style={{ position: "absolute", left: 177, top: -15, zIndex: 2 }}>
                  <PosterCard
                    score={heroMovies[2] ? Math.round(heroMovies[2].tmdb_rating * 10) : 84}
                    rotate={-3} zIndex={2}
                    title={heroMovies[2]?.title ?? "Tumbbad"}
                    year={heroMovies[2]?.year ?? "2018"}
                    posterUrl={heroMovies[2]?.poster_url}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section style={{ background: "var(--sunk)", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "84px 36px" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--ink-mute)", marginBottom: 14 }}>
            How Rasika works
          </div>
          <h2 style={{ fontFamily: "var(--font-serif)", fontWeight: 400, fontSize: "clamp(28px,4vw,46px)", lineHeight: 1.05, color: "var(--ink)", margin: "0 0 48px", maxWidth: 560 }}>
            Your taste, turned into a number you trust.
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 24 }}>
            <StepCard
              num={1}
              title="Rank what you've seen"
              body="Rate films you know. Every rating teaches Rasika what you love — pace, mood, director, decade."
            />
            <StepCard
              num={2}
              title="Discover your match"
              body="Every film gets a personal score just for you — not a global average. If it's 95 for you, it means something."
            />
            <StepCard
              num={3}
              title="Find your taste twins"
              body="See who else shares your ranking instincts. Their watchlists become your best recommendation engine."
            />
          </div>
        </div>
      </section>

      {/* ═══ YOUR SCORE ═══ */}
      <section style={{ background: "var(--paper)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "84px 36px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 60, alignItems: "center" }}>
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--brand)", marginBottom: 14 }}>
                What makes Rasika different
              </div>
              <h2 style={{ fontFamily: "var(--font-serif)", fontWeight: 400, fontSize: "clamp(28px,4vw,46px)", lineHeight: 1.05, color: "var(--ink)", margin: "0 0 24px" }}>
                Not just a score.<br />Your score.
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--brand)", marginTop: 7, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 15, color: "var(--ink)", marginBottom: 4 }}>Your match</div>
                    <div style={{ fontFamily: "var(--font-ui)", fontSize: 15, color: "var(--ink-soft)", lineHeight: 1.6 }}>A percentage that says how much <em>you specifically</em> are likely to love this film — based on your real taste profile.</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--saffron)", marginTop: 7, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 15, color: "var(--ink)", marginBottom: 4 }}>Taste twins</div>
                    <div style={{ fontFamily: "var(--font-ui)", fontSize: 15, color: "var(--ink-soft)", lineHeight: 1.6 }}>People who rank films the same way you do. When they love something, you probably will too.</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Demo card */}
            <div style={{
              background: "var(--card)", border: "1px solid var(--line)",
              borderRadius: "var(--radius)", padding: "28px",
              boxShadow: "var(--shadow-card-elevated)",
            }}>
              <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
                {/* Real poster */}
                <div style={{ width: 72, flexShrink: 0, aspectRatio: "2/3", borderRadius: 10, overflow: "hidden", background: "var(--sunk)" }}>
                  {demoMovie?.poster_url && (
                    <img src={demoMovie.poster_url} alt={demoMovie.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "var(--font-serif)", fontSize: 20, color: "var(--ink)", marginBottom: 4 }}>
                    {demoMovie?.title ?? "Tumbbad"}
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-mute)", letterSpacing: "0.06em" }}>
                    {demoMovie?.year ?? "2018"}
                  </div>
                  <div style={{ fontFamily: "var(--font-ui)", fontStyle: "italic", fontSize: 13, color: "var(--ink-soft)", marginTop: 8, lineHeight: 1.5 }}>
                    "Almost certainly you'll love this."
                  </div>
                </div>
              </div>

              {/* Dual scores */}
              <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
                {/* Match ring */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <div style={{
                    width: 62, height: 62, borderRadius: "50%",
                    background: "conic-gradient(var(--brand) 0% 95%, #EFE1DC 95% 100%)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <div style={{
                      width: 46, height: 46, borderRadius: "50%", background: "#fff",
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    }}>
                      <span style={{ fontFamily: "var(--font-ui)", fontWeight: 800, fontSize: 16, color: "var(--ink)", lineHeight: 1 }}>95%</span>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "var(--ink-mute)", letterSpacing: "0.06em", textTransform: "uppercase" }}>match</span>
                    </div>
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink-mute)", letterSpacing: "0.06em", textAlign: "center" }}>
                    Your match
                  </div>
                </div>

                {/* Global score */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <DemoScore value={demoMovie ? Math.round(demoMovie.tmdb_rating * 10) : 68} size={62} />
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink-mute)", letterSpacing: "0.06em", textAlign: "center" }}>
                    Global score
                  </div>
                </div>

                <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
                  <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--ink-mute)", lineHeight: 1.5 }}>
                    Mixed global reviews, but it's almost certainly <em style={{ color: "var(--ink-soft)" }}>for you</em>.
                  </div>
                </div>
              </div>

              {/* Taste twins */}
              <div style={{ borderTop: "1px solid var(--line)", paddingTop: 16, display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ display: "flex" }}>
                  {["#E14B33","#E6A437","#C07A4E","#7A6A5C"].map((bg, i) => (
                    <div key={i} style={{
                      width: 28, height: 28, borderRadius: "50%",
                      background: bg, border: "2px solid #fff",
                      marginLeft: i === 0 ? 0 : -9,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 10, color: "#fff",
                    }}>
                      {["A","B","C","D"][i]}
                    </div>
                  ))}
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%",
                    background: "#E0D7C9", border: "2px solid #fff", marginLeft: -9,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: 9, color: "var(--ink-soft)",
                  }}>+1.2k</div>
                </div>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--ink-soft)" }}>
                  Loved by <strong style={{ color: "var(--ink)" }}>1,240</strong> of your taste twins
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ SIGN UP BAND — dark ═══ */}
      <section style={{ background: "var(--surface-dark)", position: "relative", overflow: "hidden" }}>
        <div className="glow-pulse" style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: 600, height: 300, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(225,75,51,.35) 0%, transparent 70%)",
          filter: "blur(24px)", pointerEvents: "none",
          animationDelay: "1s",
        }} />
        <div style={{
          position: "relative", zIndex: 10,
          maxWidth: 600, margin: "0 auto", padding: "88px 36px",
          textAlign: "center",
        }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--cream-caption)", marginBottom: 14 }}>
            Join in 30 seconds
          </div>
          <h2 style={{ fontFamily: "var(--font-serif)", fontWeight: 400, fontSize: "clamp(32px,5vw,58px)", lineHeight: 1.0, color: "var(--cream-light)", margin: "0 0 20px", letterSpacing: "-0.01em" }}>
            Start ranking tonight<span style={{ color: "var(--brand)" }}>.</span>
          </h2>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: 17, color: "var(--cream-body)", lineHeight: 1.6, margin: "0 0 36px" }}>
            Free forever. No ads. Every rating makes your recommendations smarter.
          </p>
          <form onSubmit={handleMagicLink} style={{ display: "flex", gap: 8, maxWidth: 460, margin: "0 auto" }}>
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                flex: 1, background: "rgba(255,255,255,.06)",
                border: "1px solid rgba(255,255,255,.16)",
                borderRadius: "var(--radius-pill)", padding: "13px 20px",
                fontFamily: "var(--font-ui)", fontSize: 15,
                color: "var(--cream-ui)", outline: "none",
              }}
              onFocus={e => { e.target.style.borderColor = "var(--brand)"; e.target.style.boxShadow = "0 0 0 3px rgba(225,75,51,.2)"; }}
              onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,.16)"; e.target.style.boxShadow = "none"; }}
            />
            <button
              type="submit"
              disabled={loading || sent}
              style={{
                background: "var(--brand)", color: "#fff",
                border: "none", borderRadius: "var(--radius-pill)",
                padding: "13px 24px",
                fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: 14,
                cursor: "pointer",
                boxShadow: "var(--shadow-brand-dark)",
                opacity: loading || sent ? 0.6 : 1,
                whiteSpace: "nowrap",
              }}
            >
              {sent ? "Check your email" : loading ? "Sending…" : "Create account"}
            </button>
          </form>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer style={{ background: "var(--paper)", borderTop: "1px solid var(--line)" }}>
        <div style={{
          maxWidth: 1200, margin: "0 auto", padding: "32px 36px",
          display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 30, height: 30, borderRadius: "22%",
              background: "var(--brand)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ fontFamily: "var(--font-serif)", fontSize: 20, color: "#fff", lineHeight: 1, marginTop: -1 }}>R</span>
            </div>
            <span style={{ fontFamily: "var(--font-serif)", fontSize: 18, color: "var(--ink)" }}>
              Rasika<span style={{ color: "var(--brand)" }}>.</span>
            </span>
            <span style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 14, color: "var(--ink-mute)" }}>
              Discover stories you'll love.
            </span>
          </div>
          <div style={{ display: "flex", gap: 24 }}>
            {["Discover", "Taste", "Community", "People"].map(label => (
              <Link
                key={label}
                href={label === "Discover" ? "/" : `/${label.toLowerCase()}`}
                style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-mute)", textDecoration: "none" }}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </footer>

    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}
