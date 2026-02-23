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
  location: string | null;
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
}

// Tier-based swipe limits
const SWIPE_LIMITS: Record<string, { swipes: number; superInterests: number }> = {
  free: { swipes: 50, superInterests: 1 },
  plus: { swipes: 150, superInterests: 5 },
  pro: { swipes: 300, superInterests: 15 },
  elite: { swipes: 999999, superInterests: 999999 },
};

export const getSwipeLimits = (tier: string) => SWIPE_LIMITS[tier] ?? SWIPE_LIMITS.free;

/** Main swipe queue hook with DayHub/NightHub scoring */
export const useSwipeUsers = (mode: "day" | "night") => {
  const { user, profile } = useAuth();
  return useQuery({
    queryKey: ["swipe_users", user?.id, mode],
    enabled: !!user,
    refetchInterval: 60_000,
    queryFn: async () => {
      // 1. Get excluded IDs (already liked/matched/blocked)
      const { data: myConns } = await db
        .from("connections")
        .select("target_id")
        .eq("user_id", user!.id);
      const excludedIds = new Set<string>((myConns ?? []).map((c: { target_id: string }) => c.target_id));
      excludedIds.add(user!.id);

      // 2. Get all candidate profiles
      const { data: profiles, error } = await db
        .from("profiles")
        .select("user_id, display_name, avatar_url, username, level, location, bio, is_premium, xp, interests, night_activity_score, total_checkins, social_power, sp_level, city_rank, subscription_tier, updated_at, daily_sp_earned")
        .limit(300);
      if (error) throw error;

      // 3. Get recent checkins (last 3 hours)
      const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
      const { data: recentCheckins } = await db
        .from("checkins")
        .select("user_id, venue_id, checked_in_at, venues(name)")
        .gte("checked_in_at", threeHoursAgo);

      // 4. For DayHub: get shared venue history (last 30 days)
      let myVenueHistory = new Set<string>();
      if (mode === "day") {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const { data: myHistory } = await db
          .from("checkins")
          .select("venue_id")
          .eq("user_id", user!.id)
          .gte("checked_in_at", thirtyDaysAgo);
        myVenueHistory = new Set((myHistory ?? []).map((c: { venue_id: string }) => c.venue_id));
      }

      // Build maps
      const myRecentVenueIds = new Set(
        (recentCheckins ?? [])
          .filter((c: { user_id: string }) => c.user_id === user!.id)
          .map((c: { venue_id: string }) => c.venue_id)
      );

      const userCheckinMap = new Map<string, { venue_id: string; venue_name: string }>();
      const userVenueHistory = new Map<string, Set<string>>();

      for (const c of recentCheckins ?? []) {
        if (c.user_id !== user!.id) {
          userCheckinMap.set(c.user_id, {
            venue_id: c.venue_id,
            venue_name: (c as any).venues?.name ?? "",
          });
        }
      }

      // For day mode, get venue history for candidates
      if (mode === "day") {
        const candidateIds = (profiles ?? [])
          .filter((p: { user_id: string }) => !excludedIds.has(p.user_id))
          .map((p: { user_id: string }) => p.user_id)
          .slice(0, 100);

        if (candidateIds.length > 0) {
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
          const { data: historyData } = await db
            .from("checkins")
            .select("user_id, venue_id")
            .in("user_id", candidateIds)
            .gte("checked_in_at", thirtyDaysAgo);

          for (const h of historyData ?? []) {
            if (!userVenueHistory.has(h.user_id)) userVenueHistory.set(h.user_id, new Set());
            userVenueHistory.get(h.user_id)!.add(h.venue_id);
          }
        }
      }

      const myCity = profile?.location ?? null;
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      // 5. Score and rank
      const scored: SwipeUser[] = (profiles ?? [])
        .filter((p: { user_id: string }) => !excludedIds.has(p.user_id))
        .map((p: any) => {
          const checkinInfo = userCheckinMap.get(p.user_id);
          const sameVenueTonight = checkinInfo ? myRecentVenueIds.has(checkinInfo.venue_id) : false;
          const nightActive = !!checkinInfo;
          const sameCity = myCity && p.location ? p.location.toLowerCase() === myCity.toLowerCase() : false;
          const spTotal = p.social_power ?? 0;
          const momentumBonus = (p.daily_sp_earned ?? 0) > 20; // SP gained in last 24h
          const isPremium = !!p.is_premium;

          // Shared venue count for DayHub
          let sharedVenueCount = 0;
          if (mode === "day" && myVenueHistory.size > 0) {
            const theirVenues = userVenueHistory.get(p.user_id);
            if (theirVenues) {
              for (const v of theirVenues) {
                if (myVenueHistory.has(v)) sharedVenueCount++;
              }
            }
          }

          let matchScore = 0;

          if (mode === "night") {
            // NightHub: proximity-first
            if (sameVenueTonight) matchScore += 100;
            if (nightActive) matchScore += 60;
            if (sameCity) matchScore += 30;
            matchScore += Math.log10(spTotal + 1) * 8;
            if (momentumBonus) matchScore += 20;
            if (isPremium) matchScore += 15;
          } else {
            // DayHub: social quality first
            if (sameCity) matchScore += 50;
            matchScore += sharedVenueCount * 40;
            matchScore += Math.log10(spTotal + 1) * 10;
            if (isPremium) matchScore += 15;
            matchScore += Math.min((p.total_checkins ?? 0) / 3, 25);
          }

          // Rising detection: high recent SP gain relative to level
          const isRising = (p.daily_sp_earned ?? 0) > 30 && spTotal < 500;

          return {
            user_id: p.user_id,
            display_name: p.display_name,
            avatar_url: p.avatar_url,
            username: p.username,
            level: p.level,
            location: p.location,
            bio: p.bio,
            is_premium: p.is_premium,
            xp: p.xp,
            interests: p.interests,
            night_activity_score: p.night_activity_score,
            total_checkins: p.total_checkins,
            social_power: spTotal,
            sp_level: p.sp_level ?? 1,
            city_rank: p.city_rank,
            subscription_tier: p.subscription_tier ?? "free",
            sameVenueTonight,
            nightActive,
            sameCity: !!sameCity,
            matchScore,
            currentVenueName: checkinInfo?.venue_name ?? null,
            sharedVenueCount,
            momentumBonus,
            isRising,
          } as SwipeUser;
        })
        .sort((a: SwipeUser, b: SwipeUser) => b.matchScore - a.matchScore)
        .slice(0, 100);

      return scored;
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

      // Check SP balance
      const { data: myProfile } = await db
        .from("profiles")
        .select("social_power, daily_super_interests, swipe_reset_at, subscription_tier")
        .eq("user_id", user.id)
        .single();

      if (!myProfile) throw new Error("Profile not found");

      const tier = myProfile.subscription_tier ?? "free";
      const limits = getSwipeLimits(tier);

      // Reset daily counters if needed
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

      // Deduct 50 SP
      await db.from("profiles").update({
        social_power: (myProfile.social_power ?? 0) - 50,
        daily_super_interests: currentSI + 1,
      }).eq("user_id", user.id);

      // Create connection with super_interest flag
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
        // Reset needed
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
