import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import BottomNav from "@/components/BottomNav";
import MessageRequestModal from "@/components/MessageRequestModal";
import PremiumTiersModal from "@/components/PremiumTiersModal";
import { supabase } from "@/integrations/supabase/client";
import { useMessagePermission } from "@/hooks/useMessagePermissions";
import {
  ChevronLeft, ChevronRight, MapPin, MessageSquare, UserPlus, UserCheck, MoreHorizontal,
  Grid3X3, MapPinned, Activity, Award, Heart, Eye, Flame, Crown, Globe,
  TrendingUp, Share2, CheckCircle2, Ban, Instagram, Briefcase, X, Users,
  Calendar, Zap, Star, Send, Clock, Settings, Trash2, Loader2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useFollowCounts, useIsFollowing, useToggleFollow } from "@/hooks/useFollows";
import { useBlockUser } from "@/hooks/useBlockedUsers";
import {
  useUserProfileData, useUserStories, useUserCheckins, useUserBadges,
  useMutualFollows, useMutualVenues, useSPLevels, useTopVenues,
  useEventParticipationCount,
} from "@/hooks/useUserProfile";
import { useProfilePhotos } from "@/hooks/useProfilePhotos";
import { useCities } from "@/hooks/useCities";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";

type TabKey = "posts" | "checkins" | "activity" | "badges";

const BADGE_DEFS = [
  { icon: "🌙", name: "Gece Yenisi", desc: "İlk gece check-in", spReq: 0, checkinReq: 1 },
  { icon: "🎵", name: "Kulüp Kaşifi", desc: "10 gece check-in", checkinReq: 10 },
  { icon: "🦉", name: "Gece Baykuşu", desc: "25 gece check-in", checkinReq: 25 },
  { icon: "⭐", name: "VIP Sosyalite", desc: "100 check-in", checkinReq: 100 },
  { icon: "👑", name: "Gece Efsanesi", desc: "2000 Night SP", spReq: 2000 },
  { icon: "☀️", name: "Gündüz Kaşifi", desc: "İlk gündüz aktivitesi", checkinReq: 1 },
  { icon: "☕", name: "Kafe Gurusu", desc: "10 gündüz check-in", checkinReq: 10 },
  { icon: "🏆", name: "Gündüz Şampiyonu", desc: "2000 Day SP", spReq: 2000 },
  { icon: "👥", name: "Sosyal Kelebek", desc: "10 bağlantı" },
  { icon: "🏙️", name: "Şehir Simgesi", desc: "5000 SP", spReq: 5000 },
  { icon: "🌍", name: "Global Yıldız", desc: "10000 SP", spReq: 10000 },
];

const TIER_CONFIG: Record<string, { label: string; badge: string; color: string }> = {
  free: { label: "Free", badge: "", color: "text-muted-foreground" },
  plus: { label: "Plus", badge: "⚡", color: "text-blue-400" },
  pro: { label: "Pro", badge: "💎", color: "text-purple-400" },
  elite: { label: "Elite", badge: "👑", color: "text-amber-400" },
};

