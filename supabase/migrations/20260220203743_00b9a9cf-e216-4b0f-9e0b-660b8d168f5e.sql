
-- 1. Story photos storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('story-photos', 'story-photos', true, 10485760, ARRAY['image/jpeg','image/jpg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: anyone can view, only authenticated users can upload their own
CREATE POLICY "Story photos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'story-photos');

CREATE POLICY "Users can upload story photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'story-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their story photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'story-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 2. Story reports table
CREATE TABLE IF NOT EXISTS public.story_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id uuid NOT NULL,
  story_id uuid NOT NULL REFERENCES public.night_stories(id) ON DELETE CASCADE,
  reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.story_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can submit reports"
ON public.story_reports FOR INSERT
WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view their own reports"
ON public.story_reports FOR SELECT
USING (auth.uid() = reporter_id);

-- 3. Add moderation / violation tracking to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS violation_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS story_ban_until timestamp with time zone,
  ADD COLUMN IF NOT EXISTS stories_posted_today integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_story_date date;

-- 4. Add report_count to night_stories + is_hidden flag
ALTER TABLE public.night_stories
  ADD COLUMN IF NOT EXISTS report_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS text_overlay text,
  ADD COLUMN IF NOT EXISTS stickers jsonb DEFAULT '[]'::jsonb;
