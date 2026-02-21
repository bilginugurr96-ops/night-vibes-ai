import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ReservationInsert {
  venue_id?: string;
  event_id?: string;
  reservation_date: string;
  reservation_time: string;
  party_size: number;
  is_vip: boolean;
  notes?: string;
}

export const useReservations = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["reservations", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservations")
        .select("*, venues(name, image_url), events(name)")
        .eq("user_id", user!.id)
        .order("reservation_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
};

export const useCreateReservation = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ReservationInsert) => {
      if (!user) throw new Error("Not authenticated");
      const qrCode = `NHR-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const { data, error } = await supabase
        .from("reservations")
        .insert({ ...payload, user_id: user.id, qr_code: qrCode })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reservations"] }),
  });
};
