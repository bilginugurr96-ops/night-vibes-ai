import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export const useEventParticipants = (eventId: string) => {
  return useQuery({
    queryKey: ["event-participants", eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await db
        .from("event_participants")
        .select("*, profiles!event_participants_user_id_fkey(display_name, avatar_url, username)")
        .eq("event_id", eventId);
      if (error) throw error;
      return data as { id: string; user_id: string; joined_at: string; profiles: { display_name: string; avatar_url: string; username: string } | null }[];
    },
  });
};

export const useJoinEvent = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (eventId: string) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await db
        .from("event_participants")
        .insert({ event_id: eventId, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: (_, eventId) => {
      qc.invalidateQueries({ queryKey: ["event-participants", eventId] });
      qc.invalidateQueries({ queryKey: ["events"] });
    },
  });
};

export const useLeaveEvent = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (eventId: string) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await db
        .from("event_participants")
        .delete()
        .eq("event_id", eventId)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: (_, eventId) => {
      qc.invalidateQueries({ queryKey: ["event-participants", eventId] });
      qc.invalidateQueries({ queryKey: ["events"] });
    },
  });
};
