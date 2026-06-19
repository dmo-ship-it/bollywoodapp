"use client";

import { useEffect, useState } from "react";

function SingleBadge({ badge, onDone }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Animate in
    const show = setTimeout(() => setVisible(true), 50);
    // Animate out after 3.5s
    const hide = setTimeout(() => setVisible(false), 3500);
    // Remove after fade
    const done = setTimeout(() => onDone(), 4000);
    return () => { clearTimeout(show); clearTimeout(hide); clearTimeout(done); };
  }, []);

  return (
    <div className={`transition-all duration-300 ${visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"}`}>
      <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 16, boxShadow: "var(--shadow-card)", padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, minWidth: 256 }}>
        <div style={{ width: 36, height: 36, borderRadius: "28%", background: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, fontWeight: 900, fontFamily: "var(--font-mono)", flexShrink: 0 }}>
          {badge.label.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <p style={{ fontSize: 10, color: "var(--ink-mute)", textTransform: "uppercase", letterSpacing: "0.12em", fontFamily: "var(--font-mono)" }}>Badge unlocked</p>
          <p style={{ fontWeight: 600, color: "var(--ink)", fontSize: 13, fontFamily: "var(--font-ui)" }}>{badge.label}</p>
          <p style={{ fontSize: 11, color: "var(--ink-mute)", lineHeight: 1.4, fontFamily: "var(--font-ui)" }}>{badge.desc}</p>
        </div>
      </div>
    </div>
  );
}

export default function BadgeToast({ badges }) {
  const [queue, setQueue] = useState(badges);

  if (!queue.length) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 items-center">
      {queue.map((badge, i) => (
        <SingleBadge
          key={badge.id}
          badge={badge}
          onDone={() => setQueue((q) => q.filter((b) => b.id !== badge.id))}
        />
      ))}
    </div>
  );
}
