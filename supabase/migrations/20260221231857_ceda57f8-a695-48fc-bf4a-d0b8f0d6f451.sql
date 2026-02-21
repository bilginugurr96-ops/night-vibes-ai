
-- 1. Create cities table
CREATE TABLE public.cities (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  country text NOT NULL DEFAULT 'Turkey',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cities viewable by everyone" ON public.cities FOR SELECT USING (true);

-- Insert Istanbul as default city
INSERT INTO public.cities (name, country) VALUES ('Istanbul', 'Turkey');

-- 2. Add city_id and city_changed_at to profiles
ALTER TABLE public.profiles 
  ADD COLUMN city_id uuid REFERENCES public.cities(id),
  ADD COLUMN city_changed_at timestamp with time zone DEFAULT NULL;

-- Set existing users to Istanbul
UPDATE public.profiles 
SET city_id = (SELECT id FROM public.cities WHERE name = 'Istanbul')
WHERE city_id IS NULL;

-- 3. Add city_id to weekly_score_events and day_score_events
ALTER TABLE public.weekly_score_events ADD COLUMN city_id uuid REFERENCES public.cities(id);
ALTER TABLE public.day_score_events ADD COLUMN city_id uuid REFERENCES public.cities(id);

-- Set existing events to Istanbul
UPDATE public.weekly_score_events 
SET city_id = (SELECT id FROM public.cities WHERE name = 'Istanbul')
WHERE city_id IS NULL;

UPDATE public.day_score_events 
SET city_id = (SELECT id FROM public.cities WHERE name = 'Istanbul')
WHERE city_id IS NULL;

-- 4. Recreate recalculate_city_ranks to use city_id
CREATE OR REPLACE FUNCTION public.recalculate_city_ranks(p_city text DEFAULT 'Istanbul'::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_week_start date := (date_trunc('week', now()))::date;
  v_city_id uuid;
BEGIN
  -- Resolve city_id from name
  SELECT id INTO v_city_id FROM cities WHERE name = p_city;
  IF v_city_id IS NULL THEN RETURN; END IF;

  -- City rank by total social_power (filter by city_id)
  WITH ranked AS (
    SELECT user_id,
      ROW_NUMBER() OVER (ORDER BY COALESCE(social_power, 0) DESC) as rk
    FROM profiles
    WHERE city_id = v_city_id
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

  -- Weekly rank by weekly score events (filter by city_id)
  WITH scores AS (
    SELECT wse.user_id, SUM(wse.points) AS ws
    FROM weekly_score_events wse
    WHERE wse.week_start = v_week_start AND wse.city_id = v_city_id
    GROUP BY wse.user_id
  ),
  ranked AS (
    SELECT user_id, ROW_NUMBER() OVER (ORDER BY ws DESC) as rk
    FROM scores
  )
  UPDATE profiles p
  SET weekly_rank = r.rk
  FROM ranked r
  WHERE p.user_id = r.user_id;
END;
$function$;

-- 5. Recreate recalculate_social_power to use city_id
CREATE OR REPLACE FUNCTION public.recalculate_social_power(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_night bigint;
  v_day bigint;
  v_total bigint;
  v_new_level integer;
  v_city_id uuid;
  v_percentile numeric(5,2);
BEGIN
  SELECT COALESCE(night_sp, 0), COALESCE(day_score, 0), city_id
  INTO v_night, v_day, v_city_id
  FROM profiles WHERE user_id = p_user_id;

  v_total := v_night + v_day;

  SELECT level INTO v_new_level
  FROM sp_levels WHERE min_sp <= v_total
  ORDER BY level DESC LIMIT 1;

  -- City percentile (using city_id)
  WITH ranked AS (
    SELECT user_id,
      (PERCENT_RANK() OVER (ORDER BY COALESCE(social_power, 0) ASC) * 100)::numeric(5,2) as pct
    FROM profiles
    WHERE city_id = v_city_id
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
$function$;

-- 6. Recreate record_weekly_score to use city_id
CREATE OR REPLACE FUNCTION public.record_weekly_score(p_user_id uuid, p_event_type text, p_points integer, p_source_id uuid DEFAULT NULL::uuid, p_city text DEFAULT 'Istanbul'::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  v_city_id uuid;
BEGIN
  -- Get user's city_id from profile
  SELECT COALESCE(subscription_tier, 'free'), COALESCE(daily_sp_earned, 0),
         COALESCE(daily_sp_reset_at, CURRENT_DATE), COALESCE(weekly_sp, 0), city_id
  INTO v_tier, v_daily_sp, v_daily_reset, v_weekly_sp, v_city_id
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

  IF p_event_type = 'message' THEN
    SELECT COUNT(*) INTO v_daily_msg_count
    FROM weekly_score_events
    WHERE user_id = p_user_id AND event_type = 'message'
      AND created_at >= date_trunc('day', now())
      AND created_at < date_trunc('day', now()) + interval '1 day';
    IF v_daily_msg_count >= 10 THEN RETURN; END IF;
  END IF;

  IF p_event_type = 'checkin' AND p_source_id IS NOT NULL THEN
    SELECT MAX(created_at) INTO v_last_action_at
    FROM weekly_score_events
    WHERE user_id = p_user_id AND event_type = 'checkin'
      AND source_id = p_source_id AND created_at > now() - interval '10 minutes';
    IF v_last_action_at IS NOT NULL THEN RETURN; END IF;
  END IF;

  IF p_event_type = 'story' THEN
    SELECT MAX(created_at) INTO v_last_action_at
    FROM weekly_score_events
    WHERE user_id = p_user_id AND event_type = 'story'
      AND created_at > now() - interval '3 hours';
    IF v_last_action_at IS NOT NULL THEN RETURN; END IF;
  END IF;

  INSERT INTO weekly_score_events (user_id, event_type, points, source_id, city, week_start, city_id)
  VALUES (p_user_id, p_event_type, v_final_points, p_source_id, p_city, v_week_start, v_city_id);

  UPDATE profiles
  SET daily_sp_earned = COALESCE(daily_sp_earned, 0) + v_final_points,
      weekly_sp = COALESCE(weekly_sp, 0) + v_final_points,
      night_sp = COALESCE(night_sp, 0) + v_final_points,
      last_active_at = now()
  WHERE user_id = p_user_id;
END;
$function$;

-- 7. Recreate record_day_score to use city_id
CREATE OR REPLACE FUNCTION public.record_day_score(p_user_id uuid, p_event_type text, p_points integer, p_source_id uuid DEFAULT NULL::uuid, p_city text DEFAULT 'Istanbul'::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  v_city_id uuid;
BEGIN
  SELECT COALESCE(subscription_tier, 'free'), COALESCE(daily_sp_earned, 0),
         COALESCE(daily_sp_reset_at, CURRENT_DATE), COALESCE(weekly_sp, 0), city_id
  INTO v_tier, v_daily_sp, v_daily_reset, v_weekly_sp, v_city_id
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

  INSERT INTO day_score_events (user_id, event_type, points, source_id, city, week_start, city_id)
  VALUES (p_user_id, p_event_type, v_final_points, p_source_id, p_city, v_week_start, v_city_id);

  UPDATE profiles
  SET daily_sp_earned = COALESCE(daily_sp_earned, 0) + v_final_points,
      weekly_sp = COALESCE(weekly_sp, 0) + v_final_points,
      day_score = COALESCE(day_score, 0) + v_final_points,
      last_active_at = now()
  WHERE user_id = p_user_id;
END;
$function$;

-- 8. Update get_weekly_leaderboard to use city_id
CREATE OR REPLACE FUNCTION public.get_weekly_leaderboard(p_city text DEFAULT 'Istanbul'::text, p_limit integer DEFAULT 50)
 RETURNS TABLE(user_id uuid, display_name text, avatar_url text, username text, level integer, xp integer, is_premium boolean, weekly_score bigint, rank bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH current_week AS (
    SELECT (date_trunc('week', now()))::date AS ws
  ),
  target_city AS (
    SELECT id AS cid FROM cities WHERE name = p_city
  ),
  scores AS (
    SELECT 
      wse.user_id,
      SUM(wse.points) AS weekly_score
    FROM weekly_score_events wse, current_week cw, target_city tc
    WHERE wse.week_start = cw.ws
      AND wse.city_id = tc.cid
    GROUP BY wse.user_id
  ),
  ranked AS (
    SELECT 
      s.user_id,
      s.weekly_score,
      ROW_NUMBER() OVER (ORDER BY s.weekly_score DESC) AS rank
    FROM scores s
  )
  SELECT 
    r.user_id,
    p.display_name,
    p.avatar_url,
    p.username,
    COALESCE(p.level, 1) AS level,
    COALESCE(p.xp, 0) AS xp,
    COALESCE(p.is_premium, false) AS is_premium,
    r.weekly_score,
    r.rank
  FROM ranked r
  JOIN profiles p ON p.user_id = r.user_id
  WHERE r.rank <= p_limit
  ORDER BY r.rank;
$function$;

-- 9. Update get_my_weekly_rank to use city_id
CREATE OR REPLACE FUNCTION public.get_my_weekly_rank(p_user_id uuid, p_city text DEFAULT 'Istanbul'::text)
 RETURNS TABLE(weekly_score bigint, rank bigint, points_to_next bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH current_week AS (
    SELECT (date_trunc('week', now()))::date AS ws
  ),
  target_city AS (
    SELECT id AS cid FROM cities WHERE name = p_city
  ),
  scores AS (
    SELECT 
      wse.user_id,
      SUM(wse.points) AS weekly_score
    FROM weekly_score_events wse, current_week cw, target_city tc
    WHERE wse.week_start = cw.ws
      AND wse.city_id = tc.cid
    GROUP BY wse.user_id
  ),
  ranked AS (
    SELECT 
      s.user_id,
      s.weekly_score,
      ROW_NUMBER() OVER (ORDER BY s.weekly_score DESC) AS rank,
      LAG(s.weekly_score) OVER (ORDER BY s.weekly_score DESC) AS score_above
    FROM scores s
  )
  SELECT 
    COALESCE(r.weekly_score, 0)::bigint,
    COALESCE(r.rank, 0)::bigint,
    COALESCE(r.score_above - r.weekly_score, 0)::bigint AS points_to_next
  FROM ranked r
  WHERE r.user_id = p_user_id;
$function$;

-- 10. Trigger to recalculate after score - updated for city_id
CREATE OR REPLACE FUNCTION public.trigger_recalculate_after_score()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_city_name text;
BEGIN
  -- Resolve city name from city_id
  SELECT name INTO v_city_name FROM cities WHERE id = NEW.city_id;
  PERFORM recalculate_social_power(NEW.user_id);
  PERFORM recalculate_city_ranks(COALESCE(v_city_name, 'Istanbul'));
  RETURN NEW;
END;
$function$;

-- 11. Create function to update user city with rate limiting (7 days)
CREATE OR REPLACE FUNCTION public.update_user_city(p_user_id uuid, p_city_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_last_change timestamp with time zone;
  v_city_name text;
  v_old_city_name text;
  v_old_city_id uuid;
BEGIN
  -- Verify city exists
  SELECT name INTO v_city_name FROM cities WHERE id = p_city_id;
  IF v_city_name IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'City not found');
  END IF;

  -- Check current city and rate limit
  SELECT city_id, city_changed_at INTO v_old_city_id, v_last_change
  FROM profiles WHERE user_id = p_user_id;

  -- Already in this city
  IF v_old_city_id = p_city_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already in this city');
  END IF;

  -- Rate limit: 7 days between city changes
  IF v_last_change IS NOT NULL AND v_last_change > now() - interval '7 days' THEN
    RETURN jsonb_build_object('success', false, 'error', 'City change rate limited',
      'retry_after_hours', CEIL(EXTRACT(EPOCH FROM (v_last_change + interval '7 days' - now())) / 3600)::integer);
  END IF;

  -- Get old city name for rank recalculation
  SELECT name INTO v_old_city_name FROM cities WHERE id = v_old_city_id;

  -- Update city (SP stays the same!)
  UPDATE profiles
  SET city_id = p_city_id,
      city_changed_at = now(),
      city_rank = NULL,
      weekly_rank = NULL,
      city_percentile = NULL
  WHERE user_id = p_user_id;

  -- Recalculate ranks for both old and new city
  IF v_old_city_name IS NOT NULL THEN
    PERFORM recalculate_city_ranks(v_old_city_name);
  END IF;
  PERFORM recalculate_city_ranks(v_city_name);
  PERFORM recalculate_social_power(p_user_id);

  RETURN jsonb_build_object('success', true, 'city', v_city_name);
END;
$function$;
