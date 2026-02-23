
-- Add swipe system columns to connections
ALTER TABLE public.connections
ADD COLUMN IF NOT EXISTS super_interest boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS boosted_until timestamp with time zone DEFAULT NULL;

-- Add swipe limit tracking to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS daily_swipes integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS daily_super_interests integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS swipe_reset_at date DEFAULT CURRENT_DATE;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_connections_super_interest ON public.connections (target_id, super_interest) WHERE super_interest = true;
CREATE INDEX IF NOT EXISTS idx_profiles_city_sp ON public.profiles (city_id, social_power DESC);
CREATE INDEX IF NOT EXISTS idx_checkins_venue_time ON public.checkins (venue_id, checked_in_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_sp_total ON public.profiles (social_power DESC);
