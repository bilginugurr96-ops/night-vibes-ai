import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export interface SwipeUser {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  username: string | null;
  level: number | null;
  bio: string | null;
  is_premium: boolean | null;
  xp: number | null;
  interests: string[] | null;
  night_activity_score: number | null;
  total_checkins: number | null;
  social_power: number;
  sp_level: number;
  city_rank: number | null;
  subscription_tier: string;
  // Computed signals
  sameVenueTonight: boolean;
  nightActive: boolean;
  sameCity: boolean;
  matchScore: number;
  currentVenueName: string | null;
  sharedVenueCount: number;
  momentumBonus: boolean;
  isRising: boolean;
  sharedInterestCount: number;
  mutualFollowCount: number;
  profileQuality: number;
  distanceKm: number | null;
  activityStatus: string;
}

export interface DiscoverFilters {
  minAge?: number;
  maxAge?: number;
  maxDistanceKm?: number;
}

// Tier-based swipe limits
const SWIPE_LIMITS: Record<string, { swipes: number; superInterests: number }> = {
  free: { swipes: 50, superInterests: 1 },
  plus: { swipes: 150, superInterests: 5 },
  pro: { swipes: 300, superInterests: 15 },
  elite: { swipes: 999999, superInterests: 999999 },
};

export const getSwipeLimits = (tier: string) => SWIPE_LIMITS[tier] ?? SWIPE_LIMITS.free;

/** Main swipe queue hook — calls server-side discover_users function */
export const useSwipeUsers = (mode: "day" | "night", filters?: DiscoverFilters) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["swipe_users", user?.id, mode, filters?.minAge, filters?.maxAge, filters?.maxDistanceKm],
    enabled: !!user,
    refetchInterval: 60_000,
    queryFn: async () => {
      // Try to get user's current location
      let lat: number | undefined;
      let lon: number | undefined;
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000, maximumAge: 300_000 })
        );
        lat = pos.coords.latitude;
        lon = pos.coords.longitude;
        // Update profile location silently
        db.from("profiles").update({ latitude: lat, longitude: lon }).eq("user_id", user!.id).then(() => {});
      } catch {
        // GPS unavailable, continue without distance
      }

      const params: Record<string, unknown> = {
        p_user_id: user!.id,
        p_mode: mode,
        p_limit: 50,
      };
      if (lat != null) params.p_latitude = lat;
      if (lon != null) params.p_longitude = lon;
      if (filters?.minAge) params.p_min_age = filters.minAge;
      if (filters?.maxAge) params.p_max_age = filters.maxAge;
      if (filters?.maxDistanceKm) params.p_max_distance_km = filters.maxDistanceKm;

      const { data, error } = await db.rpc("discover_users", params);

      if (error) throw error;

      return (data ?? []).map((row: any): SwipeUser => ({
        user_id: row.user_id,
        display_name: row.display_name,
        avatar_url: row.avatar_url,
        username: row.username,
        level: row.level,
        bio: row.bio,
        is_premium: row.is_premium,
        xp: row.xp,
        interests: row.interests,
        night_activity_score: row.night_activity_score,
        total_checkins: row.total_checkins,
        social_power: row.social_power ?? 0,
        sp_level: row.sp_level ?? 1,
        city_rank: row.city_rank,
        subscription_tier: row.subscription_tier ?? "free",
        sameVenueTonight: row.same_venue ?? false,
        nightActive: row.night_active ?? false,
        sameCity: row.same_city ?? false,
        matchScore: Number(row.match_score ?? 0),
        currentVenueName: row.current_venue_name ?? null,
        sharedVenueCount: row.shared_venue_count ?? 0,
        momentumBonus: row.momentum_bonus ?? false,
        isRising: row.is_rising ?? false,
        sharedInterestCount: row.shared_interest_count ?? 0,
        mutualFollowCount: row.mutual_follow_count ?? 0,
        profileQuality: row.profile_quality ?? 0,
        distanceKm: row.distance_km != null ? Number(row.distance_km) : null,
        activityStatus: row.activity_status ?? "offline",
      }));
    },
  });
};

