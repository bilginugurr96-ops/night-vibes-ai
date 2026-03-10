import { useState, useRef } from "react";
import { Plus, X, Loader2, ImagePlus, ChevronLeft, ChevronRight, GripVertical } from "lucide-react";
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

  const emptySlots = editable ? Math.max(0, MAX_PHOTOS - photos.length) : 0;
  const showLightbox = lightboxIdx !== null && photos[lightboxIdx];

  return (
    <>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ImagePlus className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Fotoğraflar</span>
          </div>
          <span className="text-[11px] font-semibold text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full">
            {photos.length}/{MAX_PHOTOS}
          </span>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-3 gap-2.5">
          {/* First slot is larger / main */}
          {Array.from({ length: MAX_PHOTOS }).map((_, idx) => {
            const photo = photos[idx];
            const isMain = idx === 0;

            if (photo) {
              return (
                <div
                  key={photo.id}
                  className={`relative rounded-2xl overflow-hidden group cursor-pointer border-2 transition-all ${
                    isMain ? "col-span-2 row-span-2 border-primary/30" : "border-transparent"
                  }`}
                >
                  <div className={isMain ? "aspect-square" : "aspect-[3/4]"}>
                    <img
                      src={photo.photo_url}
                      alt=""
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      onClick={() => setLightboxIdx(idx)}
                    />
                  </div>

                  {/* Overlay gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                  {/* Main badge */}
                  {isMain && (
                    <div className="absolute top-2 left-2 bg-primary/90 text-primary-foreground text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Ana
                    </div>
                  )}

                  {/* Delete button */}
                  {editable && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(photo); }}
                      disabled={deletingId === photo.id}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-destructive/80"
                    >
                      {deletingId === photo.id ? (
                        <Loader2 className="w-3 h-3 text-primary-foreground animate-spin" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-primary-foreground" />
                      )}
                    </button>
                  )}
                </div>
              );
            }

            // Empty slot
            if (!editable) return null;

            return (
              <button
                key={`empty-${idx}`}
                onClick={() => fileRef.current?.click()}
                disabled={uploadMutation.isPending}
                className={`rounded-2xl border-2 border-dashed border-border/50 flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all ${
                  isMain ? "col-span-2 row-span-2 aspect-square" : "aspect-[3/4]"
                }`}
              >
                {uploadMutation.isPending && idx === photos.length ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    <span className="text-[10px] font-semibold">Ekle</span>
                  </>
                )}
              </button>
            );
          })}
        </div>

        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />

        {editable && photos.length === 0 && (
          <p className="text-center text-[11px] text-muted-foreground py-1">
            Profilini öne çıkarmak için fotoğraf ekle
          </p>
        )}
      </div>

      {/* ── Lightbox ── */}
      {showLightbox && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center"
          onClick={() => setLightboxIdx(null)}
        >
          {/* Close */}
          <button
            className="absolute top-5 right-5 w-10 h-10 rounded-full bg-muted/20 backdrop-blur-sm flex items-center justify-center text-primary-foreground hover:bg-muted/40 transition-colors z-10"
            onClick={() => setLightboxIdx(null)}
          >
            <X className="w-5 h-5" />
          </button>

          {/* Counter */}
          <div className="absolute top-6 left-1/2 -translate-x-1/2 text-primary-foreground/70 text-sm font-medium">
            {lightboxIdx! + 1} / {photos.length}
          </div>

          {/* Image */}
          <img
            src={photos[lightboxIdx!]?.photo_url}
            alt=""
            className="max-w-[92vw] max-h-[80vh] object-contain rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Navigation */}
          {photos.length > 1 && (
            <>
              {lightboxIdx! > 0 && (
                <button
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-muted/20 backdrop-blur-sm flex items-center justify-center text-primary-foreground hover:bg-muted/40 transition-colors"
                  onClick={(e) => { e.stopPropagation(); setLightboxIdx(lightboxIdx! - 1); }}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              {lightboxIdx! < photos.length - 1 && (
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-muted/20 backdrop-blur-sm flex items-center justify-center text-primary-foreground hover:bg-muted/40 transition-colors"
                  onClick={(e) => { e.stopPropagation(); setLightboxIdx(lightboxIdx! + 1); }}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}
            </>
          )}

          {/* Dots */}
          {photos.length > 1 && (
            <div className="absolute bottom-8 flex gap-2">
              {photos.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setLightboxIdx(i); }}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === lightboxIdx ? "bg-primary w-6" : "bg-primary-foreground/30 hover:bg-primary-foreground/50"
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
