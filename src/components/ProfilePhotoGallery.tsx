import { useState, useRef } from "react";
import { Plus, X, Loader2, ImagePlus, ChevronLeft, ChevronRight } from "lucide-react";
import { useProfilePhotos, useUploadProfilePhoto, useDeleteProfilePhoto, ProfilePhoto } from "@/hooks/useProfilePhotos";
import { useToast } from "@/hooks/use-toast";

interface ProfilePhotoGalleryProps {
  userId: string;
  editable?: boolean;
}

const MAX_PHOTOS = 6;

const ProfilePhotoGallery = ({ userId, editable = false }: ProfilePhotoGalleryProps) => {
  const { data: photos = [] } = useProfilePhotos(userId);
  const uploadMutation = useUploadProfilePhoto();
  const deleteMutation = useDeleteProfilePhoto();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
    setDeletingId(photo.id);
    try {
      await deleteMutation.mutateAsync(photo.id);
      toast({ title: "Fotoğraf silindi" });
    } catch {
      toast({ title: "Silinemedi", variant: "destructive" });
    }
    setDeletingId(null);
  };

  const showLightbox = lightboxIdx !== null && photos[lightboxIdx];

  return (
    <>
      <div className="space-y-2">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <ImagePlus className="w-3.5 h-3.5 text-primary" />
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Fotoğraflar</span>
          </div>
          <span className="text-[10px] font-medium text-muted-foreground">{photos.length}/{MAX_PHOTOS}</span>
        </div>

        {/* Compact Grid */}
        <div className="grid grid-cols-3 gap-1.5">
          {photos.map((photo, idx) => (
            <div
              key={photo.id}
              className="relative aspect-square rounded-xl overflow-hidden group cursor-pointer"
            >
              <img
                src={photo.photo_url}
                alt=""
                className="w-full h-full object-cover"
                onClick={() => setLightboxIdx(idx)}
              />
              {editable && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(photo); }}
                  disabled={deletingId === photo.id}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {deletingId === photo.id ? (
                    <Loader2 className="w-2.5 h-2.5 text-primary-foreground animate-spin" />
                  ) : (
                    <X className="w-3 h-3 text-primary-foreground" />
                  )}
                </button>
              )}
            </div>
          ))}

          {/* Add button */}
          {editable && photos.length < MAX_PHOTOS && (
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploadMutation.isPending}
              className="aspect-square rounded-xl border border-dashed border-border/60 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary/40 hover:text-primary transition-all"
            >
              {uploadMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span className="text-[9px] font-medium">Ekle</span>
                </>
              )}
            </button>
          )}
        </div>

        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
      </div>

      {/* Lightbox */}
      {showLightbox && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center"
          onClick={() => setLightboxIdx(null)}
        >
          <button
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-muted/20 backdrop-blur-sm flex items-center justify-center text-primary-foreground hover:bg-muted/40 transition-colors z-10"
            onClick={() => setLightboxIdx(null)}
          >
            <X className="w-4 h-4" />
          </button>

          <div className="absolute top-5 left-1/2 -translate-x-1/2 text-primary-foreground/60 text-xs font-medium">
            {lightboxIdx! + 1} / {photos.length}
          </div>

          <img
            src={photos[lightboxIdx!]?.photo_url}
            alt=""
            className="max-w-[90vw] max-h-[80vh] object-contain rounded-xl"
            onClick={(e) => e.stopPropagation()}
          />

          {photos.length > 1 && (
            <>
              {lightboxIdx! > 0 && (
                <button
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-muted/20 backdrop-blur-sm flex items-center justify-center text-primary-foreground hover:bg-muted/40 transition-colors"
                  onClick={(e) => { e.stopPropagation(); setLightboxIdx(lightboxIdx! - 1); }}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
              {lightboxIdx! < photos.length - 1 && (
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-muted/20 backdrop-blur-sm flex items-center justify-center text-primary-foreground hover:bg-muted/40 transition-colors"
                  onClick={(e) => { e.stopPropagation(); setLightboxIdx(lightboxIdx! + 1); }}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </>
          )}

          {photos.length > 1 && (
            <div className="absolute bottom-6 flex gap-1.5">
              {photos.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setLightboxIdx(i); }}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    i === lightboxIdx ? "bg-primary w-4" : "bg-primary-foreground/30"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default ProfilePhotoGallery;
