
-- ============================================
-- PHASE 1.5: SP REBALANCE + DUAL MODE + ANTI-CHEAT
-- ============================================

-- 1. Update SP level thresholds
UPDATE public.sp_levels SET min_sp = 0 WHERE level = 1;
UPDATE public.sp_levels SET min_sp = 400 WHERE level = 2;
UPDATE public.sp_levels SET min_sp = 1200 WHERE level = 3;
UPDATE public.sp_levels SET min_sp = 3000 WHERE level = 4;
UPDATE public.sp_levels SET min_sp = 6000 WHERE level = 5;
UPDATE public.sp_levels SET min_sp = 10000 WHERE level = 6;
UPDATE public.sp_levels SET min_sp = 16000 WHERE level = 7;
UPDATE public.sp_levels SET min_sp = 26000 WHERE level = 8;
UPDATE public.sp_levels SET min_sp = 40000 WHERE level = 9;
UPDATE public.sp_levels SET min_sp = 60000 WHERE level = 10;

-- 2. Add new profile columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS night_sp integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS weekly_sp integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS weekly_rank integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS last_active_at timestamp with time zone DEFAULT now(),
  ADD COLUMN IF NOT EXISTS streak_days integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS daily_sp_earned integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS daily_sp_reset_at date DEFAULT CURRENT_DATE;

-- 3. Create leaderboard_rewards table
CREATE TABLE public.leaderboard_rewards (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  week_start date NOT NULL,
  rank integer NOT NULL,
  bonus_sp integer NOT NULL,
  badge_name text NOT NULL,
  badge_icon text NOT NULL,
  awarded_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_start)
);

ALTER TABLE public.leaderboard_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Rewards viewable by everyone"
  ON public.leaderboard_rewards FOR SELECT
  USING (true);

