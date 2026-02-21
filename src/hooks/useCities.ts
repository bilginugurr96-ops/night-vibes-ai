import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export interface City {
  id: string;
  name: string;
  country: string;
}

export const useCities = () => {
  return useQuery({
    queryKey: ["cities"],
    queryFn: async () => {
      const { data, error } = await db.from("cities").select("*").order("name");
      if (error) throw error;
      return (data ?? []) as City[];
    },
    staleTime: 1000 * 60 * 60,
  });
};

/** Get the current user's city name */
export const useUserCity = () => {
  const { profile } = useAuth();
  const { data: cities = [] } = useCities();
  
  const cityId = (profile as any)?.city_id;
  const city = cities.find((c) => c.id === cityId);
  
  return {
    cityId,
    cityName: city?.name ?? "Istanbul",
    city,
  };
};

/** Change user's city (rate limited to 7 days) */
export const useChangeCity = () => {
  const { user } = useAuth();

  return async (cityId: string) => {
    if (!user) return null;
    const { data, error } = await db.rpc("update_user_city", {
      p_user_id: user.id,
      p_city_id: cityId,
    });
    if (error) throw error;
    return data;
  };
};
