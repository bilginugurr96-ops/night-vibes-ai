
-- Night Stories table
CREATE TABLE IF NOT EXISTS public.night_stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  venue_id uuid REFERENCES public.venues(id) ON DELETE SET NULL,
  content text,
  image_url text,
  vibe_rating integer CHECK (vibe_rating >= 1 AND vibe_rating <= 5),
  likes_count integer DEFAULT 0,
  views_count integer DEFAULT 0,
  expires_at timestamptz DEFAULT (now() + interval '24 hours'),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.night_stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Stories viewable by everyone" ON public.night_stories FOR SELECT USING (true);
CREATE POLICY "Users can create stories" ON public.night_stories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their stories" ON public.night_stories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their stories" ON public.night_stories FOR DELETE USING (auth.uid() = user_id);

-- Story likes
CREATE TABLE IF NOT EXISTS public.story_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  story_id uuid NOT NULL REFERENCES public.night_stories(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, story_id)
);
ALTER TABLE public.story_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Story likes viewable by everyone" ON public.story_likes FOR SELECT USING (true);
CREATE POLICY "Users can like stories" ON public.story_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike stories" ON public.story_likes FOR DELETE USING (auth.uid() = user_id);

-- Connections / matches table
CREATE TABLE IF NOT EXISTS public.connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  target_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'liked' CHECK (status IN ('liked', 'matched', 'blocked')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, target_id)
);
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their connections" ON public.connections FOR SELECT USING (auth.uid() = user_id OR auth.uid() = target_id);
CREATE POLICY "Users can create connections" ON public.connections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their connections" ON public.connections FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their connections" ON public.connections FOR DELETE USING (auth.uid() = user_id);

-- Messages table (after match)
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  content text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their messages" ON public.messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can send messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users can update their messages" ON public.messages FOR UPDATE USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Weekly missions
CREATE TABLE IF NOT EXISTS public.missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  xp_reward integer NOT NULL DEFAULT 100,
  mission_type text NOT NULL DEFAULT 'checkin',
  target_count integer NOT NULL DEFAULT 1,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Missions viewable by everyone" ON public.missions FOR SELECT USING (true);

-- User mission progress
CREATE TABLE IF NOT EXISTS public.user_missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  mission_id uuid NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  progress integer DEFAULT 0,
  completed boolean DEFAULT false,
  completed_at timestamptz,
  week_start date NOT NULL DEFAULT date_trunc('week', now())::date,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, mission_id, week_start)
);
ALTER TABLE public.user_missions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their missions" ON public.user_missions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their missions" ON public.user_missions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can upsert their missions" ON public.user_missions FOR UPDATE USING (auth.uid() = user_id);

-- Badges table
CREATE TABLE IF NOT EXISTS public.badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  icon text NOT NULL,
  requirement_type text NOT NULL,
  requirement_value integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Badges viewable by everyone" ON public.badges FOR SELECT USING (true);

-- User badges
CREATE TABLE IF NOT EXISTS public.user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  badge_id uuid NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  earned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_id)
);
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User badges viewable by everyone" ON public.user_badges FOR SELECT USING (true);
CREATE POLICY "System can award badges" ON public.user_badges FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Add verified field and checkin count to checkins
ALTER TABLE public.checkins ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;
ALTER TABLE public.checkins ADD COLUMN IF NOT EXISTS latitude numeric;
ALTER TABLE public.checkins ADD COLUMN IF NOT EXISTS longitude numeric;
ALTER TABLE public.checkins ADD COLUMN IF NOT EXISTS verified_at timestamptz;

-- Add night_activity_score, city_rank, global_rank, checkin_streak to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS night_activity_score integer DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_checkins integer DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS checkin_streak integer DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_premium boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_ghost_mode boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS premium_expires_at timestamptz;

-- Add live_checkin_count to venues
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS live_checkin_count integer DEFAULT 0;
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS vibe_rating numeric DEFAULT 4.0;

-- Insert default missions
INSERT INTO public.missions (title, description, xp_reward, mission_type, target_count) VALUES
  ('Gece Başlangıcı', 'Bu hafta 1 mekana check-in yap', 100, 'checkin', 1),
  ('Sosyal Kelebek', 'Bu hafta 3 farklı mekana check-in yap', 300, 'checkin', 3),
  ('Gece Gezgini', 'Bu hafta 5 mekana check-in yap', 500, 'checkin', 5),
  ('Hikaye Anlatıcı', 'Bu hafta 2 gece hikayesi paylaş', 200, 'story', 2),
  ('Bağlantı Kurucu', 'Bu hafta 3 kişiyle eşleş', 250, 'connection', 3)
ON CONFLICT DO NOTHING;

-- Insert default badges
INSERT INTO public.badges (name, description, icon, requirement_type, requirement_value) VALUES
  ('Gece Yenisi', 'İlk check-in', '🌙', 'checkin', 1),
  ('Kulüp Kaşifi', '5 check-in', '🎵', 'checkin', 5),
  ('VIP Sosyalite', '10 check-in', '⭐', 'checkin', 10),
  ('Şehir Simgesi', '25 check-in', '🏙️', 'checkin', 25),
  ('Global Yıldız', '50 check-in', '🌟', 'checkin', 50),
  ('Hikaye Ustası', '10 hikaye', '📸', 'story', 10),
  ('Gece Ateşi', '7 gün streak', '🔥', 'streak', 7)
ON CONFLICT DO NOTHING;

-- Enable realtime for stories and messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.night_stories;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.checkins;

-- award_xp function
CREATE OR REPLACE FUNCTION public.award_xp(target_user_id uuid, xp_amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_xp integer;
  new_xp integer;
  new_level integer;
BEGIN
  SELECT xp INTO current_xp FROM public.profiles WHERE user_id = target_user_id;
  new_xp := COALESCE(current_xp, 0) + xp_amount;
  new_level := GREATEST(1, new_xp / 500 + 1);
  UPDATE public.profiles 
  SET xp = new_xp, level = new_level, updated_at = now()
  WHERE user_id = target_user_id;
END;
$$;
