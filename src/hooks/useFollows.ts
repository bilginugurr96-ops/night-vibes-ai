import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

/** Connections sayısını döndürür (follows tablosu yerine connections tablosunu kullan) */
export const useFollowCounts = (userId?: string) => {
  return useQuery({
    queryKey: ["followCounts", userId],
    enabled: !!userId,
    queryFn: async () => {
      const [followersRes, followingRes] = await Promise.all([
        // Kaç kişi bu kullanıcıyı liked/matched → "takipçi"
        db.from("connections").select("id", { count: "exact", head: true }).eq("target_id", userId!).in("status", ["liked", "matched"]),
        // Bu kullanıcı kaç kişiyi liked/matched → "takip"
        db.from("connections").select("id", { count: "exact", head: true }).eq("user_id", userId!).in("status", ["liked", "matched"]),
      ]);
      return {
        followers: (followersRes.count as number) ?? 0,
        following: (followingRes.count as number) ?? 0,
      };
    },
  });
};

/** Kullanıcının match listesi */
export const useFollowing = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["following", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await db
        .from("connections")
        .select("target_id")
        .eq("user_id", user!.id)
        .in("status", ["liked", "matched"]);
      if (error) throw error;
      return (data as { target_id: string }[]).map((f) => f.target_id);
    },
  });
};

export const useToggleFollow = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ targetUserId, isFollowing }: { targetUserId: string; isFollowing: boolean }) => {
      if (!user) throw new Error("Not authenticated");
      if (isFollowing) {
        await db.from("connections").delete().eq("user_id", user.id).eq("target_id", targetUserId);
      } else {
        await db.from("connections").insert({ user_id: user.id, target_id: targetUserId, status: "liked" });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["following"] });
      qc.invalidateQueries({ queryKey: ["followCounts"] });
    },
  });
};

export const useFriendsCheckins = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["friendsCheckins", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: connData } = await db
        .from("connections")
        .select("target_id")
        .eq("user_id", user!.id)
        .in("status", ["liked", "matched"]);

      if (!connData || (connData as { target_id: string }[]).length === 0) return [];

      const followingIds = (connData as { target_id: string }[]).map((f) => f.target_id);

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
