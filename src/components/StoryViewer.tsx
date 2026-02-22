import { useEffect, useState, useRef, useCallback } from "react";
import { X, MapPin, Star, Heart, Send, MoreVertical, Flag, Eye } from "lucide-react";
import { NightStory, useLikeStory, useMyStoryLikes } from "@/hooks/useStories";
import { useReportStory } from "@/hooks/useStoryUpload";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface StoryViewerProps {
  story: NightStory;
  allStories: NightStory[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

const QUICK_REACTIONS = ["🔥", "😍", "💃", "🎉", "✨"];
const IMAGE_DURATION = 5000;

const StoryViewer = ({ story, allStories, currentIndex, onClose, onNavigate }: StoryViewerProps) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const reportStory = useReportStory();
  const likeStory = useLikeStory();
  const { data: myLikes = [] } = useMyStoryLikes();
  const isPremium = profile?.is_premium ?? false;

  // ── State ──
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sentReaction, setSentReaction] = useState<string | null>(null);
  const [showReportConfirm, setShowReportConfirm] = useState(false);

  // Slide transition state
  const [slideDir, setSlideDir] = useState<"none" | "left" | "right">("none");
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Swipe state
  const [swipeX, setSwipeX] = useState(0);
  const [swipeY, setSwipeY] = useState(0);
  const [swipeAxis, setSwipeAxis] = useState<"none" | "x" | "y">("none");

  // ── Refs ──
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef(0);
  const elapsedRef = useRef(0); // accumulated time before pause
  const pausedRef = useRef(false);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });
  const touchMovedRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const p = story.profiles;
  const initials = (p?.display_name ?? "?").split(" ").map((w) => w[0]).join("").toUpperCase().substring(0, 2);
  const isOwn = user?.id === story.user_id;

  // ── Preload adjacent stories ──
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

  // ── RAF-based progress ──
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
      // Auto-advance
      if (currentIndex < allStories.length - 1) {
        navigateTo(currentIndex + 1, "left");
      } else {
        onClose();
      }
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [currentIndex, allStories.length, onClose]);

  // Start/restart RAF loop
  const startProgress = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    startTimeRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  // ── Reset on story change ──
  useEffect(() => {
    setProgress(0);
    elapsedRef.current = 0;
    pausedRef.current = false;
    setPaused(false);
    setSentReaction(null);
    setShowMenu(false);
    setShowReply(false);
    setReplyText("");

    // Small delay to let slide transition settle
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

  // ── Pause/resume sync ──
  useEffect(() => {
    pausedRef.current = paused;
    if (paused) {
      // Save elapsed
      elapsedRef.current += performance.now() - startTimeRef.current;
    } else {
      // Restart from accumulated
      startTimeRef.current = performance.now();
    }
  }, [paused]);

  // ── Navigate with slide animation ──
  const navigateTo = useCallback((idx: number, dir: "left" | "right") => {
    if (isTransitioning) return;
    cancelAnimationFrame(rafRef.current);
    setIsTransitioning(true);
    setSlideDir(dir);
    // Let CSS transition play, then switch
    setTimeout(() => {
      onNavigate(idx);
    }, 280);
  }, [isTransitioning, onNavigate]);

  // ── Hold to pause ──
  const handlePointerDown = useCallback(() => {
    touchMovedRef.current = false;
    holdTimerRef.current = setTimeout(() => {
      setPaused(true);
    }, 150);
  }, []);

  const handlePointerUp = useCallback(() => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    if (paused && swipeAxis === "none") setPaused(false);
  }, [paused, swipeAxis]);

  // ── Touch handlers ──
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

    if (swipeAxis === "x") {
      setSwipeX(dx);
    } else if (swipeAxis === "y" && dy > 0) {
      setSwipeY(dy);
    }
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

    // Not a swipe — treat as tap
    setSwipeAxis("none");
    setPaused(false);
  }, [swipeAxis, swipeX, swipeY, currentIndex, allStories.length, navigateTo, onClose]);

  // ── Tap navigation ──
  const handleTap = useCallback((e: React.MouseEvent) => {
    if (touchMovedRef.current || showReply || showMenu || isTransitioning) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width * 0.3) {
      if (currentIndex > 0) navigateTo(currentIndex - 1, "right");
    } else if (x > rect.width * 0.7) {
      if (currentIndex < allStories.length - 1) navigateTo(currentIndex + 1, "left");
      else onClose();
    }
  }, [currentIndex, allStories.length, navigateTo, onClose, showReply, showMenu, isTransitioning]);

  // ── Helpers ──
  const handleReaction = (emoji: string) => {
    setSentReaction(emoji);
    setTimeout(() => setSentReaction(null), 2000);
    toast({ title: `${emoji} Reaksiyon gönderildi` });
  };

  const handleReport = async () => {
    try {
      await reportStory.mutateAsync({ storyId: story.id, reason: "inappropriate" });
      toast({ title: "Raporlandı", description: "İçerik incelemeye alındı." });
      setShowReportConfirm(false);
      setShowMenu(false);
    } catch {
      toast({ title: "Hata", description: "Raporlama başarısız", variant: "destructive" });
    }
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "az önce";
    if (mins < 60) return `${mins}dk`;
    return `${Math.floor(mins / 60)}sa`;
  };

  // ── Slide transform ──
  const getSlideTransform = () => {
    if (swipeAxis === "x") {
      return `translateX(${swipeX}px) scale(${1 - Math.min(Math.abs(swipeX) * 0.0004, 0.08)})`;
    }
    if (swipeAxis === "y") {
      const scale = 1 - Math.min(swipeY * 0.001, 0.15);
      return `translateY(${swipeY}px) scale(${scale})`;
    }
    if (isTransitioning) {
      return slideDir === "left" ? "translateX(-110%)" : "translateX(110%)";
    }
    return "translateX(0) scale(1)";
  };

  const getSlideTransition = () => {
    if (swipeAxis !== "none") return "none";
    if (isTransitioning) return "transform 280ms cubic-bezier(0.4, 0, 0.2, 1)";
    return "transform 280ms cubic-bezier(0.4, 0, 0.2, 1)";
  };

  // ── Backdrop opacity for swipe-down ──
  const backdropOpacity = swipeAxis === "y" ? Math.max(0.4, 1 - swipeY / 400) : 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: `rgba(0,0,0,${backdropOpacity * 0.95})`, transition: swipeAxis === "y" ? "none" : "background-color 300ms" }}
    >
      <div
        ref={containerRef}
        className="relative w-full max-w-sm h-[100dvh] sm:h-[90vh] sm:rounded-2xl overflow-hidden"
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
        {/* ── Story media ── */}
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
            <span className="text-6xl mb-4">🌙</span>
            {story.content && (
              <p className="text-foreground text-center text-lg font-semibold leading-relaxed">{story.content}</p>
            )}
          </div>
        )}

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/70 pointer-events-none" />

        {/* ── Progress bars ── */}
        <div className="absolute top-3 left-3 right-3 z-20 flex gap-[3px]">
          {allStories.map((s, i) => (
            <div key={s.id} className="flex-1 h-[2.5px] bg-white/25 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full"
                style={{
                  width: i < currentIndex ? "100%" : i === currentIndex ? `${progress}%` : "0%",
                  // No CSS transition — RAF drives this directly
                }}
              />
            </div>
          ))}
        </div>

        {/* ── Header ── */}
        <div className="absolute top-8 left-3 right-3 z-20 flex items-center gap-2.5">
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 overflow-hidden ${
              p?.is_premium ? "ring-2 ring-neon-gold" : "ring-2 ring-primary"
            }`}
            style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))" }}
          >
            {p?.avatar_url ? (
              <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-primary-foreground">{initials}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-white truncate">{p?.display_name ?? "Kullanıcı"}</span>
              {p?.is_premium && <span className="text-xs">✨</span>}
            </div>
            <div className="flex items-center gap-1.5">
              {story.venues && (
                <span className="text-[11px] text-white/60 truncate">{story.venues.name} ·</span>
              )}
              <span className="text-[11px] text-white/45">{timeAgo(story.created_at)}</span>
            </div>
          </div>

          {story.vibe_rating && (
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <Star className="w-3 h-3 text-neon-gold fill-neon-gold" />
              <span className="text-xs text-white font-bold">{story.vibe_rating}</span>
            </div>
          )}

          <button
            onClick={(e) => { e.stopPropagation(); setShowMenu(v => !v); }}
            className="text-white/70 hover:text-white flex-shrink-0 p-1"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="text-white/70 hover:text-white flex-shrink-0 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dropdown menu */}
        {showMenu && (
          <div className="absolute top-20 right-3 z-30 bg-black/80 backdrop-blur-xl rounded-xl overflow-hidden border border-white/10 min-w-[160px]" onClick={e => e.stopPropagation()}>
            {!isOwn && (
              <button
                onClick={() => { setShowReportConfirm(true); setShowMenu(false); }}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm text-destructive hover:bg-white/5 transition-colors"
              >
                <Flag className="w-4 h-4" />
                Şikayet Et
              </button>
            )}
            {isPremium && (
              <div className="px-4 py-3 border-t border-white/10 flex items-center gap-2 text-xs text-white/60">
                <Eye className="w-3 h-3" />
                {story.views_count ?? 0} görüntülenme
              </div>
            )}
          </div>
        )}

        {/* Venue tag */}
        {story.venues && (
          <div className="absolute top-[72px] left-3 z-20 pointer-events-none">
            <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/15">
              <MapPin className="w-3 h-3 text-secondary" />
              <span className="text-[11px] text-white/90 font-semibold">{story.venues.name}</span>
            </div>
          </div>
        )}

        {/* Text overlay on image */}
        {story.image_url && story.content && (
          <div className="absolute bottom-28 left-4 right-4 z-10 pointer-events-none">
            <p className="text-white text-base font-bold drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] leading-snug">{story.content}</p>
          </div>
        )}

        {/* Paused indicator */}
        {paused && swipeAxis === "none" && !showReply && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <div className="bg-black/50 backdrop-blur-sm rounded-full px-5 py-2 border border-white/15">
              <span className="text-white text-xs font-semibold tracking-wide">⏸ Duraklatıldı</span>
            </div>
          </div>
        )}

        {/* Reaction float */}
        {sentReaction && (
          <div className="absolute bottom-36 left-1/2 -translate-x-1/2 pointer-events-none z-20 animate-bounce">
            <span className="text-5xl drop-shadow-lg">{sentReaction}</span>
          </div>
        )}

        {/* ── Bottom actions ── */}
        <div className="absolute bottom-0 left-0 right-0 z-20 pb-[max(env(safe-area-inset-bottom),16px)] px-4 space-y-2" onClick={e => e.stopPropagation()}>
          {/* Quick reactions */}
          {!showReply && (
            <div className="flex gap-2 justify-center">
              {QUICK_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleReaction(emoji)}
                  className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center text-lg border border-white/10 hover:bg-white/20 active:scale-90 transition-all"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {/* Reply bar */}
          <div className="flex items-center gap-2">
            {showReply ? (
              <>
                <input
                  type="text"
                  autoFocus
                  placeholder="Yanıt yaz..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onFocus={() => setPaused(true)}
                  className="flex-1 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2.5 text-sm text-white placeholder-white/40 border border-white/15 focus:outline-none focus:border-primary/50"
                />
                <button
                  onClick={() => {
                    if (replyText.trim()) {
                      toast({ title: "Yanıt gönderildi 💌" });
                      setReplyText("");
                      setShowReply(false);
                      setPaused(false);
                    }
                  }}
                  className="w-10 h-10 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center flex-shrink-0"
                >
                  <Send className="w-4 h-4 text-white" />
                </button>
                <button
                  onClick={() => { setShowReply(false); setPaused(false); }}
                  className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/10"
                >
                  <X className="w-4 h-4 text-white/60" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => { setPaused(true); setShowReply(true); }}
                  className="flex-1 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2.5 border border-white/10"
                >
                  <span className="text-xs text-white/45 text-left block">Yanıt gönder...</span>
                </button>
                <button
                  onClick={() => {
                    const isLiked = myLikes.includes(story.id);
                    likeStory.mutate({ storyId: story.id, liked: isLiked });
                    toast({ title: isLiked ? "Beğeni kaldırıldı" : "Hikaye beğenildi ❤️" });
                  }}
                  className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/10 active:scale-90 transition-transform"
                >
                  <Heart className={`w-5 h-5 transition-colors ${myLikes.includes(story.id) ? "fill-red-500 text-red-500" : "text-white/70"}`} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Report confirm modal */}
      {showReportConfirm && (
        <div className="absolute inset-0 z-[60] flex items-end justify-center pb-8 px-4" onClick={(e) => e.stopPropagation()}>
          <div className="bg-night-700/95 backdrop-blur-xl rounded-2xl p-5 w-full max-w-sm border border-destructive/30">
            <h3 className="font-bold text-white mb-2">Hikayeyi Şikayet Et</h3>
            <p className="text-sm text-white/60 mb-4">Bu içerik uygunsuz mu?</p>
            <div className="flex gap-2">
              <button onClick={() => setShowReportConfirm(false)} className="flex-1 bg-white/10 rounded-xl py-2.5 text-sm text-white/60 border border-white/10">İptal</button>
              <button onClick={handleReport} className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white bg-destructive">Şikayet Et</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoryViewer;
