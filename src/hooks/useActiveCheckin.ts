import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ActiveCheckinVenue {
  checkinId: string;
  venueId: string;
  venueName: string;
  venueImageUrl: string | null;
  venueType: string;
  venueMode: string;
  boostExpiresAt: string;
  checkedInAt: string;
  latitude: number | null;
  longitude: number | null;
}

/**
 * Returns the user's currently active check-in (boost_expires_at > now).
 * If no active check-in exists, returns null.
 */
export const useActiveCheckin = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["active-checkin", user?.id],
    enabled: !!user,
    refetchInterval: 60_000, // refresh every minute to catch expiry
    queryFn: async (): Promise<ActiveCheckinVenue | null> => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("checkins")
        .select("id, venue_id, checked_in_at, boost_expires_at, latitude, longitude, venues(name, image_url, type, venue_mode)")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .gt("boost_expires_at", new Date().toISOString())
        .order("checked_in_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) return null;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const venue = (data as any).venues;
      if (!venue) return null;

      return {
        checkinId: data.id,
        venueId: data.venue_id,
        venueName: venue.name,
        venueImageUrl: venue.image_url,
        venueType: venue.type,
        venueMode: venue.venue_mode,
        boostExpiresAt: data.boost_expires_at!,
        checkedInAt: data.checked_in_at,
        latitude: data.latitude,
        longitude: data.longitude,
      };
    },
  });
};
