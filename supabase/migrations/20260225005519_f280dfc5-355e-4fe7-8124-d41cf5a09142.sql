
-- Function to auto-assign city from geolocation
-- Finds existing city or creates new one, then updates user profile
CREATE OR REPLACE FUNCTION public.auto_assign_city(p_user_id uuid, p_city_name text, p_country text DEFAULT 'Turkey')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_city_id uuid;
  v_current_city_id uuid;
BEGIN
  IF p_city_name IS NULL OR p_city_name = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'City name is required');
  END IF;

  -- Check current city
  SELECT city_id INTO v_current_city_id FROM profiles WHERE user_id = p_user_id;
  
  -- Find existing city (case-insensitive)
  SELECT id INTO v_city_id FROM cities WHERE lower(name) = lower(p_city_name) LIMIT 1;
  
  -- Create city if not found
  IF v_city_id IS NULL THEN
    INSERT INTO cities (name, country) VALUES (p_city_name, p_country)
    RETURNING id INTO v_city_id;
  END IF;

  -- Skip if already in this city
  IF v_current_city_id = v_city_id THEN
    RETURN jsonb_build_object('success', true, 'city', p_city_name, 'already_set', true);
  END IF;

  -- Update profile (bypass the 7-day rate limit for auto-detection, only if city was never set)
  IF v_current_city_id IS NULL THEN
    UPDATE profiles SET city_id = v_city_id, city_changed_at = now() WHERE user_id = p_user_id;
  ELSE
    -- If city was already set, respect rate limit — use update_user_city instead
    RETURN jsonb_build_object('success', false, 'error', 'City already set, use manual change', 'current_city_id', v_current_city_id);
  END IF;

  RETURN jsonb_build_object('success', true, 'city', p_city_name, 'city_id', v_city_id);
END;
$$;
