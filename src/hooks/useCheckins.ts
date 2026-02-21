import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export interface CheckinResult {
  success: boolean;
  error?: string;
  checkin_id?: string;
  boost_expires_at?: string;
  boost_minutes?: number;
  venue_name?: string;
  retry_after?: number;
  distance?: number;
}

/** Premium check-in with GPS validation, cooldowns, and boost timer */
export const usePremiumCheckin = () => {
  const { user, refreshProfile } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (venueId: string): Promise<CheckinResult> => {
      if (!user) throw new Error("Not authenticated");

      // Get GPS position
      let latitude: number | null = null;
      let longitude: number | null = null;

      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 30000,
          })
        );
        latitude = pos.coords.latitude;
        longitude = pos.coords.longitude;
      } catch {
        // GPS unavailable — server will still validate if venue has coords
      }

      const { data, error } = await db.rpc("premium_checkin", {
        p_user_id: user.id,
        p_venue_id: venueId,
        p_latitude: latitude,
        p_longitude: longitude,
      });

      if (error) throw error;
      return data as CheckinResult;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["venues"], exact: false });
      qc.invalidateQueries({ queryKey: ["venue"], exact: false });
      qc.invalidateQueries({ queryKey: ["checkins"] });
      qc.invalidateQueries({ queryKey: ["active-checkin"] });
      qc.invalidateQueries({ queryKey: ["weekly-leaderboard"] });
      qc.invalidateQueries({ queryKey: ["my-weekly-rank"] });
      refreshProfile();
    },
  });
};

/** Get user's currently active check-in (boost still running) */
export const useActiveCheckin = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["active-checkin", user?.id],
    enabled: !!user,
    refetchInterval: 60_000, // refresh every minute to check expiry
    queryFn: async () => {
      const { data, error } = await supabase
        .from("checkins")
        .select("*, venues(name, type, image_url)")
        .eq("user_id", user!.id)
        .eq("is_active", true)
        .gt("boost_expires_at", new Date().toISOString())
        .order("checked_in_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
};

/** Legacy hook kept for backward compat */
export const useCheckin = () => {
  const premium = usePremiumCheckin();
  return {
    ...premium,
    mutateAsync: async (venueId: string) => {
      const result = await premium.mutateAsync(venueId);
      if (!result.success) throw new Error(result.error ?? "Check-in failed");
      return result;
    },
  };
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
