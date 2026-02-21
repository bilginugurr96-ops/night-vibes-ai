
-- connections tablosuna profiles FK ekle (target_id ve user_id için)
ALTER TABLE public.connections
  ADD CONSTRAINT connections_target_id_fkey FOREIGN KEY (target_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  ADD CONSTRAINT connections_user_id_fkey   FOREIGN KEY (user_id)   REFERENCES public.profiles(user_id) ON DELETE CASCADE;
