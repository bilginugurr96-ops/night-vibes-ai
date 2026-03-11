import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface DiscoverResult {
  success: boolean;
  total_found: number;
  inserted: number;
  skipped: number;
  error?: string;
}

export const useDiscoverVenues = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      latitude,
      longitude,
      mode,
      radius = 2000,
    }: {
      latitude: number;
      longitude: number;
      mode?: "day" | "night";
      radius?: number;
    }): Promise<DiscoverResult> => {
      const { data, error } = await supabase.functions.invoke("discover-venues", {
        body: { latitude, longitude, mode, radius },
      });

      if (error) throw error;
      return data as DiscoverResult;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["venues"], exact: false });
      qc.invalidateQueries({ queryKey: ["heat_map"], exact: false });
    },
  });
};
