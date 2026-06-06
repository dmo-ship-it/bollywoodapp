"use client";

import { useRef, useState } from "react";

const MEDALS = ["🥇", "🥈", "🥉"];

export default function RankingsShareCard({ movies, isPersonal, language, onClose }) {
  const cardRef = useRef(null);
  const [sharing, setSharing] = useState(false);
  const top5 = movies.slice(0, 5);

  async function handleShare() {
    setSharing(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: null,
      });

      canvas.toBlob(async (blob) => {
        const file = new File([blob], "my-bolly-rankings.png", { type: "image/png" });

        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          await navigator.share({
            title: "My Film Rankings",
            files: [file],
          });
        } else {
          // Fallback: download the image
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
      <div className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
        <div className="w-full max-w-xs">

          {/* The card — this gets captured as image */}
          <div
            ref={cardRef}
            className="rounded-2xl overflow-hidden"
            style={{ background: "linear-gradient(135deg, #1c1917 0%, #292524 60%, #1c1917 100%)" }}
          >
            <div className="p-6">
              {/* Logo */}
              <div className="flex items-center gap-1 mb-5">
                <span className="text-white font-black text-xl tracking-tighter">bolly</span>
                <span className="text-orange-400 text-xl leading-none">•</span>
              </div>

              {/* Title */}
              <p className="text-stone-400 text-[11px] uppercase tracking-widest mb-1">
                {isPersonal ? "My Top Films" : "Top Films"}
                {language !== "All" ? ` · ${language}` : ""}
              </p>

              {/* Film list */}
              <div className="space-y-3 mb-5">
                {top5.map((movie, i) => {
                  const score = Math.round(isPersonal ? movie.userScore : (movie.global_score ?? 0));
                  return (
                    <div key={movie.id} className="flex items-center gap-3">
                      {/* Rank */}
                      <div className="w-6 text-center shrink-0">
                        {i < 3
                          ? <span className="text-base">{MEDALS[i]}</span>
                          : <span className="text-stone-500 text-xs font-bold">#{i + 1}</span>
                        }
                      </div>

                      {/* Poster */}
                      {movie.poster_url && (
                        <img
                          src={movie.poster_url}
                          alt={movie.title}
                          crossOrigin="anonymous"
                          className="w-8 h-11 rounded-md object-cover object-top shrink-0"
                        />
                      )}

                      {/* Title + year */}
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-semibold leading-tight truncate">{movie.title}</p>
                        <p className="text-stone-500 text-[10px]">{movie.year}</p>
                      </div>

                      {/* Score circle */}
                      <div className="w-9 h-9 rounded-full border border-orange-400 flex items-center justify-center shrink-0">
                        <span className="text-orange-400 font-bold text-xs">{score}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <p className="text-stone-600 text-[10px] text-center">bolly.app</p>
            </div>
          </div>

          {/* Actions below card */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleShare}
              disabled={sharing}
              className="flex-1 flex items-center justify-center gap-2 bg-white text-stone-900 font-bold text-sm py-3 rounded-xl hover:bg-stone-100 transition-colors disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              {sharing ? "Generating…" : "Share Image"}
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
