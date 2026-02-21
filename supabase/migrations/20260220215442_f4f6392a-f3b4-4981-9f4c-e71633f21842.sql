
-- Notifications INSERT politikasını daha güvenli hale getir
-- Sadece service_role (edge functions) veya kendi bildirimi ekleyebilsin
DROP POLICY IF EXISTS "Service can insert notifications" ON public.notifications;

-- Kullanıcılar başkasına bildirim gönderemez; sadece backend (service_role) gönderebilir
-- Frontend için geçici: kendi user_id'sine bildirim ekleyebilir (XP, görev vb.)
CREATE POLICY "Users can insert their own notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);
