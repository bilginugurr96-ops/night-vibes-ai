import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean | null;
  created_at: string;
  media_url?: string | null;
  media_type?: string | null;
  reply_to_id?: string | null;
}

export interface Conversation {
  partner_id: string;
  partner: {
    display_name: string | null;
    avatar_url: string | null;
    username: string | null;
    is_premium?: boolean | null;
    privacy_online_visible?: boolean | null;
  };
  last_message: string;
  last_time: string;
  unread: number;
}

export const useConversations = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["conversations", user?.id],
    enabled: !!user,
    queryFn: async () => {
      // Get all messages where user is sender or receiver
      const { data, error } = await db
        .from("messages")
        .select("*")
        .or(`sender_id.eq.${user!.id},receiver_id.eq.${user!.id}`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      
      // Build conversation list
      const partnerMap = new Map<string, { msgs: Message[]; unread: number }>();
      for (const msg of data as Message[]) {
        const partnerId = msg.sender_id === user!.id ? msg.receiver_id : msg.sender_id;
        if (!partnerMap.has(partnerId)) {
          partnerMap.set(partnerId, { msgs: [], unread: 0 });
        }
        const entry = partnerMap.get(partnerId)!;
        entry.msgs.push(msg);
        if (!msg.is_read && msg.receiver_id === user!.id) entry.unread++;
      }

      // Fetch partner profiles
      const partnerIds = Array.from(partnerMap.keys());
      if (partnerIds.length === 0) return [];
      
      const { data: profiles } = await db
        .from("profiles")
        .select("user_id, display_name, avatar_url, username, is_premium, privacy_online_visible")
        .in("user_id", partnerIds);

      const profileMap = new Map((profiles ?? []).map((p: { user_id: string } & Record<string, unknown>) => [p.user_id, p]));

      return partnerIds.map((pid) => {
        const entry = partnerMap.get(pid)!;
        const latestMsg = entry.msgs[0];
        return {
          partner_id: pid,
          partner: profileMap.get(pid) ?? { display_name: "Kullanıcı", avatar_url: null, username: null },
          last_message: latestMsg?.content ?? "",
          last_time: latestMsg?.created_at ?? "",
          unread: entry.unread,
        } as Conversation;
      }).sort((a, b) => new Date(b.last_time).getTime() - new Date(a.last_time).getTime());
    },
    refetchInterval: 10000,
  });
};

export const useRealTimeMessages = (partnerId: string) => {
  const { user } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!user || !partnerId) return;
    const channel = supabase
      .channel(`messages-${partnerId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
      }, (payload) => {
        const msg = payload.new as Message;
        if (
          (msg.sender_id === user.id && msg.receiver_id === partnerId) ||
          (msg.sender_id === partnerId && msg.receiver_id === user.id)
        ) {
          qc.invalidateQueries({ queryKey: ["messages", user.id, partnerId] });
          qc.invalidateQueries({ queryKey: ["conversations", user.id] });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, partnerId, qc]);

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
      // Mark incoming messages as read
      await db
        .from("messages")
        .update({ is_read: true })
        .eq("receiver_id", user!.id)
        .eq("sender_id", partnerId)
        .eq("is_read", false);
      return data as Message[];
    },
  });
};

export const useSendMessage = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ receiverId, content, mediaUrl, mediaType, replyToId }: {
      receiverId: string;
      content: string;
      mediaUrl?: string;
      mediaType?: string;
      replyToId?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await db
        .from("messages")
        .insert({
          sender_id: user.id,
          receiver_id: receiverId,
          content,
          media_url: mediaUrl,
          media_type: mediaType,
          reply_to_id: replyToId,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["messages", user?.id, vars.receiverId] });
      qc.invalidateQueries({ queryKey: ["conversations", user?.id] });
    },
  });
};

export const useMarkRead = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ partnerId }: { partnerId: string }) => {
      await db
        .from("messages")
        .update({ is_read: true })
        .eq("receiver_id", user!.id)
        .eq("sender_id", partnerId);
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["messages", user?.id, vars.partnerId] });
      qc.invalidateQueries({ queryKey: ["conversations", user?.id] });
    },
  });
};
