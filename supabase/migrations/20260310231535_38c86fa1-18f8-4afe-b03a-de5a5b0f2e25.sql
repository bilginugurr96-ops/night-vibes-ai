
-- Profile photos table
CREATE TABLE public.profile_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  photo_url text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.profile_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profile photos viewable by everyone" ON public.profile_photos FOR SELECT USING (true);
CREATE POLICY "Users can insert own photos" ON public.profile_photos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own photos" ON public.profile_photos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own photos" ON public.profile_photos FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_profile_photos_user ON public.profile_photos(user_id, display_order);
