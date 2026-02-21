
-- Phase 1: Database Foundation for 24/7 Urban Social Platform

-- 1. Expand venue_type enum with day categories
ALTER TYPE public.venue_type ADD VALUE IF NOT EXISTS 'cafe';
ALTER TYPE public.venue_type ADD VALUE IF NOT EXISTS 'restaurant';
ALTER TYPE public.venue_type ADD VALUE IF NOT EXISTS 'coworking';
ALTER TYPE public.venue_type ADD VALUE IF NOT EXISTS 'beach';
ALTER TYPE public.venue_type ADD VALUE IF NOT EXISTS 'brunch';
ALTER TYPE public.venue_type ADD VALUE IF NOT EXISTS 'workshop';

-- 2. Add day_score, social_power, city_percentile to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS day_score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS social_power integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS city_percentile numeric(5,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS sp_level integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS preferred_mode text NOT NULL DEFAULT 'auto';

-- 3. Create Social Power levels reference table
CREATE TABLE public.sp_levels (
  level integer PRIMARY KEY,
  name text NOT NULL,
  min_sp integer NOT NULL DEFAULT 0,
  profile_frame text DEFAULT NULL,
  visibility_boost numeric(3,2) NOT NULL DEFAULT 1.00,
  matching_priority integer NOT NULL DEFAULT 0,
  badge_icon text DEFAULT NULL
);

ALTER TABLE public.sp_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SP levels viewable by everyone"
  ON public.sp_levels FOR SELECT
  USING (true);

-- Insert the 10 SP levels
INSERT INTO public.sp_levels (level, name, min_sp, profile_frame, visibility_boost, matching_priority, badge_icon) VALUES
  (1,  'Explorer',           0,     'frame-explorer',      1.00, 0,  '🔍'),
  (2,  'Social Starter',     500,   'frame-starter',       1.05, 1,  '🌱'),
  (3,  'City Mover',         1500,  'frame-mover',         1.10, 2,  '🏃'),
  (4,  'Vibe Creator',       3500,  'frame-vibe',          1.15, 3,  '🎵'),
  (5,  'Urban Player',       7000,  'frame-urban',         1.20, 4,  '🎯'),
  (6,  'Scene Builder',      12000, 'frame-scene',         1.25, 5,  '🏗️'),
  (7,  'Trend Catalyst',     20000, 'frame-trend',         1.30, 6,  '⚡'),
  (8,  'City Icon',          35000, 'frame-icon',          1.35, 7,  '🌟'),
  (9,  'Elite Social',       55000, 'frame-elite',         1.40, 8,  '💎'),
  (10, 'Legend of the City', 80000, 'frame-legend',        1.50, 10, '👑');

-- 4. Create day_score_events table (mirrors weekly_score_events)
CREATE TABLE public.day_score_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  event_type text NOT NULL,
  points integer NOT NULL DEFAULT 0,
  source_id uuid DEFAULT NULL,
  city text NOT NULL DEFAULT 'Istanbul',
  week_start date NOT NULL DEFAULT (date_trunc('week', now()))::date,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.day_score_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own day score events"
  ON public.day_score_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Day scores viewable by everyone"
  ON public.day_score_events FOR SELECT
  USING (true);

-- 5. Create city_scores table for global city competition
CREATE TABLE public.city_scores (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  city text NOT NULL,
  week_start date NOT NULL DEFAULT (date_trunc('week', now()))::date,
  total_sp bigint NOT NULL DEFAULT 0,
  active_users integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(city, week_start)
);

ALTER TABLE public.city_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "City scores viewable by everyone"
  ON public.city_scores FOR SELECT
  USING (true);

-- 6. Create function to record day score (mirrors record_weekly_score)
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
BEGIN
  SELECT COALESCE(is_premium, false) INTO v_is_premium
  FROM profiles WHERE user_id = p_user_id;

  -- Premium gets 1.1x (not 1.2x like night — spec says 1.1 max)
  v_final_points := CASE WHEN v_is_premium THEN CEIL(p_points * 1.1) ELSE p_points END;

  INSERT INTO day_score_events (user_id, event_type, points, source_id, city, week_start)
  VALUES (p_user_id, p_event_type, v_final_points, p_source_id, p_city, v_week_start)
  ON CONFLICT DO NOTHING;
END;
$$;

-- 7. Create function to recalculate Social Power for a user
CREATE OR REPLACE FUNCTION public.recalculate_social_power(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_night_score bigint;
  v_day_score bigint;
  v_total_sp bigint;
  v_new_level integer;
  v_city text;
  v_percentile numeric(5,2);
BEGIN
  -- Get weekly night score
  SELECT COALESCE(SUM(points), 0) INTO v_night_score
  FROM weekly_score_events
  WHERE user_id = p_user_id
    AND week_start = (date_trunc('week', now()))::date;

  -- Get weekly day score
  SELECT COALESCE(SUM(points), 0) INTO v_day_score
  FROM day_score_events
  WHERE user_id = p_user_id
    AND week_start = (date_trunc('week', now()))::date;

  v_total_sp := v_night_score + v_day_score;

  -- Determine SP level
  SELECT level INTO v_new_level
  FROM sp_levels
  WHERE min_sp <= v_total_sp
  ORDER BY level DESC
  LIMIT 1;

  -- Get user city
  SELECT COALESCE(location, 'Istanbul') INTO v_city
  FROM profiles WHERE user_id = p_user_id;

  -- Calculate city percentile
  SELECT 
    CASE WHEN cnt = 0 THEN 100
    ELSE ROUND((1.0 - (rank_pos::numeric / cnt)) * 100, 2)
    END INTO v_percentile
  FROM (
    SELECT 
      COUNT(*) OVER () as cnt,
      ROW_NUMBER() OVER (ORDER BY COALESCE(social_power, 0) DESC) as rank_pos
    FROM profiles
    WHERE COALESCE(location, 'Istanbul') = v_city
  ) sub
  WHERE rank_pos = (
    SELECT ROW_NUMBER() OVER (ORDER BY COALESCE(social_power, 0) DESC)
    FROM profiles
    WHERE user_id = p_user_id AND COALESCE(location, 'Istanbul') = v_city
  )
  LIMIT 1;

  -- Update profile
  UPDATE profiles
  SET 
    day_score = v_day_score,
    social_power = v_total_sp,
    sp_level = COALESCE(v_new_level, 1),
    city_percentile = v_percentile,
    updated_at = now()
  WHERE user_id = p_user_id;
END;
$$;

-- 8. Update premium multiplier in record_weekly_score to cap at 1.1x
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
BEGIN
  SELECT COALESCE(is_premium, false) INTO v_is_premium 
  FROM profiles WHERE user_id = p_user_id;
  
  -- Premium multiplier capped at 1.1x per spec
  v_final_points := CASE WHEN v_is_premium THEN CEIL(p_points * 1.1) ELSE p_points END;
  
  IF p_event_type = 'message' THEN
    SELECT COUNT(*) INTO v_daily_msg_count
    FROM weekly_score_events
    WHERE user_id = p_user_id
      AND event_type = 'message'
      AND created_at >= date_trunc('day', now())
      AND created_at < date_trunc('day', now()) + interval '1 day';
    
    IF v_daily_msg_count >= 10 THEN
      RETURN;
    END IF;
  END IF;
  
  INSERT INTO weekly_score_events (user_id, event_type, points, source_id, city, week_start)
  VALUES (p_user_id, p_event_type, v_final_points, p_source_id, p_city, v_week_start)
  ON CONFLICT DO NOTHING;
END;
$$;

-- 9. Add mode column to venues for day/night categorization
ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS venue_mode text NOT NULL DEFAULT 'night';

-- Update existing venues to night mode
UPDATE public.venues SET venue_mode = 'night' WHERE venue_mode = 'night';
