-- Points and Gamification Schema

-- User Points Table
CREATE TABLE IF NOT EXISTS user_points (
  user_id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  total_points INT DEFAULT 0,
  this_month_points INT DEFAULT 0,
  current_tier VARCHAR(20) DEFAULT 'silver',
  is_founder BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Referrals Table
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID REFERENCES auth.users ON DELETE CASCADE,
  referee_id UUID REFERENCES auth.users ON DELETE CASCADE,
  code VARCHAR(10) UNIQUE NOT NULL,
  points_earned INT DEFAULT 0,
  milestone_awarded BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(referrer_id, referee_id)
);

-- Points History (for tracking individual point gains)
CREATE TABLE IF NOT EXISTS points_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  action VARCHAR(50),
  points_earned INT,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Referral Codes (track which code belongs to which user)
CREATE TABLE IF NOT EXISTS referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users ON DELETE CASCADE,
  code VARCHAR(10) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add RLS Policies
ALTER TABLE user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view all points (for leaderboards)
CREATE POLICY "Points are publicly readable" ON user_points
  FOR SELECT USING (true);

-- RLS: Only user can update their own points
CREATE POLICY "Users can update own points" ON user_points
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS: Referrals are readable
CREATE POLICY "Referrals readable" ON referrals
  FOR SELECT USING (true);

-- RLS: Points history is readable
CREATE POLICY "Points history readable" ON points_history
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() IS NULL);

-- RLS: Referral codes readable by owner
CREATE POLICY "Referral codes readable by owner" ON referral_codes
  FOR SELECT USING (auth.uid() = user_id OR true);

-- Indexes for performance
CREATE INDEX idx_user_points_total ON user_points(total_points DESC);
CREATE INDEX idx_user_points_month ON user_points(this_month_points DESC);
CREATE INDEX idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX idx_referrals_referee ON referrals(referee_id);
CREATE INDEX idx_referrals_code ON referrals(code);
CREATE INDEX idx_points_history_user ON points_history(user_id);
CREATE INDEX idx_referral_codes_user ON referral_codes(user_id);

-- Trigger to update user_points.updated_at
CREATE OR REPLACE FUNCTION update_user_points_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_points_update_timestamp
BEFORE UPDATE ON user_points
FOR EACH ROW
EXECUTE FUNCTION update_user_points_timestamp();
