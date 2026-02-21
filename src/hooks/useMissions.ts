import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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

      const { data: missions } = await db.from("missions").select("*").eq("is_active", true);
      const { data: userMissions } = await db
        .from("user_missions")
        .select("*")
        .eq("user_id", user!.id)
        .eq("week_start", weekStartStr);

      return (missions as Mission[]).map((m) => ({
        ...m,
        userProgress: (userMissions as UserMission[])?.find((um) => um.mission_id === m.id) ?? null,
      }));
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
