import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export interface MessageRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  message_preview: string;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  sender_profile?: {
    display_name: string | null;
    avatar_url: string | null;
    username: string | null;
    is_premium: boolean | null;
  };
}

/** Received message requests (pending) */
export const useReceivedRequests = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  // Real-time subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("msg-requests")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "message_requests",
        filter: `receiver_id=eq.${user.id}`,
      }, () => {
        qc.invalidateQueries({ queryKey: ["received_requests", user.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, qc]);

  return useQuery({
    queryKey: ["received_requests", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await db
        .from("message_requests")
        .select("*")
        .eq("receiver_id", user!.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;

      if (!data || data.length === 0) return [];

      // Fetch sender profiles
      const senderIds = data.map((r: { sender_id: string }) => r.sender_id);
      const { data: profiles } = await db
        .from("profiles")
        .select("user_id, display_name, avatar_url, username, is_premium")
        .in("user_id", senderIds);

      const profileMap = new Map(
        (profiles ?? []).map((p: { user_id: string } & Record<string, unknown>) => [p.user_id, p])
      );

      return data.map((r: MessageRequest) => ({
        ...r,
        sender_profile: profileMap.get(r.sender_id) ?? { display_name: null, avatar_url: null, username: null, is_premium: null },
      })) as MessageRequest[];
    },
  });
};

/** Send a message request */
export const useSendMessageRequest = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ receiverId, messagePreview }: { receiverId: string; messagePreview: string }) => {
      if (!user) throw new Error("Not authenticated");

      // Anti-spam: check daily limit (max 10 requests/day)
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { count } = await db
        .from("message_requests")
        .select("id", { count: "exact", head: true })
        .eq("sender_id", user.id)
        .gte("created_at", todayStart.toISOString());
      if ((count ?? 0) >= 10) throw new Error("Günlük istek limiti doldu (10/gün)");

      // Check cooldown (30 seconds)
      const { data: lastReq } = await db
        .from("message_requests")
        .select("created_at")
        .eq("sender_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);
      if (lastReq && lastReq.length > 0) {
        const lastTime = new Date(lastReq[0].created_at).getTime();
        if (Date.now() - lastTime < 30_000) throw new Error("Lütfen 30 saniye bekleyin");
      }

      // Check if rejected within 7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: rejectedReq } = await db
        .from("message_requests")
        .select("id")
        .eq("sender_id", user.id)
        .eq("receiver_id", receiverId)
        .eq("status", "rejected")
        .gte("updated_at", sevenDaysAgo)
        .maybeSingle();
      if (rejectedReq) throw new Error("Bu kişiye 7 gün boyunca tekrar istek gönderemezsin");

      // Upsert request
      const { data, error } = await db
        .from("message_requests")
        .upsert({
          sender_id: user.id,
          receiver_id: receiverId,
          message_preview: messagePreview.substring(0, 200),
          status: "pending",
          updated_at: new Date().toISOString(),
        }, { onConflict: "sender_id,receiver_id" })
        .select()
        .single();
      if (error) throw error;

      // Notify receiver
      const myName = (await db.from("profiles").select("display_name").eq("user_id", user.id).single()).data?.display_name ?? "Birisi";
      await db.rpc("create_notification", {
        p_user_id: receiverId,
        p_type: "message_request",
        p_title: `${myName} sana mesaj isteği gönderdi 💬`,
        p_body: messagePreview.substring(0, 100),
        p_data: { sender_id: user.id },
      }).catch(() => {});

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["message_permission"] });
    },
  });
};

/** Accept a message request */
export const useAcceptRequest = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (requestId: string) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await db
        .from("message_requests")
        .update({ status: "accepted", updated_at: new Date().toISOString() })
        .eq("id", requestId)
        .eq("receiver_id", user.id)
        .select()
        .single();
      if (error) throw error;

      // Notify sender
      const myName = (await db.from("profiles").select("display_name").eq("user_id", user.id).single()).data?.display_name ?? "Birisi";
      await db.rpc("create_notification", {
        p_user_id: data.sender_id,
        p_type: "request_accepted",
        p_title: `${myName} mesaj isteğini kabul etti ✅`,
        p_body: "Artık mesaj atabilirsin!",
        p_data: { accepter_id: user.id },
      }).catch(() => {});

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["received_requests"] });
      qc.invalidateQueries({ queryKey: ["message_permission"] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
};

/** Reject a message request */
export const useRejectRequest = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (requestId: string) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await db
        .from("message_requests")
        .update({ status: "rejected", updated_at: new Date().toISOString() })
        .eq("id", requestId)
        .eq("receiver_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["received_requests"] });
    },
  });
};
