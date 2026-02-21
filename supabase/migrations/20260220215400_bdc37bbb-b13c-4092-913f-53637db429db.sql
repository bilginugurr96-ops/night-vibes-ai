
-- ── 1. Notifications tablosu ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL,
  type        text NOT NULL DEFAULT 'general',
  title       text NOT NULL,
  body        text,
  data        jsonb DEFAULT '{}',
  is_read     boolean NOT NULL DEFAULT false,
  created_at  timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notifications' AND policyname='Users can view their own notifications') THEN
    CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notifications' AND policyname='Users can update their own notifications') THEN
    CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notifications' AND policyname='Service can insert notifications') THEN
    CREATE POLICY "Service can insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);
  END IF;
END$$;

-- ── 2. Messages tablosuna eksik kolonlar ─────────────────────────────────────
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS media_url   text,
  ADD COLUMN IF NOT EXISTS media_type  text;

-- ── 3. Profiles tablosuna eksik kolonlar ─────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS interests                text[],
  ADD COLUMN IF NOT EXISTS instagram_url            text,
  ADD COLUMN IF NOT EXISTS privacy_online_visible   boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS privacy_read_receipts    boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS privacy_who_can_message  text    DEFAULT 'matches',
  ADD COLUMN IF NOT EXISTS privacy_hide_checkins    boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS privacy_hide_visitors    boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_complete      boolean DEFAULT false;

-- ── 4. Avatars storage bucket ─────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='objects' AND schemaname='storage' AND policyname='Avatars are publicly accessible') THEN
    CREATE POLICY "Avatars are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='objects' AND schemaname='storage' AND policyname='Users can upload their own avatar') THEN
    CREATE POLICY "Users can upload their own avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='objects' AND schemaname='storage' AND policyname='Users can update their own avatar') THEN
    CREATE POLICY "Users can update their own avatar" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END$$;

-- ── 5. Realtime ─────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
