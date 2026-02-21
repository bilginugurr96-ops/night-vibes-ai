
-- Checkins: herkese okuma izni ver (sadece venue_id ve checked_in_at - kimin olduğu gizli)
-- Heat map ve "Bu gece burada" için gerekli
DROP POLICY IF EXISTS "Users can view their own checkins" ON public.checkins;

-- Herkes checkin verilerini görebilsin (kim check-in yaptı bilgisi public)
CREATE POLICY "Checkins are publicly viewable"
  ON public.checkins FOR SELECT
  USING (true);