/** Super Interest mutation: deduct SP, mark connection */
export const useSuperInterest = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (targetId: string) => {
      if (!user) throw new Error("Not authenticated");

      const { data: myProfile } = await db
        .from("profiles")
        .select("social_power, daily_super_interests, swipe_reset_at, subscription_tier")
        .eq("user_id", user.id)
        .single();

      if (!myProfile) throw new Error("Profile not found");

      const tier = myProfile.subscription_tier ?? "free";
      const limits = getSwipeLimits(tier);

      const today = new Date().toISOString().split("T")[0];
      let currentSI = myProfile.daily_super_interests ?? 0;
      if (myProfile.swipe_reset_at !== today) {
        currentSI = 0;
        await db.from("profiles").update({
          daily_swipes: 0,
          daily_super_interests: 0,
          swipe_reset_at: today,
        }).eq("user_id", user.id);
      }

      if (currentSI >= limits.superInterests) {
        throw new Error("SUPER_INTEREST_LIMIT");
      }

      if ((myProfile.social_power ?? 0) < 50) {
        throw new Error("INSUFFICIENT_SP");
      }

      await db.from("profiles").update({
        social_power: (myProfile.social_power ?? 0) - 50,
        daily_super_interests: currentSI + 1,
      }).eq("user_id", user.id);

      const { data: existing } = await db
        .from("connections")
        .select("id")
        .eq("user_id", targetId)
        .eq("target_id", user.id)
        .eq("status", "liked")
        .maybeSingle();

      if (existing) {
        await db.from("connections").update({ status: "matched" }).eq("user_id", targetId).eq("target_id", user.id);
        await db.from("connections").insert({
          user_id: user.id,
          target_id: targetId,
          status: "matched",
          super_interest: true,
          boosted_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        });
        return "matched";
      } else {
        await db.from("connections").insert({
          user_id: user.id,
          target_id: targetId,
          status: "liked",
          super_interest: true,
          boosted_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        });
        return "super_liked";
      }
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["swipe_users"] });
      qc.invalidateQueries({ queryKey: ["connections"] });
      qc.invalidateQueries({ queryKey: ["matches"] });
      if (result === "matched") {
        toast({ title: "💥 Eşleşme!", description: "Süper İlgi ile eşleştiniz!" });
      } else {
        toast({ title: "⭐ Süper İlgi gönderildi!", description: "-50 SP · 24 saat öne çıkış aktif" });
      }
    },
    onError: (err: Error) => {
      if (err.message === "INSUFFICIENT_SP") {
        toast({ title: "Yetersiz SP", description: "Süper İlgi için en az 50 SP gerekli.", variant: "destructive" });
      } else if (err.message === "SUPER_INTEREST_LIMIT") {
        toast({ title: "Günlük limit doldu", description: "Daha fazlası için tier'ını yükselt!", variant: "destructive" });
      }
    },
  });
};

/** Track daily swipe count */
export const useSwipeLimits = () => {
  const { user, profile } = useAuth();
  const tier = (profile as any)?.subscription_tier ?? "free";
  const limits = getSwipeLimits(tier);

  return useQuery({
    queryKey: ["swipe_limits", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await db
        .from("profiles")
        .select("daily_swipes, daily_super_interests, swipe_reset_at")
        .eq("user_id", user!.id)
        .single();

      if (!data) return { swipes: 0, superInterests: 0, maxSwipes: limits.swipes, maxSI: limits.superInterests };

      const today = new Date().toISOString().split("T")[0];
      if (data.swipe_reset_at !== today) {
        await db.from("profiles").update({
          daily_swipes: 0,
          daily_super_interests: 0,
          swipe_reset_at: today,
        }).eq("user_id", user!.id);
        return { swipes: 0, superInterests: 0, maxSwipes: limits.swipes, maxSI: limits.superInterests };
      }

      return {
        swipes: data.daily_swipes ?? 0,
        superInterests: data.daily_super_interests ?? 0,
        maxSwipes: limits.swipes,
        maxSI: limits.superInterests,
      };
    },
  });
};

/** Increment swipe counter */
export const useIncrementSwipe = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { data } = await db
        .from("profiles")
        .select("daily_swipes, swipe_reset_at")
        .eq("user_id", user.id)
        .single();

      const today = new Date().toISOString().split("T")[0];
      const currentSwipes = data?.swipe_reset_at === today ? (data?.daily_swipes ?? 0) : 0;

      await db.from("profiles").update({
        daily_swipes: currentSwipes + 1,
        swipe_reset_at: today,
      }).eq("user_id", user.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["swipe_limits"] });
    },
  });
};

/** Persist rejection (pass) to connections table */
export const useRejectUser = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (targetId: string) => {
      if (!user) return;
      await db.from("connections").insert({
        user_id: user.id,
        target_id: targetId,
        status: "rejected",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["swipe_users"] });
    },
  });
};
