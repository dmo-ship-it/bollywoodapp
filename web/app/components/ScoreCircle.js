export default function ScoreCircle({ score, size = "md" }) {
  if (!score) return null;

  const sizes = {
    sm: "w-8 h-8 text-[11px]",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
  };

  return (
    <div className={`${sizes[size]} rounded-full border border-orange-200 bg-white flex items-center justify-center shrink-0`}>
      <span className="font-bold text-orange-500">{score}</span>
    </div>
  );
}
