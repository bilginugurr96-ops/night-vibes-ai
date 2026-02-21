
-- Update recalculate_city_ranks to also set weekly_rank
CREATE OR REPLACE FUNCTION public.recalculate_city_ranks(p_city text DEFAULT 'Istanbul'::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_week_start date := (date_trunc('week', now()))::date;
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

  -- Weekly rank by weekly score events
  WITH scores AS (
    SELECT wse.user_id, SUM(wse.points) AS ws
    FROM weekly_score_events wse
    WHERE wse.week_start = v_week_start AND wse.city = p_city
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
