import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export type MessagePermission =
  | { allowed: true; type: "match" | "venue" | "premium" | "request_accepted" }
  | { allowed: false; reason: "no_match" | "blocked" | "privacy" | "premium_limit" | "request_pending" | "request_rejected" };

export const useMessagePermission = (partnerId: string | undefined) => {
  const { user, profile } = useAuth();

  return useQuery({
    queryKey: ["message_permission", user?.id, partnerId],
    enabled: !!user && !!partnerId && partnerId !== user?.id,
    queryFn: async (): Promise<MessagePermission> => {
      if (!user || !partnerId) return { allowed: false, reason: "no_match" };

      // 1. Check blocked
      const { data: blocked } = await db
        .from("blocked_users")
        .select("id")
        .or(`and(blocker_id.eq.${user.id},blocked_id.eq.${partnerId}),and(blocker_id.eq.${partnerId},blocked_id.eq.${user.id})`)
        .limit(1);
      if (blocked && blocked.length > 0) return { allowed: false, reason: "blocked" };

      // 2. Check if matched
      const { data: matchConn } = await db
        .from("connections")
        .select("id")
        .eq("user_id", user.id)
        .eq("target_id", partnerId)
        .eq("status", "matched")
        .maybeSingle();
      if (matchConn) return { allowed: true, type: "match" };

      // 3. Check accepted message request
      const { data: acceptedReq } = await db
        .from("message_requests")
        .select("id")
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${partnerId},status.eq.accepted),and(sender_id.eq.${partnerId},receiver_id.eq.${user.id},status.eq.accepted)`
        )
        .limit(1);
      if (acceptedReq && acceptedReq.length > 0) return { allowed: true, type: "request_accepted" };

      // 4. Check same venue (last 3 hours)
      const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
      const { data: myCheckins } = await db
        .from("checkins")
        .select("venue_id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .gte("checked_in_at", threeHoursAgo);

      if (myCheckins && myCheckins.length > 0) {
        const myVenueIds = myCheckins.map((c: { venue_id: string }) => c.venue_id);
        const { data: partnerCheckins } = await db
          .from("checkins")
          .select("venue_id")
          .eq("user_id", partnerId)
          .eq("is_active", true)
          .gte("checked_in_at", threeHoursAgo)
          .in("venue_id", myVenueIds);
        if (partnerCheckins && partnerCheckins.length > 0) return { allowed: true, type: "venue" };
      }

      // 5. Check premium DM quota
      const myProfile = profile as any;
      const tier = myProfile?.subscription_tier ?? "free";
      if (tier !== "free") {
        // Count DMs sent today to non-matched users
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const { count } = await db
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("sender_id", user.id)
          .gte("created_at", todayStart.toISOString());
        const dailyLimit = tier === "elite" ? 15 : tier === "pro" ? 10 : 5;
        if ((count ?? 0) < dailyLimit) return { allowed: true, type: "premium" };
        return { allowed: false, reason: "premium_limit" };
      }

      // 6. Check pending request
      const { data: pendingReq } = await db
        .from("message_requests")
        .select("id, status")
        .eq("sender_id", user.id)
        .eq("receiver_id", partnerId)
        .maybeSingle();
      if (pendingReq) {
        if (pendingReq.status === "pending") return { allowed: false, reason: "request_pending" };
        if (pendingReq.status === "rejected") return { allowed: false, reason: "request_rejected" };
      }

      // Check partner privacy
      const { data: partnerProfile } = await db
        .from("profiles")
        .select("privacy_who_can_message")
        .eq("user_id", partnerId)
        .maybeSingle();
      if (partnerProfile?.privacy_who_can_message === "nobody") return { allowed: false, reason: "privacy" };

      return { allowed: false, reason: "no_match" };
    },
    staleTime: 30_000,
  });
};
