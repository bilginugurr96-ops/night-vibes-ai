
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS place_id text UNIQUE;
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS city text DEFAULT 'Istanbul';
