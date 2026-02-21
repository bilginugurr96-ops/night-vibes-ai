import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface EventDB {
  id: string;
  name: string;
  venue_id: string | null;
  image_url: string | null;
  event_date: string;
  event_time: string;
  description: string | null;
  price: string;
  attendees: number;
  tags: string[];
  venues?: { name: string } | null;
}

export const useEvents = () => {
  return useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*, venues(name)")
        .order("event_date", { ascending: true });
      if (error) throw error;
      return data as EventDB[];
    },
  });
};

export const useEvent = (id: string) => {
  return useQuery({
    queryKey: ["event", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*, venues(name, address)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as EventDB & { venues: { name: string; address: string } | null };
    },
  });
};

export const useVenueEvents = (venueId: string) => {
  return useQuery({
    queryKey: ["venue-events", venueId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*, venues(name)")
        .eq("venue_id", venueId)
        .order("event_date", { ascending: true });
      if (error) throw error;
      return data as EventDB[];
    },
  });
};
