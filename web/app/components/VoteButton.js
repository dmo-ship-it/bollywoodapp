"use client";

// Controlled vote widget. Parent owns myVote state and DB logic.
// onVote(type) is called with 'up' or 'down'; parent decides whether to toggle off.
export default function VoteButton({ score = 0, myVote = null, onVote, layout = "vertical" }) {
  const upActive   = myVote === "up";
  const downActive = myVote === "down";
  const scoreColor = upActive ? "text-orange-500" : downActive ? "text-indigo-500" : "text-stone-500";

  const UpArrow = ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 10 8" fill="currentColor">
      <path d="M5 0 L10 8 L0 8 Z"/>
    </svg>
  );
  const DownArrow = ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 10 8" fill="currentColor">
      <path d="M5 8 L10 0 L0 0 Z"/>
    </svg>
  );

  if (layout === "vertical") {
    return (
      <div className="flex flex-col items-center gap-0.5 w-8 shrink-0 pt-0.5">
        <button onClick={() => onVote("up")}
          className={`w-7 h-6 flex items-center justify-center rounded transition-colors ${upActive ? "text-orange-500" : "text-stone-300 hover:text-orange-400"}`}>
          <UpArrow size={10}/>
        </button>
        <span className={`text-[11px] font-bold leading-none ${scoreColor}`}>{score}</span>
        <button onClick={() => onVote("down")}
          className={`w-7 h-6 flex items-center justify-center rounded transition-colors ${downActive ? "text-indigo-500" : "text-stone-300 hover:text-indigo-400"}`}>
          <DownArrow size={10}/>
        </button>
      </div>
    );
  }

  // Horizontal — used inside comment/post footers
  return (
    <div className="flex items-center gap-0.5">
      <button onClick={() => onVote("up")}
        className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${upActive ? "text-orange-500" : "text-stone-300 hover:text-orange-400"}`}>
        <UpArrow size={9}/>
      </button>
      <span className={`text-[11px] font-bold min-w-[1.5ch] text-center ${scoreColor}`}>{score}</span>
      <button onClick={() => onVote("down")}
        className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${downActive ? "text-indigo-500" : "text-stone-300 hover:text-indigo-400"}`}>
        <DownArrow size={9}/>
      </button>
    </div>
  );
}
