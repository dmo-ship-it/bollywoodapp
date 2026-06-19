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
      <div style={{ background: "rgba(225,75,51,0.06)", border: "1px solid rgba(225,75,51,0.15)", borderRadius: 20, padding: 24 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <p style={{ fontSize: 11, color: "var(--ink-mute)", textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 500, marginBottom: 4, fontFamily: "var(--font-mono)" }}>Your Tier</p>
            <p style={{ fontSize: 22, fontWeight: 900, color: "var(--ink)", fontFamily: "var(--font-ui)" }}>{tier.label}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: 36, fontWeight: 900, color: "var(--brand)", fontFamily: "var(--font-ui)" }}>{points.total_points.toLocaleString()}</p>
            <p style={{ fontSize: 11, color: "var(--ink-mute)" }}>total points</p>
          </div>
        </div>

        {/* Progress to next tier */}
        {nextTier && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <p style={{ fontSize: 12, fontWeight: 500, color: "var(--ink-soft)", fontFamily: "var(--font-ui)" }}>Next: {nextTier.label}</p>
              <p style={{ fontSize: 12, fontWeight: 700, color: "var(--brand)", fontFamily: "var(--font-ui)" }}>{pointsNeeded} points to go</p>
            </div>
            <div style={{ height: 8, background: "var(--card)", borderRadius: 999, overflow: "hidden" }}>
              <div style={{ height: 8, background: "var(--brand)", borderRadius: 999, width: `${Math.min(100, progressPercent)}%`, transition: "width 0.5s" }} />
            </div>
          </div>
        )}
        {!nextTier && (
          <p style={{ fontSize: 12, color: "var(--brand)", fontWeight: 700, fontFamily: "var(--font-ui)" }}>Max tier reached!</p>
        )}
      </div>

      {/* Referral Code */}
      {referralCode && (
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 20, padding: 24 }}>
          <p style={{ fontSize: 11, color: "var(--ink-mute)", textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 500, marginBottom: 12, fontFamily: "var(--font-mono)" }}>Your Referral Code</p>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <code style={{ flex: 1, background: "var(--sunk)", padding: "12px 16px", borderRadius: 10, fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--ink)" }}>
              {referralCode}
            </code>
            <button
              onClick={copyReferralCode}
              style={{ padding: "12px 16px", background: "var(--brand)", color: "#fff", fontWeight: 700, borderRadius: 10, border: "none", cursor: "pointer", whiteSpace: "nowrap", fontSize: 14, fontFamily: "var(--font-ui)" }}
            >
              {copied ? "✓ Copied" : "Copy"}
            </button>
          </div>
          <p style={{ fontSize: 12, color: "var(--ink-mute)", fontFamily: "var(--font-ui)" }}>
            Share this code or your unique link to earn points when friends sign up
          </p>
        </div>
      )}

      {/* How to earn points */}
      <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 20, padding: 16 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", marginBottom: 12, fontFamily: "var(--font-ui)" }}>Earn Points</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12, color: "var(--ink-soft)", fontFamily: "var(--font-ui)" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Rate a film</span>
            <span style={{ fontWeight: 700, color: "var(--brand)" }}>+5</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Follow a user</span>
            <span style={{ fontWeight: 700, color: "var(--brand)" }}>+10</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Compare films</span>
            <span style={{ fontWeight: 700, color: "var(--brand)" }}>+15</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Create a list</span>
            <span style={{ fontWeight: 700, color: "var(--brand)" }}>+20</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--line)", paddingTop: 8, marginTop: 4 }}>
            <span>Refer a friend</span>
            <span style={{ fontWeight: 700, color: "var(--brand)" }}>+100</span>
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
