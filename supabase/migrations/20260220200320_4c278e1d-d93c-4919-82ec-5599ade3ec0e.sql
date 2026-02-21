
-- Add likes table with all required fields for "Liked You" feature
CREATE TABLE IF NOT EXISTS public.likes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  liker_id uuid NOT NULL,
  liked_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  venue_id uuid REFERENCES public.venues(id) ON DELETE SET NULL,
  is_super_like boolean NOT NULL DEFAULT false,
  UNIQUE(liker_id, liked_id)
);

-- Enable RLS
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

-- Users can insert their own likes
CREATE POLICY "Users can insert likes"
  ON public.likes FOR INSERT
  WITH CHECK (auth.uid() = liker_id);

-- Users can see who liked them (liked_id = me) and who they liked (liker_id = me)
CREATE POLICY "Users can view relevant likes"
  ON public.likes FOR SELECT
  USING (auth.uid() = liked_id OR auth.uid() = liker_id);

-- Users can delete their own likes
CREATE POLICY "Users can delete their likes"
  ON public.likes FOR DELETE
  USING (auth.uid() = liker_id);
