/**
 * Points and Gamification System
 * Tracks user engagement, referrals, and tier progression
 */

export const POINT_VALUES = {
  RATE_FILM: 5,
  FOLLOW_USER: 10,
  COMPARE_FILMS: 15,
  CREATE_LIST: 20,
  RECEIVE_WAH: 2,
  REFERRAL_SIGN_UP: 100,
  REFERRAL_MILESTONE: 250, // When referred user rates 10 films
  REFERRAL_BONUS: 50, // Bonus for new user joining with referral
  TRIVIA_ATTEMPT: 5, // For attempting trivia
  TRIVIA_CORRECT: 10, // For correct answer
  TRIVIA_STREAK_10: 50, // Bonus for 10-day streak
  TRIVIA_STREAK_30: 150, // Bonus for 30-day streak
};

export const TIERS = [
  { id: "founder", label: "🏛️ Founder", minPoints: 0, description: "First 100 users", exclusive: true },
  { id: "silver", label: "🥈 Silver Cinephile", minPoints: 500, description: "500 points" },
  { id: "gold", label: "🥇 Gold Cinephile", minPoints: 2000, description: "2000 points" },
  { id: "platinum", label: "💎 Platinum Critic", minPoints: 5000, description: "5000 points" },
  { id: "legendary", label: "👑 Legendary Fan", minPoints: 10000, description: "10000 points" },
];

export function getTierFromPoints(points, isFounder = false) {
  if (isFounder) return TIERS[0];

  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (points >= TIERS[i].minPoints) {
      return TIERS[i];
    }
  }
  return TIERS[0];
}

export function getNextTierForPoints(points, isFounder = false) {
  const currentTier = getTierFromPoints(points, isFounder);
  const currentIndex = TIERS.findIndex(t => t.id === currentTier.id);

  if (currentIndex === TIERS.length - 1) {
    return null; // Already at max tier
  }

  return TIERS[currentIndex + 1];
}

export function getPointsNeededForNextTier(points, isFounder = false) {
  const nextTier = getNextTierForPoints(points, isFounder);
  if (!nextTier) return 0;
  return nextTier.minPoints - points;
}

export function generateReferralCode(userId) {
  // Generate a short, memorable referral code
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Award points to user for various actions
 */
export async function awardPoints(supabase, userId, action, amount = null) {
  const pointAmount = amount || POINT_VALUES[action] || 0;

  if (pointAmount === 0) return null;

  // Get current points
  const { data: current } = await supabase
    .from("user_points")
    .select("total_points, this_month_points")
    .eq("user_id", userId)
    .single();

  const newTotal = (current?.total_points || 0) + pointAmount;
  const newMonth = (current?.this_month_points || 0) + pointAmount;

  // Update points
  const { error } = await supabase
    .from("user_points")
    .upsert({
      user_id: userId,
      total_points: newTotal,
      this_month_points: newMonth,
      updated_at: new Date().toISOString(),
    });

  if (error) console.error("Error awarding points:", error);

  return { pointAmount, newTotal, newMonth };
}

/**
 * Create referral when user signs up with code
 */
export async function recordReferral(supabase, referrerId, refereeId, code) {
  const { error } = await supabase
    .from("referrals")
    .insert({
      referrer_id: referrerId,
      referee_id: refereeId,
      code,
      created_at: new Date().toISOString(),
    });

  if (!error) {
    // Award referrer signup bonus
    await awardPoints(supabase, referrerId, "REFERRAL_SIGN_UP");

    // Award referee bonus
    await awardPoints(supabase, refereeId, "REFERRAL_BONUS");
  }

  return error;
}

/**
 * Check and award referral milestone (when referee rates 10 films)
 */
export async function checkReferralMilestone(supabase, userId) {
  // Find who referred this user
  const { data: referral } = await supabase
    .from("referrals")
    .select("referrer_id, milestone_awarded")
    .eq("referee_id", userId)
    .single();

  if (!referral || referral.milestone_awarded) return null;

  // Check if user has rated 10+ films
  const { count: ratedCount } = await supabase
    .from("user_reactions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gt("rating", 0);

  if (ratedCount >= 10) {
    // Award milestone bonus to referrer
    await awardPoints(supabase, referral.referrer_id, "REFERRAL_MILESTONE");

    // Mark milestone as awarded
    await supabase
      .from("referrals")
      .update({ milestone_awarded: true })
      .eq("referee_id", userId);

    return true;
  }

  return false;
}

/**
 * Get leaderboard for a specific period
 */
export async function getLeaderboard(supabase, type = "all_time", limit = 100) {
  let query = supabase
    .from("user_points")
    .select(`
      user_id,
      total_points,
      this_month_points,
      user_profiles (user_id, display_name, username)
    `)
    .limit(limit);

  if (type === "month") {
    query = query.order("this_month_points", { ascending: false });
  } else {
    query = query.order("total_points", { ascending: false });
  }

  const { data } = await query;
  return (data ?? []).map((item, index) => ({
    rank: index + 1,
    userId: item.user_id,
    displayName: item.user_profiles?.display_name || "User",
    username: item.user_profiles?.username,
    points: type === "month" ? item.this_month_points : item.total_points,
  }));
}

/**
 * Get referral leaderboard
 */
export async function getReferralLeaderboard(supabase, limit = 50) {
  const { data } = await supabase
    .from("referrals")
    .select(`
      referrer_id,
      points_earned,
      user_profiles!referrer_id (display_name, username)
    `)
    .order("points_earned", { ascending: false })
    .limit(limit);

  // Group by referrer
  const grouped = {};
  (data ?? []).forEach(item => {
    const referrerId = item.referrer_id;
    if (!grouped[referrerId]) {
      grouped[referrerId] = {
        userId: referrerId,
        displayName: item.user_profiles?.display_name || "User",
        username: item.user_profiles?.username,
        referrals: 0,
        totalPoints: 0,
      };
    }
    grouped[referrerId].referrals += 1;
    grouped[referrerId].totalPoints += item.points_earned || 0;
  });

  return Object.values(grouped)
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .map((item, index) => ({ ...item, rank: index + 1 }));
}
