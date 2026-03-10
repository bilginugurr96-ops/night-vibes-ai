import { useState, useRef, useCallback } from "react";
import {
  Heart, X, MapPin, Crown, Flame, Star, Zap, ChevronUp,
  Check, TrendingUp
} from "lucide-react";
import type { SwipeUser } from "@/hooks/useSwipeUsers";

const LEVEL_NAMES = ["", "Gece Yenisi", "Kulüp Kaşifi", "VIP Sosyalite", "Şehir Simgesi", "Global Yıldız"];
const getLevelName = (l: number) => LEVEL_NAMES[Math.min(l, LEVEL_NAMES.length - 1)] ?? "Global Yıldız";

interface SwipeCardProps {
  user: SwipeUser;
  onLike: () => void;
  onPass: () => void;
  onSuperInterest: () => void;
  isActive: boolean;
  canSwipe: boolean;
  canSuperInterest: boolean;
  mode: "day" | "night";
}

const SwipeCard = ({
  user,
  onLike,
  onPass,
  onSuperInterest,
  isActive,
  canSwipe,
  canSuperInterest,
  mode,
}: SwipeCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [deltaX, setDeltaX] = useState(0);
  const [deltaY, setDeltaY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [exitAnim, setExitAnim] = useState<"left" | "right" | "up" | null>(null);

  const threshold = 100;
  const upThreshold = 120;

  const handleStart = useCallback((clientX: number, clientY: number) => {
    if (!canSwipe || !isActive) return;
    setStartX(clientX);
    setStartY(clientY);
    setIsDragging(true);
  }, [canSwipe, isActive]);

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging) return;
    setDeltaX(clientX - startX);
    setDeltaY(clientY - startY);
  }, [isDragging, startX, startY]);

  const handleEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);

    if (deltaY < -upThreshold && canSuperInterest) {
      setExitAnim("up");
      setTimeout(() => onSuperInterest(), 300);
    } else if (deltaX > threshold) {
      setExitAnim("right");
      setTimeout(() => onLike(), 300);
    } else if (deltaX < -threshold) {
      setExitAnim("left");
      setTimeout(() => onPass(), 300);
    } else {
      setDeltaX(0);
      setDeltaY(0);
    }
  }, [isDragging, deltaX, deltaY, onLike, onPass, onSuperInterest, canSuperInterest]);

  const rotation = isDragging ? deltaX * 0.08 : 0;
  const opacity = exitAnim ? 0 : 1;

  const exitTransform = exitAnim === "left"
    ? "translateX(-150%) rotate(-30deg)"
    : exitAnim === "right"
      ? "translateX(150%) rotate(30deg)"
      : exitAnim === "up"
        ? "translateY(-150%) scale(0.8)"
        : undefined;

  const likeIndicator = isDragging && deltaX > 40;
  const passIndicator = isDragging && deltaX < -40;
  const superIndicator = isDragging && deltaY < -60;

  const spBadge = user.sp_level ?? 1;
  const cityRankText = user.city_rank ? `#${user.city_rank}` : null;

  // Border glow for same venue
  const borderGlow = user.sameVenueTonight
    ? "ring-2 ring-primary/60 shadow-[0_0_30px_hsl(var(--primary)/0.3)]"
    : user.is_premium
      ? "ring-1 ring-amber-500/30"
      : (user.subscription_tier === "elite"
        ? "ring-1 ring-purple-500/40"
        : "ring-1 ring-border/30");

  return (
    <div
      ref={cardRef}
      className={`absolute inset-0 rounded-3xl overflow-hidden ${borderGlow} transition-opacity duration-300`}
      style={{
        transform: exitAnim
          ? exitTransform
          : `translateX(${deltaX}px) translateY(${Math.min(deltaY, 0)}px) rotate(${rotation}deg)`,
        transition: isDragging ? "none" : "transform 0.3s ease, opacity 0.3s ease",
        opacity,
        zIndex: isActive ? 10 : 5,
        touchAction: "none",
      }}
      onPointerDown={(e) => handleStart(e.clientX, e.clientY)}
      onPointerMove={(e) => handleMove(e.clientX, e.clientY)}
      onPointerUp={handleEnd}
      onPointerLeave={() => isDragging && handleEnd()}
    >
      {/* Background image */}
      <div className="absolute inset-0">
        {user.avatar_url ? (
          <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className={`w-full h-full ${mode === "night" ? "bg-gradient-to-br from-primary/30 via-card to-secondary/20" : "bg-gradient-to-br from-amber-100 via-orange-50 to-yellow-100"}`} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/10" />
      </div>

      {/* Swipe indicators */}
      {likeIndicator && (
        <div className="absolute top-20 left-8 z-20 rotate-[-20deg] border-4 border-green-400 rounded-xl px-4 py-2 animate-pulse">
          <span className="text-green-400 font-black text-2xl">LIKE</span>
        </div>
      )}
      {passIndicator && (
        <div className="absolute top-20 right-8 z-20 rotate-[20deg] border-4 border-red-400 rounded-xl px-4 py-2 animate-pulse">
          <span className="text-red-400 font-black text-2xl">PASS</span>
        </div>
      )}
      {superIndicator && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 border-4 border-amber-400 rounded-xl px-4 py-2 animate-pulse">
          <span className="text-amber-400 font-black text-xl flex items-center gap-2">
            <Star className="w-5 h-5 fill-current" /> SÜPER İLGİ
          </span>
        </div>
      )}

      {/* Top badges */}
      <div className="absolute top-4 left-4 right-4 flex items-start justify-between z-10">
        <div className="flex flex-col gap-1.5">
          {user.currentVenueName && (
            <span className={`flex items-center gap-1 backdrop-blur text-[10px] font-bold px-2.5 py-1 rounded-full ${user.sameVenueTonight ? "bg-primary/90 text-primary-foreground shadow-[0_0_12px_hsl(var(--primary)/0.5)]" : "bg-secondary/80 text-secondary-foreground"}`}>
              <MapPin className="w-3 h-3" />
              Live · {user.currentVenueName}
            </span>
          )}
          {user.isRising && (
            <span className="flex items-center gap-1 bg-orange-500/90 backdrop-blur text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
              <TrendingUp className="w-3 h-3" />
              🔥 Yükselen
            </span>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5">
          {user.subscription_tier === "elite" && (
            <span className="flex items-center gap-1 bg-purple-600/90 backdrop-blur text-white text-[10px] font-black px-2.5 py-1 rounded-full">
              <Crown className="w-3 h-3" /> Elite
            </span>
          )}
          {user.is_premium && user.subscription_tier !== "elite" && (
            <span className="flex items-center gap-1 bg-amber-500/90 backdrop-blur text-black text-[10px] font-black px-2.5 py-1 rounded-full">
              <Crown className="w-3 h-3" /> Premium
            </span>
          )}
          {cityRankText && (
            <span className="bg-background/60 backdrop-blur text-foreground text-[10px] font-bold px-2.5 py-1 rounded-full border border-border/30">
              Şehir {cityRankText}
            </span>
          )}
        </div>
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
        <div className="flex items-end justify-between mb-2">
          <div>
            <h3 className="font-display text-2xl font-black text-white leading-tight">
              {user.display_name ?? "Kullanıcı"}
            </h3>
            {user.currentVenueName && (
              <div className="flex items-center gap-1 text-white/60 text-xs mt-0.5">
                <MapPin className="w-3 h-3" />
                {user.currentVenueName}
              </div>
            )}
          </div>
          {/* SP Badge */}
          <div className="flex items-center gap-1 bg-white/10 backdrop-blur rounded-full px-2.5 py-1 border border-white/10">
            <Zap className="w-3 h-3 text-primary" />
            <span className="text-white text-[10px] font-bold">SP {user.social_power}</span>
          </div>
        </div>

        {/* Bio */}
        {user.bio && (
          <p className="text-white/80 text-xs leading-relaxed mb-3 line-clamp-2">"{user.bio}"</p>
        )}

        {/* Interests */}
        {user.interests && user.interests.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {user.interests.slice(0, 4).map((i) => (
              <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 backdrop-blur text-white/80 border border-white/10">
                {i}
              </span>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="flex gap-3 mb-5">
          <div className="flex items-center gap-1 text-white/50 text-[10px]">
            <Check className="w-3 h-3 text-secondary" />
            <span>{user.total_checkins ?? 0} check-in</span>
          </div>
          <div className="flex items-center gap-1 text-white/50 text-[10px]">
            <Star className="w-3 h-3 text-primary" />
            <span>Lv.{getLevelName(user.level ?? 1)}</span>
          </div>
          {user.sharedVenueCount > 0 && mode === "day" && (
            <div className="flex items-center gap-1 text-white/50 text-[10px]">
              <Flame className="w-3 h-3 text-orange-400" />
              <span>{user.sharedVenueCount} ortak mekan</span>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-center gap-5">
          <button
            onClick={(e) => { e.stopPropagation(); if (canSwipe) { setExitAnim("left"); setTimeout(onPass, 300); } }}
            className="w-14 h-14 rounded-full glass border border-red-500/30 flex items-center justify-center text-red-400 hover:text-red-300 hover:border-red-500/50 transition-all active:scale-90"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Super Interest */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (canSuperInterest) { setExitAnim("up"); setTimeout(onSuperInterest, 300); }
            }}
            disabled={!canSuperInterest}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-90 ${canSuperInterest ? "bg-amber-500/20 border border-amber-500/40 text-amber-400 hover:bg-amber-500/30" : "bg-muted/30 border border-border text-muted-foreground cursor-not-allowed"}`}
          >
            <ChevronUp className="w-5 h-5" />
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); if (canSwipe) { setExitAnim("right"); setTimeout(onLike, 300); } }}
            disabled={!canSwipe}
            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all active:scale-90 ${canSwipe ? "bg-gradient-to-r from-primary to-secondary shadow-[0_0_25px_hsl(var(--primary)/0.4)] hover:scale-105" : "bg-muted text-muted-foreground cursor-not-allowed"}`}
          >
            <Heart className={`w-8 h-8 ${canSwipe ? "text-white" : "text-muted-foreground"}`} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SwipeCard;
