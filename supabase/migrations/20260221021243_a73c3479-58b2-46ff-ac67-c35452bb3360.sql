
-- ═══════════════════════════════════════════════════════════════════════
-- CITY ASCENSION: Premium Tiers + Rank System + Momentum
-- ═══════════════════════════════════════════════════════════════════════

-- 1) Add new columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_tier text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS district_rank integer,
  ADD COLUMN IF NOT EXISTS city_rank integer,
  ADD COLUMN IF NOT EXISTS global_rank integer,
  ADD COLUMN IF NOT EXISTS momentum_badge_until timestamp with time zone,
  ADD COLUMN IF NOT EXISTS prev_weekly_sp integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS prev_weekly_rank integer;

-- 2) Helper: get tier config (multiplier, daily_cap, weekly_bonus)
CREATE OR REPLACE FUNCTION public.get_tier_config(p_tier text)
RETURNS TABLE(sp_multiplier numeric, daily_cap integer, weekly_bonus integer)
LANGUAGE sql IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT
    CASE p_tier
      WHEN 'plus'  THEN 1.15
      WHEN 'pro'   THEN 1.25
      WHEN 'elite' THEN 1.35
      ELSE 1.00
    END::numeric,
    CASE p_tier
      WHEN 'plus'  THEN 350
      WHEN 'pro'   THEN 500
      WHEN 'elite' THEN 750
      ELSE 250
    END::integer,
    CASE p_tier
      WHEN 'pro'   THEN 150
      WHEN 'elite' THEN 300
      ELSE 0
    END::integer;
$$;

-- 3) Rewrite record_weekly_score to use tier-based caps/multipliers
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
  v_tier text;
  v_sp_mult numeric;
  v_daily_cap integer;
  v_final_points integer;
  v_daily_sp integer;
  v_weekly_sp integer;
  v_daily_reset date;
  v_last_action_at timestamp with time zone;
  v_daily_msg_count integer;
BEGIN
  SELECT COALESCE(subscription_tier, 'free'), COALESCE(daily_sp_earned, 0),
         COALESCE(daily_sp_reset_at, CURRENT_DATE), COALESCE(weekly_sp, 0)
  INTO v_tier, v_daily_sp, v_daily_reset, v_weekly_sp
  FROM profiles WHERE user_id = p_user_id;

  SELECT sp_multiplier, daily_cap INTO v_sp_mult, v_daily_cap
  FROM get_tier_config(v_tier);

  IF v_daily_reset < CURRENT_DATE THEN
    v_daily_sp := 0;
    UPDATE profiles SET daily_sp_earned = 0, daily_sp_reset_at = CURRENT_DATE
    WHERE user_id = p_user_id;
  END IF;

  IF v_daily_sp >= v_daily_cap THEN RETURN; END IF;
  IF v_weekly_sp >= 1200 THEN RETURN; END IF;

  v_final_points := CEIL(p_points * v_sp_mult);

  IF (v_daily_sp + v_final_points) > v_daily_cap THEN
    v_final_points := v_daily_cap - v_daily_sp;
  END IF;
  IF (v_weekly_sp + v_final_points) > 1200 THEN
    v_final_points := 1200 - v_weekly_sp;
  END IF;
  IF v_final_points <= 0 THEN RETURN; END IF;

  -- Anti-spam: message cap
  IF p_event_type = 'message' THEN
    SELECT COUNT(*) INTO v_daily_msg_count
    FROM weekly_score_events
    WHERE user_id = p_user_id AND event_type = 'message'
      AND created_at >= date_trunc('day', now())
      AND created_at < date_trunc('day', now()) + interval '1 day';
    IF v_daily_msg_count >= 10 THEN RETURN; END IF;
  END IF;

  -- Anti-cheat: check-in cooldown 10 min
  IF p_event_type = 'checkin' AND p_source_id IS NOT NULL THEN
    SELECT MAX(created_at) INTO v_last_action_at
    FROM weekly_score_events
    WHERE user_id = p_user_id AND event_type = 'checkin'
      AND source_id = p_source_id AND created_at > now() - interval '10 minutes';
    IF v_last_action_at IS NOT NULL THEN RETURN; END IF;
  END IF;

  -- Anti-cheat: story cooldown 3h
  IF p_event_type = 'story' THEN
    SELECT MAX(created_at) INTO v_last_action_at
    FROM weekly_score_events
    WHERE user_id = p_user_id AND event_type = 'story'
      AND created_at > now() - interval '3 hours';
    IF v_last_action_at IS NOT NULL THEN RETURN; END IF;
  END IF;

  INSERT INTO weekly_score_events (user_id, event_type, points, source_id, city, week_start)
  VALUES (p_user_id, p_event_type, v_final_points, p_source_id, p_city, v_week_start);

  UPDATE profiles
  SET daily_sp_earned = COALESCE(daily_sp_earned, 0) + v_final_points,
      weekly_sp = COALESCE(weekly_sp, 0) + v_final_points,
      night_sp = COALESCE(night_sp, 0) + v_final_points,
      last_active_at = now()
  WHERE user_id = p_user_id;
