"use client";

import { useState } from "react";

export default function TrailerPlayer({ trailerUrl }) {
  const [open, setOpen] = useState(false);

  // Convert watch URL to embed URL
  const videoId = trailerUrl?.match(/[?&]v=([^&]+)/)?.[1];
  if (!videoId) return null;

  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-800 transition-colors"
      >
        ▶ Watch Trailer
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative w-full max-w-3xl mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setOpen(false)}
              className="absolute -top-8 right-0 text-white/70 hover:text-white text-sm"
            >
              ✕ Close
            </button>
            <div className="relative aspect-video w-full">
              <iframe
                src={embedUrl}
                className="absolute inset-0 w-full h-full rounded-lg"
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
