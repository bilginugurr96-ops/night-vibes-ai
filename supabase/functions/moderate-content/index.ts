import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageUrl, type } = await req.json() as { imageUrl: string; type: "story" | "profile" };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are a strict content moderation AI for NightHub, a premium nightlife social platform.
Your job is to analyze images and determine if they violate community guidelines.

ALWAYS respond with ONLY valid JSON: { "safe": boolean, "confidence": number }

Mark as UNSAFE (safe: false) if the image contains ANY of:
- Nudity or partial nudity
- Explicit sexual content or pornographic poses
- Visible genitalia or intimate body parts
- Underwear-only or lingerie provocative photos  
- Sexual acts or suggestive sexual behavior
- Hate symbols, slurs, or extremist imagery
- Graphic violence or gore
- Drug use, drug paraphernalia, or controlled substance promotion
- Weapons displayed in threatening ways
- Adult-only content of any kind

For PROFILE photos additionally mark UNSAFE if:
- Face is not clearly visible (fully masked, covered, or absent)
- It's a group photo with no clear single subject
- Explicit or sexually provocative pose

Safe nightlife content includes: people at clubs/bars, dancing, social gatherings, drinks, venue photos, city nightlife, parties with appropriate clothing.

Respond ONLY with JSON. No explanation.`;

    const userPrompt = type === "profile"
      ? "Analyze this profile photo for NightHub. Check for violations AND ensure it shows a clear face of a single person in appropriate clothing."
      : "Analyze this story photo for NightHub nightlife platform. Check for any content violations.";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: userPrompt },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
        max_tokens: 100,
        temperature: 0,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        // On rate limit, default to allowing content but log
        console.warn("Moderation rate limited, defaulting to safe");
        return new Response(JSON.stringify({ safe: true, confidence: 0.5, rateLimited: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      // On AI error, default to allowing (don't block users due to AI outage)
      return new Response(JSON.stringify({ safe: true, confidence: 0.5, aiError: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content ?? '{"safe":true,"confidence":0.5}';

    // Parse JSON from AI response (strip markdown if present)
    let parsed = { safe: true, confidence: 0.5 };
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      }
    } catch {
      console.warn("Failed to parse AI response:", content);
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Moderation error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error", safe: true }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