END;
$$;

-- 4) Rewrite record_day_score with tier-based caps
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
  v_tier text;
  v_sp_mult numeric;
  v_daily_cap integer;
  v_final_points integer;
  v_daily_sp integer;
  v_weekly_sp integer;
  v_daily_reset date;
  v_last_action_at timestamp with time zone;
BEGIN
  SELECT COALESCE(subscription_tier, 'free'), COALESCE(daily_sp_earned, 0),
         COALESCE(daily_sp_reset_at, CURRENT_DATE), COALESCE(weekly_sp, 0)
  INTO v_tier, v_daily_sp, v_daily_reset, v_weekly_sp
  FROM profiles WHERE user_id = p_user_id;

  SELECT sp_multiplier, daily_cap INTO v_sp_mult, v_daily_cap
  FROM get_tier_config(v_tier);

  IF v_daily_reset < CURRENT_DATE THEN
    v_daily_sp := 0;
    UPDATE profiles SET daily_sp_earned = 0, daily_sp_reset_at = CURRENT_DATE
    WHERE user_id = p_user_id;
  END IF;

  IF v_daily_sp >= v_daily_cap THEN RETURN; END IF;
  IF v_weekly_sp >= 1200 THEN RETURN; END IF;

  v_final_points := CEIL(p_points * v_sp_mult);

  IF (v_daily_sp + v_final_points) > v_daily_cap THEN
    v_final_points := v_daily_cap - v_daily_sp;
  END IF;
  IF (v_weekly_sp + v_final_points) > 1200 THEN
    v_final_points := 1200 - v_weekly_sp;
  END IF;
  IF v_final_points <= 0 THEN RETURN; END IF;

  IF p_event_type = 'checkin' AND p_source_id IS NOT NULL THEN
    SELECT MAX(created_at) INTO v_last_action_at
    FROM day_score_events
    WHERE user_id = p_user_id AND event_type = 'checkin'
      AND source_id = p_source_id AND created_at > now() - interval '10 minutes';
    IF v_last_action_at IS NOT NULL THEN RETURN; END IF;
  END IF;

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

-- 5) Recalculate ranks for a city
CREATE OR REPLACE FUNCTION public.recalculate_city_ranks(p_city text DEFAULT 'Istanbul')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- City rank by total social_power
  WITH ranked AS (
    SELECT user_id,
      ROW_NUMBER() OVER (ORDER BY COALESCE(social_power, 0) DESC) as rk
    FROM profiles
    WHERE COALESCE(location, 'Istanbul') = p_city
  )
  UPDATE profiles p
  SET city_rank = r.rk
  FROM ranked r
  WHERE p.user_id = r.user_id;

  -- Global rank (all users)
  WITH ranked AS (
    SELECT user_id,
      ROW_NUMBER() OVER (ORDER BY COALESCE(social_power, 0) DESC) as rk
    FROM profiles
  )
  UPDATE profiles p
  SET global_rank = r.rk
  FROM ranked r
  WHERE p.user_id = r.user_id;
