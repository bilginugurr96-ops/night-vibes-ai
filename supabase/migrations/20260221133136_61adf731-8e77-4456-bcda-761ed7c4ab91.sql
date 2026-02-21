
-- Fix recalculate_social_power function: cast pct to numeric before ROUND
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
  v_city text;
  v_percentile numeric(5,2);
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
      (PERCENT_RANK() OVER (ORDER BY COALESCE(social_power, 0) ASC) * 100)::numeric(5,2) as pct
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
$function$;

-- Add trigger to auto-recalculate ranks after weekly_score_events insert
CREATE OR REPLACE FUNCTION public.trigger_recalculate_after_score()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM recalculate_social_power(NEW.user_id);
  PERFORM recalculate_city_ranks(COALESCE(NEW.city, 'Istanbul'));
  RETURN NEW;
END;
$function$;

CREATE TRIGGER after_weekly_score_insert
  AFTER INSERT ON public.weekly_score_events
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_recalculate_after_score();

-- Same for day_score_events
CREATE TRIGGER after_day_score_insert
  AFTER INSERT ON public.day_score_events
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_recalculate_after_score();
