import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export interface Connection {
  id: string;
  user_id: string;
  target_id: string;
  status: "liked" | "matched" | "blocked";
  created_at: string;
  profiles?: {
    display_name: string | null;
    avatar_url: string | null;
    username: string | null;
    level: number | null;
    location: string | null;
    bio: string | null;
    is_premium?: boolean | null;
    xp?: number | null;
    interests?: string[] | null;
    night_activity_score?: number | null;
    total_checkins?: number | null;
  };
}

export interface DiscoverUser {
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
  // ranking signals
  sameVenueTonight: boolean;
  sameCity: boolean;
  matchScore: number;
  lastActive: string | null;
  currentVenueName: string | null;
}

export const useMyConnections = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["connections", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: connData, error } = await db
        .from("connections")
        .select("*")
        .or(`user_id.eq.${user!.id},target_id.eq.${user!.id}`)
        .order("created_at", { ascending: false });
      if (error) throw error;

      if (!connData || connData.length === 0) return [];

      // Gather all user IDs to fetch profiles for
      const userIds = new Set<string>();
      for (const c of connData) {
        if (c.user_id !== user!.id) userIds.add(c.user_id);
        if (c.target_id !== user!.id) userIds.add(c.target_id);
      }

      const { data: profiles } = await db
        .from("profiles")
        .select("user_id, display_name, avatar_url, username, level, location, bio, is_premium, xp, interests")
        .in("user_id", Array.from(userIds));

      const profileMap = new Map((profiles ?? []).map((p: { user_id: string } & Record<string, unknown>) => [p.user_id, p]));

      return connData.map((c: Connection) => ({
        ...c,
        profiles: profileMap.get(c.user_id === user!.id ? c.target_id : c.user_id) as Connection["profiles"],
      })) as Connection[];
    },
  });
};

export const useMatches = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["matches", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: connData, error } = await db
        .from("connections")
        .select("*")
        .eq("user_id", user!.id)
        .eq("status", "matched")
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (!connData || connData.length === 0) return [];

      const targetIds = connData.map((c: Connection) => c.target_id);
      const { data: profiles } = await db
        .from("profiles")
        .select("user_id, display_name, avatar_url, username, level, location, bio, is_premium, xp, night_activity_score, total_checkins, interests")
        .in("user_id", targetIds);

      const profileMap = new Map((profiles ?? []).map((p: { user_id: string } & Record<string, unknown>) => [p.user_id, p]));

      return connData.map((c: Connection) => ({
        ...c,
        profiles: profileMap.get(c.target_id) as Connection["profiles"],
      })) as Connection[];
    },
  });
};

/** Smart-ranked discover feed */
export const useDiscoverUsers = () => {
  const { user, profile } = useAuth();
  return useQuery({
    queryKey: ["discover_users", user?.id],
    enabled: !!user,
    refetchInterval: 60_000,
    queryFn: async () => {
      // Get IDs I've already interacted with
      const { data: myConns } = await db
        .from("connections")
        .select("target_id")
        .eq("user_id", user!.id);
      const excludedIds = new Set<string>((myConns ?? []).map((c: { target_id: string }) => c.target_id));
      excludedIds.add(user!.id);

      // Get all profiles (excluding already interacted & self)
      const { data: profiles, error } = await db
        .from("profiles")
        .select("user_id, display_name, avatar_url, username, level, location, bio, is_premium, xp, interests, night_activity_score, total_checkins, updated_at")
        .limit(200);

      if (error) throw error;

      // Get recent checkins (last 3 hours)
      const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
      const { data: recentCheckins } = await db
        .from("checkins")
        .select("user_id, venue_id, checked_in_at, venues(name)")
        .gte("checked_in_at", threeHoursAgo);

      // Get my own recent checkins to find same-venue users
      const myRecentCheckins = (recentCheckins ?? []).filter(
        (c: { user_id: string }) => c.user_id === user!.id
      );
      const myVenueIds = new Set(myRecentCheckins.map((c: { venue_id: string }) => c.venue_id));

      // Build a map: user_id -> their recent checkin venue
      const userCheckinMap = new Map<string, { venue_id: string; venue_name: string }>();
      for (const c of recentCheckins ?? []) {
        if (c.user_id !== user!.id) {
          userCheckinMap.set(c.user_id, {
            venue_id: c.venue_id,
            venue_name: c.venues?.name ?? "",
          });
        }
      }

      const myCity = profile?.location ?? null;

      // Score and filter
      const scored: DiscoverUser[] = (profiles ?? [])
        .filter((p: { user_id: string }) => !excludedIds.has(p.user_id))
        .map((p: {
          user_id: string; display_name: string | null; avatar_url: string | null;
          username: string | null; level: number | null; location: string | null;
          bio: string | null; is_premium: boolean | null; xp: number | null;
          interests: string[] | null; night_activity_score: number | null;
          total_checkins: number | null; updated_at: string | null;
        }) => {
          const checkinInfo = userCheckinMap.get(p.user_id);
          const sameVenueTonight = checkinInfo ? myVenueIds.has(checkinInfo.venue_id) : false;
          const sameCity = myCity && p.location ? p.location.toLowerCase() === myCity.toLowerCase() : false;

          // AI-like match score
          let matchScore = 0;
          if (sameVenueTonight) matchScore += 100; // Highest priority
          if (checkinInfo) matchScore += 60; // Active tonight at any venue
          if (sameCity) matchScore += 30;
          if (p.is_premium) matchScore += 15; // Boost premium
          matchScore += Math.min((p.night_activity_score ?? 0) / 10, 20);
          matchScore += Math.min((p.total_checkins ?? 0) / 5, 15);

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
            sameVenueTonight,
            sameCity: !!sameCity,
            matchScore,
            lastActive: p.updated_at,
            currentVenueName: checkinInfo?.venue_name ?? null,
          } as DiscoverUser;
        })
        .sort((a: DiscoverUser, b: DiscoverUser) => b.matchScore - a.matchScore)
        .slice(0, 50);

      return scored;
    },
  });
};

