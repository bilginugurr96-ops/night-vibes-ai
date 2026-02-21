import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useFavorites = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["favorites", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("favorites")
        .select("venue_id")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data.map((f) => f.venue_id as string);
    },
  });
};

export const useToggleFavorite = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ venueId, isFav }: { venueId: string; isFav: boolean }) => {
      if (!user) throw new Error("Not authenticated");
      if (isFav) {
        await supabase.from("favorites").delete().eq("user_id", user.id).eq("venue_id", venueId);
      } else {
        await supabase.from("favorites").insert({ user_id: user.id, venue_id: venueId });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["favorites"] }),
  });
};
