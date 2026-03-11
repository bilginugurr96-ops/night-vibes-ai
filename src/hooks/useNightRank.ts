import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserCity } from "@/hooks/useCities";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export interface LeaderboardEntry {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  username: string | null;
  level: number;
  xp: number;
  is_premium: boolean;
  weekly_score: number;
  rank: number;
}

export interface MyRank {
  weekly_score: number;
  rank: number;
  points_to_next: number;
}

export const useWeeklyLeaderboard = (city: string, limit = 50) => {
  return useQuery({
    queryKey: ["weekly-leaderboard", city, limit],
    queryFn: async () => {
      const { data, error } = await db.rpc("get_weekly_leaderboard", {
        p_city: city,
        p_limit: limit,
      });
      if (error) throw error;
      return (data ?? []) as LeaderboardEntry[];
    },
    refetchInterval: 60000,
  });
};

export const useMyWeeklyRank = (city: string) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-weekly-rank", user?.id, city],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await db.rpc("get_my_weekly_rank", {
        p_user_id: user!.id,
        p_city: city,
      });
      if (error) throw error;
      const row = data?.[0];
      return row
        ? ({ weekly_score: Number(row.weekly_score), rank: Number(row.rank), points_to_next: Number(row.points_to_next) } as MyRank)
        : { weekly_score: 0, rank: 0, points_to_next: 0 } as MyRank;
    },
    refetchInterval: 60000,
  });
};

export const useMonthlyLeaderboard = (city: string, limit = 50) => {
  return useQuery({
    queryKey: ["monthly-leaderboard", city, limit],
    queryFn: async () => {
      const { data, error } = await db.rpc("get_monthly_leaderboard", {
        p_city: city,
        p_limit: limit,
      });
      if (error) throw error;
      return (data ?? []) as (Omit<LeaderboardEntry, 'weekly_score'> & { monthly_score: number })[];
    },
    refetchInterval: 60000,
  });
};

export const useMyMonthlyRank = (city: string) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-monthly-rank", user?.id, city],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await db.rpc("get_my_monthly_rank", {
        p_user_id: user!.id,
        p_city: city,
      });
      if (error) throw error;
      const row = data?.[0];
      return row
        ? ({ weekly_score: Number(row.monthly_score), rank: Number(row.rank), points_to_next: Number(row.points_to_next) } as MyRank)
        : { weekly_score: 0, rank: 0, points_to_next: 0 } as MyRank;
    },
    refetchInterval: 60000,
  });
};

/** Get time left until end of month */
export const getMonthResetCountdown = (): { days: number; hours: number; minutes: number } => {
  const now = new Date();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const diff = endOfMonth.getTime() - now.getTime();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0 };
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return { days, hours, minutes };
};

/** Record a weekly score event from the client side */
export const useRecordScore = () => {
  const { user } = useAuth();
  const { cityName } = useUserCity();

  return async (eventType: string, points: number, sourceId?: string) => {
    if (!user) return;
    await db.rpc("record_weekly_score", {
      p_user_id: user.id,
      p_event_type: eventType,
      p_points: points,
      p_source_id: sourceId ?? null,
      p_city: cityName,
    });
  };
};

/** Get time left until Sunday 23:59 */
export const getWeekResetCountdown = (): { days: number; hours: number; minutes: number } => {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun
  const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  const endOfWeek = new Date(now);
  endOfWeek.setDate(now.getDate() + daysUntilSunday);
  endOfWeek.setHours(23, 59, 59, 999);
  const diff = endOfWeek.getTime() - now.getTime();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0 };
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return { days, hours, minutes };
};