export const useLikeUser = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (targetId: string) => {
      if (!user) throw new Error("Not authenticated");
      // Check if target already liked us
      const { data: existing } = await db
        .from("connections")
        .select("id")
        .eq("user_id", targetId)
        .eq("target_id", user.id)
        .eq("status", "liked")
        .maybeSingle();

      if (existing) {
        // It's a match! Update both
        await db.from("connections").update({ status: "matched" }).eq("user_id", targetId).eq("target_id", user.id);
        await db.from("connections").insert({ user_id: user.id, target_id: targetId, status: "matched" });
        return "matched";
      } else {
        await db.from("connections").insert({ user_id: user.id, target_id: targetId, status: "liked" });
        return "liked";
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["connections"] });
      qc.invalidateQueries({ queryKey: ["matches"] });
      qc.invalidateQueries({ queryKey: ["discover_users"] });
    },
  });
};

export const useSkipUser = () => {
  const qc = useQueryClient();
  // Client-side skip — just removes from local cache
  return useMutation({
    mutationFn: async (_targetId: string) => {
      return "skipped";
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["discover_users"] });
    },
  });
};

// ── Likes (Liked You / Sent Likes) ────────────────────────────────────────────

export interface Like {
  id: string;
  liker_id: string;
  liked_id: string;
  created_at: string;
  venue_id: string | null;
  is_super_like: boolean;
  profiles?: {
    display_name: string | null;
    avatar_url: string | null;
    username: string | null;
    level: number | null;
    location: string | null;
    bio: string | null;
    is_premium: boolean | null;
    xp: number | null;
    night_activity_score: number | null;
    total_checkins: number | null;
  };
}

/** Likes received by the current user */
export const useLikedByMe = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["liked_by_me", user?.id],
    enabled: !!user,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await db
        .from("likes")
        .select("*, profiles!likes_liker_id_fkey(display_name, avatar_url, username, level, location, bio, is_premium, xp, night_activity_score, total_checkins)")
        .eq("liked_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Like[];
    },
  });
};

/** Likes sent by the current user */
export const useSentLikes = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["sent_likes", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await db
        .from("likes")
        .select("*, profiles!likes_liked_id_fkey(display_name, avatar_url, username, level, location, bio, is_premium, xp, night_activity_score, total_checkins)")
        .eq("liker_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Like[];
    },
  });
};

/** Record a like in the likes table (separate from connections) */
export const useRecordLike = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ likedId, venueId, isSuperLike }: { likedId: string; venueId?: string; isSuperLike?: boolean }) => {
      if (!user) throw new Error("Not authenticated");
      await db.from("likes").upsert(
        { liker_id: user.id, liked_id: likedId, venue_id: venueId ?? null, is_super_like: isSuperLike ?? false },
        { onConflict: "liker_id,liked_id" }
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["liked_by_me"] });
      qc.invalidateQueries({ queryKey: ["sent_likes"] });
    },
  });
};

export const useMessages = (partnerId: string) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["messages", user?.id, partnerId],
    enabled: !!user && !!partnerId,
    queryFn: async () => {
      const { data, error } = await db
        .from("messages")
        .select("*")
        .or(`and(sender_id.eq.${user!.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${user!.id})`)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    refetchInterval: 5000,
  });
};

export const useSendMessage = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ receiverId, content }: { receiverId: string; content: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await db
        .from("messages")
        .insert({ sender_id: user.id, receiver_id: receiverId, content })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["messages", user?.id, vars.receiverId] }),
  });
};
