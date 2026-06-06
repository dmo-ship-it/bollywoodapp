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
      <div className="bg-white rounded-2xl shadow-lg border border-stone-100 px-4 py-3 flex items-center gap-3 min-w-64">
        <span className="text-3xl leading-none">{badge.icon}</span>
        <div>
          <p className="text-[10px] text-stone-400 uppercase tracking-widest">Badge unlocked</p>
          <p className="font-semibold text-stone-900 text-sm">{badge.label}</p>
          <p className="text-[11px] text-stone-400 leading-tight">{badge.desc}</p>
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
