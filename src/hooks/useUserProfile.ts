import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

/** Fetch a user's full profile */
export const useUserProfileData = (userId?: string) =>
  useQuery({
    queryKey: ["userProfile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await db
        .from("profiles")
        .select("*")
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

/** Fetch a user's stories (posts) */
export const useUserStories = (userId?: string) =>
  useQuery({
    queryKey: ["userStories", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("night_stories")
        .select("id, image_url, content, text_overlay, likes_count, views_count, created_at, venue_id, venues(name)")
        .eq("user_id", userId!)
        .eq("is_hidden", false)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

/** Fetch a user's check-ins with venue details */
export const useUserCheckins = (userId?: string) =>
  useQuery({
    queryKey: ["userCheckins", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("checkins")
        .select("id, venue_id, checked_in_at, is_verified, venues(id, name, type, image_url, address)")
        .eq("user_id", userId!)
        .order("checked_in_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

/** Fetch a user's earned badges from user_badges table */
export const useUserBadges = (userId?: string) =>
  useQuery({
    queryKey: ["userBadges", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_badges")
        .select("*, badges(name, icon, description)")
        .eq("user_id", userId!);
      if (error) throw error;
      return data ?? [];
    },
  });

/** Mutual connections: users both you and the target follow */
export const useMutualFollows = (targetUserId?: string) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["mutualFollows", user?.id, targetUserId],
    enabled: !!user && !!targetUserId && user.id !== targetUserId,
    queryFn: async () => {
      const { data: myFollowing } = await db
        .from("follows")
        .select("following_id")
        .eq("follower_id", user!.id);
      const mySet = new Set((myFollowing ?? []).map((f: any) => f.following_id));

      const { data: theirFollowing } = await db
        .from("follows")
        .select("following_id")
        .eq("follower_id", targetUserId!);
      const mutualIds = (theirFollowing ?? [])
        .map((f: any) => f.following_id)
        .filter((id: string) => mySet.has(id) && id !== user!.id && id !== targetUserId);

      if (mutualIds.length === 0) return [];

      const { data: profiles } = await db
        .from("profiles")
        .select("user_id, display_name, avatar_url, username")
        .in("user_id", mutualIds.slice(0, 10));
      return profiles ?? [];
    },
  });
};

/** Mutual venues: venues both users have checked in */
export const useMutualVenues = (targetUserId?: string) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["mutualVenues", user?.id, targetUserId],
    enabled: !!user && !!targetUserId && user.id !== targetUserId,
    queryFn: async () => {
      const thirtyDays = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const [myRes, theirRes] = await Promise.all([
        supabase.from("checkins").select("venue_id").eq("user_id", user!.id).gte("checked_in_at", thirtyDays),
        supabase.from("checkins").select("venue_id").eq("user_id", targetUserId!).gte("checked_in_at", thirtyDays),
      ]);

      const myVenues = new Set((myRes.data ?? []).map((c) => c.venue_id));
      const mutualVenueIds = [...new Set((theirRes.data ?? []).map((c) => c.venue_id).filter((id) => myVenues.has(id)))];

      if (mutualVenueIds.length === 0) return [];

      const { data: venues } = await supabase
        .from("venues")
        .select("id, name, type, image_url")
        .in("id", mutualVenueIds.slice(0, 6));
      return venues ?? [];
    },
  });
};

/** SP Levels for display */
export const useSPLevels = () =>
  useQuery({
    queryKey: ["sp-levels"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sp_levels").select("*").order("level", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 1000 * 60 * 60,
  });

/** Top venues a user visits most (aggregated from checkins) */
export const useTopVenues = (userId?: string) =>
  useQuery({
    queryKey: ["topVenues", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("checkins")
        .select("venue_id, venues(id, name, type, image_url)")
        .eq("user_id", userId!);
      if (error) throw error;

      // Aggregate visit counts
      const venueMap = new Map<string, { venue: any; count: number }>();
      for (const ci of data ?? []) {
        const v = (ci as any).venues;
        if (!v) continue;
        const existing = venueMap.get(ci.venue_id);
        if (existing) {
          existing.count++;
        } else {
          venueMap.set(ci.venue_id, { venue: v, count: 1 });
        }
      }

      return [...venueMap.values()]
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
    },
  });

/** Event participation count */
export const useEventParticipationCount = (userId?: string) =>
  useQuery({
    queryKey: ["eventParticipationCount", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { count } = await supabase
        .from("event_participants")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId!);
      return count ?? 0;
    },
  });

/** Story count */
export const useStoryCount = (userId?: string) =>
  useQuery({
    queryKey: ["storyCount", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { count } = await supabase
        .from("night_stories")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId!);
      return count ?? 0;
    },
  });
