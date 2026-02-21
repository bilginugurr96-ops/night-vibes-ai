import { useState, useRef } from "react";
import {
  Heart, X, MessageCircle, Crown, MapPin, Zap, Flame,
  Star, ChevronRight, Check, Eye, SlidersHorizontal, Lock, Send
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import NotificationBell from "@/components/NotificationBell";
import {
  useMyConnections,
  useMatches,
  useLikeUser,
  useDiscoverUsers,
  useLikedByMe,
  useSentLikes,
  useRecordLike,
  type DiscoverUser,
  type Connection,
  type Like,
} from "@/hooks/useConnections";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

const LEVEL_NAMES = ["", "Gece Yenisi", "Kulüp Kaşifi", "VIP Sosyalite", "Şehir Simgesi", "Global Yıldız"];
const getLevelName = (l: number) => LEVEL_NAMES[Math.min(l, LEVEL_NAMES.length - 1)] ?? "Global Yıldız";
const LEVEL_COLORS = ["", "from-muted to-muted", "from-blue-600 to-blue-500", "from-violet-600 to-purple-500", "from-amber-500 to-orange-500", "from-pink-500 to-rose-500"];
const getLevelColor = (l: number) => LEVEL_COLORS[Math.min(l, LEVEL_COLORS.length - 1)] ?? LEVEL_COLORS[5];

type Tab = "discover" | "matches" | "likedYou" | "sentLikes";
type Filter = "all" | "active" | "sameCity" | "premium";

// ── Liked You Card ─────────────────────────────────────────────────────────────
const LikedYouCard = ({
  like,
  isPremium,
  onUnlock,
  onMessage,
}: {
  like: Like;
  isPremium: boolean;
  onUnlock: () => void;
  onMessage: () => void;
}) => {
  const p = like.profiles;
  const level = p?.level ?? 1;
  const timeAgo = formatDistanceToNow(new Date(like.created_at), { addSuffix: true });

  const levelColors = ["", "from-muted to-muted", "from-blue-600 to-blue-500", "from-violet-600 to-purple-500", "from-amber-500 to-orange-500", "from-pink-500 to-rose-500"];
  const levelNames = ["", "Gece Yenisi", "Kulüp Kaşifi", "VIP Sosyalite", "Şehir Simgesi", "Global Yıldız"];
  const levelColor = levelColors[Math.min(level, levelColors.length - 1)] ?? levelColors[5];
  const levelName = levelNames[Math.min(level, levelNames.length - 1)] ?? "Global Yıldız";

  if (!isPremium) {
    // Blurred card for free users
    return (
      <div className="glass rounded-2xl p-4 flex items-center gap-4 border border-primary/10 relative overflow-hidden animate-fade-in-up">
        {/* Blurred avatar */}
        <div className="relative w-14 h-14 rounded-full flex-shrink-0">
          <div className="w-full h-full rounded-full bg-gradient-purple flex items-center justify-center text-primary-foreground font-bold blur-md">
            {p?.avatar_url ? (
              <img src={p.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
            ) : "?"}
          </div>
          <div className="absolute inset-0 rounded-full bg-background/40 backdrop-blur-sm flex items-center justify-center">
            <Lock className="w-4 h-4 text-primary" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="h-3 w-24 bg-muted/60 rounded-full mb-2 blur-sm" />
          <div className="h-2 w-16 bg-muted/40 rounded-full blur-sm" />
          <p className="text-[10px] text-primary font-semibold mt-2 flex items-center gap-1">
            <Heart className="w-3 h-3 fill-current" />
            {like.is_super_like ? "⭐ Süper Beğendi" : "Seni beğendi"} · {timeAgo}
          </p>
        </div>
        <button
          onClick={onUnlock}
          className="flex-shrink-0 text-[10px] bg-gradient-gold text-night-900 font-black px-3 py-2 rounded-xl gold-glow"
        >
          <Crown className="w-3 h-3 mb-0.5 mx-auto" />
          Gör
        </button>
        {/* Subtle glow overlay */}
        <div className="absolute inset-0 bg-primary/3 pointer-events-none" />
      </div>
    );
  }

  // Full card for premium
  return (
    <div className="glass rounded-2xl p-4 flex items-center gap-4 border border-primary/10 animate-fade-in-up">
      <div className="relative w-14 h-14 flex-shrink-0">
        <div className={`w-full h-full rounded-full bg-gradient-purple flex items-center justify-center text-primary-foreground font-bold ${p?.is_premium ? "ring-2 ring-neon-gold/70 gold-glow" : "ring-2 ring-primary/40 neon-glow"}`}>
          {p?.avatar_url ? (
            <img src={p.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
          ) : (p?.display_name ?? "?")[0]?.toUpperCase()}
        </div>
        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-secondary ring-2 ring-background" />
        {p?.is_premium && <span className="absolute -top-1 -right-1 text-xs">✨</span>}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className="text-sm font-bold text-foreground">{p?.display_name ?? "Kullanıcı"}</span>
          {like.is_super_like && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold">⭐ Süper Beğeni</span>}
          <span className={`text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r ${levelColor} text-white font-semibold`}>{levelName}</span>
        </div>
        {p?.location && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
            <MapPin className="w-3 h-3" />
            {p.location}
          </div>
        )}
        {p?.bio && <p className="text-xs text-muted-foreground line-clamp-1">"{p.bio}"</p>}
        <p className="text-[10px] text-primary font-semibold mt-1">
          <Heart className="w-3 h-3 fill-current inline mr-1" />
          {timeAgo}
        </p>
      </div>
      <button
        onClick={onMessage}
        className="w-11 h-11 rounded-full bg-gradient-neon flex items-center justify-center neon-glow hover:scale-105 transition-transform active:scale-95 flex-shrink-0"
      >
        <MessageCircle className="w-5 h-5 text-primary-foreground" />
      </button>
    </div>
  );
};

// ── Sent Like Card ─────────────────────────────────────────────────────────────
const SentLikeCard = ({ like }: { like: Like }) => {
  const p = like.profiles;
  const level = p?.level ?? 1;
  const timeAgo = formatDistanceToNow(new Date(like.created_at), { addSuffix: true });
  const levelColors = ["", "from-muted to-muted", "from-blue-600 to-blue-500", "from-violet-600 to-purple-500", "from-amber-500 to-orange-500", "from-pink-500 to-rose-500"];
  const levelColor = levelColors[Math.min(level, levelColors.length - 1)] ?? levelColors[5];
  const levelNames = ["", "Gece Yenisi", "Kulüp Kaşifi", "VIP Sosyalite", "Şehir Simgesi", "Global Yıldız"];
  const levelName = levelNames[Math.min(level, levelNames.length - 1)] ?? "Global Yıldız";

  return (
    <div className="glass rounded-2xl p-4 flex items-center gap-4 border border-border/50 animate-fade-in-up">
      <div className="relative w-14 h-14 flex-shrink-0">
        <div className={`w-full h-full rounded-full bg-gradient-purple flex items-center justify-center text-primary-foreground font-bold ${p?.is_premium ? "ring-2 ring-neon-gold/70" : "ring-1 ring-border"}`}>
          {p?.avatar_url ? (
            <img src={p.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
          ) : (p?.display_name ?? "?")[0]?.toUpperCase()}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className="text-sm font-bold text-foreground">{p?.display_name ?? "Kullanıcı"}</span>
          {like.is_super_like && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold">⭐ Süper</span>}
          <span className={`text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r ${levelColor} text-white font-semibold`}>{levelName}</span>
        </div>
        {p?.location && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="w-3 h-3" />
            {p.location}
          </div>
        )}
        <p className="text-[10px] text-muted-foreground mt-1">
          <Send className="w-3 h-3 inline mr-1" />
          Beğendin · {timeAgo}
        </p>
      </div>
      <div className="flex-shrink-0">
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
          <Heart className="w-4 h-4 text-primary fill-primary" />
        </div>
      </div>
    </div>
  );
};

// ── Match celebration overlay ──────────────────────────────────────────────────
const MatchOverlay = ({
  me,
  them,
  onChat,
  onKeep,
}: {
  me: { display_name: string | null; avatar_url: string | null };
  them: { display_name: string | null; avatar_url: string | null };
  onChat: () => void;
  onKeep: () => void;
}) => (
  <div className="fixed inset-0 z-50 flex flex-col items-center justify-center">
    {/* Blurred background */}
    <div className="absolute inset-0 bg-background/90 backdrop-blur-xl" />
    {/* Radial purple glow */}
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="w-96 h-96 rounded-full bg-primary/20 blur-3xl animate-pulse-neon" />
    </div>

    <div className="relative z-10 flex flex-col items-center px-6 text-center">
      {/* Avatars */}
      <div className="flex items-center mb-8">
        <Avatar user={me} size="xl" glow="purple" />
        <div className="mx-4 flex flex-col items-center">
          <div className="text-4xl animate-match-pop">💜</div>
        </div>
        <Avatar user={them} size="xl" glow="blue" />
      </div>

      <h2 className="font-display text-3xl font-black text-gradient mb-2 animate-match-pop">
        Bağlandınız!
      </h2>
      <p className="text-muted-foreground text-sm mb-1">
        <span className="text-foreground font-semibold">{them.display_name ?? "Kullanıcı"}</span> da sizi beğendi
      </p>
      <p className="text-xs text-muted-foreground mb-8">Bu gece birlikte çıkma zamanı 🌙</p>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={onChat}
          className="w-full bg-gradient-neon text-primary-foreground font-bold py-3.5 rounded-2xl neon-glow flex items-center justify-center gap-2 text-sm"
        >
          <MessageCircle className="w-4 h-4" />
          Mesaj Gönder
        </button>
        <button
          onClick={onKeep}
          className="w-full glass text-muted-foreground font-semibold py-3 rounded-2xl text-sm"
        >
          Keşfetmeye Devam Et
        </button>
      </div>
    </div>
  </div>
);

// ── Avatar helper ─────────────────────────────────────────────────────────────
const Avatar = ({
  user,
  size = "md",
  glow = "none",
  premium = false,
  online = false,
}: {
  user: { display_name: string | null; avatar_url: string | null };
  size?: "sm" | "md" | "lg" | "xl";
  glow?: "none" | "purple" | "blue" | "gold";
  premium?: boolean;
  online?: boolean;
}) => {
  const sizeClass = { sm: "w-10 h-10 text-sm", md: "w-14 h-14 text-base", lg: "w-20 h-20 text-xl", xl: "w-24 h-24 text-2xl" }[size];
  const glowClass = { none: "", purple: "neon-glow", blue: "cyan-glow", gold: "gold-glow" }[glow];
  const initials = (user.display_name ?? "?").split(" ").map((w) => w[0]).join("").toUpperCase().substring(0, 2);

  return (
    <div className={`relative ${sizeClass} rounded-full flex-shrink-0`}>
      <div className={`w-full h-full rounded-full bg-gradient-purple flex items-center justify-center text-primary-foreground font-bold ${glowClass} ${premium ? "ring-2 ring-neon-gold/70" : ""}`}>
        {user.avatar_url ? (
          <img src={user.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
        ) : (
          <span>{initials}</span>
        )}
      </div>
      {online && (
        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-secondary ring-2 ring-background" />
      )}
      {premium && (
        <span className="absolute -top-1 -right-1 text-xs leading-none">✨</span>
      )}
    </div>
  );
};

// ── Profile card (full-featured discover card) ────────────────────────────────
const DiscoverCard = ({
  user,
  onLike,
  onSkip,
  isLiking,
  likesLeft,
  isPremium,
}: {
  user: DiscoverUser;
  onLike: () => void;
  onSkip: () => void;
  isLiking: boolean;
  likesLeft: number;
  isPremium: boolean;
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [swipeAnim, setSwipeAnim] = useState<"like" | "skip" | null>(null);
  const [liked, setLiked] = useState(false);

  const triggerLike = () => {
    if (!isPremium && likesLeft <= 0) return;
    setLiked(true);
    setSwipeAnim("like");
    setTimeout(() => {
      setSwipeAnim(null);
      setLiked(false);
      onLike();
    }, 350);
  };

  const triggerSkip = () => {
    setSwipeAnim("skip");
    setTimeout(() => {
      setSwipeAnim(null);
      onSkip();
    }, 350);
  };

  const level = user.level ?? 1;
  const xp = user.xp ?? 0;
  const xpInLevel = xp % 500;
  const xpPct = Math.min((xpInLevel / 500) * 100, 100);

  return (
    <div
      ref={cardRef}
      className={`relative rounded-3xl overflow-hidden shadow-2xl animate-card-enter
        ${swipeAnim === "like" ? "animate-swipe-right" : ""}
        ${swipeAnim === "skip" ? "animate-swipe-left" : ""}
      `}
      style={{ minHeight: 480 }}
    >
      {/* Photo / gradient background */}
      <div className="absolute inset-0">
        {user.avatar_url ? (
          <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/30 via-accent/20 to-secondary/20" />
        )}
        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
      </div>

      {/* Top badges */}
      <div className="absolute top-4 left-4 right-4 flex items-start justify-between z-10">
        <div className="flex flex-col gap-1.5">
          {user.sameVenueTonight && (
            <span className="flex items-center gap-1 bg-primary/90 backdrop-blur text-primary-foreground text-[10px] font-bold px-2.5 py-1 rounded-full neon-glow">
              <Flame className="w-3 h-3" />
              Bu Gece Aynı Mekanda
            </span>
          )}
          {user.currentVenueName && !user.sameVenueTonight && (
            <span className="flex items-center gap-1 bg-secondary/80 backdrop-blur text-secondary-foreground text-[10px] font-bold px-2.5 py-1 rounded-full">
              <MapPin className="w-3 h-3" />
              {user.currentVenueName}
            </span>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5">
          {user.is_premium && (
            <span className="flex items-center gap-1 bg-neon-gold/90 backdrop-blur text-night-900 text-[10px] font-black px-2.5 py-1 rounded-full gold-glow">
              <Crown className="w-3 h-3" />
              Premium
            </span>
          )}
          {/* Online indicator */}
          <span className="flex items-center gap-1 bg-background/50 backdrop-blur text-secondary text-[10px] font-semibold px-2.5 py-1 rounded-full border border-secondary/30">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary inline-block" />
            Aktif
          </span>
        </div>
      </div>

      {/* Bottom content */}
      <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
        {/* Name + level */}
        <div className="flex items-end justify-between mb-2">
          <div>
            <h3 className="font-display text-2xl font-black text-white leading-tight">
              {user.display_name ?? "Kullanıcı"}
            </h3>
            {user.location && (
              <div className="flex items-center gap-1 text-white/60 text-xs mt-0.5">
                <MapPin className="w-3 h-3" />
                {user.location}
              </div>
            )}
          </div>
          <div className={`px-2.5 py-1 rounded-xl bg-gradient-to-r ${getLevelColor(level)} text-white text-[10px] font-bold flex items-center gap-1`}>
            <Star className="w-3 h-3 fill-current" />
            {getLevelName(level)}
          </div>
        </div>

        {/* XP bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-white/50 text-[10px]">Seviye {level} · {xp.toLocaleString()} XP</span>
            <span className="text-white/50 text-[10px]">{xpPct.toFixed(0)}%</span>
          </div>
          <div className="h-1 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-gradient-neon rounded-full transition-all" style={{ width: `${xpPct}%` }} />
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

        {/* Stats row */}
        <div className="flex gap-3 mb-5">
          <div className="flex items-center gap-1 text-white/50 text-[10px]">
            <Check className="w-3 h-3 text-secondary" />
            <span>{user.total_checkins ?? 0} check-in</span>
          </div>
          <div className="flex items-center gap-1 text-white/50 text-[10px]">
            <Zap className="w-3 h-3 text-primary" />
            <span>Skor {user.night_activity_score ?? 0}</span>
          </div>
          <div className="flex items-center gap-1 text-white/50 text-[10px]">
            <Eye className="w-3 h-3 text-muted-foreground" />
            <span>Aktif bu hafta</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-center gap-5">
          {/* Skip */}
          <button
            onClick={triggerSkip}
            className="w-14 h-14 rounded-full glass border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-border/80 transition-all active:scale-95"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Like */}
          <button
            onClick={triggerLike}
            disabled={isLiking || (!isPremium && likesLeft <= 0)}
            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all active:scale-95
              ${!isPremium && likesLeft <= 0
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-gradient-neon neon-glow hover:scale-105"
              }
              ${liked ? "animate-like-pop" : ""}
            `}
          >
            <Heart className={`w-8 h-8 ${!isPremium && likesLeft <= 0 ? "text-muted-foreground" : "text-primary-foreground"} ${liked ? "fill-current" : ""}`} />
          </button>

          {/* Profile expand placeholder */}
          <button
            className="w-14 h-14 rounded-full glass border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-all active:scale-95"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Active users horizontal strip ─────────────────────────────────────────────
const ActiveStrip = ({ users }: { users: DiscoverUser[] }) => {
  const active = users.filter((u) => u.currentVenueName || u.sameVenueTonight).slice(0, 10);
  if (active.length === 0) return null;
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
        <span className="text-xs font-bold text-foreground">Bu Gece Aktif</span>
        <span className="text-xs text-muted-foreground">{active.length} kişi</span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
        {active.map((u) => (
          <div key={u.user_id} className="flex flex-col items-center gap-1.5 flex-shrink-0">
            <div className="relative">
              <div className={`w-12 h-12 rounded-full bg-gradient-purple flex items-center justify-center text-primary-foreground text-xs font-bold ${u.is_premium ? "ring-2 ring-neon-gold/70 gold-glow" : "ring-2 ring-primary/40 neon-glow"}`}>
                {u.avatar_url ? (
                  <img src={u.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
                ) : (
                  (u.display_name ?? "?")[0].toUpperCase()
                )}
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-secondary ring-2 ring-background" />
            </div>
            <span className="text-[10px] text-muted-foreground max-w-[48px] truncate text-center">
              {u.display_name?.split(" ")[0] ?? "Kullanıcı"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Match card (matches tab) ───────────────────────────────────────────────────
const MatchCard = ({ match, onChat }: { match: Connection; onChat: () => void }) => {
  const p = match.profiles;
  const level = p?.level ?? 1;
  return (
    <div className="glass rounded-2xl p-4 flex items-center gap-4 animate-fade-in-up border border-primary/10">
      <Avatar user={p ?? { display_name: null, avatar_url: null }} size="md" glow="purple" premium={!!p?.is_premium} online />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-bold text-foreground">{p?.display_name ?? "Kullanıcı"}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r ${getLevelColor(level)} text-white font-semibold`}>
            {getLevelName(level)}
          </span>
        </div>
        {p?.location && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
            <MapPin className="w-3 h-3" />
            {p.location}
          </div>
        )}
        {p?.bio && <p className="text-xs text-muted-foreground line-clamp-1">"{p.bio}"</p>}
        <p className="text-[10px] text-primary font-semibold mt-1 flex items-center gap-1">
          <Heart className="w-3 h-3 fill-current" />
          Eşleşme sağlandı
        </p>
      </div>
      <button
        onClick={onChat}
        className="w-11 h-11 rounded-full bg-gradient-neon flex items-center justify-center neon-glow hover:scale-105 transition-transform active:scale-95 flex-shrink-0"
      >
        <MessageCircle className="w-5 h-5 text-primary-foreground" />
      </button>
    </div>
  );
};

// ── Main page ──────────────────────────────────────────────────────────────────
const ConnectionsPage = () => {
  const [tab, setTab] = useState<Tab>("discover");
  const [filter, setFilter] = useState<Filter>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [matchUser, setMatchUser] = useState<DiscoverUser | null>(null);
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set());
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [dailyLikes, setDailyLikes] = useState(0);

  const { profile, user } = useAuth();
  const isPremium = !!profile?.is_premium;
  const DAILY_LIMIT = 30;
  const likesLeft = DAILY_LIMIT - dailyLikes;

  const { data: connections = [] } = useMyConnections();
  const { data: matches = [] } = useMatches();
  const { data: rawDiscover = [], isLoading } = useDiscoverUsers();
  const { data: likedByMe = [] } = useLikedByMe();
  const { data: sentLikes = [] } = useSentLikes();
  const likeUser = useLikeUser();
  const recordLike = useRecordLike();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Filter out already interacted
  const interactedIds = new Set([...likedIds, ...skippedIds]);
  let discoverUsers = rawDiscover.filter((u) => !interactedIds.has(u.user_id));

  // Apply tab filters
  if (filter === "active") discoverUsers = discoverUsers.filter((u) => u.currentVenueName);
  if (filter === "sameCity") discoverUsers = discoverUsers.filter((u) => u.sameCity);
  if (filter === "premium") discoverUsers = discoverUsers.filter((u) => u.is_premium);

  // Current top card
  const topUser = discoverUsers[0];

  const handleLike = async (u: DiscoverUser) => {
    if (!isPremium && likesLeft <= 0) {
      toast({ title: "Günlük limit doldu", description: "Premium'a geç, sınırsız beğen!", variant: "destructive" });
      return;
    }
    try {
      setLikedIds((prev) => new Set([...prev, u.user_id]));
      setDailyLikes((d) => d + 1);
      // Record in likes table
      await recordLike.mutateAsync({ likedId: u.user_id });
      const result = await likeUser.mutateAsync(u.user_id);
      if (result === "matched") {
        setMatchUser(u);
      } else {
        toast({ title: `❤️ Beğenildi!`, description: `${u.display_name ?? "Kullanıcı"} beğendiniz.` });
      }
    } catch {
      toast({ title: "Hata", variant: "destructive" });
    }
  };

  const handleSkip = (userId: string) => {
    setSkippedIds((prev) => new Set([...prev, userId]));
  };

  const FILTERS: { key: Filter; label: string; icon: string }[] = [
    { key: "all", label: "Tümü", icon: "⚡" },
    { key: "active", label: "Aktif Bu Gece", icon: "🔥" },
    { key: "sameCity", label: "Aynı Şehir", icon: "📍" },
    { key: "premium", label: "Premium", icon: "👑" },
  ];

  const TABS: { key: Tab; label: string; count?: number }[] = [
    { key: "discover", label: "🔥 Keşfet" },
    { key: "matches", label: "💞 Eşleşmeler", count: matches.length },
    { key: "likedYou", label: "💜 Beğenenler", count: likedByMe.length },
    { key: "sentLikes", label: "❤️ Gönderdiklerim", count: sentLikes.length },
  ];

  return (
    <div className="min-h-screen bg-background pb-24 relative overflow-x-hidden">
      {/* Match overlay */}
      {matchUser && user && (
        <MatchOverlay
          me={{ display_name: profile?.display_name ?? null, avatar_url: profile?.avatar_url ?? null }}
          them={{ display_name: matchUser.display_name, avatar_url: matchUser.avatar_url }}
          onChat={() => { setMatchUser(null); navigate(`/chat/${matchUser.user_id}`); }}
          onKeep={() => setMatchUser(null)}
        />
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 glass px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="font-display text-xl font-black text-gradient">Bağlantılar</h1>
            <p className="text-[10px] text-muted-foreground">Gece sosyal ağın</p>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            {!isPremium && (
              <div className="text-[10px] font-semibold text-muted-foreground glass px-2.5 py-1.5 rounded-full border border-border">
                <span className="text-primary font-bold">{Math.max(0, likesLeft)}</span> beğeni
              </div>
            )}
            {!isPremium ? (
              <button className="flex items-center gap-1 bg-gradient-gold text-night-900 text-xs font-black px-3 py-1.5 rounded-full gold-glow">
                <Crown className="w-3 h-3" />
                Premium
              </button>
            ) : (
              <span className="flex items-center gap-1 bg-gradient-gold text-night-900 text-xs font-black px-3 py-1.5 rounded-full gold-glow">
                <Crown className="w-3 h-3" />
                Premium ✨
              </span>
            )}
          </div>
        </div>

        {/* Tabs — 2-row layout: discover+matches on top, likedYou+sentLikes below */}
        <div className="flex gap-1.5 mb-2">
          {TABS.slice(0, 2).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                tab === t.key
                  ? "bg-gradient-neon text-primary-foreground neon-glow"
                  : "glass text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}{t.count !== undefined && t.count > 0 ? ` (${t.count})` : ""}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 mb-2">
          {/* Liked You tab */}
          <button
            onClick={() => setTab("likedYou")}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all relative ${
              tab === "likedYou"
                ? "bg-primary/20 text-primary border border-primary/50 neon-glow"
                : "glass text-muted-foreground hover:text-foreground"
            }`}
          >
            💜 Beğenenler
            {likedByMe.length > 0 && (
              <span className={`ml-1 inline-flex items-center justify-center rounded-full text-[9px] font-black px-1.5 py-0.5 ${tab === "likedYou" ? "bg-primary text-primary-foreground" : "bg-primary/30 text-primary"}`}>
                {likedByMe.length > 99 ? "99+" : likedByMe.length}
              </span>
            )}
          </button>
          {/* Sent Likes tab */}
          <button
            onClick={() => setTab("sentLikes")}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              tab === "sentLikes"
                ? "bg-muted text-foreground border border-border"
                : "glass text-muted-foreground hover:text-foreground"
            }`}
          >
            ❤️ Gönderdiklerim
            {sentLikes.length > 0 && (
              <span className="ml-1 text-[9px] text-muted-foreground">({sentLikes.length})</span>
            )}
          </button>
        </div>

        {/* Filters (discover only) */}
        {tab === "discover" && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all ${
                  filter === f.key
                    ? "bg-primary/20 text-primary border border-primary/40"
                    : "glass text-muted-foreground border border-transparent"
                }`}
              >
                {f.icon} {f.label}
              </button>
            ))}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex-shrink-0 flex items-center gap-1 glass px-3 py-1.5 rounded-full text-[10px] font-bold text-muted-foreground"
            >
              <SlidersHorizontal className="w-3 h-3" />
            </button>
          </div>
        )}
      </header>

      <main className="px-4 mt-4">
        {/* ── DISCOVER TAB ── */}
        {tab === "discover" && (
          <div>
            <ActiveStrip users={rawDiscover} />

            {isLoading ? (
              <div className="glass rounded-3xl h-96 flex items-center justify-center animate-pulse">
                <span className="text-4xl animate-float">🌙</span>
              </div>
            ) : !topUser ? (
              <div className="glass rounded-3xl p-12 text-center">
                <span className="text-6xl block mb-4 animate-float">🌙</span>
                <p className="font-display text-lg font-black text-foreground mb-1">Herkes keşfedildi!</p>
                <p className="text-sm text-muted-foreground">Daha fazlası için biraz bekle veya dışarı çık 🕺</p>
              </div>
            ) : (
              <div className="relative">
                {discoverUsers[2] && (
                  <div className="absolute inset-x-8 top-4 rounded-3xl overflow-hidden opacity-20" style={{ height: 480 }}>
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/10" />
                  </div>
                )}
                {discoverUsers[1] && (
                  <div className="absolute inset-x-4 top-2 rounded-3xl overflow-hidden opacity-40" style={{ height: 480 }}>
                    {discoverUsers[1].avatar_url ? (
                      <img src={discoverUsers[1].avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/10" />
                    )}
                    <div className="absolute inset-0 bg-black/50" />
                  </div>
                )}
                <div className="relative z-10">
                  <DiscoverCard
                    key={topUser.user_id}
                    user={topUser}
                    onLike={() => handleLike(topUser)}
                    onSkip={() => handleSkip(topUser.user_id)}
                    isLiking={likeUser.isPending}
                    likesLeft={likesLeft}
                    isPremium={isPremium}
                  />
                </div>
              </div>
            )}

            {!isPremium && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-muted-foreground">Günlük beğeni</span>
                  <span className="text-xs font-bold text-foreground">{dailyLikes} / {DAILY_LIMIT}</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-4">
                  <div className="h-full bg-gradient-neon rounded-full transition-all" style={{ width: `${(dailyLikes / DAILY_LIMIT) * 100}%` }} />
                </div>
                {likesLeft <= 5 && (
                  <div className="glass rounded-2xl p-4 border border-neon-gold/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Crown className="w-4 h-4 text-neon-gold" />
                      <span className="font-display font-bold text-sm text-foreground">
                        {likesLeft <= 0 ? "Limit doldu! 🔒" : `Sadece ${likesLeft} beğeni kaldı`}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">Premium ile sınırsız beğen, öne çık ve eşleşmeden mesaj gönder.</p>
                    <button className="w-full bg-gradient-gold text-night-900 font-black py-3 rounded-xl text-sm gold-glow">
                      👑 Premium'a Geç
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── MATCHES TAB ── */}
        {tab === "matches" && (
          <div className="space-y-3">
            {matches.length === 0 ? (
              <div className="glass rounded-3xl p-12 text-center">
                <span className="text-6xl block mb-4 animate-float">💞</span>
                <p className="font-display text-lg font-black text-foreground mb-1">Henüz eşleşme yok</p>
                <p className="text-sm text-muted-foreground">İnsanları beğen ve eşleş!</p>
                <button onClick={() => setTab("discover")} className="mt-5 bg-gradient-neon text-primary-foreground font-bold px-6 py-2.5 rounded-xl text-sm neon-glow">
                  🔥 Keşfetmeye Başla
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <Heart className="w-4 h-4 text-primary fill-primary" />
                  <span className="text-xs font-bold text-foreground">{matches.length} eşleşme</span>
                </div>
                {matches.map((match) => (
                  <MatchCard key={match.id} match={match} onChat={() => navigate(`/chat/${match.target_id}`)} />
                ))}
              </>
            )}
            {!isPremium && (
              <div className="glass rounded-2xl p-5 border border-neon-gold/20 mt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="w-5 h-5 text-neon-gold" />
                  <span className="font-display font-bold text-foreground">Premium Avantajları</span>
                </div>
                <ul className="space-y-2 mb-4">
                  {["Eşleşme olmadan mesaj gönder", "Profil görüntüleyenleri gör", "Ghost Mode", "Feed'de 3x daha fazla görün", "Spotlight (24s) ile öne çık"].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Zap className="w-3 h-3 text-neon-gold flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button className="w-full bg-gradient-gold text-night-900 font-black py-3 rounded-xl text-sm gold-glow">
                  👑 Premium'a Geç — Sınırsız Eşleş
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── LIKED YOU TAB ── */}
        {tab === "likedYou" && (
          <div className="space-y-3">
            {/* Free user teaser banner */}
            {!isPremium && likedByMe.length > 0 && (
              <div className="glass rounded-2xl p-4 border border-primary/30 mb-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-secondary/5 pointer-events-none" />
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <Heart className="w-5 h-5 text-primary fill-primary animate-pulse" />
                    <span className="font-display font-bold text-foreground">
                      {likedByMe.length} kişi seni beğendi! 🔥
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Kimlerin seni beğendiğini görmek için Premium'a geç. Hemen mesaj at!
                  </p>
                  <button className="w-full bg-gradient-gold text-night-900 font-black py-2.5 rounded-xl text-sm gold-glow flex items-center justify-center gap-2">
                    <Crown className="w-4 h-4" />
                    Beğenenleri Gör — Premium'a Geç
                  </button>
                </div>
              </div>
            )}

            {likedByMe.length === 0 ? (
              <div className="glass rounded-3xl p-12 text-center">
                <span className="text-6xl block mb-4 animate-float">💜</span>
                <p className="font-display text-lg font-black text-foreground mb-1">Henüz beğeni yok</p>
                <p className="text-sm text-muted-foreground">Profilini tamamla ve keşfedilmeyi bekle!</p>
              </div>
            ) : (
              <>
                {isPremium && (
                  <div className="flex items-center gap-2 mb-1">
                    <Heart className="w-4 h-4 text-primary fill-primary" />
                    <span className="text-xs font-bold text-foreground">{likedByMe.length} kişi seni beğendi</span>
                  </div>
                )}
                {likedByMe.map((like) => (
                  <LikedYouCard
                    key={like.id}
                    like={like}
                    isPremium={isPremium}
                    onUnlock={() => toast({ title: "👑 Premium Gerekli", description: "Profili görmek için Premium'a geç!" })}
                    onMessage={() => navigate(`/chat/${like.liker_id}`)}
                  />
                ))}
              </>
            )}
          </div>
        )}

        {/* ── SENT LIKES TAB ── */}
        {tab === "sentLikes" && (
          <div className="space-y-3">
            {sentLikes.length === 0 ? (
              <div className="glass rounded-3xl p-12 text-center">
                <span className="text-6xl block mb-4 animate-float">❤️</span>
                <p className="font-display text-lg font-black text-foreground mb-1">Henüz beğeni göndermedin</p>
                <p className="text-sm text-muted-foreground">Keşfet sekmesine git ve insanları beğen!</p>
                <button onClick={() => setTab("discover")} className="mt-5 bg-gradient-neon text-primary-foreground font-bold px-6 py-2.5 rounded-xl text-sm neon-glow">
                  🔥 Keşfetmeye Başla
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <Send className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-bold text-foreground">{sentLikes.length} beğeni gönderdин</span>
                </div>
                {sentLikes.map((like) => (
                  <SentLikeCard key={like.id} like={like} />
                ))}
              </>
            )}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default ConnectionsPage;

