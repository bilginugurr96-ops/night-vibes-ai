import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

/** List of user IDs that the current user has blocked */
export const useBlockedIds = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["blockedIds", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await db
        .from("blocked_users")
        .select("blocked_id")
        .eq("blocker_id", user!.id);
      if (error) throw error;
      return (data ?? []).map((r: any) => r.blocked_id as string);
    },
  });
};

/** Full blocked list with profile details */
export const useBlockedList = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["blockedList", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await db
        .from("blocked_users")
        .select("id, blocked_id, created_at")
        .eq("blocker_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (!data || data.length === 0) return [];

      const ids = data.map((r: any) => r.blocked_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, username, sp_level, social_power")
        .in("user_id", ids);

      const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));
      return data.map((r: any) => ({
        ...r,
        profile: profileMap.get(r.blocked_id) ?? null,
      }));
    },
  });
};

/** Block a user */
export const useBlockUser = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (blockedId: string) => {
      if (!user) throw new Error("Not authenticated");

      // Insert block record
      const { error } = await db
        .from("blocked_users")
        .insert({ blocker_id: user.id, blocked_id: blockedId });
      if (error) {
        if (error.code === "23505") return; // already blocked
        throw error;
      }

      // Remove follows in both directions
      await db.from("follows").delete()
        .eq("follower_id", user.id).eq("following_id", blockedId);
      await db.from("follows").delete()
        .eq("follower_id", blockedId).eq("following_id", user.id);

      // Remove connections in both directions
      await db.from("connections").delete()
        .eq("user_id", user.id).eq("target_id", blockedId);
      await db.from("connections").delete()
        .eq("user_id", blockedId).eq("target_id", user.id);
    },
    onSuccess: () => {
      toast({ title: "🚫 Kullanıcı engellendi" });
      qc.invalidateQueries({ queryKey: ["blockedIds"] });
      qc.invalidateQueries({ queryKey: ["blockedList"] });
      qc.invalidateQueries({ queryKey: ["followCounts"] });
      qc.invalidateQueries({ queryKey: ["following"] });
    },
    onError: () => {
      toast({ title: "Engelleme başarısız", variant: "destructive" });
    },
  });
};

/** Unblock a user */
export const useUnblockUser = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (blockedId: string) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await db
        .from("blocked_users")
        .delete()
        .eq("blocker_id", user.id)
        .eq("blocked_id", blockedId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Engel kaldırıldı ✅" });
      qc.invalidateQueries({ queryKey: ["blockedIds"] });
      qc.invalidateQueries({ queryKey: ["blockedList"] });
    },
    onError: () => {
      toast({ title: "İşlem başarısız", variant: "destructive" });
    },
  });
};
