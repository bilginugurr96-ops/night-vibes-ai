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
  lounge: "lounge",
  cafe: "cafe",
  restaurant: "restaurant",
  coworking_space: "coworking",
  // Google "new" types
  coffee_shop: "cafe",
  bakery: "cafe",
  brunch_restaurant: "brunch",
};

const NIGHT_TYPES = ["night_club", "bar"];
const DAY_TYPES = ["cafe", "restaurant", "coffee_shop"];

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

    // Pick types based on mode
    const searchTypes = mode === "day" ? DAY_TYPES : mode === "night" ? NIGHT_TYPES : [...NIGHT_TYPES, ...DAY_TYPES];

    // Fetch from Google Places Nearby Search (New)
    const allPlaces: any[] = [];

    for (const includedType of searchTypes) {
      const body = {
        includedTypes: [includedType],
        maxResultCount: 10,
        locationRestriction: {
          circle: {
            center: { latitude, longitude },
            radius: Math.min(radius, 5000),
          },
        },
      };

      const res = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": GOOGLE_API_KEY,
          "X-Goog-FieldMask": "places.id,places.displayName,places.location,places.types,places.rating,places.formattedAddress,places.currentOpeningHours,places.photos",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error(`Google Places API error for ${includedType}: ${res.status} ${errText}`);
        continue;
      }

      const data = await res.json();
      if (data.places) {
        allPlaces.push(...data.places);
      }
    }

    // Deduplicate by place ID
    const uniquePlaces = new Map<string, any>();
    for (const p of allPlaces) {
      if (!uniquePlaces.has(p.id)) {
        uniquePlaces.set(p.id, p);
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

      const venueData = {
        place_id: placeId,
        name: place.displayName?.text || "Unknown",
        latitude: place.location?.latitude,
        longitude: place.location?.longitude,
        type: venueType,
        venue_mode: mapToVenueMode(venueType),
        rating: place.rating || 4.0,
        address: place.formattedAddress || null,
        is_open: place.currentOpeningHours?.openNow ?? true,
        image_url: place.photos?.[0]
          ? `https://places.googleapis.com/v1/${place.photos[0].name}/media?maxHeightPx=400&maxWidthPx=600&key=${GOOGLE_API_KEY}`
          : null,
      };

      // Upsert (skip if place_id exists)
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
