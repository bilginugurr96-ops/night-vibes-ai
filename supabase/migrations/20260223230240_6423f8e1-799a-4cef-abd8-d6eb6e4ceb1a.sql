
-- Create blocked_users table
CREATE TABLE public.blocked_users (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id uuid NOT NULL,
  blocked_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT blocked_users_unique UNIQUE (blocker_id, blocked_id),
  CONSTRAINT blocked_users_no_self CHECK (blocker_id != blocked_id)
);

-- Indexes
CREATE INDEX idx_blocked_users_blocker ON public.blocked_users (blocker_id);
CREATE INDEX idx_blocked_users_blocked ON public.blocked_users (blocked_id);

-- Enable RLS
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

-- Users can see their own blocks
CREATE POLICY "Users can view their blocks"
  ON public.blocked_users FOR SELECT
  USING (auth.uid() = blocker_id);

-- Users can block others
CREATE POLICY "Users can block others"
  ON public.blocked_users FOR INSERT
  WITH CHECK (auth.uid() = blocker_id);

-- Users can unblock
CREATE POLICY "Users can unblock"
  ON public.blocked_users FOR DELETE
  USING (auth.uid() = blocker_id);
