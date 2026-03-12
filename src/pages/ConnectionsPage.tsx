import { useState, useMemo } from "react";
import {
  Heart, X, MessageCircle, Crown, MapPin, Zap, Flame,
  Star, ChevronRight, Check, Eye, Lock, Send, Moon, Sun
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import DiscoverFiltersPanel from "@/components/DiscoverFilters";

import SwipeCard from "@/components/SwipeCard";
import {
  useMyConnections,
  useMatches,
  useLikeUser,
  useLikedByMe,
  useSentLikes,
  useRecordLike,
  type Connection,
  type Like,
} from "@/hooks/useConnections";
import {
  useSwipeUsers,
  useSuperInterest,
  useSwipeLimits,
  useIncrementSwipe,
  useRejectUser,
  getSwipeLimits,
  type DiscoverFilters,
} from "@/hooks/useSwipeUsers";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { useDayNight } from "@/contexts/DayNightContext";
import { useUserCity } from "@/hooks/useCities";

const LEVEL_NAMES = ["", "Gece Yenisi", "Kulüp Kaşifi", "VIP Sosyalite", "Şehir Simgesi", "Global Yıldız"];
const getLevelName = (l: number) => LEVEL_NAMES[Math.min(l, LEVEL_NAMES.length - 1)] ?? "Global Yıldız";
const LEVEL_COLORS = ["", "from-muted to-muted", "from-blue-600 to-blue-500", "from-violet-600 to-purple-500", "from-amber-500 to-orange-500", "from-pink-500 to-rose-500"];
const getLevelColor = (l: number) => LEVEL_COLORS[Math.min(l, LEVEL_COLORS.length - 1)] ?? LEVEL_COLORS[5];

type Tab = "discover" | "matches" | "likedYou" | "sentLikes";

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
  const levelColor = LEVEL_COLORS[Math.min(level, LEVEL_COLORS.length - 1)] ?? LEVEL_COLORS[5];
  const levelName = LEVEL_NAMES[Math.min(level, LEVEL_NAMES.length - 1)] ?? "Global Yıldız";

  if (!isPremium) {
    return (
      <div className="glass rounded-2xl p-4 flex items-center gap-4 border border-primary/10 relative overflow-hidden animate-fade-in-up">
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
        <button onClick={onUnlock} className="flex-shrink-0 text-[10px] bg-gradient-gold text-night-900 font-black px-3 py-2 rounded-xl gold-glow">
          <Crown className="w-3 h-3 mb-0.5 mx-auto" />
          Gör
        </button>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-4 flex items-center gap-4 border border-primary/10 animate-fade-in-up">
      <div className="relative w-14 h-14 flex-shrink-0">
        <div className={`w-full h-full rounded-full bg-gradient-purple flex items-center justify-center text-primary-foreground font-bold ${p?.is_premium ? "ring-2 ring-neon-gold/70 gold-glow" : "ring-2 ring-primary/40 neon-glow"}`}>
          {p?.avatar_url ? (
            <img src={p.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
          ) : (p?.display_name ?? "?")[0]?.toUpperCase()}
        </div>
        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-secondary ring-2 ring-background" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className="text-sm font-bold text-foreground">{p?.display_name ?? "Kullanıcı"}</span>
          {like.is_super_like && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold">⭐ Süper</span>}
          <span className={`text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r ${levelColor} text-white font-semibold`}>{levelName}</span>
        </div>
        {p?.location && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
            <MapPin className="w-3 h-3" />
            {p.location}
          </div>
        )}
        <p className="text-[10px] text-primary font-semibold mt-1">
          <Heart className="w-3 h-3 fill-current inline mr-1" />
          {timeAgo}
        </p>
      </div>
      <button onClick={onMessage} className="w-11 h-11 rounded-full bg-gradient-neon flex items-center justify-center neon-glow hover:scale-105 transition-transform active:scale-95 flex-shrink-0">
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
  const levelColor = LEVEL_COLORS[Math.min(level, LEVEL_COLORS.length - 1)] ?? LEVEL_COLORS[5];
  const levelName = LEVEL_NAMES[Math.min(level, LEVEL_NAMES.length - 1)] ?? "Global Yıldız";

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
  them,
  onChat,
  onKeep,
}: {
  them: { display_name: string | null; avatar_url: string | null };
  onChat: () => void;
  onKeep: () => void;
}) => (
  <div className="fixed inset-0 z-50 flex flex-col items-center justify-center">
    <div className="absolute inset-0 bg-background/90 backdrop-blur-xl" />
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="w-96 h-96 rounded-full bg-primary/20 blur-3xl animate-pulse-neon" />
    </div>
    <div className="relative z-10 flex flex-col items-center px-6 text-center">
      <div className="w-24 h-24 rounded-full overflow-hidden mb-6 ring-4 ring-primary/50 shadow-[0_0_40px_hsl(var(--primary)/0.4)]">
        {them.avatar_url ? (
          <img src={them.avatar_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-purple flex items-center justify-center text-3xl text-white font-black">
            {(them.display_name ?? "?")[0]?.toUpperCase()}
          </div>
        )}
      </div>
      <h2 className="font-display text-3xl font-black text-gradient mb-2">Bağlandınız!</h2>
      <p className="text-muted-foreground text-sm mb-1">
        <span className="text-foreground font-semibold">{them.display_name ?? "Kullanıcı"}</span> da sizi beğendi
      </p>
      <p className="text-xs text-muted-foreground mb-8">Hemen mesaj at 🔥</p>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button onClick={onChat} className="w-full bg-gradient-neon text-primary-foreground font-bold py-3.5 rounded-2xl neon-glow flex items-center justify-center gap-2 text-sm">
          <MessageCircle className="w-4 h-4" /> Mesaj Gönder
        </button>
        <button onClick={onKeep} className="w-full glass text-muted-foreground font-semibold py-3 rounded-2xl text-sm">
          Keşfetmeye Devam Et
        </button>
      </div>
    </div>
  </div>
);

// ── Match card ─────────────────────────────────────────────────────────────────
const MatchCard = ({ match, onChat }: { match: Connection; onChat: () => void }) => {
  const p = match.profiles;
  const level = p?.level ?? 1;
  return (
    <div className="glass rounded-2xl p-4 flex items-center gap-4 animate-fade-in-up border border-primary/10">
      <div className="relative w-14 h-14 flex-shrink-0">
        <div className={`w-full h-full rounded-full bg-gradient-purple flex items-center justify-center text-primary-foreground font-bold ${p?.is_premium ? "ring-2 ring-neon-gold/70 gold-glow" : "ring-2 ring-primary/40 neon-glow"}`}>
          {p?.avatar_url ? (
            <img src={p.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
          ) : (p?.display_name ?? "?")[0]?.toUpperCase()}
        </div>
        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-secondary ring-2 ring-background" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-bold text-foreground">{p?.display_name ?? "Kullanıcı"}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r ${getLevelColor(level)} text-white font-semibold`}>{getLevelName(level)}</span>
        </div>
        {p?.location && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1"><MapPin className="w-3 h-3" />{p.location}</div>
        )}
        <p className="text-[10px] text-primary font-semibold mt-1 flex items-center gap-1">
          <Heart className="w-3 h-3 fill-current" /> Eşleşme sağlandı
        </p>
      </div>
      <button onClick={onChat} className="w-11 h-11 rounded-full bg-gradient-neon flex items-center justify-center neon-glow hover:scale-105 transition-transform active:scale-95 flex-shrink-0">
        <MessageCircle className="w-5 h-5 text-primary-foreground" />
      </button>
    </div>
  );
};

// ── SP Insufficient Modal ──────────────────────────────────────────────────────
const SPModal = ({ onClose }: { onClose: () => void }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
    <div className="relative glass rounded-3xl p-6 mx-4 max-w-sm border border-primary/20" onClick={e => e.stopPropagation()}>
      <div className="text-center mb-4">
        <span className="text-4xl block mb-3">⚡</span>
        <h3 className="font-display text-lg font-black text-foreground">Yetersiz SP</h3>
        <p className="text-sm text-muted-foreground mt-1">Süper İlgi göndermek için en az 50 SP gerekli.</p>
      </div>
      <div className="space-y-2 mb-4">
        <div className="glass rounded-xl p-3 border border-border/50">
          <p className="text-xs font-bold text-foreground mb-1">SP nasıl kazanılır?</p>
          <ul className="space-y-1 text-[10px] text-muted-foreground">
            <li className="flex items-center gap-2"><Zap className="w-3 h-3 text-primary" /> Check-in yap (+15-25 SP)</li>
            <li className="flex items-center gap-2"><Star className="w-3 h-3 text-primary" /> Story paylaş (+20 SP)</li>
            <li className="flex items-center gap-2"><Flame className="w-3 h-3 text-primary" /> 7 gün streak (+50 SP)</li>
          </ul>
        </div>
      </div>
      <button onClick={onClose} className="w-full bg-gradient-neon text-primary-foreground font-bold py-3 rounded-xl text-sm neon-glow">
        Anladım
      </button>
    </div>
  </div>
);

// ── Main page ──────────────────────────────────────────────────────────────────
const ConnectionsPage = () => {
  const [tab, setTab] = useState<Tab>("discover");
  const [matchUser, setMatchUser] = useState<{ display_name: string | null; avatar_url: string | null; user_id: string } | null>(null);
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set());
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [showSPModal, setShowSPModal] = useState(false);
  const [discoverFilters, setDiscoverFilters] = useState<DiscoverFilters>({});
  const { profile, user } = useAuth();
  const { isNight, mode } = useDayNight();
  const hubMode = mode === "night" ? "night" : "day";
  const { cityName: userCity } = useUserCity();
  const tier = (profile as any)?.subscription_tier ?? "free";
  const isPremium = tier !== "free";

  const { data: matches = [] } = useMatches();
  const { data: rawDiscover = [], isLoading } = useSwipeUsers(hubMode);
  const { data: likedByMe = [] } = useLikedByMe();
  const { data: sentLikes = [] } = useSentLikes();
  const { data: swipeLimitsData } = useSwipeLimits();
  const likeUser = useLikeUser();
  const recordLike = useRecordLike();
  const superInterest = useSuperInterest();
  const incrementSwipe = useIncrementSwipe();
  const { toast } = useToast();
  const navigate = useNavigate();

  const swipesUsed = swipeLimitsData?.swipes ?? 0;
  const maxSwipes = swipeLimitsData?.maxSwipes ?? getSwipeLimits(tier).swipes;
  const siUsed = swipeLimitsData?.superInterests ?? 0;
  const maxSI = swipeLimitsData?.maxSI ?? getSwipeLimits(tier).superInterests;
  const canSwipe = tier === "elite" || swipesUsed < maxSwipes;
  const canSuperInterest = siUsed < maxSI;

  // Filter out already interacted
  const interactedIds = useMemo(() => new Set([...likedIds, ...skippedIds]), [likedIds, skippedIds]);
  const discoverUsers = useMemo(() => rawDiscover.filter((u) => !interactedIds.has(u.user_id)), [rawDiscover, interactedIds]);
  const topUser = discoverUsers[0];
  const nextUser = discoverUsers[1];

  const cityDisplay = userCity ?? profile?.location ?? "Şehrim";

  const handleLike = async (u: typeof topUser) => {
    if (!u) return;
    if (!canSwipe) {
      toast({ title: "Günlük limit doldu", description: "Tier'ını yükselt!", variant: "destructive" });
      return;
    }
    try {
      setLikedIds((prev) => new Set([...prev, u.user_id]));
      incrementSwipe.mutate();
      await recordLike.mutateAsync({ likedId: u.user_id });
      const result = await likeUser.mutateAsync(u.user_id);
      if (result === "matched") {
        setMatchUser({ display_name: u.display_name, avatar_url: u.avatar_url, user_id: u.user_id });
      }
    } catch {
      toast({ title: "Hata", variant: "destructive" });
    }
  };

  const handlePass = (userId: string) => {
    setSkippedIds((prev) => new Set([...prev, userId]));
    incrementSwipe.mutate();
  };

  const handleSuperInterest = async (u: typeof topUser) => {
    if (!u) return;
    if ((profile as any)?.social_power < 50) {
      setShowSPModal(true);
      return;
    }
    try {
      setLikedIds((prev) => new Set([...prev, u.user_id]));
      const result = await superInterest.mutateAsync(u.user_id);
      if (result === "matched") {
        setMatchUser({ display_name: u.display_name, avatar_url: u.avatar_url, user_id: u.user_id });
      }
    } catch {
      // Error handled in hook
    }
  };

  const TABS: { key: Tab; label: string; count?: number }[] = [
    { key: "discover", label: "🔥 Keşfet" },
    { key: "matches", label: "💞 Eşleşmeler", count: matches.length },
    { key: "likedYou", label: "💜 Beğenenler", count: likedByMe.length },
    { key: "sentLikes", label: "❤️ Gönderdiklerim", count: sentLikes.length },
  ];

  return (
    <div className="min-h-screen bg-background pb-24 relative overflow-x-hidden">
      {/* Match overlay */}
      {matchUser && (
        <MatchOverlay
          them={{ display_name: matchUser.display_name, avatar_url: matchUser.avatar_url }}
          onChat={() => { navigate(`/chat/${matchUser.user_id}`); setMatchUser(null); }}
          onKeep={() => setMatchUser(null)}
        />
      )}

      {showSPModal && <SPModal onClose={() => setShowSPModal(false)} />}

      {/* Header */}
      <header className="sticky top-0 z-40 glass px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="font-display text-xl font-black text-gradient">Keşfet</h1>
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              {hubMode === "night" ? <Moon className="w-3 h-3 text-primary" /> : <Sun className="w-3 h-3 text-amber-500" />}
              {hubMode === "night" ? `🌃 ${cityDisplay} Night Pulse` : `☀️ ${cityDisplay} Day Energy`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            
            {!isPremium && (
              <div className="text-[10px] font-semibold text-muted-foreground glass px-2.5 py-1.5 rounded-full border border-border">
                <span className="text-primary font-bold">{Math.max(0, maxSwipes - swipesUsed)}</span> swipe
              </div>
            )}
          </div>
        </div>



        {/* Tabs */}
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
        <div className="flex gap-1.5">
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
          <button
            onClick={() => setTab("sentLikes")}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              tab === "sentLikes"
                ? "bg-muted text-foreground border border-border"
                : "glass text-muted-foreground hover:text-foreground"
            }`}
          >
            ❤️ Gönderdiklerim
            {sentLikes.length > 0 && <span className="ml-1 text-[9px] text-muted-foreground">({sentLikes.length})</span>}
          </button>
        </div>
      </header>

      <main className="px-4 mt-4">
        {/* ── DISCOVER TAB (Swipe Cards) ── */}
        {tab === "discover" && (
          <div>
            {isLoading ? (
              <div className="glass rounded-3xl flex items-center justify-center animate-pulse" style={{ height: "70vh" }}>
                <span className="text-4xl animate-float">{hubMode === "night" ? "🌙" : "☀️"}</span>
              </div>
            ) : !topUser ? (
              <div className="glass rounded-3xl p-12 text-center" style={{ minHeight: "50vh" }}>
                <span className="text-6xl block mb-4 animate-float">{hubMode === "night" ? "🌙" : "☀️"}</span>
                <p className="font-display text-lg font-black text-foreground mb-1">Herkes keşfedildi!</p>
                <p className="text-sm text-muted-foreground">
                  {hubMode === "night" ? "Daha fazlası için dışarı çık 🕺" : "Gün içinde yeni bağlantılar gelecek ☕"}
                </p>
              </div>
            ) : (
              <div className="relative" style={{ height: "70vh" }}>
                {/* Background card (next) */}
                {nextUser && (
                  <div className="absolute inset-x-4 top-2 bottom-2 rounded-3xl overflow-hidden opacity-40 z-0">
                    {nextUser.avatar_url ? (
                      <img src={nextUser.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/10" />
                    )}
                    <div className="absolute inset-0 bg-black/50" />
                  </div>
                )}

                {/* Active swipe card */}
                <SwipeCard
                  key={topUser.user_id}
                  user={topUser}
                  onLike={() => handleLike(topUser)}
                  onPass={() => handlePass(topUser.user_id)}
                  onSuperInterest={() => handleSuperInterest(topUser)}
                  isActive
                  canSwipe={canSwipe}
                  canSuperInterest={canSuperInterest}
                  mode={hubMode}
                />
              </div>
            )}

            {/* Swipe progress bar */}
            {tier !== "elite" && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-muted-foreground">Günlük swipe</span>
                  <span className="text-xs font-bold text-foreground">{swipesUsed} / {maxSwipes}</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-2">
                  <div className="h-full bg-gradient-neon rounded-full transition-all" style={{ width: `${(swipesUsed / maxSwipes) * 100}%` }} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Star className="w-3 h-3 text-amber-400" /> Süper İlgi: {siUsed}/{maxSI}
                  </span>
                  {!isPremium && swipesUsed > maxSwipes * 0.7 && (
                    <button className="text-[10px] bg-gradient-gold text-night-900 font-black px-3 py-1 rounded-full">
                      <Crown className="w-3 h-3 inline mr-1" /> Yükselt
                    </button>
                  )}
                </div>
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
          </div>
        )}

        {/* ── LIKED YOU TAB ── */}
        {tab === "likedYou" && (
          <div className="space-y-3">
            {!isPremium && likedByMe.length > 0 && (
              <div className="glass rounded-2xl p-4 border border-primary/30 mb-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-secondary/5 pointer-events-none" />
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <Heart className="w-5 h-5 text-primary fill-primary animate-pulse" />
                    <span className="font-display font-bold text-foreground">{likedByMe.length} kişi seni beğendi! 🔥</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">Kimlerin seni beğendiğini görmek için Premium'a geç.</p>
                  <button className="w-full bg-gradient-gold text-night-900 font-black py-2.5 rounded-xl text-sm gold-glow flex items-center justify-center gap-2">
                    <Crown className="w-4 h-4" /> Beğenenleri Gör
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
              likedByMe.map((like) => (
                <LikedYouCard
                  key={like.id}
                  like={like}
                  isPremium={isPremium}
                  onUnlock={() => toast({ title: "👑 Premium Gerekli", description: "Profili görmek için Premium'a geç!" })}
                  onMessage={() => navigate(`/chat/${like.liker_id}`)}
                />
              ))
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
                  <span className="text-xs font-bold text-foreground">{sentLikes.length} beğeni gönderdin</span>
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
