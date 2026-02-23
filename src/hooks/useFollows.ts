import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export interface FollowUser {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
  profile?: {
    user_id: string;
    display_name: string | null;
    avatar_url: string | null;
    username: string | null;
    level: number | null;
    location: string | null;
    social_power: number;
    sp_level: number;
    selected_badge: string | null;
    is_premium: boolean | null;
    subscription_tier: string;
  };
  isMutual?: boolean;
}

/** Follow counts using the follows table */
export const useFollowCounts = (userId?: string) => {
  return useQuery({
    queryKey: ["followCounts", userId],
    enabled: !!userId,
    queryFn: async () => {
      const [followersRes, followingRes] = await Promise.all([
        db.from("follows").select("id", { count: "exact", head: true }).eq("following_id", userId!),
        db.from("follows").select("id", { count: "exact", head: true }).eq("follower_id", userId!),
      ]);
      return {
        followers: (followersRes.count as number) ?? 0,
        following: (followingRes.count as number) ?? 0,
      };
    },
  });
};

/** IDs the current user is following */
export const useFollowing = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["following", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await db
        .from("follows")
        .select("following_id")
        .eq("follower_id", user!.id);
      if (error) throw error;
      return (data as { following_id: string }[]).map((f) => f.following_id);
    },
  });
};

/** Full followers list with profiles */
export const useFollowersList = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["followersList", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await db
        .from("follows")
        .select("*")
        .eq("following_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (!data || data.length === 0) return [];

      const userIds = data.map((f: any) => f.follower_id);
      const { data: profiles } = await db
        .from("profiles")
        .select("user_id, display_name, avatar_url, username, level, location, social_power, sp_level, selected_badge, is_premium, subscription_tier")
        .in("user_id", userIds);

      // Check which followers the current user also follows back (mutual)
      const { data: myFollowing } = await db
        .from("follows")
        .select("following_id")
        .eq("follower_id", user!.id)
        .in("following_id", userIds);
      const mutualSet = new Set((myFollowing ?? []).map((f: any) => f.following_id));

      const profileMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p]));
      return data.map((f: any) => ({
        ...f,
        profile: profileMap.get(f.follower_id),
        isMutual: mutualSet.has(f.follower_id),
      })) as FollowUser[];
    },
  });
};

/** Full following list with profiles */
export const useFollowingList = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["followingList", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await db
        .from("follows")
        .select("*")
        .eq("follower_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (!data || data.length === 0) return [];

      const userIds = data.map((f: any) => f.following_id);
      const { data: profiles } = await db
        .from("profiles")
        .select("user_id, display_name, avatar_url, username, level, location, social_power, sp_level, selected_badge, is_premium, subscription_tier")
        .in("user_id", userIds);

      // Check which are mutual
      const { data: followBack } = await db
        .from("follows")
        .select("follower_id")
        .eq("following_id", user!.id)
        .in("follower_id", userIds);
      const mutualSet = new Set((followBack ?? []).map((f: any) => f.follower_id));

      const profileMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p]));
      return data.map((f: any) => ({
        ...f,
        profile: profileMap.get(f.following_id),
        isMutual: mutualSet.has(f.following_id),
      })) as FollowUser[];
    },
  });
};

/** Check if current user follows a specific user */
export const useIsFollowing = (targetUserId?: string) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["isFollowing", user?.id, targetUserId],
    enabled: !!user && !!targetUserId && user.id !== targetUserId,
    queryFn: async () => {
      const { data } = await db
        .from("follows")
        .select("id")
        .eq("follower_id", user!.id)
        .eq("following_id", targetUserId!)
        .maybeSingle();
      return !!data;
    },
  });
};

/** Check mutual follow */
export const useIsMutual = (targetUserId?: string) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["isMutual", user?.id, targetUserId],
    enabled: !!user && !!targetUserId && user.id !== targetUserId,
    queryFn: async () => {
      const [a, b] = await Promise.all([
        db.from("follows").select("id").eq("follower_id", user!.id).eq("following_id", targetUserId!).maybeSingle(),
        db.from("follows").select("id").eq("follower_id", targetUserId!).eq("following_id", user!.id).maybeSingle(),
      ]);
      return !!(a.data && b.data);
    },
  });
};

const invalidateFollowQueries = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ["following"] });
  qc.invalidateQueries({ queryKey: ["followCounts"] });
  qc.invalidateQueries({ queryKey: ["followersList"] });
  qc.invalidateQueries({ queryKey: ["followingList"] });
  qc.invalidateQueries({ queryKey: ["isFollowing"] });
  qc.invalidateQueries({ queryKey: ["isMutual"] });
};

/** Follow / Unfollow toggle */
export const useToggleFollow = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ targetUserId, isFollowing }: { targetUserId: string; isFollowing: boolean }) => {
      if (!user) throw new Error("Not authenticated");
      if (isFollowing) {
        // Unfollow
        await db.from("follows").delete().eq("follower_id", user.id).eq("following_id", targetUserId);
      } else {
        // Follow — check daily limit (100 for free)
        const today = new Date().toISOString().split("T")[0];
        const { count } = await db
          .from("follows")
          .select("id", { count: "exact", head: true })
          .eq("follower_id", user.id)
          .gte("created_at", `${today}T00:00:00Z`);
        if ((count ?? 0) >= 100) throw new Error("Günlük takip limitine ulaştınız");

        await db.from("follows").insert({ follower_id: user.id, following_id: targetUserId });
      }
    },
    onSuccess: () => invalidateFollowQueries(qc),
  });
};

/** Unfollow mutation (standalone) */
export const useUnfollow = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (targetId: string) => {
      if (!user) throw new Error("Not authenticated");
      await db.from("follows").delete().eq("follower_id", user.id).eq("following_id", targetId);
    },
    onSuccess: () => invalidateFollowQueries(qc),
  });
};

/** Remove a follower (delete their follow record) */
export const useRemoveFollower = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (followerId: string) => {
      if (!user) throw new Error("Not authenticated");
      await db.from("follows").delete().eq("follower_id", followerId).eq("following_id", user.id);
    },
    onSuccess: () => invalidateFollowQueries(qc),
  });
};

/** Friends checkins (people user follows) */
export const useFriendsCheckins = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["friendsCheckins", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: followData } = await db
        .from("follows")
        .select("following_id")
        .eq("follower_id", user!.id);

      if (!followData || followData.length === 0) return [];

      const followingIds = followData.map((f: any) => f.following_id);

      const { data, error } = await supabase
        .from("checkins")
        .select("*, venues(name, image_url, address)")
        .in("user_id", followingIds)
        .order("checked_in_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data ?? [];
    },
  });
};
