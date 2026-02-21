import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface VenueDB {
  id: string;
  name: string;
  type: "club" | "bar" | "concert" | "lounge" | "cafe" | "restaurant" | "coworking" | "beach" | "brunch" | "workshop";
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
  venue_mode?: string;
}

export const NIGHT_VENUE_TYPES = ["club", "bar", "concert", "lounge"];
export const DAY_VENUE_TYPES = ["cafe", "restaurant", "coworking", "beach", "brunch", "workshop"];

export const useVenues = (type?: string, modeFilter?: "night" | "day") => {
  return useQuery({
    queryKey: ["venues", type, modeFilter],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any).from("venues").select("*").order("rating", { ascending: false });
      
      if (type && type !== "all") {
        query = query.eq("type", type);
      } else if (modeFilter) {
        const types = modeFilter === "night" ? NIGHT_VENUE_TYPES : DAY_VENUE_TYPES;
        query = query.in("type", types);
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
