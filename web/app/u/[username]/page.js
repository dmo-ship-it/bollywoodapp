import { supabase } from "../../../lib/supabase";
import Link from "next/link";

const FLAGS = { IN:"🇮🇳",US:"🇺🇸",GB:"🇬🇧",CA:"🇨🇦",AU:"🇦🇺",AE:"🇦🇪",SG:"🇸🇬",NZ:"🇳🇿",ZA:"🇿🇦",MY:"🇲🇾",QA:"🇶🇦" };

export default async function ProfileCardPage({ params }) {
  const { username } = await params;

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("user_id, display_name, username, country, city, languages, dna, streak_current")
    .eq("username", username)
    .single();

  if (!profile) {
    return (
      <div className="text-center py-32 text-stone-400">
        <p className="text-4xl mb-4">🎭</p>
        <p className="text-stone-600 font-medium">Profile not found</p>
        <Link href="/" className="text-orange-600 hover:underline mt-4 block">← Home</Link>
      </div>
    );
  }

  const { data: reactions } = await supabase
    .from("user_reactions")
    .select("rating, score")
    .eq("user_id", profile.user_id)
    .gt("rating", 0);

  const rated = reactions ?? [];
  const loved = rated.filter(r => r.rating === 5).length;
  const scored = rated.filter(r => r.score != null);
  const avgScore = scored.length ? Math.round(scored.reduce((s, r) => s + r.score, 0) / scored.length) : 0;

  const displayName = profile.display_name || profile.username || "User";
  const initials = displayName.slice(0, 2).toUpperCase();
  const location = [profile.city, profile.country ? FLAGS[profile.country] : null].filter(Boolean).join(" · ");

  return (
    <div className="max-w-md mx-auto px-4 py-12 bg-stone-50 min-h-screen flex items-center justify-center">

      {/* Card */}
      <div className="w-full bg-gradient-to-br from-orange-600 to-rose-600 rounded-3xl p-8 shadow-2xl text-white">

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-4xl font-black mx-auto mb-4">
            {initials}
          </div>
          <h1 className="text-3xl font-black">{displayName}</h1>
          {profile.username && <p className="text-orange-100 text-sm">@{profile.username}</p>}
        </div>

        {/* Location */}
        {location && (
          <p className="text-center text-orange-100 text-sm mb-6">{location}</p>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
            <p className="text-orange-100 text-xs mb-1">Films Watched</p>
            <p className="text-3xl font-black">{rated.length}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
            <p className="text-orange-100 text-xs mb-1">Avg Score</p>
            <p className="text-3xl font-black">{avgScore}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
            <p className="text-orange-100 text-xs mb-1">Loved ❤️</p>
            <p className="text-3xl font-black">{loved}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
            <p className="text-orange-100 text-xs mb-1">🔥 Streak</p>
            <p className="text-3xl font-black">{profile.streak_current ?? 0}w</p>
          </div>
        </div>

        {/* DNA */}
        {profile.dna?.length > 0 && (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 mb-6">
            <p className="text-orange-100 text-xs uppercase tracking-widest mb-3 font-medium">Entertainment DNA</p>
            <div className="space-y-2">
              {profile.dna.slice(0, 3).map((arc, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-lg w-5">{arc.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{arc.label}</p>
                    <div className="h-1 bg-white/20 rounded-full">
                      <div className="h-1 bg-white/60 rounded-full" style={{ width: `${arc.pct}%` }} />
                    </div>
                  </div>
                  <span className="text-xs w-6 text-right">{arc.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Languages */}
        {profile.languages?.length > 0 && (
          <div className="mb-6">
            <p className="text-orange-100 text-xs uppercase tracking-widest mb-2 font-medium">Languages</p>
            <div className="flex flex-wrap gap-1.5">
              {profile.languages.map(l => (
                <span key={l} className="bg-white/20 backdrop-blur-sm text-white text-xs font-medium px-2.5 py-1 rounded-full">
                  {l}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="pt-4 border-t border-white/20">
          <Link href={`/people/${profile.user_id}`} className="block w-full bg-white text-orange-600 font-bold text-center py-3 rounded-full hover:bg-orange-50 transition-colors text-sm">
            View Full Profile →
          </Link>
        </div>
      </div>
    </div>
  );
}
