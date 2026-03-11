import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export interface NightPlan {
  id: string;
  user_id: string;
  title: string;
  plan_date: string;
  is_public: boolean;
  created_at: string;
  stops?: PlanStop[];
  participants?: PlanParticipant[];
  profiles?: { display_name: string; avatar_url: string; username: string } | null;
}

export interface PlanStop {
  id: string;
  plan_id: string;
  venue_id: string;
  stop_order: number;
  planned_time: string;
  venues?: { name: string; image_url: string | null; type: string; address: string | null } | null;
}

export interface PlanParticipant {
  id: string;
  plan_id: string;
  user_id: string;
  status: string;
  joined_at: string;
  profiles?: { display_name: string; avatar_url: string; username: string } | null;
}

export const useNightPlans = () => {
  return useQuery({
    queryKey: ["night-plans"],
    queryFn: async () => {
      const { data, error } = await db
        .from("night_plans")
        .select("*, profiles!night_plans_user_id_fkey(display_name, avatar_url, username)")
        .gte("plan_date", new Date().toISOString().split("T")[0])
        .order("plan_date", { ascending: true });
      if (error) throw error;
      return data as NightPlan[];
    },
  });
};

export const useNightPlan = (id: string) => {
  return useQuery({
    queryKey: ["night-plan", id],
    enabled: !!id,
    queryFn: async () => {
      const [
        { data: plan, error: planErr },
        { data: stops, error: stopsErr },
        { data: participants, error: partErr },
      ] = await Promise.all([
        db.from("night_plans").select("*, profiles!night_plans_user_id_fkey(display_name, avatar_url, username)").eq("id", id).maybeSingle(),
        db.from("plan_stops").select("*, venues(name, image_url, type, address)").eq("plan_id", id).order("stop_order", { ascending: true }),
        db.from("plan_participants").select("*, profiles!plan_participants_user_id_fkey(display_name, avatar_url, username)").eq("plan_id", id),
      ]);
      if (planErr) throw planErr;
      if (stopsErr) throw stopsErr;
      if (partErr) throw partErr;
      return { ...plan, stops: stops ?? [], participants: participants ?? [] } as NightPlan;
    },
  });
};

export const useMyNightPlans = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-night-plans", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await db
        .from("night_plans")
        .select("*, plan_stops(*, venues(name, image_url, type)), plan_participants(user_id, status)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as NightPlan[];
    },
  });
};

export const useCreateNightPlan = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ title, plan_date, stops }: {
      title: string;
      plan_date: string;
      stops: { venue_id: string; planned_time: string }[];
    }) => {
      if (!user) throw new Error("Not authenticated");

      const { data: plan, error: planErr } = await db
        .from("night_plans")
        .insert({ user_id: user.id, title, plan_date })
        .select()
        .single();
      if (planErr) throw planErr;

      if (stops.length > 0) {
        const stopRows = stops.map((s, i) => ({
          plan_id: plan.id,
          venue_id: s.venue_id,
          stop_order: i,
          planned_time: s.planned_time,
        }));
        const { error: stopsErr } = await db.from("plan_stops").insert(stopRows);
        if (stopsErr) throw stopsErr;
      }

      return plan;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["night-plans"] });
      qc.invalidateQueries({ queryKey: ["my-night-plans"] });
    },
  });
};

export const useJoinNightPlan = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (planId: string) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await db
        .from("plan_participants")
        .insert({ plan_id: planId, user_id: user.id, status: "joined" });
      if (error) throw error;
    },
    onSuccess: (_, planId) => {
      qc.invalidateQueries({ queryKey: ["night-plan", planId] });
      qc.invalidateQueries({ queryKey: ["night-plans"] });
    },
  });
};

export const useLeaveNightPlan = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (planId: string) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await db
        .from("plan_participants")
        .delete()
        .eq("plan_id", planId)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: (_, planId) => {
      qc.invalidateQueries({ queryKey: ["night-plan", planId] });
      qc.invalidateQueries({ queryKey: ["night-plans"] });
    },
  });
};

export const useDeleteNightPlan = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (planId: string) => {
      const { error } = await db.from("night_plans").delete().eq("id", planId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["night-plans"] });
      qc.invalidateQueries({ queryKey: ["my-night-plans"] });
    },
  });
};
