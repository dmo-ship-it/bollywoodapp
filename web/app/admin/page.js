"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase-browser";

const StatCard = ({ label, value, icon, subtext }) => (
  <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-3xl font-black text-stone-900">{value}</p>
        {subtext && <p className="text-xs text-stone-500 mt-2">{subtext}</p>}
      </div>
      <div className="text-4xl">{icon}</div>
    </div>
  </div>
);

const MovieRow = ({ rank, title, count, year }) => (
  <div className="flex items-center gap-4 p-4 bg-white border border-stone-200 rounded-xl hover:border-orange-300 transition-colors">
    <div className="w-8 text-center font-bold text-stone-600">#{rank}</div>
    <div className="flex-1 min-w-0">
      <p className="font-bold text-stone-900">{title}</p>
      <p className="text-xs text-stone-500">{year}</p>
    </div>
    <div className="text-right shrink-0">
      <p className="text-lg font-black text-orange-600">{count}</p>
      <p className="text-xs text-stone-500">ratings</p>
    </div>
  </div>
);

export default function AdminDashboard() {
  const supabase = createClient();

  const [stats, setStats] = useState({
    totalUsers: 0,
    activeThisMonth: 0,
    totalRatings: 0,
    avgRating: 0,
    topMovies: [],
    tierDistribution: {},
    referralConversion: 0,
    triviaParticipation: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadStats() {
      try {
        // Total users
        const { count: userCount } = await supabase
          .from("user_profiles")
          .select("*", { count: "exact", head: true });

        // Active this month (updated_at in last 30 days)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const { count: activeCount } = await supabase
          .from("user_profiles")
          .select("*", { count: "exact", head: true })
          .gte("updated_at", thirtyDaysAgo);

        // Total ratings and average
        const { data: ratingStats } = await supabase
          .from("user_reactions")
          .select("rating");

        const totalRatings = ratingStats?.length || 0;
        const avgRating = totalRatings > 0
          ? (ratingStats.reduce((sum, r) => sum + (r.rating || 0), 0) / totalRatings).toFixed(2)
          : 0;

        // Top 10 most rated movies
        const { data: topMovies } = await supabase
          .from("movies")
          .select("id, title, year, total_ratings")
          .order("total_ratings", { ascending: false })
          .limit(10);

        // Tier distribution
        const { data: tierData } = await supabase
          .from("user_points")
          .select("current_tier");

        const tierDistribution = {};
        tierData?.forEach(t => {
          const tier = t.current_tier || "founder";
          tierDistribution[tier] = (tierDistribution[tier] || 0) + 1;
        });

        // Referral conversion (milestones awarded / total referrals)
        const { count: totalReferrals } = await supabase
          .from("referrals")
          .select("*", { count: "exact", head: true });

        const { count: milestonesAwarded } = await supabase
          .from("referrals")
          .select("*", { count: "exact", head: true })
          .eq("milestone_awarded", true);

        const referralConversion = totalReferrals > 0
          ? Math.round((milestonesAwarded / totalReferrals) * 100)
          : 0;

        // Trivia participation
        const { count: triviaResponses } = await supabase
          .from("user_trivia_responses")
          .select("*", { count: "exact", head: true });

        setStats({
          totalUsers: userCount || 0,
          activeThisMonth: activeCount || 0,
          totalRatings,
          avgRating,
          topMovies: topMovies || [],
          tierDistribution,
          referralConversion,
          triviaParticipation: triviaResponses || 0,
        });

        setLoading(false);
      } catch (err) {
        console.error("Error loading stats:", err);
        setError("Failed to load statistics");
        setLoading(false);
      }
    }

    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-8">
          <div className="h-10 bg-stone-200 rounded-lg w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array(4).fill(0).map((_, i) => (
              <div key={i} className="h-32 bg-stone-200 rounded-2xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-stone-900 mb-2">📊 Admin Dashboard</h1>
        <p className="text-stone-600">Real-time engagement metrics and analytics</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-8 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          label="Total Users"
          value={stats.totalUsers}
          icon="👥"
          subtext={`${stats.activeThisMonth} active this month`}
        />
        <StatCard
          label="Film Ratings"
          value={stats.totalRatings}
          icon="⭐"
          subtext={`Avg: ${stats.avgRating} stars`}
        />
        <StatCard
          label="Trivia Responses"
          value={stats.triviaParticipation}
          icon="🎬"
          subtext="Total attempts"
        />
        <StatCard
          label="Referral Conversion"
          value={`${stats.referralConversion}%`}
          icon="🔗"
          subtext="To 10-film milestone"
        />
      </div>

      {/* Tier Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Top Movies */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-xl font-bold text-stone-900 mb-4">🏆 Top 10 Most Rated Films</h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {stats.topMovies.length > 0 ? (
              stats.topMovies.map((movie, idx) => (
                <MovieRow
                  key={movie.id}
                  rank={idx + 1}
                  title={movie.title}
                  year={movie.year}
                  count={movie.total_ratings}
                />
              ))
            ) : (
              <p className="text-stone-500 text-sm">No movies rated yet</p>
            )}
          </div>
        </div>

        {/* Tier Distribution */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-xl font-bold text-stone-900 mb-4">🎖️ User Tier Distribution</h2>
          <div className="space-y-4">
            {Object.entries(stats.tierDistribution).length > 0 ? (
              Object.entries(stats.tierDistribution)
                .sort((a, b) => {
                  const tiers = ["founder", "silver", "gold", "platinum", "legendary"];
                  return tiers.indexOf(a[0]) - tiers.indexOf(b[0]);
                })
                .map(([tier, count]) => {
                  const tierEmojis = {
                    founder: "🏛️",
                    silver: "🥈",
                    gold: "🥇",
                    platinum: "💎",
                    legendary: "👑",
                  };
                  const tierLabels = {
                    founder: "Founder",
                    silver: "Silver",
                    gold: "Gold",
                    platinum: "Platinum",
                    legendary: "Legendary",
                  };

                  return (
                    <div key={tier}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-stone-700">
                          {tierEmojis[tier]} {tierLabels[tier]}
                        </span>
                        <span className="font-bold text-stone-900">{count}</span>
                      </div>
                      <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-orange-400 to-rose-400"
                          style={{ width: `${Math.min(100, (count / stats.totalUsers) * 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })
            ) : (
              <p className="text-stone-500 text-sm">No tier data available</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gradient-to-br from-orange-50 to-rose-50 border border-orange-200 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-stone-900 mb-4">⚡ Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <a
            href="/admin/trivia"
            className="px-4 py-2 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-500 transition-colors"
          >
            Manage Trivia Questions
          </a>
          <a
            href="/leaderboards"
            target="_blank"
            className="px-4 py-2 bg-white border border-orange-200 text-orange-600 font-medium rounded-lg hover:bg-orange-50 transition-colors"
          >
            View Leaderboards
          </a>
        </div>
      </div>
    </div>
  );
}
