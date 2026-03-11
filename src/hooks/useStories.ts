import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export interface NightStory {
  id: string;
  user_id: string;
  venue_id: string | null;
  content: string | null;
  image_url: string | null;
  vibe_rating: number | null;
  likes_count: number;
  views_count: number;
  expires_at: string | null;
  created_at: string;
  profiles?: { display_name: string | null; avatar_url: string | null; username: string | null; level: number | null; is_premium?: boolean | null };
  venues?: { name: string; type: string; venue_mode?: string } | null;
}

export const useStories = () => {
  return useQuery({
    queryKey: ["night_stories"],
    queryFn: async () => {
      const { data, error } = await db
        .from("night_stories")
        .select("*, profiles(display_name, avatar_url, username, level, is_premium), venues(name, type, venue_mode)")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as NightStory[];
    },
    refetchInterval: 30000,
  });
};

export const useCreateStory = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { venue_id?: string; content?: string; image_url?: string; vibe_rating?: number }) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await db
        .from("night_stories")
        .insert({ ...payload, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["night_stories"] }),
  });
};

export const useLikeStory = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ storyId, liked }: { storyId: string; liked: boolean }) => {
      if (!user) throw new Error("Not authenticated");
      if (liked) {
        await db.from("story_likes").delete().eq("user_id", user.id).eq("story_id", storyId);
      } else {
        await db.from("story_likes").insert({ user_id: user.id, story_id: storyId });
        // Get story owner info
        const { data: story } = await db.from("night_stories").select("user_id").eq("id", storyId).single();
        if (story && story.user_id !== user.id) {
          // Award +2 NightRank points to the story owner
          await db.rpc("record_weekly_score", {
            p_user_id: story.user_id,
            p_event_type: "story_reaction",
            p_points: 2,
            p_source_id: null,
            p_city: "Istanbul",
          });
          // Send notification to story owner via secure RPC
          const likerName = (await db.from("profiles").select("display_name").eq("user_id", user.id).single()).data?.display_name ?? "Birisi";
          await db.rpc("create_notification", {
            p_user_id: story.user_id,
            p_type: "story_like",
            p_title: "Hikayeni beğendi ❤️",
            p_body: `${likerName} hikayeni beğendi.`,
            p_data: { story_id: storyId, liker_id: user.id },
          });
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["night_stories"] });
      qc.invalidateQueries({ queryKey: ["my_story_likes"] });
    },
  });
};

export const useDeleteStory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (storyId: string) => {
      const { error } = await db.from("night_stories").delete().eq("id", storyId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["night_stories"] }),
  });
};

export const useMyStoryLikes = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my_story_likes", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await db
        .from("story_likes")
        .select("story_id")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data as { story_id: string }[]).map((l) => l.story_id);
    },
  });
};
