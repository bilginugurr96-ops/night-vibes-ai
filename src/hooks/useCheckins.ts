import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export const useCheckin = () => {
  const { user, refreshProfile } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (venueId: string) => {
      if (!user) throw new Error("Not authenticated");

      // For now, do a standard check-in (geofence simulation)
      // In production, GPS validation would happen server-side
      const { data, error } = await supabase
        .from("checkins")
        .insert({ user_id: user.id, venue_id: venueId, is_verified: true, verified_at: new Date().toISOString() })
        .select()
        .single();
      if (error) throw error;

      // Award 50 XP for verified check-in
      await db.rpc("award_xp", { target_user_id: user.id, xp_amount: 50 });

      // Record weekly NightRank score (+15 for verified check-in)
      await db.rpc("record_weekly_score", {
        p_user_id: user.id,
        p_event_type: "checkin",
        p_points: 15,
        p_source_id: data.id,
        p_city: "Istanbul",
      });

      // Increment total_checkins on profile (fix operator precedence: wrap in parens)
      const { data: profileData } = await supabase
        .from("profiles")
        .select("total_checkins")
        .eq("user_id", user.id)
        .single();
      await supabase
        .from("profiles")
        .update({ total_checkins: (profileData?.total_checkins ?? 0) + 1 })
        .eq("user_id", user.id);

      // Increment live_checkin_count on venue
      const { data: venueData } = await supabase.from("venues").select("live_checkin_count").eq("id", venueId).single();
      await supabase.from("venues").update({ live_checkin_count: (venueData?.live_checkin_count ?? 0) + 1 }).eq("id", venueId);

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["venues"], exact: false });
      qc.invalidateQueries({ queryKey: ["venue"], exact: false });
      qc.invalidateQueries({ queryKey: ["checkins"] });
      qc.invalidateQueries({ queryKey: ["weekly-leaderboard"] });
      qc.invalidateQueries({ queryKey: ["my-weekly-rank"] });
      refreshProfile();
    },
  });
};

export const useMyCheckins = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["checkins", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("checkins")
        .select("*, venues(name, type, image_url)")
        .eq("user_id", user!.id)
        .order("checked_in_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });
};

export const useAwardXP = () => {
  const { user, refreshProfile } = useAuth();

  return async (xpAmount: number) => {
    if (!user) return;
    await db.rpc("award_xp", { target_user_id: user.id, xp_amount: xpAmount });
    await refreshProfile();
  };
};
