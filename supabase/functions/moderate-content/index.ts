import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json() as {
      imageUrl?: string;
      type?: "story" | "profile";
      text?: string;
      textType?: "name" | "bio";
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // ── TEXT MODERATION ──
    if (body.text && body.textType) {
      const textPrompt = `You are a strict content moderation AI for VYBE, a premium social status platform.
Analyze the following ${body.textType === "name" ? "display name" : "bio text"} and determine if it violates community guidelines.

ALWAYS respond with ONLY valid JSON: { "safe": boolean, "reason": string }

Mark as UNSAFE (safe: false) if the text contains ANY of:
- Profanity, slurs, or vulgar language (in any language including Turkish)
- Sexual or sexually suggestive content
- Hate speech, racism, homophobia, or discrimination
- Threats or violent language
- Drug references or promotion
- Spam, gibberish designed to abuse, or impersonation attempts
- Contact info meant to bypass platform (phone numbers, external links)
- Offensive nicknames or derogatory terms

For DISPLAY NAMES additionally mark UNSAFE if:
- Contains only special characters or emojis with no real name
- Impersonates a public figure or brand
- Contains offensive words in any language

Safe content includes: normal names, creative usernames, fun bios about nightlife/hobbies/interests, emoji usage, city references.

Text to analyze: "${body.text.replace(/"/g, '\\"')}"

Respond ONLY with JSON. No explanation.`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [{ role: "user", content: textPrompt }],
          max_tokens: 150,
          temperature: 0,
        }),
      });

      if (!response.ok) {
        console.warn("Text moderation AI error, defaulting to safe");
        return new Response(JSON.stringify({ safe: true, confidence: 0.5, aiError: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const aiResult = await response.json();
      const content = aiResult.choices?.[0]?.message?.content ?? '{"safe":true,"reason":""}';
      let parsed = { safe: true, reason: "" };
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
      } catch {
        console.warn("Failed to parse text moderation response:", content);
      }

      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── IMAGE MODERATION (existing) ──
    const { imageUrl, type } = body;
    if (!imageUrl) throw new Error("imageUrl or text is required");

    const systemPrompt = `You are a strict content moderation AI for VYBE, a premium social status platform.
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
      ? "Analyze this profile photo for VYBE. Check for violations AND ensure it shows a clear face of a single person in appropriate clothing."
      : "Analyze this story photo for VYBE nightlife platform. Check for any content violations.";

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
        console.warn("Moderation rate limited, defaulting to safe");
        return new Response(JSON.stringify({ safe: true, confidence: 0.5, rateLimited: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      return new Response(JSON.stringify({ safe: true, confidence: 0.5, aiError: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content ?? '{"safe":true,"confidence":0.5}';

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
