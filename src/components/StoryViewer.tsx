import { useEffect, useState, useRef, useCallback } from "react";
import { X, MapPin, Star, Heart, Send, MoreVertical, Flag, Eye, ChevronLeft, ChevronRight } from "lucide-react";
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

const LEVEL_NAMES = ["", "Gece Yenisi", "Kulüp Kaşifi", "VIP Sosyalite", "Şehir Simgesi", "Global Yıldız"];
const getLevelName = (l: number) => LEVEL_NAMES[Math.min(l, LEVEL_NAMES.length - 1)] ?? "Global Yıldız";

const QUICK_REACTIONS = ["🔥", "😍", "💃", "🎉", "✨"];

const StoryViewer = ({ story, allStories, currentIndex, onClose, onNavigate }: StoryViewerProps) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const reportStory = useReportStory();
  const likeStory = useLikeStory();
  const { data: myLikes = [] } = useMyStoryLikes();
  const isPremium = profile?.is_premium ?? false;

  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sentReaction, setSentReaction] = useState<string | null>(null);
  const [showReportConfirm, setShowReportConfirm] = useState(false);

  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const p = story.profiles;
  const initials = (p?.display_name ?? "?").split(" ").map((w) => w[0]).join("").toUpperCase().substring(0, 2);
  const isOwn = user?.id === story.user_id;

  const DURATION = 5000; // 5s per story

  // Timer logic
  const startTimer = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(intervalRef.current!);
          // Auto-advance
          if (currentIndex < allStories.length - 1) {
            onNavigate(currentIndex + 1);
          } else {
            onClose();
          }
          return 100;
        }
        return prev + (100 / (DURATION / 100));
      });
    }, 100);
  }, [currentIndex, allStories.length, onNavigate, onClose]);

  useEffect(() => {
    setProgress(0);
    setSentReaction(null);
    setShowMenu(false);
    setShowReply(false);
  }, [story.id]);

  useEffect(() => {
    if (!paused) {
      startTimer();
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [paused, story.id, startTimer]);

  // Hold to pause
  const handlePointerDown = () => {
    holdTimer.current = setTimeout(() => setPaused(true), 200);
  };
  const handlePointerUp = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    setPaused(false);
  };

  // Tap navigation areas
  const handleTap = (e: React.MouseEvent) => {
    if (showReply || showMenu) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width / 3) {
      // Left third — previous
      if (currentIndex > 0) {
        setProgress(0);
        onNavigate(currentIndex - 1);
      }
    } else {
      // Right 2/3 — next
      if (currentIndex < allStories.length - 1) {
        setProgress(0);
        onNavigate(currentIndex + 1);
      } else {
        onClose();
      }
    }
  };

  const handleReaction = (emoji: string) => {
    setSentReaction(emoji);
    setTimeout(() => setSentReaction(null), 2000);
    toast({ title: `${emoji} Reaksiyon gönderildi` });
  };

  const handleReport = async () => {
    try {
      await reportStory.mutateAsync({ storyId: story.id, reason: "inappropriate" });
      toast({ title: "Raporlandı", description: "İçerik incelemeye alındı. Teşekkürler." });
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md">
      <div className="relative w-full max-w-sm h-[90vh] flex flex-col">

        {/* Multi-story progress bars */}
        <div className="absolute top-3 left-4 right-4 z-20 flex gap-1">
          {allStories.map((s, i) => (
            <div key={s.id} className="flex-1 h-0.5 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-none"
                style={{
                  width: i < currentIndex ? "100%" : i === currentIndex ? `${progress}%` : "0%",
                  transition: i === currentIndex ? "width 0.1s linear" : "none",
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-8 left-4 right-4 z-20 flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center text-primary-foreground text-xs font-bold flex-shrink-0 overflow-hidden
              ${p?.is_premium ? "ring-2 ring-amber-400" : "ring-2 ring-primary"}
            `}
            style={{ background: "linear-gradient(135deg, hsl(271 100% 59%), hsl(191 100% 50%))" }}
          >
            {p?.avatar_url ? (
              <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-white truncate">{p?.display_name ?? "Kullanıcı"}</span>
              {p?.is_premium && <span className="text-xs flex-shrink-0">✨</span>}
            </div>
            <div className="flex items-center gap-1.5">
              {story.venues && (
                <span className="text-xs text-white/60 truncate">{story.venues.name} •</span>
              )}
              <span className="text-xs text-white/50 flex-shrink-0">{timeAgo(story.created_at)}</span>
            </div>
          </div>

          {story.vibe_rating && (
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
              <span className="text-xs text-white font-bold">{story.vibe_rating}</span>
            </div>
          )}

          {/* Menu */}
          <button
            onClick={() => setShowMenu((s) => !s)}
            className="text-white/70 hover:text-white flex-shrink-0"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          <button onClick={onClose} className="text-white/70 hover:text-white flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dropdown menu */}
        {showMenu && (
          <div className="absolute top-20 right-4 z-30 glass rounded-xl overflow-hidden border border-white/10 min-w-[160px]">
            {!isOwn && (
              <button
                onClick={() => { setShowReportConfirm(true); setShowMenu(false); }}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm text-destructive hover:bg-white/5 transition-colors"
              >
                <Flag className="w-4 h-4" />
                Hikayeyi Şikayet Et
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

        {/* Story content — tap + hold */}
        <div
          className="flex-1 rounded-2xl overflow-hidden relative select-none"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onClick={handleTap}
        >
          {story.image_url ? (
            <img src={story.image_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div
              className="w-full h-full flex flex-col items-center justify-center p-8"
              style={{ background: "linear-gradient(135deg, hsl(258 18% 9%), hsl(240 14% 5%))" }}
            >
              <span className="text-6xl mb-4">🌙</span>
              {story.content && (
                <p className="text-foreground text-center text-lg font-semibold leading-relaxed">{story.content}</p>
              )}
            </div>
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/50 pointer-events-none" />

          {/* Text overlay */}
          {story.image_url && story.content && (
            <div className="absolute bottom-20 left-4 right-4 pointer-events-none">
              <p className="text-white text-base font-bold drop-shadow-lg">{story.content}</p>
            </div>
          )}

          {/* Venue tag */}
          {story.venues && (
            <div className="absolute top-20 left-4 pointer-events-none">
              <div className="flex items-center gap-1.5 glass rounded-full px-3 py-1.5 border border-white/20">
                <MapPin className="w-3 h-3 text-secondary" />
                <span className="text-xs text-secondary font-bold">{story.venues.name}</span>
              </div>
            </div>
          )}

          {/* Paused indicator */}
          {paused && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="glass rounded-full px-4 py-2 border border-white/20">
                <span className="text-white text-xs font-semibold">⏸ Duraklatıldı</span>
              </div>
            </div>
          )}

          {/* Reaction float animation */}
          {sentReaction && (
            <div className="absolute bottom-32 left-1/2 -translate-x-1/2 pointer-events-none animate-float">
              <span className="text-5xl">{sentReaction}</span>
            </div>
          )}

          {/* Tap hint areas */}
          <div className="absolute top-12 bottom-24 left-0 w-1/3 pointer-events-auto opacity-0" />
          <div className="absolute top-12 bottom-24 right-0 w-2/3 pointer-events-auto opacity-0" />
        </div>

        {/* Bottom actions */}
        <div className="absolute bottom-4 left-4 right-4 z-20 space-y-2">
          {/* Quick reactions */}
          {!showReply && (
            <div className="flex gap-2 justify-center">
              {QUICK_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleReaction(emoji)}
                  className="w-10 h-10 glass rounded-full flex items-center justify-center text-lg border border-white/10 hover:border-white/30 hover:scale-110 transition-all active:scale-90"
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
                  className="flex-1 glass rounded-full px-4 py-2.5 text-sm text-white placeholder-white/40 bg-transparent border border-white/20 focus:outline-none focus:border-primary/60"
                />
                <button
                  onClick={() => {
                    if (replyText.trim()) {
                      toast({ title: "Yanıt gönderildi 💌" });
                      setReplyText("");
                      setShowReply(false);
                    }
                  }}
                  className="w-10 h-10 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center flex-shrink-0"
                >
                  <Send className="w-4 h-4 text-white" />
                </button>
                <button onClick={() => setShowReply(false)} className="w-10 h-10 glass rounded-full flex items-center justify-center border border-white/10">
                  <X className="w-4 h-4 text-white/60" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => { setPaused(true); setShowReply(true); }}
                  className="flex-1 glass rounded-full px-4 py-2.5 flex items-center gap-2 border border-white/10"
                >
                  <span className="text-xs text-white/50 flex-1 text-left">Yanıt gönder...</span>
                </button>
                <button
                  onClick={() => {
                    const isLiked = myLikes.includes(story.id);
                    likeStory.mutate({ storyId: story.id, liked: isLiked });
                    toast({ title: isLiked ? "Beğeni kaldırıldı" : "Hikaye beğenildi ❤️" });
                  }}
                  className="w-10 h-10 glass rounded-full flex items-center justify-center border border-white/10 hover:text-destructive transition-colors"
                >
                  <Heart className={`w-5 h-5 ${myLikes.includes(story.id) ? "fill-red-500 text-red-500" : "text-white/70"}`} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Nav arrows (desktop UX) */}
        {currentIndex > 0 && (
          <button
            onClick={() => { setProgress(0); onNavigate(currentIndex - 1); }}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 w-10 h-10 glass rounded-full flex items-center justify-center border border-white/10 hidden sm:flex"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
        )}
        {currentIndex < allStories.length - 1 && (
          <button
            onClick={() => { setProgress(0); onNavigate(currentIndex + 1); }}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 w-10 h-10 glass rounded-full flex items-center justify-center border border-white/10 hidden sm:flex"
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
        )}
      </div>

      {/* Report confirm */}
      {showReportConfirm && (
        <div className="absolute inset-0 z-30 flex items-end justify-center pb-8 px-4">
          <div className="glass rounded-2xl p-5 w-full max-w-sm border border-destructive/30">
            <h3 className="font-bold text-white mb-2">Hikayeyi Şikayet Et</h3>
            <p className="text-sm text-white/60 mb-4">Bu içerik uygunsuz mu? Şikayet etmek istediğinize emin misiniz?</p>
            <div className="flex gap-2">
              <button onClick={() => setShowReportConfirm(false)} className="flex-1 glass rounded-xl py-2.5 text-sm text-white/60 border border-white/10">İptal</button>
              <button onClick={handleReport} className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white bg-destructive">Şikayet Et</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoryViewer;
