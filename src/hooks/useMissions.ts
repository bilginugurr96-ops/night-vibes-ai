import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export interface Mission {
  id: string;
  title: string;
  description: string | null;
  xp_reward: number;
  mission_type: string;
  target_count: number;
  is_active: boolean;
}

export interface UserMission {
  id: string;
  user_id: string;
  mission_id: string;
  progress: number;
  completed: boolean;
  completed_at: string | null;
  claimed_at: string | null;
  week_start: string;
  missions?: Mission;
}

export const useMissions = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["missions", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekStartStr = weekStart.toISOString().split("T")[0];

      // Auto-assign missions for this week
      await db.rpc("assign_weekly_missions", { p_user_id: user!.id });

      // Fetch user's assigned missions with mission details
      const { data: userMissions } = await db
        .from("user_missions")
        .select("*, missions(*)")
        .eq("user_id", user!.id)
        .eq("week_start", weekStartStr);

      if (!userMissions || userMissions.length === 0) {
        // Fallback: fetch all active missions
        const { data: missions } = await db.from("missions").select("*").eq("is_active", true);
        return (missions as Mission[]).map((m) => ({
          ...m,
          userProgress: null,
        }));
      }

      return (userMissions as UserMission[]).map((um) => ({
        ...(um.missions as Mission),
        userProgress: {
          progress: um.progress ?? 0,
          completed: um.completed ?? false,
          claimed_at: um.claimed_at,
        },
      }));
    },
  });
};

export const useClaimMission = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (missionId: string) => {
      const { data, error } = await db.rpc("claim_mission_reward", {
        p_user_id: user!.id,
        p_mission_id: missionId,
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error ?? "Claim failed");
      return data;
    },
    onSuccess: (data) => {
      toast.success(`🎉 Ödül alındı! +${data.xp_awarded} XP, +${data.sp_awarded} SP`);
      queryClient.invalidateQueries({ queryKey: ["missions"] });
      queryClient.invalidateQueries({ queryKey: ["my-weekly-rank"] });
    },
    onError: (err: Error) => {
      if (err.message === "Already claimed") {
        toast.error("Bu ödül zaten alındı");
      } else if (err.message === "Mission not completed yet") {
        toast.error("Görevi önce tamamla!");
      } else {
        toast.error("Ödül alınamadı");
      }
    },
  });
};

export const useLeaderboard = () => {
  return useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const { data, error } = await db
        .from("profiles")
        .select("user_id, display_name, avatar_url, username, level, xp, total_checkins, location, is_premium")
        .order("xp", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    refetchInterval: 60000,
  });
};
