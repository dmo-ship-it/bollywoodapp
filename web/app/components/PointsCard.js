"use client";

import { useState, useEffect } from "react";
import { createClient } from "../../lib/supabase-browser";
import { getTierFromPoints, getPointsNeededForNextTier, getNextTierForPoints } from "../../lib/points";

export default function PointsCard({ userId, displayName }) {
  const supabase = createClient();
  const [points, setPoints] = useState(null);
  const [referralCode, setReferralCode] = useState(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [pointsRes, codeRes] = await Promise.all([
        supabase.from("user_points").select("total_points, is_founder").eq("user_id", userId).single(),
        supabase.from("referral_codes").select("code").eq("user_id", userId).single(),
      ]);

      setPoints(pointsRes.data);
      setReferralCode(codeRes.data?.code || null);
      setLoading(false);
    }
    load();
  }, []);

  const copyReferralCode = () => {
    if (!referralCode) return;
    navigator.clipboard.writeText(`bollyapp.com?ref=${referralCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return null;
  if (!points) return null;

  const tier = getTierFromPoints(points.total_points, points.is_founder);
  const nextTier = getNextTierForPoints(points.total_points, points.is_founder);
  const pointsNeeded = getPointsNeededForNextTier(points.total_points, points.is_founder);
  const progressPercent = nextTier
    ? ((points.total_points - (TIERS.find(t => t.id === tier.id)?.minPoints || 0)) /
      (nextTier.minPoints - (TIERS.find(t => t.id === tier.id)?.minPoints || 0))) * 100
    : 100;

  return (
    <div className="space-y-4">

      {/* Points & Tier */}
      <div className="bg-gradient-to-r from-orange-100 to-rose-100 border border-orange-200 rounded-2xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-sm text-stone-600 uppercase tracking-widest font-medium mb-1">Your Tier</p>
            <p className="text-2xl font-black text-stone-900">{tier.label}</p>
          </div>
          <div className="text-right">
            <p className="text-4xl font-black text-orange-600">{points.total_points.toLocaleString()}</p>
            <p className="text-xs text-stone-500">total points</p>
          </div>
        </div>

        {/* Progress to next tier */}
        {nextTier && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-stone-600">Next: {nextTier.label}</p>
              <p className="text-xs font-bold text-orange-600">{pointsNeeded} points to go</p>
            </div>
            <div className="h-2 bg-white rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-400 to-rose-400 transition-all duration-500"
                style={{ width: `${Math.min(100, progressPercent)}%` }}
              />
            </div>
          </div>
        )}
        {!nextTier && (
          <p className="text-xs text-orange-600 font-bold">🎉 Max tier reached!</p>
        )}
      </div>

      {/* Referral Code */}
      {referralCode && (
        <div className="bg-white border border-stone-200 rounded-2xl p-6">
          <p className="text-sm text-stone-600 uppercase tracking-widest font-medium mb-3">Your Referral Code</p>
          <div className="flex items-center gap-2 mb-3">
            <code className="flex-1 bg-stone-100 px-4 py-3 rounded-lg font-mono font-bold text-stone-900">
              {referralCode}
            </code>
            <button
              onClick={copyReferralCode}
              className="px-4 py-3 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-500 transition-colors whitespace-nowrap text-sm"
            >
              {copied ? "✓ Copied" : "Copy"}
            </button>
          </div>
          <p className="text-xs text-stone-500">
            Share this code or your unique link to earn points when friends sign up
          </p>
        </div>
      )}

      {/* How to earn points */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4">
        <p className="text-sm font-bold text-stone-900 mb-3">Earn Points</p>
        <div className="space-y-2 text-xs text-stone-600">
          <div className="flex justify-between">
            <span>Rate a film</span>
            <span className="font-bold text-orange-600">+5</span>
          </div>
          <div className="flex justify-between">
            <span>Follow a user</span>
            <span className="font-bold text-orange-600">+10</span>
          </div>
          <div className="flex justify-between">
            <span>Compare films</span>
            <span className="font-bold text-orange-600">+15</span>
          </div>
          <div className="flex justify-between">
            <span>Create a list</span>
            <span className="font-bold text-orange-600">+20</span>
          </div>
          <div className="flex justify-between border-t border-stone-100 pt-2 mt-2">
            <span>Refer a friend</span>
            <span className="font-bold text-orange-600">+100</span>
          </div>
        </div>
      </div>

    </div>
  );
}

const TIERS = [
  { id: "founder", minPoints: 0 },
  { id: "silver", minPoints: 500 },
  { id: "gold", minPoints: 2000 },
  { id: "platinum", minPoints: 5000 },
  { id: "legendary", minPoints: 10000 },
];
