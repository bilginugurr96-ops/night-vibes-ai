
-- Add foreign key from likes to profiles so PostgREST can resolve the relationship
ALTER TABLE public.likes
  ADD CONSTRAINT likes_liker_id_fkey FOREIGN KEY (liker_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  ADD CONSTRAINT likes_liked_id_fkey FOREIGN KEY (liked_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
