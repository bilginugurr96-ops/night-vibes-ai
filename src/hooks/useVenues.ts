import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface VenueDB {
  id: string;
  name: string;
  type: "club" | "bar" | "concert" | "lounge";
  image_url: string | null;
  address: string | null;
  rating: number;
  crowd_level: number;
  is_open: boolean;
  hours: string | null;
  has_vip: boolean;
  distance: string | null;
  tags: string[];
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  live_checkin_count: number | null;
  vibe_rating: number | null;
}

export const useVenues = (type?: string) => {
  return useQuery({
    queryKey: ["venues", type],
    queryFn: async () => {
      let query = supabase.from("venues").select("*").order("rating", { ascending: false });
      if (type && type !== "all") {
        query = query.eq("type", type as "club" | "bar" | "concert" | "lounge");
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as VenueDB[];
    },
  });
};

export const useVenue = (id: string) => {
  return useQuery({
    queryKey: ["venue", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("venues").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as VenueDB;
    },
  });
};
