import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export interface SPLevel {
  level: number;
  name: string;
  min_sp: number;
  profile_frame: string | null;
  visibility_boost: number;
  matching_priority: number;
  badge_icon: string | null;
}

export const useSPLevels = () => {
  return useQuery({
    queryKey: ["sp-levels"],
    queryFn: async () => {
      const { data, error } = await db.from("sp_levels").select("*").order("level", { ascending: true });
      if (error) throw error;
      return (data ?? []) as SPLevel[];
    },
    staleTime: 1000 * 60 * 60, // cache for 1h
  });
};

export const useLeaderboardRewards = (userId?: string) => {
  return useQuery({
    queryKey: ["leaderboard-rewards", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await db
        .from("leaderboard_rewards")
        .select("*")
        .eq("user_id", userId)
        .order("awarded_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
  });
};

/** Get SP progress info for a user profile */
export const useSPProgress = () => {
  const { profile } = useAuth();
  const { data: levels = [] } = useSPLevels();

  if (!profile || levels.length === 0) {
    return {
      currentLevel: null,
      nextLevel: null,
      progressPct: 0,
      spToNext: 0,
      totalSP: 0,
      nightSP: 0,
      daySP: 0,
      percentile: null,
      streakDays: 0,
      weeklyRank: null,
    };
  }

  const totalSP = (profile as any).social_power ?? 0;
  const nightSP = (profile as any).night_sp ?? 0;
  const daySP = (profile as any).day_score ?? 0;
  const spLevel = (profile as any).sp_level ?? 1;
  const percentile = (profile as any).city_percentile ?? null;
  const streakDays = (profile as any).streak_days ?? 0;
  const weeklyRank = (profile as any).weekly_rank ?? null;
  const tier = (profile as any).subscription_tier ?? "free";

  const currentLevel = levels.find((l) => l.level === spLevel) ?? levels[0];
  const nextLevel = levels.find((l) => l.level === spLevel + 1) ?? null;

  const spInLevel = totalSP - (currentLevel?.min_sp ?? 0);
  const spRange = nextLevel ? nextLevel.min_sp - (currentLevel?.min_sp ?? 0) : 1;
  const progressPct = nextLevel ? Math.min((spInLevel / spRange) * 100, 100) : 100;
  const spToNext = nextLevel ? nextLevel.min_sp - totalSP : 0;

  return {
    currentLevel,
    nextLevel,
    progressPct,
    spToNext,
    totalSP,
    nightSP,
    daySP,
    percentile,
    streakDays,
    weeklyRank,
    tier,
  };
};

/** Record a day score from the client side */
export const useRecordDayScore = () => {
  const { user } = useAuth();

  return async (eventType: string, points: number, sourceId?: string) => {
    if (!user) return;
    await db.rpc("record_day_score", {
      p_user_id: user.id,
      p_event_type: eventType,
      p_points: points,
      p_source_id: sourceId ?? null,
      p_city: "Istanbul",
    });
  };
};

/** Trigger streak update */
export const useUpdateStreak = () => {
  const { user } = useAuth();

  return async () => {
    if (!user) return;
    await db.rpc("update_streak", { p_user_id: user.id });
  };
};

/** SP gain point values */
export const SP_POINTS = {
  NIGHT_CHECKIN: 25,
  DAY_CHECKIN: 15,
  STORY_SHARE: 20,
  LIKE_RECEIVED: 2,
  MATCH: 10,
  WEEKLY_STREAK: 50,
} as const;
