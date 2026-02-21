
-- Weekly score events table - tracks every scoring action
CREATE TABLE public.weekly_score_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  event_type text NOT NULL, -- story_post, story_reaction, checkin, like_received, match, hot_venue, message, event_attend
  points integer NOT NULL DEFAULT 0,
  source_id uuid, -- optional reference to the source entity
  city text NOT NULL DEFAULT 'Istanbul',
  week_start date NOT NULL DEFAULT (date_trunc('week', now()))::date,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast weekly lookups
CREATE INDEX idx_weekly_scores_user_week ON public.weekly_score_events (user_id, week_start);
CREATE INDEX idx_weekly_scores_city_week ON public.weekly_score_events (city, week_start, points DESC);

-- Unique constraint to prevent duplicate scoring for same source
CREATE UNIQUE INDEX idx_weekly_scores_unique_event ON public.weekly_score_events (user_id, event_type, source_id, week_start) WHERE source_id IS NOT NULL;

-- Enable RLS
ALTER TABLE public.weekly_score_events ENABLE ROW LEVEL SECURITY;

-- Everyone can view scores (for leaderboard)
CREATE POLICY "Weekly scores viewable by everyone"
  ON public.weekly_score_events FOR SELECT USING (true);

-- Users can only insert their own scores
CREATE POLICY "Users can insert own score events"
  ON public.weekly_score_events FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.weekly_score_events;

-- Function to get weekly leaderboard for a city
CREATE OR REPLACE FUNCTION public.get_weekly_leaderboard(p_city text DEFAULT 'Istanbul', p_limit integer DEFAULT 50)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  avatar_url text,
  username text,
  level integer,
  xp integer,
  is_premium boolean,
  weekly_score bigint,
  rank bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  WITH current_week AS (
    SELECT (date_trunc('week', now()))::date AS ws
  ),
  scores AS (
    SELECT 
      wse.user_id,
      SUM(wse.points) AS weekly_score
    FROM weekly_score_events wse, current_week cw
    WHERE wse.week_start = cw.ws
      AND wse.city = p_city
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
$$;

-- Function to get a specific user's weekly rank
CREATE OR REPLACE FUNCTION public.get_my_weekly_rank(p_user_id uuid, p_city text DEFAULT 'Istanbul')
RETURNS TABLE (
  weekly_score bigint,
  rank bigint,
  points_to_next bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  WITH current_week AS (
    SELECT (date_trunc('week', now()))::date AS ws
  ),
  scores AS (
    SELECT 
      wse.user_id,
      SUM(wse.points) AS weekly_score
    FROM weekly_score_events wse, current_week cw
    WHERE wse.week_start = cw.ws
      AND wse.city = p_city
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
$$;

-- Function to record a weekly score event with anti-spam
CREATE OR REPLACE FUNCTION public.record_weekly_score(
  p_user_id uuid,
  p_event_type text,
  p_points integer,
  p_source_id uuid DEFAULT NULL,
  p_city text DEFAULT 'Istanbul'
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
  v_week_start date := (date_trunc('week', now()))::date;
  v_is_premium boolean;
  v_final_points integer;
  v_daily_msg_count integer;
BEGIN
  -- Check premium for multiplier
  SELECT COALESCE(is_premium, false) INTO v_is_premium 
  FROM profiles WHERE user_id = p_user_id;
  
  -- Apply premium multiplier (1.2x)
  v_final_points := CASE WHEN v_is_premium THEN CEIL(p_points * 1.2) ELSE p_points END;
  
  -- Anti-spam: cap message points at 10 per day
  IF p_event_type = 'message' THEN
    SELECT COUNT(*) INTO v_daily_msg_count
    FROM weekly_score_events
    WHERE user_id = p_user_id
      AND event_type = 'message'
      AND created_at >= date_trunc('day', now())
      AND created_at < date_trunc('day', now()) + interval '1 day';
    
    IF v_daily_msg_count >= 10 THEN
      RETURN; -- Daily message cap reached
    END IF;
  END IF;
  
  -- Insert (unique index prevents duplicate source_id scoring)
  INSERT INTO weekly_score_events (user_id, event_type, points, source_id, city, week_start)
  VALUES (p_user_id, p_event_type, v_final_points, p_source_id, p_city, v_week_start)
  ON CONFLICT DO NOTHING;
END;
$$;
