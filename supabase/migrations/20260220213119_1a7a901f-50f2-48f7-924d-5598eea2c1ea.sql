-- Add FK from night_stories.user_id to profiles.user_id
-- This enables the Supabase join: night_stories.select("*, profiles(...)")
ALTER TABLE public.night_stories
  ADD CONSTRAINT night_stories_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
