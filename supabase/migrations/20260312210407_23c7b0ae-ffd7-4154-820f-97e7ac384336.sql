
CREATE OR REPLACE FUNCTION public.discover_users(
  p_user_id uuid,
  p_mode text DEFAULT 'night',
  p_latitude numeric DEFAULT NULL,
  p_longitude numeric DEFAULT NULL,
  p_limit integer DEFAULT 50,
  p_min_age integer DEFAULT NULL,
  p_max_age integer DEFAULT NULL,
  p_max_distance_km numeric DEFAULT NULL
)
RETURNS TABLE(
  user_id uuid,
  display_name text,
  avatar_url text,
  username text,
  level integer,
  bio text,
  is_premium boolean,
  xp integer,
  interests text[],
  night_activity_score integer,
  total_checkins integer,
  social_power integer,
  sp_level integer,
  city_rank integer,
  subscription_tier text,
  same_venue boolean,
  night_active boolean,
  same_city boolean,
  match_score numeric,
  current_venue_name text,
  shared_venue_count integer,
  momentum_bonus boolean,
  is_rising boolean,
  shared_interest_count integer,
  mutual_follow_count integer,
  profile_quality integer,
  distance_km numeric,
  activity_status text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_my_city_id uuid;
  v_my_interests text[];
  v_my_tier text;
  v_my_gender text;
  v_my_interested_in text;
BEGIN
  SELECT p.city_id, p.interests, COALESCE(p.subscription_tier, 'free'), p.gender, p.interested_in
  INTO v_my_city_id, v_my_interests, v_my_tier, v_my_gender, v_my_interested_in
  FROM profiles p WHERE p.user_id = p_user_id;

  RETURN QUERY
  WITH
  -- 1. Excluded users (liked, matched, rejected, blocked)
  excluded AS (
    SELECT c.target_id AS uid, c.status, c.created_at FROM connections c WHERE c.user_id = p_user_id
    UNION ALL
    SELECT c2.user_id AS uid, c2.status, c2.created_at FROM connections c2 WHERE c2.target_id = p_user_id
    UNION ALL
    SELECT b.blocked_id AS uid, 'blocked'::text, b.created_at FROM blocked_users b WHERE b.blocker_id = p_user_id
    UNION ALL
    SELECT b2.blocker_id AS uid, 'blocked'::text, b2.created_at FROM blocked_users b2 WHERE b2.blocked_id = p_user_id
  ),
  final_excluded AS (
    SELECT DISTINCT e.uid FROM excluded e
    WHERE NOT (e.status = 'rejected' AND e.created_at < now() - interval '30 days')
  ),

  -- 2. Recent check-ins (last 3 hours)
  recent_checkins AS (
    SELECT ci.user_id AS cuid, ci.venue_id, v.name AS venue_name
    FROM checkins ci JOIN venues v ON v.id = ci.venue_id
    WHERE ci.checked_in_at > now() - interval '3 hours' AND ci.is_active = true
  ),
  my_venues AS (
    SELECT DISTINCT venue_id FROM recent_checkins WHERE cuid = p_user_id
  ),

  -- 3. Mutual follows
  my_follows AS (SELECT following_id FROM follows WHERE follower_id = p_user_id),
  my_followers AS (SELECT follower_id FROM follows WHERE following_id = p_user_id),
  mutual AS (
    SELECT mf.following_id AS uid FROM my_follows mf
    INNER JOIN my_followers mfr ON mfr.follower_id = mf.following_id
  ),

  -- 4. Shared venue history (last 30 days)
  my_venue_history AS (
    SELECT DISTINCT venue_id FROM checkins
    WHERE checkins.user_id = p_user_id AND checked_in_at > now() - interval '30 days'
  ),
  candidate_venue_counts AS (
    SELECT ci.user_id AS cuid, COUNT(DISTINCT ci.venue_id) AS shared_count
    FROM checkins ci INNER JOIN my_venue_history mvh ON mvh.venue_id = ci.venue_id
    WHERE ci.user_id != p_user_id AND ci.checked_in_at > now() - interval '30 days'
    GROUP BY ci.user_id
  ),

  -- 5. Recent story posters (last 6 hours)
  recent_story_users AS (
    SELECT DISTINCT ns.user_id AS suid
    FROM night_stories ns
    WHERE ns.created_at > now() - interval '6 hours' AND ns.is_hidden = false
  ),

  -- 6. Today's event participants
  todays_event_users AS (
    SELECT DISTINCT ep.user_id AS euid
    FROM event_participants ep
    JOIN events ev ON ev.id = ep.event_id
    WHERE ev.event_date = CURRENT_DATE
  ),

  -- 7. Score candidates
  scored AS (
    SELECT
      p.user_id, p.display_name, p.avatar_url, p.username,
      COALESCE(p.level, 1) AS level, p.bio,
      COALESCE(p.is_premium, false) AS is_premium,
      COALESCE(p.xp, 0) AS xp, p.interests,
      COALESCE(p.night_activity_score, 0) AS night_activity_score,
      COALESCE(p.total_checkins, 0) AS total_checkins,
      COALESCE(p.social_power, 0) AS social_power,
      COALESCE(p.sp_level, 1) AS sp_level, p.city_rank,
      COALESCE(p.subscription_tier, 'free') AS subscription_tier,

      EXISTS (SELECT 1 FROM recent_checkins rc JOIN my_venues mv ON mv.venue_id = rc.venue_id WHERE rc.cuid = p.user_id) AS same_venue,
      EXISTS (SELECT 1 FROM recent_checkins rc WHERE rc.cuid = p.user_id) AS night_active,
      (p.city_id IS NOT NULL AND p.city_id = v_my_city_id) AS same_city,
      (SELECT rc.venue_name FROM recent_checkins rc WHERE rc.cuid = p.user_id LIMIT 1) AS current_venue_name,
      COALESCE(cvc.shared_count, 0)::integer AS shared_venue_count,
      (COALESCE(p.daily_sp_earned, 0) > 20) AS momentum_bonus,
      (COALESCE(p.daily_sp_earned, 0) > 30 AND COALESCE(p.social_power, 0) < 500) AS is_rising,

      COALESCE(array_length(ARRAY(SELECT unnest(p.interests) INTERSECT SELECT unnest(v_my_interests)), 1), 0) AS shared_interest_count,
      (CASE WHEN EXISTS (SELECT 1 FROM mutual m WHERE m.uid = p.user_id) THEN 1 ELSE 0 END) AS mutual_follow_count,

      -- Profile quality
      (
        (CASE WHEN p.avatar_url IS NOT NULL THEN 25 ELSE 0 END) +
        (CASE WHEN p.bio IS NOT NULL AND length(p.bio) > 10 THEN 20 ELSE 0 END) +
        (CASE WHEN p.interests IS NOT NULL AND array_length(p.interests, 1) >= 3 THEN 20 ELSE 0 END) +
        (CASE WHEN p.instagram_url IS NOT NULL THEN 10 ELSE 0 END) +
        (CASE WHEN COALESCE(p.total_checkins, 0) >= 3 THEN 15 ELSE 0 END) +
        (CASE WHEN p.last_active_at > now() - interval '7 days' THEN 10 ELSE 0 END)
      ) AS profile_quality,

      -- Distance in km (haversine approximation)
      CASE
        WHEN p_latitude IS NOT NULL AND p_longitude IS NOT NULL AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL THEN
          ROUND((111.32 * sqrt(
            power(cos(radians((p.latitude + p_latitude) / 2)) * (p.longitude - p_longitude), 2) +
            power(p.latitude - p_latitude, 2)
          ))::numeric, 2)
        ELSE NULL
      END AS distance_km,

      -- Activity status
      CASE
        WHEN EXISTS (SELECT 1 FROM recent_checkins rc WHERE rc.cuid = p.user_id) THEN 'checked_in'
        WHEN EXISTS (SELECT 1 FROM recent_story_users rsu WHERE rsu.suid = p.user_id) THEN 'story_active'
        WHEN EXISTS (SELECT 1 FROM todays_event_users teu WHERE teu.euid = p.user_id) THEN 'event_today'
        WHEN p.last_active_at > now() - interval '1 hour' THEN 'online'
        WHEN p.last_active_at > now() - interval '24 hours' THEN 'recent'
        ELSE 'offline'
      END AS activity_status,

      -- Match score calculation
      (
        -- Same venue = highest priority (+100)
        (CASE WHEN EXISTS (SELECT 1 FROM recent_checkins rc JOIN my_venues mv ON mv.venue_id = rc.venue_id WHERE rc.cuid = p.user_id) THEN 100 ELSE 0 END)::numeric +
        
        -- Distance-based score (+60 max, closer = higher)
        (CASE
          WHEN p_latitude IS NOT NULL AND p_longitude IS NOT NULL AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL THEN
            GREATEST(0, 60 - (111.32 * sqrt(
              power(cos(radians((p.latitude + p_latitude) / 2)) * (p.longitude - p_longitude), 2) +
              power(p.latitude - p_latitude, 2)
            ) * 12)::numeric)
          WHEN EXISTS (SELECT 1 FROM recent_checkins rc WHERE rc.cuid = p.user_id) THEN 40
          ELSE 0
        END)::numeric +
        
        -- Same city (+30)
        (CASE WHEN p.city_id IS NOT NULL AND p.city_id = v_my_city_id THEN 30 ELSE 0 END)::numeric +
        
        -- Activity boost (+40 for recently active: checkin, story, event)
        (CASE
          WHEN EXISTS (SELECT 1 FROM recent_checkins rc WHERE rc.cuid = p.user_id) THEN 40
          WHEN EXISTS (SELECT 1 FROM recent_story_users rsu WHERE rsu.suid = p.user_id) THEN 30
          WHEN EXISTS (SELECT 1 FROM todays_event_users teu WHERE teu.euid = p.user_id) THEN 25
          WHEN p.last_active_at > now() - interval '1 hour' THEN 15
          ELSE 0
        END)::numeric +
        
        -- Social Power influence (min(SP/50, 20))
        (LEAST(COALESCE(p.social_power, 0)::numeric / 50, 20))::numeric +
        
        -- Check-in activity score (up to +15)
        (LEAST(COALESCE(p.total_checkins, 0)::numeric / 5, 15))::numeric +
        
        -- Mutual connections (+25)
        (CASE WHEN EXISTS (SELECT 1 FROM mutual m WHERE m.uid = p.user_id) THEN 25 ELSE 0 END)::numeric +
        
        -- Premium boost (+15)
        (CASE WHEN p.subscription_tier = 'elite' THEN 15 WHEN p.subscription_tier = 'pro' THEN 12 WHEN p.subscription_tier = 'plus' THEN 8 ELSE 0 END)::numeric +
        
        -- Shared interests (up to +60)
        (LEAST(COALESCE(array_length(ARRAY(SELECT unnest(p.interests) INTERSECT SELECT unnest(v_my_interests)), 1), 0) * 12, 60))::numeric +
        
        -- Profile quality bonus (up to +25)
        ((
          (CASE WHEN p.avatar_url IS NOT NULL THEN 25 ELSE 0 END) +
          (CASE WHEN p.bio IS NOT NULL AND length(p.bio) > 10 THEN 20 ELSE 0 END) +
          (CASE WHEN p.interests IS NOT NULL AND array_length(p.interests, 1) >= 3 THEN 20 ELSE 0 END) +
          (CASE WHEN p.instagram_url IS NOT NULL THEN 10 ELSE 0 END) +
          (CASE WHEN COALESCE(p.total_checkins, 0) >= 3 THEN 15 ELSE 0 END) +
          (CASE WHEN p.last_active_at > now() - interval '7 days' THEN 10 ELSE 0 END)
        ) * 0.25)::numeric +
        
        -- Momentum bonus (+20)
        (CASE WHEN COALESCE(p.daily_sp_earned, 0) > 20 THEN 20 ELSE 0 END)::numeric +
        
        -- Shared venue history for day mode (up to +90)
        (CASE WHEN p_mode = 'day' THEN LEAST(COALESCE(cvc.shared_count, 0) * 30, 90) ELSE 0 END)::numeric +
        
        -- Super interest boost (target gets priority)
        (CASE WHEN EXISTS (
          SELECT 1 FROM connections sc 
          WHERE sc.user_id = p.user_id AND sc.target_id = p_user_id 
          AND sc.super_interest = true AND sc.boosted_until > now()
        ) THEN 80 ELSE 0 END)::numeric
      ) AS match_score

    FROM profiles p
    LEFT JOIN candidate_venue_counts cvc ON cvc.cuid = p.user_id
    WHERE p.user_id != p_user_id
      AND p.user_id NOT IN (SELECT fe.uid FROM final_excluded fe)
      AND COALESCE(p.is_ghost_mode, false) = false
      AND p.display_name IS NOT NULL
      -- Gender preference filtering (mutual)
      AND (
        v_my_interested_in IS NULL OR v_my_interested_in = 'everyone'
        OR (v_my_interested_in = 'men' AND p.gender = 'male')
        OR (v_my_interested_in = 'women' AND p.gender = 'female')
      )
      AND (
        p.interested_in IS NULL OR p.interested_in = 'everyone'
        OR (p.interested_in = 'men' AND v_my_gender = 'male')
        OR (p.interested_in = 'women' AND v_my_gender = 'female')
      )
      -- Age range filtering
      AND (
        p_min_age IS NULL OR p.birth_date IS NULL
        OR (EXTRACT(YEAR FROM age(CURRENT_DATE, p.birth_date)) >= p_min_age)
      )
      AND (
        p_max_age IS NULL OR p.birth_date IS NULL
        OR (EXTRACT(YEAR FROM age(CURRENT_DATE, p.birth_date)) <= p_max_age)
      )
      -- Distance filtering
      AND (
        p_max_distance_km IS NULL
        OR p_latitude IS NULL OR p_longitude IS NULL
        OR p.latitude IS NULL OR p.longitude IS NULL
        OR (111.32 * sqrt(
            power(cos(radians((p.latitude + p_latitude) / 2)) * (p.longitude - p_longitude), 2) +
            power(p.latitude - p_latitude, 2)
          )) <= p_max_distance_km
      )
  )

  SELECT
    s.user_id, s.display_name, s.avatar_url, s.username, s.level, s.bio,
    s.is_premium, s.xp, s.interests, s.night_activity_score, s.total_checkins,
    s.social_power, s.sp_level, s.city_rank, s.subscription_tier,
    s.same_venue, s.night_active, s.same_city, s.match_score,
    s.current_venue_name, s.shared_venue_count, s.momentum_bonus,
    s.is_rising, s.shared_interest_count, s.mutual_follow_count, s.profile_quality,
    s.distance_km,
    s.activity_status
  FROM scored s
  ORDER BY s.match_score DESC
  LIMIT p_limit;
END;
$function$;

-- Add latitude/longitude to profiles for distance-based discovery
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'latitude') THEN
    ALTER TABLE public.profiles ADD COLUMN latitude numeric DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'longitude') THEN
    ALTER TABLE public.profiles ADD COLUMN longitude numeric DEFAULT NULL;
  END IF;
END $$;
