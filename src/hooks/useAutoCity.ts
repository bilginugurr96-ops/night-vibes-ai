import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

/**
 * Automatically detects user's city from browser geolocation
 * and assigns it to their profile if not already set.
 * Runs once per session.
 */
export const useAutoCity = () => {
  const { user, profile } = useAuth();
  const attempted = useRef(false);

  useEffect(() => {
    if (!user || attempted.current) return;
    // Only run if city_id is not set
    if ((profile as any)?.city_id) return;

    attempted.current = true;

    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;

          // Reverse geocode via OpenStreetMap Nominatim (free, no key needed)
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=en`,
            { headers: { "User-Agent": "VYBE-App/1.0" } }
          );
          if (!res.ok) return;

          const geo = await res.json();
          const cityName =
            geo.address?.city ||
            geo.address?.town ||
            geo.address?.province ||
            geo.address?.state;

          if (!cityName) return;

          // Determine country
          const country = geo.address?.country || "Turkey";

          // Call DB function to assign city
          await db.rpc("auto_assign_city", {
            p_user_id: user.id,
            p_city_name: cityName,
            p_country: country,
          });
        } catch {
          // Silently fail — not critical
        }
      },
      () => {
        // User denied geolocation — do nothing
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  }, [user, profile]);
};
