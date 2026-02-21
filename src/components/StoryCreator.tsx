import { useState, useRef, useCallback } from "react";
import { Camera, Image as ImageIcon, X, AlertTriangle, Lock } from "lucide-react";
import StoryEditor from "@/components/StoryEditor";
import { VenueDB } from "@/hooks/useVenues";
import {
  compressImage, uploadStoryPhoto, moderateImage,
  recordViolation, checkStoryLimit, incrementStoryCount,
} from "@/hooks/useStoryUpload";
import { useCreateStory } from "@/hooks/useStories";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface StoryCreatorProps {
  venues: VenueDB[];
  onClose: () => void;
  onSuccess: () => void;
}

type Phase = "pick" | "edit" | "moderating" | "blocked";

const StoryCreator = ({ venues, onClose, onSuccess }: StoryCreatorProps) => {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const createStory = useCreateStory();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<Phase>("pick");
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const [blockReason, setBlockReason] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);

  const isPremium = profile?.is_premium ?? false;
  // Use the first open venue as a default venue tag candidate
  const openVenues = venues.filter((v) => v.is_open);

  const handleFileSelect = useCallback(async (file: File) => {
    if (!user) return;
    // Check limits
    const limitCheck = await checkStoryLimit(user.id, isPremium);
    if (!limitCheck.canPost) {
      toast({ title: "Hikaye limiti aşıldı", description: limitCheck.reason, variant: "destructive" });
      return;
    }

    try {
      const compressed = await compressImage(file);
      const url = URL.createObjectURL(compressed);
      setPhotoBlob(compressed);
      setPhotoPreview(url);
      setPhase("edit");
    } catch {
      toast({ title: "Hata", description: "Fotoğraf işlenemedi", variant: "destructive" });
    }
  }, [user, isPremium, toast]);

  const handlePhotoInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
    e.target.value = "";
  };

  const handlePublish = async (editorPayload: {
    textOverlay: string;
    textStyle: string;
    selectedStickers: string[];
    vibeVote: string | null;
    venueTagged: boolean;
  }) => {
    if (!user || !photoBlob) return;
    setIsPublishing(true);

    try {
      // 1. Upload photo
      const uploadedUrl = await uploadStoryPhoto(user.id, photoBlob);
      setPublicUrl(uploadedUrl);

      // 2. AI moderation
      setPhase("moderating");
      const modResult = await moderateImage(uploadedUrl, "story");

      if (!modResult.safe) {
        // Record violation
        const violation = await recordViolation(user.id);
        let msg = "Bu fotoğraf VYBE topluluk kurallarını ihlal ediyor. Lütfen uygun bir gece yaşamı fotoğrafı yükleyin.";
        if (violation.violationCount === 1) msg += " (1. uyarı)";
        else if (violation.violationCount === 2) msg += " 24 saatlik yayın kısıtlaması uygulandı.";
        else msg += " Hesabınız geçici olarak kısıtlandı.";
        setBlockReason(msg);
        setPhase("blocked");
        setIsPublishing(false);
        return;
      }

      // 3. Find tagged venue
      const taggedVenue = editorPayload.venueTagged && openVenues[0] ? openVenues[0] : undefined;
      const taggedVenueId = taggedVenue?.id;

      // 4. Create story record
      await createStory.mutateAsync({
        image_url: uploadedUrl,
        content: editorPayload.textOverlay || undefined,
        venue_id: taggedVenueId,
        vibe_rating: editorPayload.vibeVote ? 8 : 5,
        ...(editorPayload.selectedStickers.length > 0
          ? { stickers: JSON.stringify(editorPayload.selectedStickers) }
          : {}),
      });

      // 5. Increment counter
      await incrementStoryCount(user.id);

      // 6. Award XP via RPC
      const baseXp = isPremium ? 15 : 10;
      const venueBonus = taggedVenue && (taggedVenue.crowd_level ?? 0) >= 70 ? 5 : 0; // Hot venue bonus

      // First story of the night bonus: stories_posted_today was 0 before increment
      const { data: freshProfile } = await supabase
        .from("profiles")
        .select("stories_posted_today")
        .eq("user_id", user.id)
        .single();
      const firstStoryBonus = (freshProfile?.stories_posted_today ?? 0) <= 1 ? 5 : 0;

      const totalXp = baseXp + venueBonus + firstStoryBonus;
      await supabase.rpc("award_xp", { target_user_id: user.id, xp_amount: totalXp });

      const xpParts = [`+${baseXp} XP`];
      if (venueBonus) xpParts.push("+5 Hot Venue");
      if (firstStoryBonus) xpParts.push("+5 İlk Hikaye");

      toast({ title: "Hikaye paylaşıldı! 🌙", description: `${xpParts.join(" · ")} kazandın!` });
      await refreshProfile();
      onSuccess();
    } catch (err) {
      console.error(err);
      toast({ title: "Hata", description: "Hikaye paylaşılamadı", variant: "destructive" });
      setIsPublishing(false);
      setPhase("edit");
    }
  };

  // ── Phase: PICK ────────────────────────────────────────────────────────────
  if (phase === "pick") {
    return (
      <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-lg flex flex-col items-center justify-center p-6">
        <button onClick={onClose} className="absolute top-4 right-4 w-10 h-10 glass rounded-full flex items-center justify-center border border-white/20">
          <X className="w-5 h-5 text-white" />
        </button>

        <span className="text-5xl mb-4">🌙</span>
        <h2 className="font-display text-xl font-bold text-white mb-1">Gece Hikayeni Paylaş</h2>
        <p className="text-sm text-white/50 text-center mb-8">
          {isPremium ? "Sınırsız hikaye" : "Gece başına 3 hikaye"}
        </p>

        <div className="flex flex-col gap-3 w-full max-w-xs">
          {/* Gallery */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-3 glass rounded-2xl px-5 py-4 border border-white/10 hover:border-primary/40 transition-all"
          >
            <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
              <ImageIcon className="w-5 h-5 text-primary" />
            </div>
            <div className="text-left">
              <p className="text-white font-bold text-sm">Galeriden Seç</p>
              <p className="text-white/40 text-xs">JPG, PNG, WEBP · max 10MB</p>
            </div>
          </button>

          {/* Camera */}
          <button
            onClick={() => {
              if (fileInputRef.current) {
                fileInputRef.current.accept = "image/*";
                fileInputRef.current.capture = "environment";
                fileInputRef.current.click();
              }
            }}
            className="flex items-center gap-3 glass rounded-2xl px-5 py-4 border border-white/10 hover:border-secondary/40 transition-all"
          >
            <div className="w-10 h-10 bg-secondary/20 rounded-xl flex items-center justify-center">
              <Camera className="w-5 h-5 text-secondary" />
            </div>
            <div className="text-left">
              <p className="text-white font-bold text-sm">Kamera ile Çek</p>
              <p className="text-white/40 text-xs">Anlık çekim</p>
            </div>
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          className="hidden"
          onChange={handlePhotoInput}
        />

        {!isPremium && (
          <button
            onClick={() => navigate("/profile")}
            className="mt-6 flex items-center gap-2 text-xs text-amber-400 border border-amber-400/30 rounded-full px-4 py-2"
          >
            <Lock className="w-3 h-3" />
            Sınırsız hikaye için Premium'a geç 👑
          </button>
        )}
      </div>
    );
  }

  // ── Phase: EDIT ────────────────────────────────────────────────────────────
  if (phase === "edit") {
    return (
      <StoryEditor
        photoBlob={photoBlob}
        photoPreview={photoPreview}
        venue={openVenues[0] ?? null}
        isPremium={isPremium}
        onClose={() => setPhase("pick")}
        onPublish={handlePublish}
        isPublishing={isPublishing}
      />
    );
  }

  // ── Phase: MODERATING ──────────────────────────────────────────────────────
  if (phase === "moderating") {
    return (
      <div className="fixed inset-0 z-[200] bg-black/95 flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-white font-semibold">İçerik denetleniyor…</p>
        <p className="text-white/40 text-xs">Bu birkaç saniye sürebilir</p>
      </div>
    );
  }

  // ── Phase: BLOCKED ─────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[200] bg-black/95 flex flex-col items-center justify-center p-6">
      <div className="w-16 h-16 bg-destructive/20 rounded-full flex items-center justify-center mb-4">
        <AlertTriangle className="w-8 h-8 text-destructive" />
      </div>
      <h2 className="font-display text-lg font-bold text-white mb-2 text-center">İçerik Reddedildi</h2>
      <p className="text-white/60 text-sm text-center leading-relaxed mb-6">{blockReason}</p>
      <div className="flex gap-3 w-full max-w-xs">
        <button
          onClick={() => setPhase("pick")}
          className="flex-1 glass rounded-xl py-3 text-sm text-white border border-white/20 font-semibold"
        >
          Farklı Fotoğraf
        </button>
        <button
          onClick={onClose}
          className="flex-1 glass rounded-xl py-3 text-sm text-white/60 border border-white/10"
        >
          Kapat
        </button>
      </div>
    </div>
  );
};

export default StoryCreator;
