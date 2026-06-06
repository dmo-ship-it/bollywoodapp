"use client";

import { useRef, useState, useEffect } from "react";

export default function RankingsShareCard({ movies, totalRated, isPersonal, language, onClose }) {
  const cardRef   = useRef(null);
  const [sharing, setSharing] = useState(false);
  const [bgReady, setBgReady] = useState(false);
  const top5      = movies.slice(0, 5);
  const topMovie  = movies[0];
  const bgUrl     = topMovie?.backdrop_url || topMovie?.poster_url;

  // Pre-load the background image as a data URL to avoid CORS issues in html2canvas
  const [bgData, setBgData] = useState(null);

  useEffect(() => {
    if (!bgUrl) { setBgReady(true); return; }
    fetch(bgUrl)
      .then((r) => r.blob())
      .then((blob) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setBgData(reader.result);
          setBgReady(true);
        };
        reader.readAsDataURL(blob);
      })
      .catch(() => setBgReady(true)); // fallback to no bg
  }, [bgUrl]);

  async function handleShare() {
    setSharing(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(cardRef.current, {
        scale: 3,
        backgroundColor: "#111111",
        logging: false,
        useCORS: true,
        allowTaint: false,
      });

      canvas.toBlob(async (blob) => {
        const file = new File([blob], "my-bolly-rankings.png", { type: "image/png" });

        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          await navigator.share({ title: "My Film Rankings", files: [file] });
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "my-bolly-rankings.png";
          a.click();
          URL.revokeObjectURL(url);
        }
        setSharing(false);
      }, "image/png");
    } catch (e) {
      console.error(e);
      setSharing(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/70 z-40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
        <div className="w-full max-w-xs">

          {/* Card */}
          <div
            ref={cardRef}
            style={{
              borderRadius: "16px",
              overflow: "hidden",
              position: "relative",
              backgroundColor: "#111111",
            }}
          >
            {/* Background image */}
            {bgData && (
              <div style={{
                position: "absolute", inset: 0,
                backgroundImage: `url(${bgData})`,
                backgroundSize: "cover",
                backgroundPosition: "center top",
                opacity: 0.35,
              }} />
            )}

            {/* Dark gradient overlay */}
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.85) 60%, rgba(0,0,0,0.97) 100%)",
            }} />

            {/* Content */}
            <div style={{ position: "relative", padding: "28px" }}>

              {/* Logo */}
              <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "24px" }}>
                <span style={{ color: "#ffffff", fontWeight: 900, fontSize: "22px", letterSpacing: "-0.5px", fontFamily: "system-ui, sans-serif" }}>bolly</span>
                <span style={{ color: "#f97316", fontSize: "22px", lineHeight: 1, fontFamily: "system-ui, sans-serif" }}>•</span>
              </div>

              {/* Headline */}
              <div style={{ marginBottom: "20px" }}>
                {isPersonal && totalRated > 0 && (
                  <p style={{ color: "#ffffff", fontSize: "15px", fontWeight: 700, fontFamily: "system-ui, sans-serif", marginBottom: "4px", lineHeight: 1.3 }}>
                    I've ranked {totalRated} movies on Bolly
                  </p>
                )}
                <p style={{ color: "#9ca3af", fontSize: "11px", fontFamily: "system-ui, sans-serif", letterSpacing: "0.5px" }}>
                  My Top {top5.length}{language !== "All" ? ` ${language}` : ""}:
                </p>
              </div>

              {/* Films */}
              <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "28px" }}>
                {top5.map((movie, i) => {
                  const score = Math.round(isPersonal ? movie.userScore : (movie.global_score ?? 0));
                  return (
                    <div key={movie.id} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div style={{ width: "24px", textAlign: "center", flexShrink: 0 }}>
                        <span style={{ color: "#6b7280", fontSize: "12px", fontWeight: 700, fontFamily: "system-ui, sans-serif" }}>#{i + 1}</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: "#ffffff", fontSize: "14px", fontWeight: 600, lineHeight: 1.3, fontFamily: "system-ui, sans-serif", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {movie.title}
                        </p>
                        <p style={{ color: "#6b7280", fontSize: "11px", marginTop: "2px", fontFamily: "system-ui, sans-serif" }}>
                          {movie.year}
                        </p>
                      </div>
                      <div style={{ width: "36px", height: "36px", borderRadius: "50%", border: "1.5px solid #f97316", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <span style={{ color: "#f97316", fontSize: "11px", fontWeight: 700, fontFamily: "system-ui, sans-serif" }}>{score}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "16px" }}>
                <p style={{ color: "#4b5563", fontSize: "10px", textAlign: "center", fontFamily: "system-ui, sans-serif", letterSpacing: "1px" }}>
                  BOLLY.APP
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleShare}
              disabled={sharing || !bgReady}
              className="flex-1 flex items-center justify-center gap-2 bg-white text-stone-900 font-bold text-sm py-3 rounded-xl hover:bg-stone-100 transition-colors disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              {!bgReady ? "Loading…" : sharing ? "Generating…" : "Share Image"}
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-white/10 text-white font-bold text-sm py-3 rounded-xl hover:bg-white/20 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
