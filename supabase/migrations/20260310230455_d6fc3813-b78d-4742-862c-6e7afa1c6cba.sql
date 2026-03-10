
CREATE OR REPLACE FUNCTION public.discover_users(
  p_user_id uuid,
  p_mode text DEFAULT 'night',
  p_latitude numeric DEFAULT NULL,
  p_longitude numeric DEFAULT NULL,
  p_limit integer DEFAULT 50
)
RETURNS TABLE (
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
  profile_quality integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_my_city_id uuid;
  v_my_interests text[];
  v_my_tier text;
BEGIN
  -- Get current user context
  SELECT p.city_id, p.interests, COALESCE(p.subscription_tier, 'free')
  INTO v_my_city_id, v_my_interests, v_my_tier
  FROM profiles p WHERE p.user_id = p_user_id;

  RETURN QUERY
  WITH
  -- 1. Excluded users: connections (liked/matched/blocked) + self
  excluded AS (
    -- My outgoing connections (all statuses)
    SELECT c.target_id AS uid, c.status, c.created_at
    FROM connections c WHERE c.user_id = p_user_id
    UNION ALL
    -- Incoming connections to me
    SELECT c2.user_id AS uid, c2.status, c2.created_at
    FROM connections c2 WHERE c2.target_id = p_user_id
    UNION ALL
    -- Blocked (both directions)
    SELECT b.blocked_id AS uid, 'blocked'::text, b.created_at
    FROM blocked_users b WHERE b.blocker_id = p_user_id
    UNION ALL
    SELECT b2.blocker_id AS uid, 'blocked'::text, b2.created_at
    FROM blocked_users b2 WHERE b2.blocked_id = p_user_id
  ),
  -- Filter: exclude all except rejected > 30 days
  final_excluded AS (
    SELECT DISTINCT e.uid
    FROM excluded e
    WHERE NOT (
      e.status = 'rejected'
      AND e.created_at < now() - interval '30 days'
    )
  ),

  -- 2. Recent check-ins (last 3 hours)
  recent_checkins AS (
    SELECT ci.user_id AS cuid, ci.venue_id, v.name AS venue_name
    FROM checkins ci
    JOIN venues v ON v.id = ci.venue_id
    WHERE ci.checked_in_at > now() - interval '3 hours'
      AND ci.is_active = true
  ),
  my_venues AS (
    SELECT DISTINCT venue_id FROM recent_checkins WHERE cuid = p_user_id
  ),

  -- 3. Mutual follows
  my_follows AS (
    SELECT following_id FROM follows WHERE follower_id = p_user_id
  ),
  my_followers AS (
    SELECT follower_id FROM follows WHERE following_id = p_user_id
  ),
  mutual AS (
    SELECT mf.following_id AS uid
    FROM my_follows mf
    INNER JOIN my_followers mfr ON mfr.follower_id = mf.following_id
  ),

  -- 4. Shared venue history (last 30 days)
  my_venue_history AS (
    SELECT DISTINCT venue_id
    FROM checkins
    WHERE checkins.user_id = p_user_id
      AND checked_in_at > now() - interval '30 days'
  ),
  candidate_venue_counts AS (
    SELECT ci.user_id AS cuid, COUNT(DISTINCT ci.venue_id) AS shared_count
    FROM checkins ci
    INNER JOIN my_venue_history mvh ON mvh.venue_id = ci.venue_id
    WHERE ci.user_id != p_user_id
      AND ci.checked_in_at > now() - interval '30 days'
    GROUP BY ci.user_id
  ),

  -- 5. Score candidates
  scored AS (
    SELECT
      p.user_id,
      p.display_name,
      p.avatar_url,
      p.username,
      COALESCE(p.level, 1) AS level,
      p.bio,
      COALESCE(p.is_premium, false) AS is_premium,
      COALESCE(p.xp, 0) AS xp,
      p.interests,
      COALESCE(p.night_activity_score, 0) AS night_activity_score,
      COALESCE(p.total_checkins, 0) AS total_checkins,
      COALESCE(p.social_power, 0) AS social_power,
      COALESCE(p.sp_level, 1) AS sp_level,
      p.city_rank,
      COALESCE(p.subscription_tier, 'free') AS subscription_tier,

      -- Same venue right now
      EXISTS (
        SELECT 1 FROM recent_checkins rc
        JOIN my_venues mv ON mv.venue_id = rc.venue_id
        WHERE rc.cuid = p.user_id
      ) AS same_venue,

      -- Active at any venue
      EXISTS (
        SELECT 1 FROM recent_checkins rc WHERE rc.cuid = p.user_id
      ) AS night_active,

      -- Same city
      (p.city_id IS NOT NULL AND p.city_id = v_my_city_id) AS same_city,

      -- Current venue name
      (SELECT rc.venue_name FROM recent_checkins rc WHERE rc.cuid = p.user_id LIMIT 1) AS current_venue_name,

      -- Shared venue count
      COALESCE(cvc.shared_count, 0)::integer AS shared_venue_count,

      -- Momentum
      (COALESCE(p.daily_sp_earned, 0) > 20) AS momentum_bonus,

      -- Rising
      (COALESCE(p.daily_sp_earned, 0) > 30 AND COALESCE(p.social_power, 0) < 500) AS is_rising,

      -- Shared interests
      COALESCE(
        array_length(
          ARRAY(SELECT unnest(p.interests) INTERSECT SELECT unnest(v_my_interests)),
          1
        ), 0
      ) AS shared_interest_count,

      -- Mutual follows
      (CASE WHEN EXISTS (SELECT 1 FROM mutual m WHERE m.uid = p.user_id) THEN 1 ELSE 0 END) AS mutual_follow_count,

      -- Profile quality (0-100)
      (
        (CASE WHEN p.avatar_url IS NOT NULL THEN 25 ELSE 0 END) +
        (CASE WHEN p.bio IS NOT NULL AND length(p.bio) > 10 THEN 20 ELSE 0 END) +
        (CASE WHEN p.interests IS NOT NULL AND array_length(p.interests, 1) >= 3 THEN 20 ELSE 0 END) +
        (CASE WHEN p.instagram_url IS NOT NULL THEN 10 ELSE 0 END) +
        (CASE WHEN COALESCE(p.total_checkins, 0) >= 3 THEN 15 ELSE 0 END) +
        (CASE WHEN p.last_active_at > now() - interval '7 days' THEN 10 ELSE 0 END)
      ) AS profile_quality,

      -- MATCH SCORE
      (
        -- Signal 1: Same venue (highest priority)
        (CASE WHEN EXISTS (
          SELECT 1 FROM recent_checkins rc
          JOIN my_venues mv ON mv.venue_id = rc.venue_id
          WHERE rc.cuid = p.user_id
        ) THEN 150 ELSE 0 END)::numeric +

        -- Signal 2: Active check-in (proximity proxy)
        (CASE WHEN EXISTS (
          SELECT 1 FROM recent_checkins rc WHERE rc.cuid = p.user_id
        ) THEN 60 ELSE 0 END)::numeric +

        -- Signal 3: Same city
        (CASE WHEN p.city_id IS NOT NULL AND p.city_id = v_my_city_id THEN 35 ELSE 0 END)::numeric +

        -- Signal 4: Social Power (logarithmic, max ~30)
        (LEAST(log(GREATEST(COALESCE(p.social_power, 0), 1) + 1) * 10, 30))::numeric +

        -- Signal 5: Shared interests (up to 5 * 12 = 60)
        (LEAST(
          COALESCE(array_length(
            ARRAY(SELECT unnest(p.interests) INTERSECT SELECT unnest(v_my_interests)),
            1
          ), 0) * 12,
          60
        ))::numeric +

        -- Signal 6: Premium tier boost
        (CASE
          WHEN p.subscription_tier = 'elite' THEN 25
          WHEN p.subscription_tier = 'pro' THEN 18
          WHEN p.subscription_tier = 'plus' THEN 10
          ELSE 0
        END)::numeric +

        -- Signal 7: Mutual connection
        (CASE WHEN EXISTS (SELECT 1 FROM mutual m WHERE m.uid = p.user_id) THEN 40 ELSE 0 END)::numeric +

        -- Signal 8: Profile quality (scaled to max 25)
        ((
          (CASE WHEN p.avatar_url IS NOT NULL THEN 25 ELSE 0 END) +
          (CASE WHEN p.bio IS NOT NULL AND length(p.bio) > 10 THEN 20 ELSE 0 END) +
          (CASE WHEN p.interests IS NOT NULL AND array_length(p.interests, 1) >= 3 THEN 20 ELSE 0 END) +
          (CASE WHEN p.instagram_url IS NOT NULL THEN 10 ELSE 0 END) +
          (CASE WHEN COALESCE(p.total_checkins, 0) >= 3 THEN 15 ELSE 0 END) +
          (CASE WHEN p.last_active_at > now() - interval '7 days' THEN 10 ELSE 0 END)
        ) * 0.25)::numeric +

        -- Momentum bonus
        (CASE WHEN COALESCE(p.daily_sp_earned, 0) > 20 THEN 20 ELSE 0 END)::numeric +

        -- Shared venue history (day mode bonus)
        (CASE WHEN p_mode = 'day' THEN LEAST(COALESCE(cvc.shared_count, 0) * 30, 90) ELSE 0 END)::numeric +

        -- Recency boost: active in last hour
        (CASE WHEN p.last_active_at > now() - interval '1 hour' THEN 15 ELSE 0 END)::numeric
      ) AS match_score

    FROM profiles p
    LEFT JOIN candidate_venue_counts cvc ON cvc.cuid = p.user_id
    WHERE p.user_id != p_user_id
      AND p.user_id NOT IN (SELECT fe.uid FROM final_excluded fe)
      AND COALESCE(p.is_ghost_mode, false) = false
      AND p.display_name IS NOT NULL
  )

  SELECT
    s.user_id, s.display_name, s.avatar_url, s.username, s.level, s.bio,
    s.is_premium, s.xp, s.interests, s.night_activity_score, s.total_checkins,
    s.social_power, s.sp_level, s.city_rank, s.subscription_tier,
    s.same_venue, s.night_active, s.same_city, s.match_score,
    s.current_venue_name, s.shared_venue_count, s.momentum_bonus,
    s.is_rising, s.shared_interest_count, s.mutual_follow_count, s.profile_quality
  FROM scored s
  ORDER BY s.match_score DESC
  LIMIT p_limit;
END;
$$;
