
-- Add boost tracking columns to checkins
ALTER TABLE public.checkins
  ADD COLUMN IF NOT EXISTS boost_expires_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT false;

-- Create index for active checkins lookup
CREATE INDEX IF NOT EXISTS idx_checkins_active_user ON public.checkins (user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_checkins_venue_cooldown ON public.checkins (user_id, venue_id, checked_in_at DESC);

-- Function to perform premium check-in with all validations
CREATE OR REPLACE FUNCTION public.premium_checkin(
  p_user_id uuid,
  p_venue_id uuid,
  p_latitude numeric DEFAULT NULL,
  p_longitude numeric DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_venue RECORD;
  v_last_checkin_at timestamp with time zone;
  v_last_any_checkin_at timestamp with time zone;
  v_distance numeric;
  v_boost_minutes integer := 60;
  v_sp_points integer := 15;
  v_tier text;
  v_checkin_id uuid;
  v_boost_end timestamp with time zone;
BEGIN
  -- Get venue info
  SELECT * INTO v_venue FROM venues WHERE id = p_venue_id;
  IF v_venue IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Venue not found');
  END IF;

  -- Get user tier
  SELECT COALESCE(subscription_tier, 'free') INTO v_tier
  FROM profiles WHERE user_id = p_user_id;

  -- Premium tier boost duration
  IF v_tier = 'pro' THEN v_boost_minutes := 90;
  ELSIF v_tier = 'elite' THEN v_boost_minutes := 90;
  END IF;

  -- GPS validation (100m radius) if coordinates provided
  IF p_latitude IS NOT NULL AND p_longitude IS NOT NULL AND v_venue.latitude IS NOT NULL AND v_venue.longitude IS NOT NULL THEN
    v_distance := 111320 * sqrt(
      power(cos(radians((v_venue.latitude + p_latitude) / 2)) * (v_venue.longitude - p_longitude), 2) +
      power(v_venue.latitude - p_latitude, 2)
    );
    IF v_distance > 100 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Too far from venue', 'distance', round(v_distance));
    END IF;
  END IF;

  -- Cooldown: same venue 2 hours
  SELECT MAX(checked_in_at) INTO v_last_checkin_at
  FROM checkins
  WHERE user_id = p_user_id AND venue_id = p_venue_id
    AND checked_in_at > now() - interval '2 hours';
  IF v_last_checkin_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cooldown active for this venue',
      'retry_after', extract(epoch from (v_last_checkin_at + interval '2 hours' - now()))::integer);
  END IF;

  -- Rate limit: no check-in at ANY venue within 30 minutes
  SELECT MAX(checked_in_at) INTO v_last_any_checkin_at
  FROM checkins
  WHERE user_id = p_user_id
    AND checked_in_at > now() - interval '30 minutes';
  IF v_last_any_checkin_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Please wait before checking in again',
      'retry_after', extract(epoch from (v_last_any_checkin_at + interval '30 minutes' - now()))::integer);
  END IF;

  -- Deactivate any previous active check-ins
  UPDATE checkins SET is_active = false
  WHERE user_id = p_user_id AND is_active = true;

  -- Calculate boost end
  v_boost_end := now() + (v_boost_minutes || ' minutes')::interval;

  -- Insert check-in
  INSERT INTO checkins (user_id, venue_id, latitude, longitude, is_verified, verified_at, boost_expires_at, is_active)
  VALUES (p_user_id, p_venue_id, p_latitude, p_longitude, true, now(), v_boost_end, true)
  RETURNING id INTO v_checkin_id;

  -- Award SP (small amount, not gamified)
  PERFORM record_weekly_score(p_user_id, 'checkin', v_sp_points, v_checkin_id, 'Istanbul');

  -- Update streak
  PERFORM update_streak(p_user_id);

  -- Update profile checkin count
  UPDATE profiles
  SET total_checkins = COALESCE(total_checkins, 0) + 1
  WHERE user_id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'checkin_id', v_checkin_id,
    'boost_expires_at', v_boost_end,
    'boost_minutes', v_boost_minutes,
    'venue_name', v_venue.name
  );
END;
$$;

-- Function to auto-expire active checkins (can be called periodically)
CREATE OR REPLACE FUNCTION public.expire_checkins()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE checkins SET is_active = false
  WHERE is_active = true AND boost_expires_at < now();
$$;
