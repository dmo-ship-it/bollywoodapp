function scoreFill(v) {
  if (v >= 90) return "#E14B33";
  if (v >= 70) return "#E6A437";
  if (v >= 50) return "#C07A4E";
  return "#8C8A93";
}

function scoreTextColor(v) {
  return v >= 70 && v < 90 ? "#261E19" : "#FFFFFF";
}

export default function ScoreCircle({ score, size = "md" }) {
  if (score == null) return null;
  const val = Math.round(Number(score));
  if (isNaN(val)) return null;

  const dim = { sm: 32, md: 40, lg: 48 }[size] ?? 40;
  const fs  = { sm: 11, md: 13, lg: 15 }[size] ?? 13;

  return (
    <div
      style={{
        width: dim, height: dim,
        borderRadius: "28%",
        background: scoreFill(val),
        color: scoreTextColor(val),
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
        fontFamily: "var(--font-ui)",
        fontWeight: 800,
        fontSize: fs,
        letterSpacing: "-0.02em",
        transition: "all 0.25s ease",
      }}
    >
      {val}
    </div>
  );
}
