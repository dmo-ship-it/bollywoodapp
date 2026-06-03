"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase-browser";
import { getTasteProfile, getTasteBasedRecommendations } from "../../lib/taste";
import WatchlistButton from "../components/WatchlistButton";
import Link from "next/link";

const RATING_EMOJI = { 5: "❤️", 4: "👍", 3: "😐", 2: "👎", 1: "💔" };

export default function TasteDiscoveryPage() {
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [taste, setTaste] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUser(user);

      const profile = await getTasteProfile(user.id);
      setTaste(profile);

      const recs = await getTasteBasedRecommendations(user.id);
      setRecommendations(recs);
      setLoading(false);
    }
    load();
  }, []);

  if (!user) return null;
  if (loading) return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-center text-stone-400">
      <div className="text-4xl mb-4 animate-pulse">🎬</div>
      Finding films for your taste…
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 bg-stone-50 min-h-screen">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-stone-900 mb-2">Films For Your Taste</h1>
        <p className="text-stone-500 text-sm">
          {recommendations.length > 0
            ? `${recommendations.length} unwatched films perfectly matched to your taste`
            : "No recommendations at this time"}
        </p>
      </div>

      {/* Taste Summary */}
      {taste && recommendations.length > 0 && (
        <div className="bg-gradient-to-r from-orange-50 to-rose-50 border border-orange-100 rounded-2xl p-5 mb-6">
          <p className="text-sm text-stone-700 font-medium">
            Based on your love of <strong>{taste.directorAffinities[0]?.name}</strong> films,
            <strong> {taste.eraBreakdown[0]?.era} era</strong>,
            and <strong>{taste.genreBreakdown[0]?.genre}</strong> stories…
          </p>
        </div>
      )}

      {/* Recommendations Grid */}
      {recommendations.length === 0 ? (
        <div className="text-center py-20 bg-white border border-stone-200 rounded-2xl text-stone-400">
          <p className="text-4xl mb-3">🎬</p>
          <p className="font-medium text-stone-600 mb-1">No more recommendations</p>
          <p className="text-sm mb-4">You've seen all the films matching your taste profile!</p>
          <Link href="/taste-profile" className="text-orange-600 text-sm hover:underline">View taste profile →</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {recommendations.map(film => {
            const score = film.global_score ? Math.round(film.global_score) : null;
            return (
              <div key={film.id} className="group relative">
                <Link href={`/movies/${film.id}`} className="block">
                  {/* Poster */}
                  <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-stone-200 shadow-sm mb-2">
                    {film.poster_url ? (
                      <img
                        src={film.poster_url}
                        alt={film.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-stone-400 text-3xl">🎬</div>
                    )}

                    {/* Taste Match Score */}
                    <div className="absolute bottom-1.5 right-1.5 bg-orange-600 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-sm">
                      {Math.round(film.tasteMatchScore)}
                    </div>

                    {/* Watchlist on hover */}
                    <div className="absolute top-1.5 left-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <div className="bg-white/90 backdrop-blur-sm rounded-lg p-1 shadow-sm">
                        <WatchlistButton movieId={film.id} movieTitle={film.title} />
                      </div>
                    </div>
                  </div>

                  {/* Title + meta */}
                  <p className="text-[11px] font-semibold text-stone-800 line-clamp-2 group-hover:text-orange-600 transition-colors leading-tight">
                    {film.title}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[10px] text-stone-400">{film.year}</span>
                    {score && (
                      <>
                        <span className="text-stone-300">·</span>
                        <span className="text-[10px] text-orange-600 font-semibold">⭐ {score}</span>
                      </>
                    )}
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer CTA */}
      <div className="flex gap-3 justify-center mt-8 pb-8">
        <Link href="/taste-profile" className="bg-white text-stone-900 font-bold px-6 py-3 rounded-full border border-stone-200 hover:bg-stone-50 transition-colors">
          View Taste Profile
        </Link>
        <Link href="/" className="bg-orange-600 text-white font-bold px-6 py-3 rounded-full hover:bg-orange-500 transition-colors">
          Discover More Films
        </Link>
      </div>
    </div>
  );
}
