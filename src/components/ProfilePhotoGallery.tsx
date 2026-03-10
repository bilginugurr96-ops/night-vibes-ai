import { useState, useRef } from "react";
import { Plus, X, Camera, Loader2 } from "lucide-react";
import { useProfilePhotos, useUploadProfilePhoto, useDeleteProfilePhoto, ProfilePhoto } from "@/hooks/useProfilePhotos";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface ProfilePhotoGalleryProps {
  userId: string;
  editable?: boolean;
}

const ProfilePhotoGallery = ({ userId, editable = false }: ProfilePhotoGalleryProps) => {
  const { data: photos = [] } = useProfilePhotos(userId);
  const uploadMutation = useUploadProfilePhoto();
  const deleteMutation = useDeleteProfilePhoto();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await uploadMutation.mutateAsync(file);
      toast({ title: "Fotoğraf eklendi 📸" });
    } catch (err: any) {
      if (err?.message === "unsafe") {
        toast({ title: "⚠️ Uygunsuz fotoğraf", variant: "destructive" });
      } else if (err?.message?.includes("Maksimum")) {
        toast({ title: err.message, variant: "destructive" });
      } else {
        toast({ title: "Fotoğraf yüklenemedi", variant: "destructive" });
      }
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleDelete = async (photo: ProfilePhoto) => {
    try {
      await deleteMutation.mutateAsync(photo.id);
      toast({ title: "Fotoğraf silindi" });
    } catch {
      toast({ title: "Silinemedi", variant: "destructive" });
    }
  };

  const canAdd = editable && photos.length < 6;

  return (
    <>
      <div className="space-y-2">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Fotoğraflar {photos.length}/6
        </label>
        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo, idx) => (
            <div key={photo.id} className="relative aspect-[3/4] rounded-xl overflow-hidden group">
              <img
                src={photo.photo_url}
                alt=""
                className="w-full h-full object-cover cursor-pointer"
                onClick={() => setLightboxIdx(idx)}
              />
              {editable && (
                <button
                  onClick={() => handleDelete(photo)}
                  disabled={deleteMutation.isPending}
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3.5 h-3.5 text-white" />
                </button>
              )}
            </div>
          ))}
          {canAdd && (
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploadMutation.isPending}
              className="aspect-[3/4] rounded-xl border-2 border-dashed border-border/60 flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
            >
              {uploadMutation.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  <span className="text-[10px] font-medium">Ekle</span>
                </>
              )}
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
      </div>

      {/* Lightbox */}
      {lightboxIdx !== null && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center" onClick={() => setLightboxIdx(null)}>
          <button className="absolute top-4 right-4 p-2" onClick={() => setLightboxIdx(null)}>
            <X className="w-6 h-6 text-white" />
          </button>
          <img
            src={photos[lightboxIdx]?.photo_url}
            alt=""
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-xl"
            onClick={(e) => e.stopPropagation()}
          />
          {/* Nav arrows */}
          {photos.length > 1 && (
            <>
              {lightboxIdx > 0 && (
                <button
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white"
                  onClick={(e) => { e.stopPropagation(); setLightboxIdx(lightboxIdx - 1); }}
                >
                  ‹
                </button>
              )}
              {lightboxIdx < photos.length - 1 && (
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white"
                  onClick={(e) => { e.stopPropagation(); setLightboxIdx(lightboxIdx + 1); }}
                >
                  ›
                </button>
              )}
            </>
          )}
          {/* Dots */}
          <div className="absolute bottom-6 flex gap-1.5">
            {photos.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${i === lightboxIdx ? "bg-white" : "bg-white/30"}`}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default ProfilePhotoGallery;
