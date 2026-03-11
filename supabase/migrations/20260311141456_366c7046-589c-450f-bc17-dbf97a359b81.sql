
-- Night Plans table
CREATE TABLE public.night_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Gece Planı',
  plan_date date NOT NULL DEFAULT CURRENT_DATE,
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.night_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Plans viewable by everyone" ON public.night_plans
  FOR SELECT USING (true);

CREATE POLICY "Users can create own plans" ON public.night_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own plans" ON public.night_plans
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own plans" ON public.night_plans
  FOR DELETE USING (auth.uid() = user_id);

-- Plan Stops table
CREATE TABLE public.plan_stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.night_plans(id) ON DELETE CASCADE,
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  stop_order integer NOT NULL DEFAULT 0,
  planned_time time without time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.plan_stops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Plan stops viewable by everyone" ON public.plan_stops
  FOR SELECT USING (true);

CREATE POLICY "Plan owners can manage stops" ON public.plan_stops
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.night_plans WHERE id = plan_id AND user_id = auth.uid())
  );

CREATE POLICY "Plan owners can update stops" ON public.plan_stops
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.night_plans WHERE id = plan_id AND user_id = auth.uid())
  );

CREATE POLICY "Plan owners can delete stops" ON public.plan_stops
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.night_plans WHERE id = plan_id AND user_id = auth.uid())
  );

-- Plan Participants table (friends joining)
CREATE TABLE public.plan_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.night_plans(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(plan_id, user_id)
);

ALTER TABLE public.plan_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants viewable by everyone" ON public.plan_participants
  FOR SELECT USING (true);

CREATE POLICY "Users can join plans" ON public.plan_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave plans" ON public.plan_participants
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can update own participation" ON public.plan_participants
  FOR UPDATE USING (auth.uid() = user_id);

-- Event Participants table
CREATE TABLE public.event_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Event participants viewable by everyone" ON public.event_participants
  FOR SELECT USING (true);

CREATE POLICY "Users can join events" ON public.event_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave events" ON public.event_participants
  FOR DELETE USING (auth.uid() = user_id);
