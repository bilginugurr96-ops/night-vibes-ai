
CREATE OR REPLACE FUNCTION public.auto_assign_city(p_user_id uuid, p_city_name text, p_country text DEFAULT 'Turkey')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_city_id uuid;
  v_current_city_id uuid;
  v_city_changed_at timestamp with time zone;
BEGIN
  IF p_city_name IS NULL OR p_city_name = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'City name is required');
  END IF;

  SELECT city_id, city_changed_at INTO v_current_city_id, v_city_changed_at
  FROM profiles WHERE user_id = p_user_id;
  
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

  -- If city was manually changed within last 7 days, respect rate limit
  IF v_current_city_id IS NOT NULL AND v_city_changed_at IS NOT NULL 
     AND v_city_changed_at > now() - interval '7 days' THEN
    -- Still update if this is auto-detection (no rate limit for auto)
    NULL;
  END IF;

  -- Update profile city
  UPDATE profiles SET city_id = v_city_id, city_changed_at = now() WHERE user_id = p_user_id;

  RETURN jsonb_build_object('success', true, 'city', p_city_name, 'city_id', v_city_id);
END;
$$;
