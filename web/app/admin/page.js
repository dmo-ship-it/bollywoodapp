"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase-browser";

const StatCard = ({ label, value, subtext }) => (
  <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 16, padding: 24, boxShadow: "var(--shadow-card)" }}>
    <p style={{ fontSize: 10, fontWeight: 700, color: "var(--ink-mute)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>{label}</p>
    <p style={{ fontSize: 28, fontWeight: 900, color: "var(--ink)", fontFamily: "var(--font-mono)", marginBottom: subtext ? 8 : 0 }}>{value}</p>
    {subtext && <p style={{ fontSize: 11, color: "var(--ink-mute)" }}>{subtext}</p>}
  </div>
);

const MovieRow = ({ rank, title, count, year }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "12px 16px", background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, transition: "border-color 0.15s" }}>
    <div style={{ width: 32, textAlign: "center", fontWeight: 700, color: "var(--ink-mute)", fontFamily: "var(--font-mono)", fontSize: 13 }}>#{rank}</div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <p style={{ fontWeight: 700, color: "var(--ink)", fontSize: 14 }}>{title}</p>
      <p style={{ fontSize: 11, color: "var(--ink-mute)" }}>{year}</p>
    </div>
    <div style={{ textAlign: "right", flexShrink: 0 }}>
      <p style={{ fontSize: 18, fontWeight: 900, color: "var(--brand)", fontFamily: "var(--font-mono)" }}>{count}</p>
      <p style={{ fontSize: 11, color: "var(--ink-mute)" }}>ratings</p>
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
        const { count: userCount } = await supabase
          .from("user_profiles")
          .select("*", { count: "exact", head: true });

        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const { count: activeCount } = await supabase
          .from("user_profiles")
          .select("*", { count: "exact", head: true })
          .gte("updated_at", thirtyDaysAgo);

        const { data: ratingStats } = await supabase
          .from("user_reactions")
          .select("rating");

        const totalRatings = ratingStats?.length || 0;
        const avgRating = totalRatings > 0
          ? (ratingStats.reduce((sum, r) => sum + (r.rating || 0), 0) / totalRatings).toFixed(2)
          : 0;

        const { data: topMovies } = await supabase
          .from("movies")
          .select("id, title, year, total_ratings")
          .order("total_ratings", { ascending: false })
          .limit(10);

        const { data: tierData } = await supabase
          .from("user_points")
          .select("current_tier");

        const tierDistribution = {};
        tierData?.forEach(t => {
          const tier = t.current_tier || "founder";
          tierDistribution[tier] = (tierDistribution[tier] || 0) + 1;
        });

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
        <div className="space-y-8">
          <div className="h-10 rounded-lg shimmer w-1/3" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array(4).fill(0).map((_, i) => (
              <div key={i} className="h-32 rounded-2xl shimmer" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const TIER_LABELS = { founder: "Founder", silver: "Silver", gold: "Gold", platinum: "Platinum", legendary: "Legendary" };
  const TIER_ORDER  = ["founder", "silver", "gold", "platinum", "legendary"];

  return (
    <div className="p-8" style={{ background: "var(--paper)", minHeight: "100vh" }}>
      <div className="mb-8">
        <h1 style={{ fontSize: 28, fontWeight: 900, color: "var(--ink)", fontFamily: "var(--font-ui)", marginBottom: 6 }}>Admin Dashboard</h1>
        <p style={{ color: "var(--ink-mute)", fontSize: 14 }}>Real-time engagement metrics and analytics</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-8 text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard label="Total Users"        value={stats.totalUsers}           subtext={`${stats.activeThisMonth} active this month`} />
        <StatCard label="Film Ratings"       value={stats.totalRatings}         subtext={`Avg: ${stats.avgRating} stars`} />
        <StatCard label="Trivia Responses"   value={stats.triviaParticipation}  subtext="Total attempts" />
        <StatCard label="Referral Conversion" value={`${stats.referralConversion}%`} subtext="To 10-film milestone" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 16, padding: 24, boxShadow: "var(--shadow-card)" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)", marginBottom: 16, fontFamily: "var(--font-ui)" }}>Top 10 Most Rated Films</h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {stats.topMovies.length > 0 ? (
              stats.topMovies.map((movie, idx) => (
                <MovieRow key={movie.id} rank={idx + 1} title={movie.title} year={movie.year} count={movie.total_ratings} />
              ))
            ) : (
              <p style={{ color: "var(--ink-mute)", fontSize: 13 }}>No movies rated yet</p>
            )}
          </div>
        </div>

        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 16, padding: 24, boxShadow: "var(--shadow-card)" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)", marginBottom: 16, fontFamily: "var(--font-ui)" }}>User Tier Distribution</h2>
          <div className="space-y-4">
            {Object.entries(stats.tierDistribution).length > 0 ? (
              Object.entries(stats.tierDistribution)
                .sort((a, b) => TIER_ORDER.indexOf(a[0]) - TIER_ORDER.indexOf(b[0]))
                .map(([tier, count]) => (
                  <div key={tier}>
                    <div className="flex items-center justify-between mb-2">
                      <span style={{ fontWeight: 500, color: "var(--ink-soft)", fontSize: 13 }}>{TIER_LABELS[tier] ?? tier}</span>
                      <span style={{ fontWeight: 700, color: "var(--ink)", fontFamily: "var(--font-mono)", fontSize: 13 }}>{count}</span>
                    </div>
                    <div style={{ height: 6, background: "var(--sunk)", borderRadius: 999, overflow: "hidden" }}>
                      <div
                        style={{ height: "100%", background: "var(--brand)", borderRadius: 999, width: `${Math.min(100, (count / stats.totalUsers) * 100)}%`, transition: "width 0.3s" }}
                      />
                    </div>
                  </div>
                ))
            ) : (
              <p style={{ color: "var(--ink-mute)", fontSize: 13 }}>No tier data available</p>
            )}
          </div>
        </div>
      </div>

      <div style={{ background: "rgba(225,75,51,0.04)", border: "1px solid rgba(225,75,51,0.15)", borderRadius: 16, padding: 24 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)", marginBottom: 16, fontFamily: "var(--font-ui)" }}>Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <a
            href="/admin/trivia"
            style={{ padding: "8px 16px", background: "var(--brand)", color: "#fff", fontWeight: 600, fontSize: 13, borderRadius: 8, textDecoration: "none", fontFamily: "var(--font-ui)" }}
          >
            Manage Trivia Questions
          </a>
          <a
            href="/leaderboards"
            target="_blank"
            style={{ padding: "8px 16px", background: "var(--card)", border: "1px solid var(--line)", color: "var(--brand)", fontWeight: 600, fontSize: 13, borderRadius: 8, textDecoration: "none", fontFamily: "var(--font-ui)" }}
          >
            View Leaderboards
          </a>
        </div>
      </div>
    </div>
  );
}
