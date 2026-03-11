
CREATE OR REPLACE FUNCTION public.get_monthly_leaderboard(p_city text DEFAULT 'Istanbul'::text, p_limit integer DEFAULT 50)
RETURNS TABLE(user_id uuid, display_name text, avatar_url text, username text, level integer, xp integer, is_premium boolean, monthly_score bigint, rank bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH target_city AS (
    SELECT id AS cid FROM cities WHERE name = p_city
  ),
  scores AS (
    SELECT 
      wse.user_id,
      SUM(wse.points) AS monthly_score
    FROM weekly_score_events wse, target_city tc
    WHERE wse.created_at >= date_trunc('month', now())
      AND wse.city_id = tc.cid
    GROUP BY wse.user_id
  ),
  ranked AS (
    SELECT 
      s.user_id,
      s.monthly_score,
      ROW_NUMBER() OVER (ORDER BY s.monthly_score DESC) AS rank
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
    r.monthly_score,
    r.rank
  FROM ranked r
  JOIN profiles p ON p.user_id = r.user_id
  WHERE r.rank <= p_limit
  ORDER BY r.rank;
$$;

CREATE OR REPLACE FUNCTION public.get_my_monthly_rank(p_user_id uuid, p_city text DEFAULT 'Istanbul'::text)
RETURNS TABLE(monthly_score bigint, rank bigint, points_to_next bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH target_city AS (
    SELECT id AS cid FROM cities WHERE name = p_city
  ),
  scores AS (
    SELECT 
      wse.user_id,
      SUM(wse.points) AS monthly_score
    FROM weekly_score_events wse, target_city tc
    WHERE wse.created_at >= date_trunc('month', now())
      AND wse.city_id = tc.cid
    GROUP BY wse.user_id
  ),
  ranked AS (
    SELECT 
      s.user_id,
      s.monthly_score,
      ROW_NUMBER() OVER (ORDER BY s.monthly_score DESC) AS rank,
      LAG(s.monthly_score) OVER (ORDER BY s.monthly_score DESC) AS score_above
    FROM scores s
  )
  SELECT 
    COALESCE(r.monthly_score, 0)::bigint,
    COALESCE(r.rank, 0)::bigint,
    COALESCE(r.score_above - r.monthly_score, 0)::bigint AS points_to_next
  FROM ranked r
  WHERE r.user_id = p_user_id;
$$;