END;
$$;

-- 6) Check momentum badge eligibility
CREATE OR REPLACE FUNCTION public.check_momentum_badge(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_curr_sp integer;
  v_prev_sp integer;
  v_curr_rank integer;
  v_prev_rank integer;
  v_sp_increase numeric;
  v_rank_climb integer;
  v_tier text;
  v_momentum_bonus integer;
BEGIN
  SELECT COALESCE(weekly_sp, 0), COALESCE(prev_weekly_sp, 0),
         COALESCE(weekly_rank, 0), COALESCE(prev_weekly_rank, 0),
         COALESCE(subscription_tier, 'free')
  INTO v_curr_sp, v_prev_sp, v_curr_rank, v_prev_rank, v_tier
  FROM profiles WHERE user_id = p_user_id;

  IF v_prev_sp = 0 THEN RETURN false; END IF;

  v_sp_increase := ((v_curr_sp - v_prev_sp)::numeric / v_prev_sp) * 100;
  v_rank_climb := v_prev_rank - v_curr_rank; -- positive = climbing

  IF v_sp_increase >= 20 AND v_rank_climb >= 5 THEN
    UPDATE profiles
    SET momentum_badge_until = now() + interval '7 days'
    WHERE user_id = p_user_id;

    -- Premium gets 5% momentum bonus
    IF v_tier != 'free' THEN
      v_momentum_bonus := CEIL(v_curr_sp * 0.05);
      UPDATE profiles
      SET social_power = COALESCE(social_power, 0) + v_momentum_bonus
      WHERE user_id = p_user_id;
    END IF;

    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- 7) Enhanced weekly_reset with premium bonuses and rank snapshots
CREATE OR REPLACE FUNCTION public.weekly_reset()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Award leaderboard bonuses before reset
  PERFORM award_weekly_leaderboard_bonuses('Istanbul');

  -- Snapshot current weekly stats before reset
  UPDATE profiles
  SET prev_weekly_sp = COALESCE(weekly_sp, 0),
      prev_weekly_rank = weekly_rank;

  -- Reset weekly counters
  UPDATE profiles
  SET weekly_sp = 0,
      weekly_rank = NULL,
      streak_days = CASE
        WHEN last_active_at > now() - interval '7 days' THEN streak_days
        ELSE 0
      END
  WHERE user_id IS NOT NULL;

  -- Recalculate ranks
  PERFORM recalculate_city_ranks('Istanbul');
END;
$$;

-- 8) Enhanced leaderboard bonuses with premium tier bonus
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
  v_tier text;
  v_tier_bonus integer;
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
    IF NOT EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = v_rec.user_id
        AND last_active_at > now() - interval '7 days'
    ) THEN CONTINUE; END IF;

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

    -- Premium tier weekly bonus
    SELECT COALESCE(subscription_tier, 'free') INTO v_tier
    FROM profiles WHERE user_id = v_rec.user_id;

    SELECT weekly_bonus INTO v_tier_bonus FROM get_tier_config(v_tier);
    v_bonus := v_bonus + COALESCE(v_tier_bonus, 0);

    IF v_bonus > 500 THEN v_bonus := 500; END IF;

    INSERT INTO leaderboard_rewards (user_id, week_start, rank, bonus_sp, badge_name, badge_icon)
    VALUES (v_rec.user_id, v_prev_week, v_rec.rank, v_bonus, v_badge_name, v_badge_icon)
    ON CONFLICT (user_id, week_start) DO NOTHING;

    UPDATE profiles
    SET social_power = COALESCE(social_power, 0) + v_bonus,
        night_sp = COALESCE(night_sp, 0) + (v_bonus / 2),
        day_score = COALESCE(day_score, 0) + (v_bonus / 2)
    WHERE user_id = v_rec.user_id;

    -- Check momentum badge
    PERFORM check_momentum_badge(v_rec.user_id);
  END LOOP;
END;
$$;
