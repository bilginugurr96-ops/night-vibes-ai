import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export interface ModerationResult {
  safe: boolean;
  confidence: number;
  rateLimited?: boolean;
  aiError?: boolean;
}

/** Compress + resize image to max 1080x1920, returns a Blob */
export async function compressImage(file: File, maxW = 1080, maxH = 1920): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      const ratio = Math.min(maxW / width, maxH / height, 1);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((b) => b ? resolve(b) : reject(new Error("Canvas toBlob failed")), "image/jpeg", 0.85);
    };
    img.onerror = reject;
    img.src = url;
  });
}

/** Run AI content moderation on a public image URL */
export async function moderateImage(imageUrl: string, type: "story" | "profile" = "story"): Promise<ModerationResult> {
  const { data, error } = await supabase.functions.invoke("moderate-content", {
    body: { imageUrl, type },
  });
  if (error) {
    console.error("Moderation call failed:", error);
    // Fail open — don't block users on AI errors
    return { safe: true, confidence: 0.5, aiError: true };
  }
  return data as ModerationResult;
}

/** Upload a photo to story-photos storage and return the public URL */
export async function uploadStoryPhoto(userId: string, blob: Blob): Promise<string> {
  const filename = `${userId}/${Date.now()}.jpg`;
  const { error } = await supabase.storage.from("story-photos").upload(filename, blob, {
    contentType: "image/jpeg",
    upsert: false,
  });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  const { data: { publicUrl } } = supabase.storage.from("story-photos").getPublicUrl(filename);
  return publicUrl;
}

/** Hook to report a story */
export const useReportStory = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ storyId, reason }: { storyId: string; reason?: string }) => {
      if (!user) throw new Error("Not authenticated");
      // Insert report
      await db.from("story_reports").insert({ reporter_id: user.id, story_id: storyId, reason });
      // Increment report count and auto-hide at 3
      const { data: story } = await db.from("night_stories").select("report_count").eq("id", storyId).single();
      const newCount = (story?.report_count ?? 0) + 1;
      await db.from("night_stories").update({
        report_count: newCount,
        is_hidden: newCount >= 3,
      }).eq("id", storyId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["night_stories"] }),
  });
};

/** Increment violation count and apply ban if needed */
export async function recordViolation(userId: string): Promise<{ violationCount: number; banned: boolean }> {
  const { data: profile } = await db.from("profiles").select("violation_count").eq("user_id", userId).single();
  const newCount = (profile?.violation_count ?? 0) + 1;

  let banUntil: string | null = null;
  if (newCount === 2) {
    // 24h story ban
    banUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  } else if (newCount >= 3) {
    // 72h restriction
    banUntil = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
  }

  await db.from("profiles").update({
    violation_count: newCount,
    ...(banUntil ? { story_ban_until: banUntil } : {}),
  }).eq("user_id", userId);

  return { violationCount: newCount, banned: !!banUntil };
}

/** Check if user can post a story today */
export async function checkStoryLimit(userId: string, isPremium: boolean): Promise<{ canPost: boolean; reason?: string }> {
  const { data: profile } = await db
    .from("profiles")
    .select("stories_posted_today, last_story_date, story_ban_until")
    .eq("user_id", userId)
    .single();

  if (!profile) return { canPost: true };

  // Check ban
  if (profile.story_ban_until && new Date(profile.story_ban_until) > new Date()) {
    const until = new Date(profile.story_ban_until);
    return { canPost: false, reason: `Story paylaşımın ${until.toLocaleString("tr-TR")} tarihine kadar kısıtlandı.` };
  }

  // Reset daily counter if new day
  const today = new Date().toISOString().slice(0, 10);
  const lastDate = profile.last_story_date;
  const todayCount = lastDate === today ? (profile.stories_posted_today ?? 0) : 0;

  // Free users: 3 per night; Premium: unlimited
  if (!isPremium && todayCount >= 3) {
    return { canPost: false, reason: "Ücretsiz hesaplar gece başına 3 hikaye paylaşabilir. Premium'a geç →" };
  }

  return { canPost: true };
}

/** Increment stories_posted_today */
export async function incrementStoryCount(userId: string) {
  const today = new Date().toISOString().slice(0, 10);
  const { data: profile } = await db
    .from("profiles")
    .select("stories_posted_today, last_story_date")
    .eq("user_id", userId)
    .single();

  const isToday = profile?.last_story_date === today;
  await db.from("profiles").update({
    stories_posted_today: isToday ? (profile.stories_posted_today ?? 0) + 1 : 1,
    last_story_date: today,
  }).eq("user_id", userId);
}
