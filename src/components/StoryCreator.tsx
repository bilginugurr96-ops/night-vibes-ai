import { useState, useRef, useCallback } from "react";
import { Camera, Image as ImageIcon, X } from "lucide-react";
import StoryEditor from "@/components/StoryEditor";
import { VenueDB } from "@/hooks/useVenues";
import { useActiveCheckin } from "@/hooks/useActiveCheckin";
import {
  compressImage, uploadStoryPhoto, moderateImage,
  recordViolation, checkStoryLimit, incrementStoryCount,
} from "@/hooks/useStoryUpload";
import { useCreateStory } from "@/hooks/useStories";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

interface StoryCreatorProps {
  venues: VenueDB[];
  onClose: () => void;
  onSuccess: (storySP: number) => void;
}

type Phase = "pick" | "edit" | "moderating" | "blocked";

/** Fixed SP model: base 8, checkin 12, boost 15 */
function calculateStorySP(hasActiveCheckin: boolean, hasActiveBoost: boolean): number {
  if (hasActiveBoost) return 15;
  if (hasActiveCheckin) return 12;
  return 8;
}

const StoryCreator = ({ venues, onClose, onSuccess }: StoryCreatorProps) => {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const createStory = useCreateStory();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<Phase>("pick");
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [blockReason, setBlockReason] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);

  const isPremium = profile?.is_premium ?? false;
  const { data: activeCheckin } = useActiveCheckin();

  const activeCheckinVenue: VenueDB | null = activeCheckin
    ? {
        id: activeCheckin.venueId,
        name: activeCheckin.venueName,
        image_url: activeCheckin.venueImageUrl,
        type: activeCheckin.venueType as VenueDB["type"],
        venue_mode: activeCheckin.venueMode,
        address: null, rating: 0, crowd_level: 0, is_open: true, hours: null,
        has_vip: false, distance: null, tags: [], description: null,
        latitude: activeCheckin.latitude, longitude: activeCheckin.longitude,
        live_checkin_count: null, vibe_rating: null,
      }
    : null;

  const hasActiveBoost = !!activeCheckin && new Date(activeCheckin.boostExpiresAt) > new Date();

  const handleFileSelect = useCallback(async (file: File) => {
    if (!user) return;
    const limitCheck = await checkStoryLimit(user.id, isPremium);
    if (!limitCheck.canPost) {
      toast({ title: "Limit", description: limitCheck.reason, variant: "destructive" });
      return;
    }
    try {
      const compressed = await compressImage(file);
      setPhotoBlob(compressed);
      setPhotoPreview(URL.createObjectURL(compressed));
      setPhase("edit");
    } catch {
      toast({ title: "Error", description: "Could not process photo", variant: "destructive" });
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
    selectedVenueId: string | null;
    moodTag?: string | null;
    brightness?: number;
  }) => {
    if (!user || !photoBlob) return;
    setIsPublishing(true);

    try {
      // 1. Upload
      const uploadedUrl = await uploadStoryPhoto(user.id, photoBlob);

      // 2. Moderate
      setPhase("moderating");
      const modResult = await moderateImage(uploadedUrl, "story");

      if (!modResult.safe) {
        const violation = await recordViolation(user.id);
        let msg = "This photo violates community guidelines.";
        if (violation.violationCount === 2) msg += " 24h restriction applied.";
        else if (violation.violationCount >= 3) msg += " Account temporarily restricted.";
        setBlockReason(msg);
        setPhase("blocked");
        setIsPublishing(false);
        return;
      }

      // 3. Venue
      const taggedVenueId = editorPayload.venueTagged ? editorPayload.selectedVenueId : null;

      // 4. Create story
      await createStory.mutateAsync({
        image_url: uploadedUrl,
        content: editorPayload.textOverlay || undefined,
        venue_id: taggedVenueId ?? undefined,
        vibe_rating: editorPayload.vibeVote ? 8 : 5,
      });

      // 5. Increment daily count
      await incrementStoryCount(user.id);

      // 6. Fixed SP reward (only first 3 stories per 24h)
      const { data: freshProfile } = await db
        .from("profiles")
        .select("stories_posted_today")
        .eq("user_id", user.id)
        .single();

      const storiesPosted = freshProfile?.stories_posted_today ?? 0;
      let spAwarded = 0;

      if (storiesPosted <= 3) {
        spAwarded = calculateStorySP(!!activeCheckin, hasActiveBoost);
        // Award via record_weekly_score RPC (handles daily/weekly caps)
        await db.rpc("record_weekly_score", {
          p_user_id: user.id,
          p_event_type: "story",
          p_points: spAwarded,
          p_source_id: null,
          p_city: "Istanbul",
        });
      }

      // 7. Award XP separately
      const xpAmount = isPremium ? 15 : 10;
      await db.rpc("award_xp", { target_user_id: user.id, xp_amount: xpAmount });

      await refreshProfile();
      onSuccess(spAwarded);
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Story could not be shared", variant: "destructive" });
      setIsPublishing(false);
      setPhase("edit");
    }
  };

  // ── PICK phase ──
  if (phase === "pick") {
    return (
      <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/8 flex items-center justify-center border border-white/10"
        >
          <X className="w-4 h-4 text-white/70" />
        </button>

        <p className="text-white/30 text-xs font-medium tracking-widest uppercase mb-8">New Story</p>

        {/* Camera shutter */}
        <button
          onClick={() => {
            if (fileInputRef.current) {
              fileInputRef.current.accept = "image/*";
              fileInputRef.current.capture = "environment";
              fileInputRef.current.click();
            }
          }}
          className="w-20 h-20 rounded-full border-[3px] border-white/30 flex items-center justify-center mb-6 transition-all duration-200 active:scale-95"
        >
          <div className="w-16 h-16 rounded-full border-2 border-white/15 flex items-center justify-center">
            <Camera className="w-6 h-6 text-white/50" />
          </div>
        </button>

        <p className="text-white/20 text-[10px] mb-8">Tap to capture</p>

        {/* Gallery button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 text-white/40 text-xs hover:text-white/60 transition-colors duration-200"
        >
          <ImageIcon className="w-4 h-4" />
          <span>Choose from gallery</span>
        </button>

        {/* Active check-in indicator */}
        {activeCheckin && (
          <div className="absolute bottom-12 flex items-center gap-2 bg-white/5 rounded-full px-4 py-2 border border-white/8">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400/80" />
            <span className="text-[11px] text-white/40">{activeCheckin.venueName}</span>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          className="hidden"
          onChange={handlePhotoInput}
        />
      </div>
    );
  }

  // ── EDIT phase ──
  if (phase === "edit") {
    return (
      <StoryEditor
        photoBlob={photoBlob}
        photoPreview={photoPreview}
        activeCheckinVenue={activeCheckinVenue}
        allVenues={venues}
        isPremium={isPremium}
        onClose={() => setPhase("pick")}
        onPublish={handlePublish}
        isPublishing={isPublishing}
      />
    );
  }

  // ── MODERATING phase ──
  if (phase === "moderating") {
    return (
      <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
        <p className="text-white/50 text-sm">Reviewing content...</p>
      </div>
    );
  }

  // ── BLOCKED phase ──
  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center p-8">
      <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
        <X className="w-6 h-6 text-destructive/70" />
      </div>
      <p className="text-white/70 text-sm text-center mb-6 leading-relaxed">{blockReason}</p>
      <div className="flex gap-3">
        <button
          onClick={() => setPhase("pick")}
          className="px-5 py-2.5 rounded-full text-sm text-white/70 bg-white/8 border border-white/10"
        >
          Try another
        </button>
        <button
          onClick={onClose}
          className="px-5 py-2.5 rounded-full text-sm text-white/40 bg-white/5 border border-white/8"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default StoryCreator;
