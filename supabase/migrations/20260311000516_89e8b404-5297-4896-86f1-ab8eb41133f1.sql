
-- Add claimed_at to track if reward was claimed
ALTER TABLE public.user_missions ADD COLUMN IF NOT EXISTS claimed_at timestamp with time zone DEFAULT NULL;

-- Function to claim a completed mission reward (awards XP + SP)
CREATE OR REPLACE FUNCTION public.claim_mission_reward(p_user_id uuid, p_mission_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_week_start date := (date_trunc('week', now()))::date;
  v_um RECORD;
  v_mission RECORD;
BEGIN
  -- Get user_mission
  SELECT * INTO v_um FROM user_missions
  WHERE user_id = p_user_id AND mission_id = p_mission_id AND week_start = v_week_start;
  
  IF v_um IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Mission not found');
  END IF;
  
  IF NOT COALESCE(v_um.completed, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Mission not completed yet');
  END IF;
  
  IF v_um.claimed_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already claimed');
  END IF;
  
  -- Get mission details
  SELECT * INTO v_mission FROM missions WHERE id = p_mission_id;
  IF v_mission IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Mission definition not found');
  END IF;
  
  -- Mark as claimed
  UPDATE user_missions SET claimed_at = now()
  WHERE id = v_um.id;
  
  -- Award XP
  PERFORM award_xp(p_user_id, v_mission.xp_reward);
  
  -- Award SP bonus (half of XP as SP)
  PERFORM record_weekly_score(p_user_id, 'mission_reward', GREATEST(v_mission.xp_reward / 2, 5), v_um.id, 'Istanbul');
  
  RETURN jsonb_build_object('success', true, 'xp_awarded', v_mission.xp_reward, 'sp_awarded', GREATEST(v_mission.xp_reward / 2, 5));
END;
$$;

-- Function to assign weekly missions to a user (picks random active missions)
CREATE OR REPLACE FUNCTION public.assign_weekly_missions(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_week_start date := (date_trunc('week', now()))::date;
  v_existing_count integer;
  v_mission RECORD;
BEGIN
  -- Check if already assigned this week
  SELECT COUNT(*) INTO v_existing_count
  FROM user_missions WHERE user_id = p_user_id AND week_start = v_week_start;
  
  IF v_existing_count > 0 THEN
    RETURN jsonb_build_object('success', true, 'already_assigned', true, 'count', v_existing_count);
  END IF;
  
  -- Pick 5 random active missions
  FOR v_mission IN
    SELECT id FROM missions WHERE is_active = true ORDER BY random() LIMIT 5
  LOOP
    INSERT INTO user_missions (user_id, mission_id, week_start, progress, completed)
    VALUES (p_user_id, v_mission.id, v_week_start, 0, false)
    ON CONFLICT DO NOTHING;
  END LOOP;
  
  RETURN jsonb_build_object('success', true, 'assigned', true);
END;
$$;
