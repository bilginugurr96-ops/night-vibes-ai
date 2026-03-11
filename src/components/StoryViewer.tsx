import { useEffect, useState, useRef, useCallback } from "react";
import { X, MapPin, Heart, Send, MoreVertical, Flag, ChevronUp, Trash2 } from "lucide-react";
import { NightStory, useLikeStory, useMyStoryLikes, useDeleteStory } from "@/hooks/useStories";
import { useReportStory } from "@/hooks/useStoryUpload";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface StoryViewerProps {
  story: NightStory;
  allStories: NightStory[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

const QUICK_REACTIONS = ["❤️", "🔥", "👀", "✨"];
const IMAGE_DURATION = 5000;

const StoryViewer = ({ story, allStories, currentIndex, onClose, onNavigate }: StoryViewerProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const reportStory = useReportStory();
  const likeStory = useLikeStory();
  const deleteStory = useDeleteStory();
  const { data: myLikes = [] } = useMyStoryLikes();

  // State
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replyFocused, setReplyFocused] = useState(false);
  const [sentReaction, setSentReaction] = useState<string | null>(null);
  const [showReportConfirm, setShowReportConfirm] = useState(false);

  // Transition
  const [slideDir, setSlideDir] = useState<"none" | "left" | "right">("none");
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Swipe
  const [swipeX, setSwipeX] = useState(0);
  const [swipeY, setSwipeY] = useState(0);
  const [swipeAxis, setSwipeAxis] = useState<"none" | "x" | "y">("none");

  // Refs
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef(0);
  const elapsedRef = useRef(0);
  const pausedRef = useRef(false);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });
  const touchMovedRef = useRef(false);
  const replyInputRef = useRef<HTMLInputElement>(null);

  const p = story.profiles;
  const initials = (p?.display_name ?? "?").split(" ").map((w) => w[0]).join("").toUpperCase().substring(0, 2);
  const isOwn = user?.id === story.user_id;

  // Preload adjacent stories
  useEffect(() => {
    const preload = (idx: number) => {
      const s = allStories[idx];
      if (s?.image_url) {
        const img = new Image();
        img.src = s.image_url;
      }
    };
    preload(currentIndex - 1);
    preload(currentIndex + 1);
  }, [currentIndex, allStories]);

  // RAF progress
  const tick = useCallback(() => {
    if (pausedRef.current) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    const now = performance.now();
    const elapsed = elapsedRef.current + (now - startTimeRef.current);
    const pct = Math.min((elapsed / IMAGE_DURATION) * 100, 100);
    setProgress(pct);

    if (pct >= 100) {
      if (currentIndex < allStories.length - 1) {
        navigateTo(currentIndex + 1, "left");
      } else {
        onClose();
      }
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [currentIndex, allStories.length, onClose]);

  const startProgress = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    startTimeRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  // Reset on story change
  useEffect(() => {
    setProgress(0);
    elapsedRef.current = 0;
    pausedRef.current = false;
    setPaused(false);
    setSentReaction(null);
    setShowMenu(false);
    setReplyText("");
    setReplyFocused(false);

    const t = setTimeout(() => {
      startProgress();
      setIsTransitioning(false);
      setSlideDir("none");
    }, 30);

    return () => {
      clearTimeout(t);
      cancelAnimationFrame(rafRef.current);
    };
  }, [story.id, startProgress]);

  // Pause/resume sync
  useEffect(() => {
    pausedRef.current = paused;
    if (paused) {
      elapsedRef.current += performance.now() - startTimeRef.current;
    } else {
      startTimeRef.current = performance.now();
    }
  }, [paused]);

  // Navigate with slide
  const navigateTo = useCallback((idx: number, dir: "left" | "right") => {
    if (isTransitioning) return;
    cancelAnimationFrame(rafRef.current);
    setIsTransitioning(true);
    setSlideDir(dir);
    setTimeout(() => onNavigate(idx), 250);
  }, [isTransitioning, onNavigate]);

  // Hold to pause
  const handlePointerDown = useCallback(() => {
    touchMovedRef.current = false;
    holdTimerRef.current = setTimeout(() => setPaused(true), 150);
  }, []);

  const handlePointerUp = useCallback(() => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    if (paused && swipeAxis === "none" && !replyFocused) setPaused(false);
  }, [paused, swipeAxis, replyFocused]);

  // Touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY, time: Date.now() };
    touchMovedRef.current = false;
    setSwipeAxis("none");
    setSwipeX(0);
    setSwipeY(0);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    const dx = t.clientX - touchStartRef.current.x;
    const dy = t.clientY - touchStartRef.current.y;

    if (swipeAxis === "none" && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      const axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      setSwipeAxis(axis);
      touchMovedRef.current = true;
      setPaused(true);
    }

    if (swipeAxis === "x") setSwipeX(dx);
    else if (swipeAxis === "y" && dy > 0) setSwipeY(dy);
  }, [swipeAxis]);

  const handleTouchEnd = useCallback(() => {
    const dt = Date.now() - touchStartRef.current.time;

    if (swipeAxis === "x") {
      const threshold = 60;
      const velocity = Math.abs(swipeX) / dt;
      const triggered = Math.abs(swipeX) > threshold || velocity > 0.5;

      if (triggered && swipeX < 0 && currentIndex < allStories.length - 1) {
        navigateTo(currentIndex + 1, "left");
      } else if (triggered && swipeX > 0 && currentIndex > 0) {
        navigateTo(currentIndex - 1, "right");
      } else if (triggered && swipeX < 0 && currentIndex === allStories.length - 1) {
        onClose();
      }
      setSwipeX(0);
      setSwipeAxis("none");
      setPaused(false);
      return;
    }

    if (swipeAxis === "y") {
      if (swipeY > 120) {
        onClose();
        return;
      }
      setSwipeY(0);
      setSwipeAxis("none");
      setPaused(false);
      return;
    }

    setSwipeAxis("none");
    setPaused(false);
  }, [swipeAxis, swipeX, swipeY, currentIndex, allStories.length, navigateTo, onClose]);

  // Tap navigation
  const handleTap = useCallback((e: React.MouseEvent) => {
    if (touchMovedRef.current || replyFocused || showMenu || isTransitioning) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width * 0.3) {
      if (currentIndex > 0) navigateTo(currentIndex - 1, "right");
    } else if (x > rect.width * 0.7) {
      if (currentIndex < allStories.length - 1) navigateTo(currentIndex + 1, "left");
      else onClose();
    }
  }, [currentIndex, allStories.length, navigateTo, onClose, replyFocused, showMenu, isTransitioning]);

  // Reactions
  const handleReaction = (emoji: string) => {
    setSentReaction(emoji);
    setTimeout(() => setSentReaction(null), 1500);
    toast({ title: `${emoji} gönderildi` });
  };

  // Reply send
  const handleSendReply = () => {
    if (!replyText.trim()) return;
    toast({ title: "Yanıt gönderildi 💌" });
    setReplyText("");
    setReplyFocused(false);
    setPaused(false);
  };

  // Report
  const handleReport = async () => {
    try {
      await reportStory.mutateAsync({ storyId: story.id, reason: "inappropriate" });
      toast({ title: "Raporlandı", description: "İçerik incelemeye alındı." });
      setShowReportConfirm(false);
      setShowMenu(false);
    } catch {
      toast({ title: "Hata", variant: "destructive" });
    }
  };

  // Delete own story
  const handleDelete = async () => {
    try {
      await deleteStory.mutateAsync(story.id);
      toast({ title: "Hikaye silindi 🗑️" });
      onClose();
    } catch {
      toast({ title: "Silinemedi", variant: "destructive" });
    }
  };

  // Swipe up → profile
  const handleSwipeUpProfile = () => {
    navigate(`/profile?uid=${story.user_id}`);
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "az önce";
    if (mins < 60) return `${mins}dk`;
    return `${Math.floor(mins / 60)}sa`;
  };

  // Transform
  const getSlideTransform = () => {
    if (swipeAxis === "x") {
      return `translateX(${swipeX}px) scale(${1 - Math.min(Math.abs(swipeX) * 0.0004, 0.08)})`;
    }
    if (swipeAxis === "y") {
      const scale = 1 - Math.min(swipeY * 0.001, 0.15);
      return `translateY(${swipeY}px) scale(${scale})`;
    }
    if (isTransitioning) {
      return slideDir === "left" ? "translateX(-100%) scale(0.92)" : "translateX(100%) scale(0.92)";
    }
    return "translateX(0) scale(1)";
  };

  const getSlideTransition = () => {
    if (swipeAxis !== "none") return "none";
    return "transform 250ms cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 250ms ease";
  };

  const backdropOpacity = swipeAxis === "y" ? Math.max(0.4, 1 - swipeY / 400) : 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: `rgba(0,0,0,${backdropOpacity * 0.97})`, transition: swipeAxis === "y" ? "none" : "background-color 300ms" }}
    >
      <div
        className="relative w-full max-w-[430px] h-[100dvh] sm:h-[92vh] sm:rounded-2xl overflow-hidden"
        style={{
          transform: getSlideTransform(),
          transition: getSlideTransition(),
          willChange: "transform",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onClick={handleTap}
      >
        {/* Story media */}
        {story.image_url ? (
          <img
            src={story.image_url}
            alt=""
            className="absolute inset-0 w-full h-full object-cover select-none"
            draggable={false}
          />
        ) : (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center p-8"
            style={{ background: "linear-gradient(135deg, hsl(258 18% 9%), hsl(240 14% 5%))" }}
          >
            {story.content && (
              <p className="text-white text-center text-xl font-semibold leading-relaxed max-w-[280px]">{story.content}</p>
            )}
          </div>
        )}

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/60 pointer-events-none" />

        {/* Progress bars */}
        <div className="absolute top-2.5 left-2.5 right-2.5 z-20 flex gap-[3px]">
          {allStories.map((s, i) => (
            <div key={s.id} className="flex-1 h-[2px] bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white/90 rounded-full"
                style={{
                  width: i < currentIndex ? "100%" : i === currentIndex ? `${progress}%` : "0%",
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-7 left-3 right-3 z-20 flex items-center gap-2.5">
          <div
            className="relative w-9 h-9 flex-shrink-0"
            onClick={(e) => { e.stopPropagation(); navigate(`/profile?uid=${story.user_id}`); }}
          >
            <div className="w-full h-full rounded-full overflow-hidden border-[1.5px] border-white/30">
              {p?.avatar_url ? (
                <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-neon flex items-center justify-center">
                  <span className="text-white text-xs font-bold">{initials}</span>
                </div>
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 min-w-[22px] h-[16px] rounded-full bg-primary border-[1.5px] border-black/60 flex items-center justify-center px-1">
              <span className="text-[7px] text-primary-foreground font-black whitespace-nowrap">Lv.{p?.level ?? 1}</span>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[13px] font-semibold text-white truncate">{p?.display_name ?? "Kullanıcı"}</span>
              <span className="text-[11px] text-white/40">{timeAgo(story.created_at)}</span>
            </div>
            {story.venues && (
              <div className="flex items-center gap-1 mt-0.5">
                <MapPin className="w-2.5 h-2.5 text-white/40" />
                <span className="text-[10px] text-white/40 truncate">{story.venues.name}</span>
              </div>
            )}
          </div>

          <button
            onClick={(e) => { e.stopPropagation(); setShowMenu(v => !v); }}
            className="text-white/50 hover:text-white/80 p-1.5 transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="text-white/50 hover:text-white/80 p-1.5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Menu dropdown */}
        {showMenu && (
          <div
            className="absolute top-[72px] right-3 z-30 bg-black/85 backdrop-blur-xl rounded-xl overflow-hidden border border-white/10 min-w-[150px]"
            onClick={e => e.stopPropagation()}
          >
            {isOwn && (
              <button
                onClick={handleDelete}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-400 hover:bg-white/5 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Hikayeyi Sil
              </button>
            )}
            {!isOwn && (
              <button
                onClick={() => { setShowReportConfirm(true); setShowMenu(false); }}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-400 hover:bg-white/5 transition-colors"
              >
                <Flag className="w-4 h-4" />
                Şikayet Et
              </button>
            )}
          </div>
        )}

        {/* Text overlay */}
        {story.image_url && story.content && (
          <div className="absolute bottom-32 left-4 right-4 z-10 pointer-events-none">
            <p className="text-white text-base font-semibold drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] leading-snug">{story.content}</p>
          </div>
        )}

        {/* Paused indicator */}
        {paused && swipeAxis === "none" && !replyFocused && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <div className="bg-black/40 backdrop-blur-sm rounded-full px-4 py-1.5 border border-white/10">
              <span className="text-white/60 text-xs font-medium">Duraklatıldı</span>
            </div>
          </div>
        )}

        {/* Floating reaction */}
        {sentReaction && (
          <div className="absolute bottom-40 left-1/2 -translate-x-1/2 pointer-events-none z-20" style={{ animation: "reaction-float 1.5s ease-out forwards" }}>
            <span className="text-5xl drop-shadow-lg">{sentReaction}</span>
          </div>
        )}

        {/* Swipe up hint */}
        <div className="absolute bottom-[110px] left-1/2 -translate-x-1/2 z-10 pointer-events-none opacity-30">
          <ChevronUp className="w-4 h-4 text-white animate-bounce" style={{ animationDuration: "2s" }} />
        </div>

        {/* Bottom interaction area */}
        <div
          className="absolute bottom-0 left-0 right-0 z-20 pb-[max(env(safe-area-inset-bottom),12px)] px-3 space-y-2.5"
          onClick={e => e.stopPropagation()}
        >
          {/* Quick reactions row */}
          {!replyFocused && (
            <div className="flex justify-center gap-3">
              {QUICK_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleReaction(emoji)}
                  className="w-11 h-11 rounded-full bg-white/8 backdrop-blur-sm flex items-center justify-center text-lg border border-white/8 hover:bg-white/15 active:scale-90 transition-all duration-150"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {/* Message input + like */}
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <input
                ref={replyInputRef}
                type="text"
                placeholder="Mesaj gönder..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onFocus={() => { setReplyFocused(true); setPaused(true); }}
                onBlur={() => {
                  if (!replyText.trim()) {
                    setReplyFocused(false);
                    setPaused(false);
                  }
                }}
                onKeyDown={(e) => e.key === "Enter" && handleSendReply()}
                className="w-full bg-white/8 backdrop-blur-sm rounded-full px-4 py-2.5 text-sm text-white placeholder-white/30 border border-white/10 focus:outline-none focus:border-white/20 transition-colors"
              />
            </div>

            {replyFocused && replyText.trim() ? (
              <button
                onClick={handleSendReply}
                className="w-10 h-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform"
              >
                <Send className="w-4 h-4 text-primary-foreground" />
              </button>
            ) : (
              <button
                onClick={() => {
                  const isLiked = myLikes.includes(story.id);
                  likeStory.mutate({ storyId: story.id, liked: isLiked });
                }}
                className="w-10 h-10 rounded-full bg-white/8 backdrop-blur-sm flex items-center justify-center border border-white/8 active:scale-90 transition-all"
              >
                <Heart className={`w-5 h-5 transition-colors duration-200 ${myLikes.includes(story.id) ? "fill-red-500 text-red-500" : "text-white/60"}`} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Report confirm */}
      {showReportConfirm && (
        <div
          className="absolute inset-0 z-[60] flex items-end justify-center pb-8 px-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-black/90 backdrop-blur-xl rounded-2xl p-5 w-full max-w-sm border border-white/10">
            <h3 className="font-semibold text-white mb-2">Hikayeyi Şikayet Et</h3>
            <p className="text-sm text-white/50 mb-4">Bu içerik uygunsuz mu?</p>
            <div className="flex gap-2">
              <button onClick={() => setShowReportConfirm(false)} className="flex-1 bg-white/8 rounded-xl py-2.5 text-sm text-white/50 border border-white/8">İptal</button>
              <button onClick={handleReport} className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white bg-red-500/80">Şikayet Et</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes reaction-float {
          0% { transform: translateX(-50%) translateY(0) scale(1); opacity: 1; }
          100% { transform: translateX(-50%) translateY(-80px) scale(1.3); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default StoryViewer;
