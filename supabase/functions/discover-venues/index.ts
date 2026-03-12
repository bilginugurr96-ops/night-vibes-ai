import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Google Places type → our venue_type enum mapping
const CATEGORY_MAP: Record<string, string> = {
  night_club: "club",
  bar: "bar",
  cafe: "cafe",
  restaurant: "restaurant",
};

const NIGHT_TYPES = ["night_club", "bar"];
const DAY_TYPES = ["cafe", "restaurant"];

function mapToVenueType(googleTypes: string[]): string | null {
  for (const t of googleTypes) {
    if (CATEGORY_MAP[t]) return CATEGORY_MAP[t];
  }
  return null;
}

function mapToVenueMode(venueType: string): string {
  return ["club", "bar", "concert", "lounge"].includes(venueType) ? "night" : "day";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GOOGLE_API_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY");
    if (!GOOGLE_API_KEY) {
      throw new Error("GOOGLE_PLACES_API_KEY is not configured");
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const { latitude, longitude, mode, radius = 2000 } = await req.json();

    if (!latitude || !longitude) {
      return new Response(JSON.stringify({ error: "latitude and longitude required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const searchTypes = mode === "day" ? DAY_TYPES : mode === "night" ? NIGHT_TYPES : [...NIGHT_TYPES, ...DAY_TYPES];

    // Use legacy Places API - Nearby Search
    const allPlaces: any[] = [];

    for (const placeType of searchTypes) {
      const url = new URL("https://maps.googleapis.com/maps/api/place/nearbysearch/json");
      url.searchParams.set("location", `${latitude},${longitude}`);
      url.searchParams.set("radius", String(Math.min(radius, 5000)));
      url.searchParams.set("type", placeType);
      url.searchParams.set("key", GOOGLE_API_KEY);

      const res = await fetch(url.toString());
      if (!res.ok) {
        const errText = await res.text();
        console.error(`Google Places API error for ${placeType}: ${res.status} ${errText}`);
        continue;
      }

      const data = await res.json();
      if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
        console.error(`Google Places API status for ${placeType}: ${data.status} - ${data.error_message || ""}`);
        continue;
      }

      if (data.results) {
        allPlaces.push(...data.results);
      }
    }

    // Deduplicate by place_id
    const uniquePlaces = new Map<string, any>();
    for (const p of allPlaces) {
      if (p.place_id && !uniquePlaces.has(p.place_id)) {
        uniquePlaces.set(p.place_id, p);
      }
    }

    // Build venue rows
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const venues: any[] = [];
    let inserted = 0;
    let skipped = 0;

    for (const [placeId, place] of uniquePlaces) {
      const venueType = mapToVenueType(place.types || []);
      if (!venueType) {
        skipped++;
        continue;
      }

      // Assign random local images instead of Google photo URLs
      const isNightVenue = ["club", "bar", "concert", "lounge"].includes(venueType);
      const imgPrefix = isNightVenue ? "bar" : "cafe";
      const imgNum = Math.floor(Math.random() * 8) + 1;

      const venueData = {
        place_id: placeId,
        name: place.name || "Unknown",
        latitude: place.geometry?.location?.lat,
        longitude: place.geometry?.location?.lng,
        type: venueType,
        venue_mode: mapToVenueMode(venueType),
        rating: place.rating || 4.0,
        address: place.vicinity || null,
        is_open: place.opening_hours?.open_now ?? true,
        image_url: `/venues/${imgPrefix}-${imgNum}.jpg`,
      };

      const { data, error } = await supabase
        .from("venues")
        .upsert(venueData, { onConflict: "place_id", ignoreDuplicates: true })
        .select("id, name, type")
        .maybeSingle();

      if (error) {
        console.error(`Upsert error for ${venueData.name}:`, error.message);
        skipped++;
      } else {
        venues.push(data || venueData);
        inserted++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        total_found: uniquePlaces.size,
        inserted,
        skipped,
        venues,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("discover-venues error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
