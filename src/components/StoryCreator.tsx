import { useState, useRef, useCallback, useEffect } from "react";
import { X, Zap, ZapOff, RefreshCw, Image as ImageIcon } from "lucide-react";
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

type Phase = "camera" | "gallery" | "edit" | "moderating" | "blocked";

function calculateStorySP(hasActiveCheckin: boolean, hasActiveBoost: boolean): number {
  if (hasActiveBoost) return 15;
  if (hasActiveCheckin) return 12;
  return 8;
}

const MAX_VIDEO_DURATION = 15;

const StoryCreator = ({ venues, onClose, onSuccess }: StoryCreatorProps) => {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const createStory = useCreateStory();

  const [phase, setPhase] = useState<Phase>("camera");
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [blockReason, setBlockReason] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);

  // Camera state
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [isRecording, setIsRecording] = useState(false);
  const [recordProgress, setRecordProgress] = useState(0);

  // Gallery state
  const [galleryOpen, setGalleryOpen] = useState(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // ── Camera lifecycle ──
  const startCamera = useCallback(async () => {
    try {
      // Stop existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode,
          width: { ideal: 1080 },
          height: { ideal: 1920 },
        },
        audio: true,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Apply flash (torch) if supported
      const track = stream.getVideoTracks()[0];
      if (track && flashOn) {
        try {
          // @ts-expect-error - applyConstraints torch not in types
          await track.applyConstraints({ advanced: [{ torch: true }] });
        } catch { /* torch not supported */ }
      }

      setCameraReady(true);
      setCameraError(false);
    } catch (err) {
      console.error("Camera error:", err);
      setCameraError(true);
    }
  }, [facingMode, flashOn]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraReady(false);
  }, []);

  // Start camera on mount
  useEffect(() => {
    if (phase === "camera") {
      startCamera();
    }
    return () => {
      if (phase === "camera") stopCamera();
    };
  }, [phase, startCamera, stopCamera]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    };
  }, [stopCamera]);

  // ── Capture photo ──
  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d")!;

    // Mirror if front camera
    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(b => b ? resolve(b) : reject(new Error("Canvas failed")), "image/jpeg", 0.9);
    });

    if (!user) return;
    const limitCheck = await checkStoryLimit(user.id, isPremium);
    if (!limitCheck.canPost) {
      toast({ title: "Limit", description: limitCheck.reason, variant: "destructive" });
      return;
    }

    const compressed = await compressImage(new File([blob], "capture.jpg", { type: "image/jpeg" }));
    setPhotoBlob(compressed);
    setPhotoPreview(URL.createObjectURL(compressed));
    stopCamera();
    setPhase("edit");
  }, [facingMode, user, isPremium, toast, stopCamera]);

  // ── Video recording ──
  const startRecording = useCallback(() => {
    if (!streamRef.current) return;
    recordChunksRef.current = [];
    setRecordProgress(0);
    setIsRecording(true);

    try {
      const recorder = new MediaRecorder(streamRef.current, { mimeType: "video/webm" });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        setIsRecording(false);
        setRecordProgress(0);
        if (recordTimerRef.current) clearInterval(recordTimerRef.current);

        // For now, take a frame as the story image (video stories can be extended later)
        // Use the last frame as preview
        if (videoRef.current && canvasRef.current) {
          const canvas = canvasRef.current;
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
          const ctx = canvas.getContext("2d")!;
          if (facingMode === "user") {
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
          }
          ctx.drawImage(videoRef.current, 0, 0);

          const blob = await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob(b => b ? resolve(b) : reject(), "image/jpeg", 0.9);
          });

          if (user) {
            const compressed = await compressImage(new File([blob], "frame.jpg", { type: "image/jpeg" }));
            setPhotoBlob(compressed);
            setPhotoPreview(URL.createObjectURL(compressed));
            stopCamera();
            setPhase("edit");
          }
        }
      };

      recorder.start(1000);

      // Progress timer
      const startTime = Date.now();
      recordTimerRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        setRecordProgress(Math.min(elapsed / MAX_VIDEO_DURATION, 1));
        if (elapsed >= MAX_VIDEO_DURATION) {
          recorder.stop();
        }
      }, 50);
    } catch {
      setIsRecording(false);
      toast({ title: "Error", description: "Recording not supported", variant: "destructive" });
    }
  }, [facingMode, user, stopCamera, toast]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
  }, []);

  // ── Shutter press handlers ──
  const handleShutterDown = useCallback(() => {
    holdTimerRef.current = setTimeout(() => {
      startRecording();
    }, 300);
  }, [startRecording]);

  const handleShutterUp = useCallback(() => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    if (isRecording) {
      stopRecording();
    } else {
      capturePhoto();
    }
  }, [isRecording, stopRecording, capturePhoto]);

  // ── Camera flip ──
  const flipCamera = useCallback(() => {
    setFacingMode(prev => prev === "user" ? "environment" : "user");
  }, []);

  // ── Flash toggle ──
  const toggleFlash = useCallback(async () => {
    setFlashOn(prev => !prev);
    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      if (track) {
        try {
          // @ts-expect-error - torch not in types
          await track.applyConstraints({ advanced: [{ torch: !flashOn }] });
        } catch { /* not supported */ }
      }
    }
  }, [flashOn]);

  // ── Gallery file select ──
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
      stopCamera();
      setPhase("edit");
    } catch {
      toast({ title: "Error", description: "Could not process photo", variant: "destructive" });
    }
  }, [user, isPremium, toast, stopCamera]);

  const handlePhotoInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
    e.target.value = "";
  };

  // ── Publish ──
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
      const uploadedUrl = await uploadStoryPhoto(user.id, photoBlob);

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

      const taggedVenueId = editorPayload.venueTagged ? editorPayload.selectedVenueId : null;

      await createStory.mutateAsync({
        image_url: uploadedUrl,
        content: editorPayload.textOverlay || undefined,
        venue_id: taggedVenueId ?? undefined,
        vibe_rating: editorPayload.vibeVote ? 8 : 5,
      });

      await incrementStoryCount(user.id);

      const { data: freshProfile } = await db
        .from("profiles")
        .select("stories_posted_today")
        .eq("user_id", user.id)
        .single();

      const storiesPosted = freshProfile?.stories_posted_today ?? 0;
      let spAwarded = 0;

      if (storiesPosted <= 3) {
        spAwarded = calculateStorySP(!!activeCheckin, hasActiveBoost);
        await db.rpc("record_weekly_score", {
          p_user_id: user.id,
          p_event_type: "story",
          p_points: spAwarded,
          p_source_id: null,
          p_city: "Istanbul",
        });
      }

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

  // ── Hidden canvas for capture ──
  const hiddenCanvas = <canvas ref={canvasRef} className="hidden" />;

  // ── CAMERA phase ──
  if (phase === "camera") {
    return (
      <div className="fixed inset-0 z-[200] bg-black">
        {hiddenCanvas}

        {/* Camera preview */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-150 ${
            cameraReady ? "opacity-100" : "opacity-0"
          } ${facingMode === "user" ? "scale-x-[-1]" : ""}`}
        />

        {/* Loading state */}
        {!cameraReady && !cameraError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-white/15 border-t-white/50 rounded-full animate-spin" />
          </div>
        )}

        {/* Camera error fallback */}
        {cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8">
            <p className="text-white/50 text-sm text-center">Camera not available</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 bg-white/8 rounded-full px-5 py-2.5 border border-white/10 text-white/70 text-sm"
            >
              <ImageIcon className="w-4 h-4" />
              Choose from gallery
            </button>
          </div>
        )}

        {/* Recording progress ring overlay */}
        {isRecording && (
          <div className="absolute inset-0 pointer-events-none z-10">
            <div className="absolute top-4 left-4 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              <span className="text-white/80 text-xs font-medium">
                {Math.floor(recordProgress * MAX_VIDEO_DURATION)}s
              </span>
            </div>
          </div>
        )}

        {/* ── Top bar ── */}
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),16px)] pb-3">
          <button
            onClick={() => { stopCamera(); onClose(); }}
            className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center"
          >
            <X className="w-5 h-5 text-white/80" />
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleFlash}
              className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center"
            >
              {flashOn ? (
                <Zap className="w-4.5 h-4.5 text-yellow-300" />
              ) : (
                <ZapOff className="w-4.5 h-4.5 text-white/60" />
              )}
            </button>
          </div>
        </div>

        {/* ── Bottom controls ── */}
        <div className="absolute bottom-0 left-0 right-0 z-20 pb-[max(env(safe-area-inset-bottom),24px)] px-6">
          {/* Active check-in indicator */}
          {activeCheckin && (
            <div className="flex justify-center mb-4">
              <div className="flex items-center gap-2 bg-black/30 backdrop-blur-sm rounded-full px-4 py-1.5 border border-white/8">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                <span className="text-[11px] text-white/50">{activeCheckin.venueName}</span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            {/* Gallery thumbnail */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 flex items-center justify-center overflow-hidden"
            >
              <ImageIcon className="w-5 h-5 text-white/50" />
            </button>

            {/* Shutter button */}
            <button
              onPointerDown={handleShutterDown}
              onPointerUp={handleShutterUp}
              onPointerLeave={() => {
                if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
                if (isRecording) stopRecording();
              }}
              className="relative w-[76px] h-[76px] flex items-center justify-center"
            >
              {/* Outer ring */}
              <div className="absolute inset-0 rounded-full border-[3px] border-white/80" />

              {/* Recording progress ring */}
              {isRecording && (
                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 76 76">
                  <circle
                    cx="38"
                    cy="38"
                    r="35"
                    fill="none"
                    stroke="rgba(239,68,68,0.9)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 35}`}
                    strokeDashoffset={`${2 * Math.PI * 35 * (1 - recordProgress)}`}
                    style={{ transition: "stroke-dashoffset 50ms linear" }}
                  />
                </svg>
              )}

              {/* Inner circle */}
              <div className={`rounded-full transition-all duration-150 ${
                isRecording
                  ? "w-8 h-8 bg-red-500 rounded-lg"
                  : "w-[62px] h-[62px] bg-white"
              }`} />
            </button>

            {/* Camera flip */}
            <button
              onClick={flipCamera}
              className="w-12 h-12 rounded-full bg-black/30 backdrop-blur-sm border border-white/15 flex items-center justify-center"
            >
              <RefreshCw className="w-5 h-5 text-white/70" />
            </button>
          </div>

          <p className="text-center text-[10px] text-white/25 mt-3">
            {isRecording ? "Release to stop" : "Tap photo · Hold video"}
          </p>
        </div>

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
      <>
        {hiddenCanvas}
        <StoryEditor
          photoBlob={photoBlob}
          photoPreview={photoPreview}
          activeCheckinVenue={activeCheckinVenue}
          allVenues={venues}
          isPremium={isPremium}
          onClose={() => {
            setPhotoBlob(null);
            setPhotoPreview(null);
            setPhase("camera");
          }}
          onPublish={handlePublish}
          isPublishing={isPublishing}
        />
      </>
    );
  }

  // ── MODERATING phase ──
  if (phase === "moderating") {
    return (
      <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center gap-4">
        {hiddenCanvas}
        <div className="w-10 h-10 border-2 border-white/15 border-t-white/50 rounded-full animate-spin" />
        <p className="text-white/40 text-sm">Reviewing content...</p>
      </div>
    );
  }

  // ── BLOCKED phase ──
  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center p-8">
      {hiddenCanvas}
      <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
        <X className="w-6 h-6 text-red-400/70" />
      </div>
      <p className="text-white/60 text-sm text-center mb-6 leading-relaxed">{blockReason}</p>
      <div className="flex gap-3">
        <button
          onClick={() => setPhase("camera")}
          className="px-5 py-2.5 rounded-full text-sm text-white/60 bg-white/6 border border-white/8"
        >
          Try another
        </button>
        <button
          onClick={onClose}
          className="px-5 py-2.5 rounded-full text-sm text-white/35 bg-white/4 border border-white/6"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default StoryCreator;