-- 4. Update record_weekly_score with premium 1.15x + daily/weekly caps + anti-cheat
CREATE OR REPLACE FUNCTION public.record_weekly_score(
  p_user_id uuid,
  p_event_type text,
  p_points integer,
  p_source_id uuid DEFAULT NULL,
  p_city text DEFAULT 'Istanbul'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_week_start date := (date_trunc('week', now()))::date;
  v_is_premium boolean;
  v_final_points integer;
  v_daily_msg_count integer;
  v_daily_sp integer;
  v_weekly_sp integer;
  v_daily_reset date;
  v_last_checkin_at timestamp with time zone;
BEGIN
  -- Get profile data
  SELECT COALESCE(is_premium, false), COALESCE(daily_sp_earned, 0), 
         COALESCE(daily_sp_reset_at, CURRENT_DATE), COALESCE(weekly_sp, 0)
  INTO v_is_premium, v_daily_sp, v_daily_reset, v_weekly_sp
  FROM profiles WHERE user_id = p_user_id;

  -- Reset daily counter if new day
  IF v_daily_reset < CURRENT_DATE THEN
    v_daily_sp := 0;
    UPDATE profiles SET daily_sp_earned = 0, daily_sp_reset_at = CURRENT_DATE
    WHERE user_id = p_user_id;
  END IF;

  -- Daily SP cap: 250
  IF v_daily_sp >= 250 THEN RETURN; END IF;

  -- Weekly SP cap: 1200
  IF v_weekly_sp >= 1200 THEN RETURN; END IF;

  -- Premium multiplier: 1.15x
  v_final_points := CASE WHEN v_is_premium THEN CEIL(p_points * 1.15) ELSE p_points END;

  -- Enforce daily cap
  IF (v_daily_sp + v_final_points) > 250 THEN
    v_final_points := 250 - v_daily_sp;
  END IF;

  -- Enforce weekly cap
  IF (v_weekly_sp + v_final_points) > 1200 THEN
    v_final_points := 1200 - v_weekly_sp;
  END IF;

  IF v_final_points <= 0 THEN RETURN; END IF;

  -- Anti-spam: cap message points at 10 per day
  IF p_event_type = 'message' THEN
    SELECT COUNT(*) INTO v_daily_msg_count
    FROM weekly_score_events
    WHERE user_id = p_user_id
      AND event_type = 'message'
      AND created_at >= date_trunc('day', now())
      AND created_at < date_trunc('day', now()) + interval '1 day';
    IF v_daily_msg_count >= 10 THEN RETURN; END IF;
  END IF;

  -- Anti-cheat: check-in cooldown (10 min same venue)
  IF p_event_type = 'checkin' AND p_source_id IS NOT NULL THEN
    SELECT MAX(created_at) INTO v_last_checkin_at
    FROM weekly_score_events
    WHERE user_id = p_user_id
      AND event_type = 'checkin'
      AND source_id = p_source_id
      AND created_at > now() - interval '10 minutes';
    IF v_last_checkin_at IS NOT NULL THEN RETURN; END IF;
  END IF;

  -- Anti-cheat: story cooldown (3 hours)
  IF p_event_type = 'story' THEN
    SELECT MAX(created_at) INTO v_last_checkin_at
    FROM weekly_score_events
    WHERE user_id = p_user_id
      AND event_type = 'story'
      AND created_at > now() - interval '3 hours';
    IF v_last_checkin_at IS NOT NULL THEN RETURN; END IF;
  END IF;

  -- Insert score event
  INSERT INTO weekly_score_events (user_id, event_type, points, source_id, city, week_start)
  VALUES (p_user_id, p_event_type, v_final_points, p_source_id, p_city, v_week_start);

  -- Update daily/weekly SP counters + night_sp + last_active
  UPDATE profiles
  SET daily_sp_earned = COALESCE(daily_sp_earned, 0) + v_final_points,
      weekly_sp = COALESCE(weekly_sp, 0) + v_final_points,
      night_sp = COALESCE(night_sp, 0) + v_final_points,
      last_active_at = now()
  WHERE user_id = p_user_id;
END;
$$;

-- 5. Update record_day_score with same caps + anti-cheat
CREATE OR REPLACE FUNCTION public.record_day_score(
  p_user_id uuid,
  p_event_type text,
  p_points integer,
  p_source_id uuid DEFAULT NULL,
  p_city text DEFAULT 'Istanbul'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_week_start date := (date_trunc('week', now()))::date;
  v_is_premium boolean;
  v_final_points integer;
  v_daily_sp integer;
  v_weekly_sp integer;
  v_daily_reset date;
  v_last_action_at timestamp with time zone;
BEGIN
  SELECT COALESCE(is_premium, false), COALESCE(daily_sp_earned, 0),
         COALESCE(daily_sp_reset_at, CURRENT_DATE), COALESCE(weekly_sp, 0)
  INTO v_is_premium, v_daily_sp, v_daily_reset, v_weekly_sp
  FROM profiles WHERE user_id = p_user_id;

  IF v_daily_reset < CURRENT_DATE THEN
    v_daily_sp := 0;
    UPDATE profiles SET daily_sp_earned = 0, daily_sp_reset_at = CURRENT_DATE
    WHERE user_id = p_user_id;
  END IF;

  IF v_daily_sp >= 250 THEN RETURN; END IF;
  IF v_weekly_sp >= 1200 THEN RETURN; END IF;

  v_final_points := CASE WHEN v_is_premium THEN CEIL(p_points * 1.15) ELSE p_points END;

  IF (v_daily_sp + v_final_points) > 250 THEN
    v_final_points := 250 - v_daily_sp;
  END IF;
  IF (v_weekly_sp + v_final_points) > 1200 THEN
    v_final_points := 1200 - v_weekly_sp;
  END IF;
  IF v_final_points <= 0 THEN RETURN; END IF;

  -- Anti-cheat: check-in cooldown 10 min
  IF p_event_type = 'checkin' AND p_source_id IS NOT NULL THEN
    SELECT MAX(created_at) INTO v_last_action_at
    FROM day_score_events
    WHERE user_id = p_user_id AND event_type = 'checkin'
      AND source_id = p_source_id AND created_at > now() - interval '10 minutes';
    IF v_last_action_at IS NOT NULL THEN RETURN; END IF;
  END IF;

  -- Anti-cheat: story cooldown 3h
  IF p_event_type = 'story' THEN
    SELECT MAX(created_at) INTO v_last_action_at
    FROM day_score_events
    WHERE user_id = p_user_id AND event_type = 'story'
      AND created_at > now() - interval '3 hours';
    IF v_last_action_at IS NOT NULL THEN RETURN; END IF;
  END IF;

  INSERT INTO day_score_events (user_id, event_type, points, source_id, city, week_start)
  VALUES (p_user_id, p_event_type, v_final_points, p_source_id, p_city, v_week_start);

  UPDATE profiles
  SET daily_sp_earned = COALESCE(daily_sp_earned, 0) + v_final_points,
      weekly_sp = COALESCE(weekly_sp, 0) + v_final_points,
      day_score = COALESCE(day_score, 0) + v_final_points,
      last_active_at = now()
  WHERE user_id = p_user_id;
END;
$$;

-- 6. Recalculate Social Power (updated with night_sp + day_score)
CREATE OR REPLACE FUNCTION public.recalculate_social_power(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_night bigint;
  v_day bigint;
  v_total bigint;
  v_new_level integer;
  v_city text;
  v_percentile numeric(5,2);
  v_rank integer;
BEGIN
  SELECT COALESCE(night_sp, 0), COALESCE(day_score, 0), COALESCE(location, 'Istanbul')
  INTO v_night, v_day, v_city
  FROM profiles WHERE user_id = p_user_id;

  v_total := v_night + v_day;

  SELECT level INTO v_new_level
  FROM sp_levels WHERE min_sp <= v_total
  ORDER BY level DESC LIMIT 1;

  -- City percentile
  WITH ranked AS (
    SELECT user_id,
      PERCENT_RANK() OVER (ORDER BY COALESCE(social_power, 0) ASC) * 100 as pct
    FROM profiles
    WHERE COALESCE(location, 'Istanbul') = v_city
  )
  SELECT ROUND(pct, 2) INTO v_percentile
  FROM ranked WHERE user_id = p_user_id;

  UPDATE profiles
  SET social_power = v_total,
      sp_level = COALESCE(v_new_level, 1),
      city_percentile = v_percentile,
      updated_at = now()
  WHERE user_id = p_user_id;
END;
$$;

-- 7. Award weekly leaderboard bonuses function
CREATE OR REPLACE FUNCTION public.award_weekly_leaderboard_bonuses(p_city text DEFAULT 'Istanbul')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_prev_week date := ((date_trunc('week', now()) - interval '7 days'))::date;
  v_rec RECORD;
  v_bonus integer;
  v_badge_name text;
  v_badge_icon text;
BEGIN
  FOR v_rec IN
    SELECT user_id, rank
    FROM (
      SELECT wse.user_id, ROW_NUMBER() OVER (ORDER BY SUM(wse.points) DESC) as rank
      FROM weekly_score_events wse
      WHERE wse.week_start = v_prev_week AND wse.city = p_city
      GROUP BY wse.user_id
    ) sub
    WHERE rank <= 25
  LOOP
    -- Check user was active in last 7 days
    IF NOT EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = v_rec.user_id 
        AND last_active_at > now() - interval '7 days'
    ) THEN CONTINUE; END IF;

    -- Determine bonus
    CASE v_rec.rank
      WHEN 1 THEN v_bonus := 500; v_badge_name := 'Golden Crown'; v_badge_icon := '👑';
      WHEN 2 THEN v_bonus := 300; v_badge_name := 'Silver Flame'; v_badge_icon := '🥈';
      WHEN 3 THEN v_bonus := 200; v_badge_name := 'Bronze Spark'; v_badge_icon := '🥉';
      ELSE
        IF v_rec.rank <= 10 THEN
          v_bonus := 100; v_badge_name := 'Top 10'; v_badge_icon := '🔟';
        ELSE
          v_bonus := 50; v_badge_name := 'Active Player'; v_badge_icon := '⚡';
        END IF;
    END CASE;

    -- Cap bonus SP at 500
    IF v_bonus > 500 THEN v_bonus := 500; END IF;

    -- Insert reward (unique per user per week)
    INSERT INTO leaderboard_rewards (user_id, week_start, rank, bonus_sp, badge_name, badge_icon)
    VALUES (v_rec.user_id, v_prev_week, v_rec.rank, v_bonus, v_badge_name, v_badge_icon)
    ON CONFLICT (user_id, week_start) DO NOTHING;

    -- Add bonus to social power
    UPDATE profiles
    SET social_power = COALESCE(social_power, 0) + v_bonus,
        night_sp = COALESCE(night_sp, 0) + (v_bonus / 2),
        day_score = COALESCE(day_score, 0) + (v_bonus / 2)
    WHERE user_id = v_rec.user_id;
  END LOOP;
END;
$$;

-- 8. Weekly reset function
CREATE OR REPLACE FUNCTION public.weekly_reset()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Award leaderboard bonuses before reset
  PERFORM award_weekly_leaderboard_bonuses('Istanbul');
  
  -- Reset weekly counters
  UPDATE profiles
  SET weekly_sp = 0,
      weekly_rank = NULL,
      streak_days = CASE 
        WHEN last_active_at > now() - interval '7 days' THEN streak_days
        ELSE 0
      END;
END;
$$;

-- 9. Streak bonus function (called on daily activity)
CREATE OR REPLACE FUNCTION public.update_streak(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_last_active date;
  v_streak integer;
BEGIN
  SELECT last_active_at::date, COALESCE(streak_days, 0)
  INTO v_last_active, v_streak
  FROM profiles WHERE user_id = p_user_id;

  IF v_last_active = CURRENT_DATE THEN
    RETURN; -- Already counted today
  ELSIF v_last_active = CURRENT_DATE - 1 THEN
    v_streak := v_streak + 1;
  ELSE
    v_streak := 1; -- Streak broken
  END IF;

  UPDATE profiles
  SET streak_days = v_streak, last_active_at = now()
  WHERE user_id = p_user_id;

  -- Award 50 bonus SP for 7-day streak
  IF v_streak > 0 AND v_streak % 7 = 0 THEN
    PERFORM record_weekly_score(p_user_id, 'streak_bonus', 50, NULL, 'Istanbul');
  END IF;
END;
$$;
