function getISOWeek(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

function prevISOWeek(isoWeek) {
  const [year, w] = isoWeek.split("-W").map(Number);
  if (w === 1) return `${year - 1}-W52`;
  return `${year}-W${String(w - 1).padStart(2, "0")}`;
}

export async function updateStreak(supabase, userId) {
  const currentWeek = getISOWeek();

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("streak_current, streak_longest, streak_last_week")
    .eq("user_id", userId)
    .single();

  if (!profile) return 0;

  const lastWeek = profile.streak_last_week;
  if (lastWeek === currentWeek) return profile.streak_current ?? 0; // already logged this week

  const newStreak  = lastWeek === prevISOWeek(currentWeek) ? (profile.streak_current ?? 0) + 1 : 1;
  const newLongest = Math.max(profile.streak_longest ?? 0, newStreak);

  await supabase.from("user_profiles").update({
    streak_current:  newStreak,
    streak_longest:  newLongest,
    streak_last_week: currentWeek,
  }).eq("user_id", userId);

  return newStreak;
}