const UserProfilePage = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabKey>("posts");
  const [showMenu, setShowMenu] = useState(false);
  const [avatarLightbox, setAvatarLightbox] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [postLightboxIdx, setPostLightboxIdx] = useState<number | null>(null);
  const [deletingStoryId, setDeletingStoryId] = useState<string | null>(null);
  const { data: messagePermission } = useMessagePermission(userId);

  const isOwnProfile = userId === user?.id;
  const { data: profile, isLoading } = useUserProfileData(userId);
  const { data: followCounts } = useFollowCounts(userId);
  const { data: isFollowing = false } = useIsFollowing(userId);
  const toggleFollow = useToggleFollow();
  const blockUser = useBlockUser();
  const { data: stories = [] } = useUserStories(userId);
  const { data: checkins = [] } = useUserCheckins(userId);
  const { data: badges = [] } = useUserBadges(userId);
  const { data: mutualFollows = [] } = useMutualFollows(userId);
  const { data: mutualVenues = [] } = useMutualVenues(userId);
  const { data: spLevels = [] } = useSPLevels();
  const { data: profilePhotos = [] } = useProfilePhotos(userId);
  const { data: cities = [] } = useCities();
  const { data: topVenues = [] } = useTopVenues(userId);
  const { data: eventsJoined = 0 } = useEventParticipationCount(userId);
  const qc = useQueryClient();
  const deleteStory = useMutation({
    mutationFn: async (storyId: string) => {
      const { error } = await supabase.from("night_stories").delete().eq("id", storyId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["userStories", userId] });
      toast({ title: "Gönderi silindi 🗑️" });
      setPostLightboxIdx(null);
      setDeletingStoryId(null);
    },
    onError: () => {
      toast({ title: "Silinemedi", variant: "destructive" });
      setDeletingStoryId(null);
    },
  });


  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Kullanıcı bulunamadı</p>
        <Button variant="outline" onClick={() => navigate(-1)}>Geri Dön</Button>
      </div>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = profile as any;
  const totalSP = p.social_power ?? 0;
  const spLevel = p.sp_level ?? 1;
  const xp = p.xp ?? 0;
  const level = p.level ?? 1;
  const xpInLevel = xp % 500;
  const xpPct = (xpInLevel / 500) * 100;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentLevel = spLevels.find((l: any) => l.level === spLevel) ?? spLevels[0];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nextLevel = spLevels.find((l: any) => l.level === spLevel + 1);
  const progressPct = currentLevel && nextLevel
    ? Math.min(((totalSP - (currentLevel as any).min_sp) / ((nextLevel as any).min_sp - (currentLevel as any).min_sp)) * 100, 100)
    : 100;
  const streakDays = p.streak_days ?? 0;
  const tier = p.subscription_tier ?? "free";
  const tierInfo = TIER_CONFIG[tier] ?? TIER_CONFIG.free;
  const hasMomentum = p.momentum_badge_until && new Date(p.momentum_badge_until) > new Date();
  const initials = (p.display_name ?? "?").split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);

  const handleFollow = () => {
    if (!userId) return;
    toggleFollow.mutate({ targetUserId: userId, isFollowing });
  };

  const handleBlock = async () => {
    if (!userId) return;
    blockUser.mutate(userId);
    toast({ title: "Kullanıcı engellendi" });
    navigate(-1);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(`${window.location.origin}/user/${userId}`);
    toast({ title: "Profil linki kopyalandı 📋" });
    setShowMenu(false);
  };

  const tabs: { key: TabKey; icon: React.ReactNode; label: string }[] = [
    { key: "posts", icon: <Grid3X3 className="w-5 h-5" />, label: "Gönderiler" },
    { key: "checkins", icon: <MapPinned className="w-5 h-5" />, label: "Check-in" },
    { key: "activity", icon: <Activity className="w-5 h-5" />, label: "Aktivite" },
    { key: "badges", icon: <Award className="w-5 h-5" />, label: "Rozetler" },
  ];

  const userCity = p.city_id ? cities.find((c: any) => c.id === p.city_id)?.name : p.location;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="flex items-center justify-between px-4 h-12">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="font-display text-sm font-bold text-foreground truncate max-w-[200px]">
            {p.username ? `@${p.username}` : p.display_name ?? "Profil"}
          </h1>
          {!isOwnProfile ? (
            <div className="relative">
              <button onClick={() => setShowMenu(!showMenu)} className="p-1.5 rounded-full hover:bg-muted/50 transition-colors">
                <MoreHorizontal className="w-5 h-5 text-foreground" />
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-10 z-50 bg-card rounded-xl border border-border/50 py-1 min-w-[160px] shadow-2xl">
                    <button onClick={handleShare} className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 text-foreground hover:bg-muted/50">
                      <Share2 className="w-4 h-4" /> Paylaş
                    </button>
                    <button onClick={handleBlock} className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 text-destructive hover:bg-muted/50">
                      <Ban className="w-4 h-4" /> Engelle
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button onClick={() => navigate("/settings")} className="p-1.5 rounded-full hover:bg-muted/50 transition-colors">
              <Settings className="w-5 h-5 text-foreground" />
            </button>
          )}
        </div>
      </header>

      <main className="px-4 pt-5 space-y-4">
        {/* ── Profile Header Row ── */}
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <button
            onClick={() => p.avatar_url && setAvatarLightbox(true)}
            className="flex-shrink-0 relative"
          >
            <div className={`w-20 h-20 rounded-full overflow-hidden bg-muted ring-[3px] ring-offset-2 ring-offset-background ${
              tier !== "free" ? "ring-primary/50" : "ring-primary/25"
            }`}>
              {p.avatar_url ? (
                <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xl font-bold text-muted-foreground">{initials}</div>
              )}
            </div>
            {tier !== "free" && tierInfo.badge && (
              <span className="absolute -bottom-0.5 -right-0.5 text-sm bg-background rounded-full px-0.5">{tierInfo.badge}</span>
            )}
          </button>

          {/* Stats Grid */}
          <div className="flex-1 grid grid-cols-4 text-center">
            {[
              { val: stories.length, label: "Gönderi" },
              { val: followCounts?.followers ?? 0, label: "Takipçi" },
              { val: followCounts?.following ?? 0, label: "Takip" },
              { val: p.total_checkins ?? 0, label: "Check-in" },
            ].map((s) => (
              <div key={s.label}>
                <p className="font-display text-base font-bold text-foreground">{s.val}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Name, Level & Info ── */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-base font-bold text-foreground">{p.display_name}</h2>
            {p.selected_badge && <span className="text-base">{p.selected_badge}</span>}
            {hasMomentum && <Flame className="w-3.5 h-3.5 text-primary animate-pulse" />}
            {tier !== "free" && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/15 ${tierInfo.color}`}>
                {tierInfo.badge} {tierInfo.label}
              </span>
            )}
          </div>

          {/* SP Level badge */}
          {currentLevel && (
            <div className="flex items-center gap-1.5">
              <span className="text-sm">{(currentLevel as any).badge_icon}</span>
              <span className="text-xs font-semibold text-foreground">{(currentLevel as any).name}</span>
              <span className="text-[10px] text-muted-foreground">·</span>
              <span className="text-xs text-primary font-bold">{totalSP.toLocaleString()} SP</span>
              <span className="text-[10px] text-muted-foreground">·</span>
              <span className="text-[10px] text-muted-foreground">Lv.{level}</span>
              {streakDays > 0 && (
                <>
                  <span className="text-[10px] text-muted-foreground">·</span>
                  <Flame className="w-3 h-3 text-primary" />
                  <span className="text-xs font-semibold text-foreground">{streakDays}</span>
                </>
              )}
            </div>
          )}

          {/* Location, occupation, instagram */}
          <div className="flex items-center gap-3 flex-wrap">
            {userCity && (
              <div className="flex items-center gap-1 text-muted-foreground text-xs">
                <MapPin className="w-3 h-3" /> {userCity}
              </div>
            )}
            {p.occupation && (
              <div className="flex items-center gap-1 text-muted-foreground text-xs">
                <Briefcase className="w-3 h-3" /> {p.occupation}
              </div>
            )}
            {p.instagram_url && (
              <div className="flex items-center gap-1 text-muted-foreground text-xs">
                <Instagram className="w-3 h-3" /> {p.instagram_url}
              </div>
            )}
          </div>
        </div>

        {/* Bio */}
        {p.bio && (
          <p className="text-sm text-foreground/90 leading-relaxed">{p.bio}</p>
        )}

        {/* Interest tags */}
        {p.interests && p.interests.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {p.interests.map((tag: string) => (
              <span key={tag} className="px-2.5 py-1 rounded-full bg-muted/50 text-[10px] font-semibold text-muted-foreground">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Tonight vibe */}
        {p.tonight_vibe && (
          <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-xl px-3 py-2">
            <span className="text-sm">
              {p.tonight_vibe === "going_out" ? "🎉" : p.tonight_vibe === "chill" ? "☕" : "🧭"}
            </span>
            <span className="text-xs font-semibold text-foreground">
              {p.tonight_vibe === "going_out" ? "Dışarı Çıkıyor" : p.tonight_vibe === "chill" ? "Sakin Akşam" : "Keşfediyor"}
            </span>
          </div>
        )}

        {/* ── Action Buttons ── */}
        {!isOwnProfile && (
          <div className="flex gap-2">
            <Button
              onClick={handleFollow}
              disabled={toggleFollow.isPending}
              className={`flex-1 h-9 rounded-xl text-xs font-bold ${
                isFollowing
                  ? "bg-muted/50 text-foreground border border-border/50 hover:bg-muted"
                  : "bg-primary text-primary-foreground"
              }`}
              variant={isFollowing ? "outline" : "default"}
            >
              {isFollowing ? (
                <><UserCheck className="w-3.5 h-3.5 mr-1" /> Takip Ediliyor</>
              ) : (
                <><UserPlus className="w-3.5 h-3.5 mr-1" /> Takip Et</>
              )}
            </Button>

            {/* Smart Message Button */}
            {messagePermission?.allowed ? (
              <Button
                onClick={() => navigate(`/chat/${userId}`)}
                variant="outline"
                className="h-9 rounded-xl border-border/50 px-4"
              >
                <MessageSquare className="w-3.5 h-3.5" />
              </Button>
            ) : messagePermission && !messagePermission.allowed && 'reason' in messagePermission && messagePermission.reason === "request_pending" ? (
              <Button
                variant="outline"
                disabled
                className="h-9 rounded-xl border-border/50 px-4 text-xs"
              >
                <Clock className="w-3.5 h-3.5 mr-1" /> Bekliyor
              </Button>
            ) : messagePermission && !messagePermission.allowed && 'reason' in messagePermission && messagePermission.reason === "blocked" ? null : (
              <Button
                onClick={() => setShowRequestModal(true)}
                variant="outline"
                className="h-9 rounded-xl border-primary/30 px-4 text-xs"
              >
                <Send className="w-3.5 h-3.5 mr-1" /> İstek
              </Button>
            )}
          </div>
        )}

        {/* Message Request Modal */}
        {showRequestModal && userId && (
          <MessageRequestModal
            receiverId={userId}
            receiverName={p.display_name ?? "Kullanıcı"}
            onClose={() => setShowRequestModal(false)}
          />
        )}

        {isOwnProfile && (
          <div className="space-y-2">
            <Button
              onClick={() => navigate("/edit-profile")}
              variant="outline"
              className="w-full h-9 rounded-xl border-border/50 text-xs font-bold"
            >
              Profili Düzenle
            </Button>

            {/* Premium Upgrade Card */}
            <button
              onClick={() => setShowPremiumModal(true)}
              className={`w-full rounded-xl p-3 flex items-center gap-3 border transition-all ${
                tier !== "free"
                  ? "bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/30"
                  : "bg-card/60 border-border/30 hover:border-primary/30"
              }`}
            >
              <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                tier === "elite" ? "bg-gradient-to-r from-yellow-400 to-orange-500"
                : tier === "pro" ? "bg-gradient-to-r from-purple-500 to-pink-500"
                : tier === "plus" ? "bg-gradient-to-r from-blue-500 to-cyan-400"
                : "bg-muted"
              }`}>
                <Crown className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-xs font-bold text-foreground">
                  {tier !== "free" ? `${tierInfo.badge} ${tierInfo.label} Aktif` : "LYNE Premium"}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {tier !== "free" ? "Planını yönet veya yükselt" : "Şehrinde yüksel, statünü göster"}
                </p>
              </div>
              <ChevronLeft className="w-4 h-4 text-muted-foreground rotate-180" />
            </button>
          </div>
        )}

        {/* Mutual follows */}
        {mutualFollows.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex -space-x-1.5">
              {mutualFollows.slice(0, 3).map((mf: any) => (
                <div key={mf.user_id} className="w-5 h-5 rounded-full bg-muted border-2 border-background overflow-hidden">
                  {mf.avatar_url && <img src={mf.avatar_url} alt="" className="w-full h-full object-cover" />}
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              <span className="font-semibold text-foreground">{mutualFollows[0]?.display_name}</span>
              {mutualFollows.length > 1 && ` ve ${mutualFollows.length - 1} kişi`} takip ediyor
            </p>
          </div>
        )}

        {/* ── Social Stats Bar ── */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { icon: <Zap className="w-4 h-4 text-primary" />, val: totalSP.toLocaleString(), label: "SP" },
            { icon: <Star className="w-4 h-4 text-amber-400" />, val: `Lv.${level}`, label: "Seviye" },
            { icon: <MapPinned className="w-4 h-4 text-secondary" />, val: String(p.total_checkins ?? 0), label: "Check-in" },
            { icon: <Calendar className="w-4 h-4 text-primary" />, val: String(eventsJoined), label: "Etkinlik" },
          ].map((stat) => (
            <div key={stat.label} className="bg-card/60 backdrop-blur-sm rounded-xl border border-border/30 p-2.5 text-center">
              <div className="flex justify-center mb-1">{stat.icon}</div>
              <p className="font-display text-sm font-bold text-foreground">{stat.val}</p>
              <p className="text-[9px] text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* ── SP Progress ── */}
        <div className="bg-card/60 backdrop-blur-sm rounded-2xl border border-border/30 p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {currentLevel && <span className="text-xl">{(currentLevel as any).badge_icon}</span>}
              <div>
                <p className="text-xs font-bold text-foreground">{currentLevel ? (currentLevel as any).name : "—"}</p>
                <p className="text-[9px] text-muted-foreground">Lv.{spLevel}</p>
              </div>
            </div>
            <p className="font-display text-base font-bold text-primary">{totalSP.toLocaleString()} <span className="text-[10px] text-muted-foreground font-normal">SP</span></p>
          </div>
          {/* SP bar */}
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{ width: `${progressPct}%`, background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--secondary)))" }}
            />
          </div>
          {/* XP bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>XP: {xp.toLocaleString()}</span>
              <span>{xpInLevel}/500 → Lv.{level + 1}</span>
            </div>
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-amber-400/70 transition-all duration-1000"
                style={{ width: `${xpPct}%` }}
              />
            </div>
          </div>
          {/* Rankings */}
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <div className="flex items-center gap-3">
              {p.city_rank && (
                <span className="flex items-center gap-1"><MapPin className="w-2.5 h-2.5 text-primary" /><b className="text-foreground">#{p.city_rank}</b> Şehir</span>
              )}
              {p.weekly_rank && (
                <span className="flex items-center gap-1"><TrendingUp className="w-2.5 h-2.5 text-secondary" /><b className="text-foreground">#{p.weekly_rank}</b> Haftalık</span>
              )}
              {p.global_rank && (
                <span className="flex items-center gap-1"><Globe className="w-2.5 h-2.5 text-muted-foreground" /><b className="text-foreground">#{p.global_rank}</b> Global</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span>🌙 {(p.night_sp ?? 0).toLocaleString()}</span>
              <span>☀️ {(p.day_score ?? 0).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* ── Top Venues ── */}
        {topVenues.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest px-1">En Çok Gidilen Mekanlar</h3>
            <div className="space-y-1.5">
              {topVenues.map((tv: any, i: number) => (
                <button
                  key={tv.venue.id}
                  onClick={() => navigate(`/venue/${tv.venue.id}`)}
                  className="w-full bg-card/60 rounded-xl p-2.5 flex items-center gap-3 text-left border border-border/20 hover:border-border/40 transition-colors"
                >
                  <span className={`text-sm font-bold w-5 text-center ${
                    i === 0 ? "text-amber-400" : i === 1 ? "text-muted-foreground" : "text-muted-foreground/60"
                  }`}>
                    {i + 1}
                  </span>
                  <div className="w-9 h-9 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                    {tv.venue.image_url && <img src={tv.venue.image_url} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{tv.venue.name}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">{tv.venue.type}</p>
                  </div>
                  <span className="text-xs font-bold text-primary">{tv.count}×</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Mutual venues */}
        {mutualVenues.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest px-1">Ortak Mekanlar</h3>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {mutualVenues.map((v: any) => (
                <button
                  key={v.id}
                  onClick={() => navigate(`/venue/${v.id}`)}
                  className="flex-shrink-0 bg-card/60 rounded-xl p-2 flex items-center gap-2 border border-border/30"
                >
                  <div className="w-7 h-7 rounded-lg bg-muted overflow-hidden">
                    {v.image_url && <img src={v.image_url} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <span className="text-[11px] font-semibold text-foreground whitespace-nowrap">{v.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Tabs ── */}
        <div className="flex border-b border-border/30 -mx-4 px-4">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-all relative ${
                activeTab === tab.key ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {tab.icon}
              <span className="text-[9px] font-semibold">{tab.label}</span>
              {activeTab === tab.key && (
                <div className="absolute bottom-0 left-1/4 right-1/4 h-[2px] bg-primary rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* ── Tab Content ── */}

        {/* Posts Grid */}
        {activeTab === "posts" && (
          stories.length === 0 ? (
            <div className="py-16 text-center">
              <Grid3X3 className="w-10 h-10 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Henüz gönderi yok</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-[2px] -mx-4">
              {stories.map((story: any, idx: number) => (
                <div
                  key={story.id}
                  className="aspect-square relative overflow-hidden bg-muted group cursor-pointer"
                  onClick={() => setPostLightboxIdx(idx)}
                >
                  {story.image_url ? (
                    <img src={story.image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20 p-2">
                      <p className="text-[10px] text-foreground text-center line-clamp-3">{story.text_overlay || story.content}</p>
                    </div>
                  )}
                  {/* Hover overlay with stats */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <span className="flex items-center gap-1 text-primary-foreground text-xs font-bold">
                      <Heart className="w-3.5 h-3.5 fill-primary-foreground" /> {story.likes_count ?? 0}
                    </span>
                    <span className="flex items-center gap-1 text-primary-foreground text-xs font-bold">
                      <Eye className="w-3.5 h-3.5" /> {story.views_count ?? 0}
                    </span>
                  </div>
                  {/* Venue tag */}
                  {story.venues?.name && (
                    <div className="absolute bottom-1 left-1 right-1">
                      <span className="text-[8px] text-primary-foreground/80 bg-black/40 rounded px-1 py-0.5 truncate block">
                        📍 {story.venues.name}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        )}

        {/* Check-ins */}
        {activeTab === "checkins" && (
          checkins.length === 0 ? (
            <div className="py-16 text-center">
              <MapPinned className="w-10 h-10 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Henüz check-in yok</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {checkins.map((ci: any) => (
                <button
                  key={ci.id}
                  onClick={() => ci.venues?.id && navigate(`/venue/${ci.venues.id}`)}
                  className="w-full bg-card/40 rounded-xl p-3 flex items-center gap-3 text-left hover:bg-card/60 transition-colors"
                >
                  <div className="w-11 h-11 rounded-xl bg-muted overflow-hidden flex-shrink-0">
                    {ci.venues?.image_url && <img src={ci.venues.image_url} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{ci.venues?.name ?? "Mekan"}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-muted-foreground capitalize">{ci.venues?.type}</span>
                      <span className="text-[10px] text-muted-foreground">·</span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(ci.checked_in_at), { addSuffix: true, locale: tr })}
                      </span>
                    </div>
                  </div>
                  {ci.is_verified && <CheckCircle2 className="w-4 h-4 text-secondary flex-shrink-0" />}
                </button>
              ))}
            </div>
          )
        )}

        {/* Activity Timeline */}
        {activeTab === "activity" && (
          checkins.length === 0 && stories.length === 0 ? (
            <div className="py-16 text-center">
              <Activity className="w-10 h-10 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Henüz aktivite yok</p>
            </div>
          ) : (
            <div className="space-y-0">
              {[
                ...stories.slice(0, 10).map((s: any) => ({ type: "story" as const, date: s.created_at, data: s })),
                ...checkins.slice(0, 10).map((c: any) => ({ type: "checkin" as const, date: c.checked_in_at, data: c })),
              ]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 20)
                .map((item, i, arr) => (
                  <div key={i} className="flex gap-3">
                    {/* Timeline line */}
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        item.type === "story" ? "bg-primary/15" : "bg-secondary/15"
                      }`}>
                        {item.type === "story" ? (
                          <Grid3X3 className="w-3.5 h-3.5 text-primary" />
                        ) : (
                          <MapPinned className="w-3.5 h-3.5 text-secondary" />
                        )}
                      </div>
                      {i < arr.length - 1 && (
                        <div className="w-[1px] flex-1 min-h-[12px] bg-border/40" />
                      )}
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0 pb-3">
                      <p className="text-xs font-semibold text-foreground">
                        {item.type === "story"
                          ? `Hikaye paylaştı${item.data.venues?.name ? ` · ${item.data.venues.name}` : ""}`
                          : `${item.data.venues?.name ?? "Mekan"}'a check-in yaptı`}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {formatDistanceToNow(new Date(item.date), { addSuffix: true, locale: tr })}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          )
        )}

        {/* Badges */}
        {activeTab === "badges" && (
          <div className="space-y-4">
            {/* Rank cards */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: <MapPin className="w-3.5 h-3.5 text-primary" />, val: p.city_rank ? `#${p.city_rank}` : "—", label: "Şehir Sırası" },
                { icon: <Globe className="w-3.5 h-3.5 text-secondary" />, val: p.global_rank ? `#${p.global_rank}` : "—", label: "Global Sıra" },
                { icon: <TrendingUp className="w-3.5 h-3.5 text-primary" />, val: p.weekly_rank ? `#${p.weekly_rank}` : "—", label: "Haftalık" },
              ].map((r) => (
                <div key={r.label} className="bg-card/60 rounded-xl border border-border/30 p-3 text-center">
                  <div className="flex justify-center mb-1">{r.icon}</div>
                  <p className="font-display text-lg font-bold text-foreground">{r.val}</p>
                  <p className="text-[9px] text-muted-foreground">{r.label}</p>
                </div>
              ))}
            </div>

            {/* Earned badges */}
            {badges.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest px-1">Kazanılan</h3>
                <div className="grid grid-cols-4 gap-2">
                  {badges.map((b: any) => (
                    <div key={b.id} className="bg-card/60 rounded-xl p-2.5 text-center border border-primary/20">
                      <span className="text-xl">{b.badges?.icon ?? "🏅"}</span>
                      <p className="text-[9px] font-semibold text-foreground mt-1 leading-tight">{b.badges?.name ?? "Rozet"}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All badges */}
            <div className="space-y-2">
              <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest px-1">Tüm Rozetler</h3>
              <div className="grid grid-cols-4 gap-2">
                {BADGE_DEFS.map((badge, i) => {
                  const earned =
                    (badge.spReq !== undefined && totalSP >= badge.spReq) ||
                    (badge.checkinReq !== undefined && (p.total_checkins ?? 0) >= badge.checkinReq);
                  return (
                    <div key={i} className={`bg-card/60 rounded-xl p-2.5 text-center border transition-all ${
                      earned ? "border-primary/20" : "border-border/20 opacity-30 grayscale"
                    }`}>
                      <span className="text-xl">{badge.icon}</span>
                      <p className="text-[9px] font-semibold text-foreground mt-1 leading-tight">{badge.name}</p>
                      <p className="text-[7px] text-muted-foreground mt-0.5">{badge.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Avatar lightbox */}
      {avatarLightbox && p.avatar_url && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center" onClick={() => setAvatarLightbox(false)}>
          <button className="absolute top-4 right-4 w-9 h-9 rounded-full bg-muted/20 flex items-center justify-center text-primary-foreground" onClick={() => setAvatarLightbox(false)}>
            <X className="w-4 h-4" />
          </button>
          <img src={p.avatar_url} alt="" className="max-w-[90%] max-h-[80vh] rounded-2xl object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {showPremiumModal && <PremiumTiersModal onClose={() => setShowPremiumModal(false)} />}
      <BottomNav />
    </div>
  );
};

export default UserProfilePage;
