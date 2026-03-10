import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export interface ProfilePhoto {
  id: string;
  user_id: string;
  photo_url: string;
  display_order: number;
  created_at: string;
}

export const useProfilePhotos = (userId?: string) =>
  useQuery({
    queryKey: ["profilePhotos", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await db
        .from("profile_photos")
        .select("*")
        .eq("user_id", userId!)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ProfilePhoto[];
    },
  });

export const useUploadProfilePhoto = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error("Not authenticated");

      // Get current photo count
      const { count } = await db
        .from("profile_photos")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      if ((count ?? 0) >= 6) throw new Error("Maksimum 6 fotoğraf ekleyebilirsiniz");

      const ext = file.name.split(".").pop();
      const path = `${user.id}/photo_${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: false });
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);

      // Moderate
      try {
        const { data: modResult } = await supabase.functions.invoke("moderate-content", {
          body: { imageUrl: urlData.publicUrl, type: "profile" },
        });
        if (modResult?.safe === false) {
          await supabase.storage.from("avatars").remove([path]);
          throw new Error("unsafe");
        }
      } catch (e: any) {
        if (e?.message === "unsafe") throw e;
        // moderation failure = allow
      }

      const { error: insertErr } = await db
        .from("profile_photos")
        .insert({ user_id: user.id, photo_url: urlData.publicUrl, display_order: (count ?? 0) });
      if (insertErr) throw insertErr;

      return urlData.publicUrl;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profilePhotos", user?.id] });
    },
  });
};

export const useDeleteProfilePhoto = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (photoId: string) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await db
        .from("profile_photos")
        .delete()
        .eq("id", photoId)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profilePhotos", user?.id] });
    },
  });
};
