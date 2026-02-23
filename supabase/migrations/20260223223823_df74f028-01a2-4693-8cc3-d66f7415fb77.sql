
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS selected_badge text DEFAULT NULL;

COMMENT ON COLUMN public.profiles.selected_badge IS 'The badge icon/name the user has selected to display on their profile';
