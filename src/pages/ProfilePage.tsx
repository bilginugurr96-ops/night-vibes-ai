import { useState, useRef } from "react";
import {
  Settings, ChevronRight, Award, MapPin, Star, Flame, LogOut, Edit2, Check, X,
  Users, UserCheck, Crown, Shield, Zap, Camera, Eye, Lock, Globe, Instagram,
  Bell, MessageSquare, Heart, ChevronLeft, CheckCircle2, TrendingUp,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import NotificationBell from "@/components/NotificationBell";
import SPProgressBar from "@/components/SPProgressBar";
import RankCard from "@/components/RankCard";
import PremiumTiersModal from "@/components/PremiumTiersModal";
import { useAuth } from "@/contexts/AuthContext";
import { useFollowCounts, useFollowing, useToggleFollow } from "@/hooks/useFollows";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useMyCheckins } from "@/hooks/useCheckins";
import { useQuery } from "@tanstack/react-query";
import { useMyConnections, useUnfollow } from "@/hooks/useConnections";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const LEVEL_NAMES = ["", "🌙 Gece Yenisi", "🎵 Kulüp Kaşifi", "⭐ VIP Sosyalite", "🏙️ Şehir Simgesi", "🌟 Global Yıldız"];
const getLevelName = (l: number) => LEVEL_NAMES[Math.min(l, LEVEL_NAMES.length - 1)] ?? "🌟 Global Yıldız";

const INTERESTS = ["Club", "Rooftop", "Techno", "Hip-Hop", "Cocktails", "Festival", "Jazz", "House", "R&B", "Karaoke", "Lounge", "EDM", "Latin", "Live Music"];

const BADGES = [
  { icon: "🌙", name: "Gece Yenisi", desc: "İlk check-in", xp: 0, req: 0 },
  { icon: "🎵", name: "Kulüp Kaşifi", desc: "500 XP kazan", xp: 500, req: 500 },
  { icon: "⭐", name: "VIP Sosyalite", desc: "1000 XP kazan", xp: 1000, req: 1000 },
  { icon: "🏙️", name: "Şehir Simgesi", desc: "5000 XP kazan", xp: 5000, req: 5000 },
  { icon: "🌟", name: "Global Yıldız", desc: "10000 XP kazan", xp: 10000, req: 10000 },
  { icon: "👑", name: "Efsane", desc: "50000 XP kazan", xp: 50000, req: 50000 },
  { icon: "🔥", name: "Gece Ateşi", desc: "3 gün streak", xp: 0, req: 0, streakReq: 3 },
  { icon: "⚔️", name: "Hafta Sonu Savaşçısı", desc: "28 gün streak", xp: 0, req: 0, streakReq: 28 },
  { icon: "📸", name: "Hikaye Ustası", desc: "5 hikaye paylaş", xp: 0, req: 0 },
  { icon: "🎬", name: "İlk Hikaye", desc: "İlk hikayeni paylaş", xp: 0, req: 0 },
  { icon: "📷", name: "Fotoğrafçı", desc: "25 hikaye paylaş", xp: 0, req: 0 },
  { icon: "👥", name: "Sosyal Kelebek", desc: "10 bağlantı kur", xp: 0, req: 0 },
  { icon: "🤩", name: "Popüler Yüz", desc: "50 takipçiye ulaş", xp: 0, req: 0 },
  { icon: "💫", name: "Influencer", desc: "Hikayelerin 100 beğeni alsın", xp: 0, req: 0 },
  { icon: "🎉", name: "Parti Hayvanı", desc: "20 check-in yap", xp: 0, req: 0 },
  { icon: "🦅", name: "Gece Kartalı", desc: "100 check-in yap", xp: 0, req: 0 },
  { icon: "🏆", name: "Sadık Müdavim", desc: "Aynı mekana 10 kez git", xp: 0, req: 0 },
  { icon: "🗺️", name: "Keşifçi", desc: "10 farklı mekana git", xp: 0, req: 0 },
  { icon: "🎧", name: "DJ Ruhu", desc: "Techno/EDM mekanlarına 10 check-in", xp: 0, req: 0 },
  { icon: "🍸", name: "Kokteyl Uzmanı", desc: "Bar mekanlarına 10 check-in", xp: 0, req: 0 },
  { icon: "🍽️", name: "Mekan Gurmesi", desc: "Lounge mekanlarına 5 check-in", xp: 0, req: 0 },
  { icon: "🎪", name: "Festivaller Kralı", desc: "Konser etkinliklerine 5 katıl", xp: 0, req: 0 },
  { icon: "🎩", name: "Gece Beyefendisi", desc: "VIP rezervasyon yap", xp: 0, req: 0 },
  { icon: "🦉", name: "Gece Baykuşu", desc: "Gece 2'den sonra check-in", xp: 0, req: 0 },
];

type EditSection = null | "name" | "bio" | "interests" | "privacy";
type ActiveModal = null | "premium";

// ── SP & Rank cards for other users ──────────────────────────────────────────
const OtherUserSPCard = ({ profile: op }: { profile: any }) => {
  const { data: levels = [] } = useQuery({
    queryKey: ["sp-levels"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sp_levels").select("*").order("level", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 1000 * 60 * 60,
  });

  const totalSP = op.social_power ?? 0;
  const nightSP = op.night_sp ?? 0;
  const daySP = op.day_score ?? 0;
  const spLevel = op.sp_level ?? 1;
  const percentile = op.city_percentile ?? null;
  const streakDays = op.streak_days ?? 0;

  const currentLevel = levels.find((l: any) => l.level === spLevel) ?? levels[0];
  const nextLevel = levels.find((l: any) => l.level === spLevel + 1) ?? null;

  if (!currentLevel) return null;

  const spInLevel = totalSP - (currentLevel?.min_sp ?? 0);
  const spRange = nextLevel ? nextLevel.min_sp - (currentLevel?.min_sp ?? 0) : 1;
  const progressPct = nextLevel ? Math.min((spInLevel / spRange) * 100, 100) : 100;
  const spToNext = nextLevel ? nextLevel.min_sp - totalSP : 0;

  return (
    <div className="glass rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{currentLevel.badge_icon}</span>
          <div>
            <p className="text-sm font-bold text-foreground">{currentLevel.name}</p>
            <p className="text-[10px] text-muted-foreground">Social Power Lv.{currentLevel.level}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-display text-lg font-bold text-primary">{totalSP.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground">SP</p>
        </div>
      </div>
      <div>
        <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
          <span>{currentLevel.name}</span>
          {nextLevel && <span>{spToNext.toLocaleString()} SP kaldı</span>}
          <span>{nextLevel?.name ?? "MAX"}</span>
        </div>
        <div className="h-2.5 bg-muted rounded-full overflow-hidden relative">
          <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${progressPct}%`, background: "linear-gradient(90deg, hsl(271 100% 59%), hsl(191 100% 50%))" }} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="glass rounded-xl p-2.5 flex items-center gap-2">
          <span className="text-sm">🌙</span>
          <div><p className="text-xs font-bold text-foreground">{nightSP.toLocaleString()}</p><p className="text-[9px] text-muted-foreground">Night SP</p></div>
        </div>
        <div className="glass rounded-xl p-2.5 flex items-center gap-2">
          <span className="text-sm">☀️</span>
          <div><p className="text-xs font-bold text-foreground">{daySP.toLocaleString()}</p><p className="text-[9px] text-muted-foreground">Day SP</p></div>
        </div>
      </div>
      <div className="flex items-center justify-between">
        {percentile !== null && percentile !== undefined && (
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-secondary" />
            <span className="text-xs text-foreground font-medium">Top %{Math.max(1, Math.round(100 - percentile))}</span>
            <span className="text-[10px] text-muted-foreground">şehrinde</span>
          </div>
        )}
        {streakDays > 0 && (
          <div className="flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-bold text-foreground">{streakDays} gün</span>
            <span className="text-[10px] text-muted-foreground">streak</span>
          </div>
        )}
      </div>
    </div>
  );
};

const OtherUserRankCard = ({ profile: op }: { profile: any }) => {
  const tier = op.subscription_tier ?? "free";
  const TIER_LABELS: Record<string, { label: string; badge: string; color: string }> = {
    free: { label: "Free", badge: "", color: "text-muted-foreground" },
    plus: { label: "Plus", badge: "⚡", color: "text-blue-400" },
    pro: { label: "Pro", badge: "💎", color: "text-purple-400" },
    elite: { label: "Elite", badge: "👑", color: "text-yellow-400" },
  };
  const tierInfo = TIER_LABELS[tier] ?? TIER_LABELS.free;
  const cityRank = op.city_rank;
  const globalRank = op.global_rank;
  const weeklyRank = op.weekly_rank;
  const hasMomentum = op.momentum_badge_until && new Date(op.momentum_badge_until) > new Date();

  return (
    <div className="glass rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Crown className={`w-4 h-4 ${tierInfo.color}`} />
          <span className={`text-sm font-bold ${tierInfo.color}`}>{tierInfo.badge} {tierInfo.label}</span>
        </div>
        {hasMomentum && (
          <div className="flex items-center gap-1 bg-primary/20 px-2 py-0.5 rounded-full animate-pulse-neon">
            <Flame className="w-3 h-3 text-primary" />
            <span className="text-[10px] text-primary font-bold">Rising 🔥</span>
          </div>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="glass rounded-xl p-3 text-center">
          <MapPin className="w-3.5 h-3.5 text-primary mx-auto mb-1" />
          <p className="font-display text-lg font-bold text-foreground">{cityRank ? `#${cityRank}` : "—"}</p>
          <p className="text-[9px] text-muted-foreground">Şehir Sırası</p>
        </div>
        <div className="glass rounded-xl p-3 text-center">
          <Globe className="w-3.5 h-3.5 text-secondary mx-auto mb-1" />
          <p className="font-display text-lg font-bold text-foreground">{globalRank ? `#${globalRank}` : "—"}</p>
          <p className="text-[9px] text-muted-foreground">Global Sıra</p>
        </div>
        <div className="glass rounded-xl p-3 text-center">
          <TrendingUp className="w-3.5 h-3.5 text-primary mx-auto mb-1" />
          <p className="font-display text-lg font-bold text-foreground">{weeklyRank ? `#${weeklyRank}` : "—"}</p>
          <p className="text-[9px] text-muted-foreground">Haftalık</p>
        </div>
      </div>
    </div>
  );
};
type ActivePanel = null | "checkins" | "favorites" | "followers" | "following" | "badges";

// Favori mekanları venue detaylarıyla getiren hook
const useFavoriteVenues = (userId?: string) => {
  return useQuery({
    queryKey: ["favoriteVenues", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("favorites")
        .select("venue_id, venues(id, name, type, image_url, address, crowd_level, is_open)")
        .eq("user_id", userId!);
      if (error) throw error;
      return data ?? [];
    },
  });
};

const ProfilePage = () => {
  const { profile, user, signOut, refreshProfile } = useAuth();
  const [searchParams] = useSearchParams();
  const viewingUid = searchParams.get("uid");
  const isOwnProfile = !viewingUid || viewingUid === user?.id;

  // Fetch other user's profile when viewing someone else
  const { data: otherProfile } = useQuery({
    queryKey: ["otherProfile", viewingUid],
    enabled: !!viewingUid && !isOwnProfile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", viewingUid!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: followCounts } = useFollowCounts(isOwnProfile ? user?.id : viewingUid ?? undefined);
  const { data: checkins = [] } = useMyCheckins();
  const { data: favoriteVenues = [] } = useFavoriteVenues(isOwnProfile ? user?.id : viewingUid ?? undefined);
  const { data: connections = [] } = useMyConnections();
  const unfollowMutation = useUnfollow();
  const { data: followingList = [] } = useFollowing();
  const toggleFollow = useToggleFollow();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [editSection, setEditSection] = useState<EditSection>(null);
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [instagram, setInstagram] = useState(profile?.instagram_url ?? "");
  const [selectedInterests, setSelectedInterests] = useState<string[]>(profile?.interests ?? []);
  const [privacyOnline, setPrivacyOnline] = useState(profile?.privacy_online_visible ?? true);
  const [privacyReadReceipts, setPrivacyReadReceipts] = useState(profile?.privacy_read_receipts ?? true);
  const [privacyWhoMsg, setPrivacyWhoMsg] = useState(profile?.privacy_who_can_message ?? "matches");
  const [privacyHideCheckins, setPrivacyHideCheckins] = useState(profile?.privacy_hide_checkins ?? false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);

  const initials = (profile?.display_name ?? user?.email ?? "?")
    .split(" ").map((w) => w[0]).join("").toUpperCase().substring(0, 2);

  const xp = profile?.xp ?? 0;
  const level = profile?.level ?? 1;
  const xpInLevel = xp % 500;
  const xpPct = (xpInLevel / 500) * 100;

  const handleSave = async (updates: Record<string, unknown>) => {
    if (!user) return;
    setSaving(true);
    const { error } = await db.from("profiles").update(updates).eq("user_id", user.id);
    if (error) {
      toast({ title: "Hata", description: "Profil güncellenemedi", variant: "destructive" });
    } else {
      await refreshProfile();
      toast({ title: "Profil güncellendi ✅" });
      setEditSection(null);
    }
    setSaving(false);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingPhoto(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      await db.from("profiles").update({ avatar_url: urlData.publicUrl }).eq("user_id", user.id);
      await refreshProfile();
      toast({ title: "Profil fotoğrafı güncellendi 📸" });
    } catch {
      toast({ title: "Fotoğraf yüklenemedi", variant: "destructive" });
    }
    setUploadingPhoto(false);
  };

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  };

  const toggleGhostMode = async () => {
    const newVal = !profile?.is_ghost_mode;
    await db.from("profiles").update({ is_ghost_mode: newVal }).eq("user_id", user!.id);
    await refreshProfile();
    toast({ title: newVal ? "👻 Ghost Mode Açık" : "Ghost Mode Kapalı", description: newVal ? "Profilin artık gizli" : "Profilin herkese görünür" });
  };

  const stats = [
    { label: "Check-in", value: String(profile?.total_checkins ?? 0), icon: "📍", panel: "checkins" as ActivePanel },
    { label: "Favori", value: String(favoriteVenues.length), icon: "❤️", panel: "favorites" as ActivePanel },
    { label: "Takipçi", value: String(followCounts?.followers ?? 0), icon: "👥", panel: "followers" as ActivePanel },
    { label: "Takip", value: String(followCounts?.following ?? 0), icon: "➡️", panel: "following" as ActivePanel },
  ];

  const profileInterests = profile?.interests ?? [];

  // ── OTHER USER PROFILE (read-only) ─────────────────────────────────────────
  if (!isOwnProfile) {
    const op = otherProfile;
    if (!op) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }
    const opInitials = (op.display_name ?? "?").split(" ").map((w: string) => w[0]).join("").toUpperCase().substring(0, 2);
    const opLevel = op.level ?? 1;
    const opXp = op.xp ?? 0;
    const opXpInLevel = opXp % 500;
    const opXpPct = (opXpInLevel / 500) * 100;
    const opInterests = op.interests ?? [];

    return (
      <div className="min-h-screen bg-background pb-24">
        {/* Cover */}
        <div className="relative h-36 bg-gradient-neon overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/80" />
          <button onClick={() => navigate(-1)} className="absolute top-3 left-3 p-2 rounded-xl glass text-foreground">
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        <main className="px-4 space-y-4 -mt-14">
          {/* Avatar & Name */}
          <div className="glass rounded-2xl p-5 text-center animate-slide-up">
            <div className="relative inline-block mb-3">
              <div className={`w-24 h-24 mx-auto rounded-full bg-gradient-neon flex items-center justify-center text-primary-foreground text-2xl font-bold ${op.is_premium ? "neon-glow" : ""} overflow-hidden`}>
                {op.avatar_url ? (
                  <img src={op.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : opInitials}
              </div>
              {op.is_premium && <span className="absolute -top-1 -right-1 text-xl">✨</span>}
            </div>

            <h2 className="font-display text-xl font-bold text-foreground mb-1">
              {op.display_name ?? "Kullanıcı"}
            </h2>
            <p className="text-sm text-muted-foreground">@{op.username ?? "kullanici"} • {op.location ?? "—"}</p>

            {op.bio && <p className="text-sm text-muted-foreground italic mt-2">"{op.bio}"</p>}
            {op.instagram_url && (
              <div className="flex items-center justify-center gap-1 mt-1">
                <Instagram className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{op.instagram_url}</span>
              </div>
            )}

            {/* Level Badge */}
            <div className="flex items-center justify-center gap-2 mt-3">
              <span className="text-sm font-bold bg-primary/20 text-primary px-3 py-1 rounded-full">
                {getLevelName(opLevel)}
              </span>
            </div>

            {/* Follow/Unfollow Button */}
            {viewingUid && viewingUid !== user?.id && (() => {
              const isFollowingUser = followingList.includes(viewingUid);
              return (
                <button
                  onClick={() => toggleFollow.mutate({ targetUserId: viewingUid, isFollowing: isFollowingUser })}
                  disabled={toggleFollow.isPending}
                  className={`mt-3 px-6 py-2 rounded-xl text-sm font-bold transition-all active:scale-[0.97] ${
                    isFollowingUser
                      ? "glass text-muted-foreground border border-border"
                      : "bg-primary text-primary-foreground neon-glow"
                  }`}
                >
                  {toggleFollow.isPending ? "..." : isFollowingUser ? "Takipten Çık" : "Takip Et"}
                </button>
              );
            })()}
            <div className="mt-3 px-2">
              <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                <span>Seviye {opLevel}</span>
                <span>{opXpInLevel} / 500 XP</span>
                <span>Seviye {opLevel + 1}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-gradient-neon rounded-full transition-all duration-700" style={{ width: `${opXpPct}%` }} />
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Check-in", value: String(op.total_checkins ?? 0), icon: "📍" },
              { label: "Favori", value: String(favoriteVenues.length), icon: "❤️" },
              { label: "Takipçi", value: String(followCounts?.followers ?? 0), icon: "👥" },
              { label: "Takip", value: String(followCounts?.following ?? 0), icon: "➡️" },
            ].map((stat) => (
              <div key={stat.label} className="glass rounded-xl p-3 text-center">
                <span className="text-base">{stat.icon}</span>
                <p className="text-base font-bold text-foreground mt-0.5">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* SP Progress & Rank */}
          <OtherUserSPCard profile={op} />
          <OtherUserRankCard profile={op} />

          {/* Interests */}
          {opInterests.length > 0 && (
            <section className="glass rounded-2xl p-4">
              <h3 className="font-display text-sm font-bold text-foreground mb-3">Gece İlgi Alanları</h3>
              <div className="flex flex-wrap gap-2">
                {opInterests.map((interest: string) => (
                  <span key={interest} className="bg-primary/15 text-primary text-xs font-medium px-3 py-1 rounded-full border border-primary/20">
                    {interest}
                  </span>
                ))}
              </div>
            </section>
          )}
        </main>
        <BottomNav />
      </div>
    );
  }

  // ── PANEL RENDER ──────────────────────────────────────────────────────────────
  if (activePanel) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <header className="sticky top-0 z-40 glass border-b border-border/30 px-4 py-4 flex items-center gap-3">
          <button onClick={() => setActivePanel(null)} className="p-2 glass rounded-full">
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="font-display text-lg font-bold text-foreground">
            {activePanel === "checkins" && "Check-in Geçmişi"}
            {activePanel === "favorites" && "Favori Mekanlar"}
            {activePanel === "followers" && "Takipçiler"}
            {activePanel === "following" && "Takip Edilenler"}
            {activePanel === "badges" && "Rozetler"}
          </h1>
        </header>

        <main className="px-4 mt-4 space-y-3">
          {/* CHECK-INS */}
          {activePanel === "checkins" && (
            checkins.length === 0 ? (
              <div className="glass rounded-2xl p-10 text-center">
                <span className="text-4xl block mb-3">📍</span>
                <p className="text-muted-foreground text-sm">Henüz check-in yok</p>
              </div>
            ) : (
              checkins.map((c: any) => (
                <div key={c.id} className="glass rounded-xl p-4 flex items-center gap-3">
                  {c.venues?.image_url && (
                    <img src={c.venues.image_url} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">{c.venues?.name ?? "Bilinmeyen Mekan"}</p>
                    <p className="text-xs text-muted-foreground capitalize">{c.venues?.type}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(c.checked_in_at).toLocaleDateString("tr-TR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  {c.is_verified && (
                    <div className="flex flex-col items-center gap-0.5">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      <span className="text-[9px] text-secondary">+50 XP</span>
                    </div>
                  )}
                </div>
              ))
            )
          )}

          {/* FAVORITES */}
          {activePanel === "favorites" && (
            favoriteVenues.length === 0 ? (
              <div className="glass rounded-2xl p-10 text-center">
                <span className="text-4xl block mb-3">❤️</span>
                <p className="text-muted-foreground text-sm">Henüz favori mekan yok</p>
              </div>
            ) : (
              favoriteVenues.map((f: any) => (
                <button
                  key={f.venue_id}
                  onClick={() => navigate(`/venue/${f.venue_id}`)}
                  className="w-full glass rounded-xl p-4 flex items-center gap-3 hover:neon-glow transition-all"
                >
                  {f.venues?.image_url && (
                    <img src={f.venues.image_url} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-bold text-foreground truncate">{f.venues?.name ?? "Mekan"}</p>
                    <p className="text-xs text-muted-foreground capitalize">{f.venues?.type} • {f.venues?.address}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${f.venues?.is_open ? "bg-green-400" : "bg-red-400"}`} />
                      <span className="text-[10px] text-muted-foreground">{f.venues?.is_open ? "Açık" : "Kapalı"} • %{f.venues?.crowd_level} doluluk</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </button>
              ))
            )
          )}

          {/* FOLLOWERS */}
          {activePanel === "followers" && (
            (() => {
              const followers = connections.filter((c) => c.target_id === user?.id);
              return followers.length === 0 ? (
                <div className="glass rounded-2xl p-10 text-center">
                  <span className="text-4xl block mb-3">👥</span>
                  <p className="text-muted-foreground text-sm">Henüz takipçi yok</p>
                </div>
              ) : (
                followers.map((c) => {
                  const p = c.profiles;
                  const initials2 = (p?.display_name ?? "?").split(" ").map((w) => w[0]).join("").toUpperCase().substring(0, 2);
                  return (
                    <div key={c.id} className="glass rounded-xl p-4 flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-neon flex items-center justify-center text-primary-foreground text-sm font-bold overflow-hidden flex-shrink-0">
                        {p?.avatar_url ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" /> : initials2}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground">{p?.display_name ?? "Kullanıcı"}</p>
                        <p className="text-xs text-muted-foreground">@{p?.username ?? "?"} • {p?.location ?? "—"}</p>
                      </div>
                      {c.status === "matched" && (
                        <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-medium">Eşleşme</span>
                      )}
                    </div>
                  );
                })
              );
            })()
          )}

          {/* FOLLOWING */}
          {activePanel === "following" && (
            (() => {
              const following = connections.filter((c) => c.user_id === user?.id);
              return following.length === 0 ? (
                <div className="glass rounded-2xl p-10 text-center">
                  <span className="text-4xl block mb-3">➡️</span>
                  <p className="text-muted-foreground text-sm">Henüz kimseyi takip etmiyorsun</p>
                </div>
              ) : (
                following.map((c) => {
                  const p = c.profiles;
                  const initials2 = (p?.display_name ?? "?").split(" ").map((w) => w[0]).join("").toUpperCase().substring(0, 2);
                  return (
                    <div key={c.id} className="glass rounded-xl p-4 flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-neon flex items-center justify-center text-primary-foreground text-sm font-bold overflow-hidden flex-shrink-0">
                        {p?.avatar_url ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" /> : initials2}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground">{p?.display_name ?? "Kullanıcı"}</p>
                        <p className="text-xs text-muted-foreground">@{p?.username ?? "?"} • {p?.location ?? "—"}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {c.status === "matched" && (
                          <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-medium">Eşleşme</span>
                        )}
                        <button
                          onClick={() => {
                            unfollowMutation.mutate(c.target_id, {
                              onSuccess: () => toast({ title: "Takipten çıkıldı ✅" }),
                              onError: () => toast({ title: "Hata", variant: "destructive" }),
                            });
                          }}
                          disabled={unfollowMutation.isPending}
                          className="text-xs text-destructive border border-destructive/30 hover:bg-destructive/10 px-2.5 py-1 rounded-full font-medium transition-colors"
                        >
                          {unfollowMutation.isPending ? "..." : "Çıkar"}
                        </button>
                      </div>
                    </div>
                  );
                })
              );
            })()
          )}

          {/* BADGES */}
          {activePanel === "badges" && (
            <div className="grid grid-cols-2 gap-3">
              {BADGES.map((badge) => {
                const earned = badge.req > 0 ? xp >= badge.req : (badge.streakReq ? (profile?.checkin_streak ?? 0) >= badge.streakReq : true);
                return (
                  <div key={badge.name} className={`glass rounded-2xl p-4 text-center transition-all ${earned ? "border border-primary/40 neon-glow" : "opacity-50"}`}>
                    <span className="text-3xl block mb-2">{badge.icon}</span>
                    <p className="text-sm font-bold text-foreground">{badge.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{badge.desc}</p>
                    {earned && <p className="text-xs text-primary font-bold mt-1">✅ Kazanıldı</p>}
                    {!earned && badge.req > 0 && <p className="text-xs text-muted-foreground mt-1">{xp}/{badge.req} XP</p>}
                  </div>
                );
              })}
            </div>
          )}
        </main>
        <BottomNav />
      </div>
    );
  }

  // ── MAIN PROFILE ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Cover */}
      <div className="relative h-36 bg-gradient-neon overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/80" />
        <div className="absolute top-3 right-3 flex gap-2">
          <NotificationBell />
          <button
            onClick={() => setEditSection(editSection === "privacy" ? null : "privacy")}
            className="p-2 rounded-xl glass text-foreground"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      <main className="px-4 space-y-4 -mt-14">
        {/* Avatar & Name */}
        <div className="glass rounded-2xl p-5 text-center animate-slide-up">
          <div className="relative inline-block mb-3">
            <div
              className={`w-24 h-24 mx-auto rounded-full bg-gradient-neon flex items-center justify-center text-primary-foreground text-2xl font-bold ${profile?.is_premium ? "neon-glow" : ""} overflow-hidden`}
            >
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : initials}
            </div>
            {profile?.is_premium && <span className="absolute -top-1 -right-1 text-xl">✨</span>}
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploadingPhoto}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center neon-glow"
            >
              {uploadingPhoto ? (
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera className="w-4 h-4 text-primary-foreground" />
              )}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
          </div>

          {/* Name edit */}
          {editSection === "name" ? (
            <div className="flex items-center gap-2 justify-center mb-2">
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="text-center bg-muted/50 border-border rounded-xl max-w-[180px]"
                placeholder="Adınız"
              />
              <Button size="icon" onClick={() => handleSave({ display_name: displayName })} disabled={saving} className="bg-primary text-primary-foreground rounded-xl h-9 w-9">
                <Check className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="outline" onClick={() => setEditSection(null)} className="rounded-xl h-9 w-9">
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 mb-1">
              <h2 className="font-display text-xl font-bold text-foreground">
                {profile?.display_name ?? user?.email?.split("@")[0] ?? "Kullanıcı"}
              </h2>
              <button onClick={() => { setEditSection("name"); setDisplayName(profile?.display_name ?? ""); }}>
                <Edit2 className="w-4 h-4 text-muted-foreground hover:text-foreground" />
              </button>
            </div>
          )}

          <p className="text-sm text-muted-foreground">@{profile?.username ?? "kullanici"} • {profile?.location ?? "—"}</p>

          {/* Bio */}
          {editSection === "bio" ? (
            <div className="mt-3 space-y-2">
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, 150))}
                placeholder="Kendinizi tanıtın (max 150 karakter)"
                className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2 text-sm text-foreground resize-none min-h-[80px] focus:outline-none focus:border-primary/50"
              />
              <p className="text-xs text-muted-foreground text-right">{bio.length}/150</p>
              <Input
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="Instagram kullanıcı adı (opsiyonel)"
                className="bg-muted/50 border-border rounded-xl text-sm"
              />
              <div className="flex gap-2">
                <Button onClick={() => handleSave({ bio, instagram_url: instagram })} disabled={saving} className="flex-1 bg-primary text-primary-foreground rounded-xl">
                  Kaydet
                </Button>
                <Button variant="outline" onClick={() => setEditSection(null)} className="rounded-xl">İptal</Button>
              </div>
            </div>
          ) : (
            <div
              className="mt-2 cursor-pointer"
              onClick={() => { setEditSection("bio"); setBio(profile?.bio ?? ""); setInstagram(profile?.instagram_url ?? ""); }}
            >
              {profile?.bio ? (
                <p className="text-sm text-muted-foreground italic">"{profile.bio}"</p>
              ) : (
                <p className="text-sm text-muted-foreground/50 italic">+ Bio ekle...</p>
              )}
              {profile?.instagram_url && (
                <div className="flex items-center justify-center gap-1 mt-1">
                  <Instagram className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{profile.instagram_url}</span>
                </div>
              )}
            </div>
          )}

          {/* Level Badge */}
          <div className="flex items-center justify-center gap-2 mt-3">
            <span className="text-sm font-bold bg-primary/20 text-primary px-3 py-1 rounded-full">
              {getLevelName(level)}
            </span>
            {profile?.checkin_streak && profile.checkin_streak > 1 && (
              <div className="flex items-center gap-1 bg-muted rounded-full px-2 py-1">
                <Flame className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-bold text-foreground">{profile.checkin_streak} gün</span>
              </div>
            )}
            {profile?.is_ghost_mode && (
              <div className="flex items-center gap-1 bg-muted rounded-full px-2 py-1">
                <span className="text-xs">👻</span>
                <span className="text-xs font-bold text-muted-foreground">Ghost</span>
              </div>
            )}
          </div>

          {/* XP progress (legacy) */}
          <div className="mt-3 px-2">
            <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
              <span>Seviye {level}</span>
              <span>{xpInLevel} / 500 XP</span>
              <span>Seviye {level + 1}</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-gradient-neon rounded-full transition-all duration-700" style={{ width: `${xpPct}%` }} />
            </div>
            <p className="text-xs text-center text-muted-foreground mt-1">Toplam {xp} XP</p>
          </div>
        </div>

        {/* Profile Completion */}
        {(() => {
          const steps = [
            { key: "avatar", label: "Profil fotoğrafı", done: !!profile?.avatar_url },
            { key: "name", label: "Görünen ad", done: !!profile?.display_name },
            { key: "bio", label: "Hakkında", done: !!profile?.bio },
            { key: "interests", label: "İlgi alanları", done: (profile?.interests ?? []).length > 0 },
            { key: "location", label: "Şehir", done: !!profile?.location && profile.location !== "Istanbul" },
          ];
          const doneCount = steps.filter((s) => s.done).length;
          const pct = Math.round((doneCount / steps.length) * 100);
          if (pct >= 100) return null;
          return (
            <div className="glass rounded-2xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground tracking-wide">Profili Tamamla</p>
                <span className="text-xs font-medium text-muted-foreground">{pct}%</span>
              </div>
              <div className="h-1 bg-muted/60 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 bg-primary/80"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex gap-1.5">
                {steps.map((step) => (
                  <button
                    key={step.key}
                    onClick={() => {
                      if (step.done) return;
                      if (step.key === "avatar") fileRef.current?.click();
                      else if (step.key === "name") { setEditSection("name"); setDisplayName(profile?.display_name ?? ""); }
                      else if (step.key === "bio") { setEditSection("bio"); setBio(profile?.bio ?? ""); setInstagram(profile?.instagram_url ?? ""); }
                      else if (step.key === "interests") { setEditSection("interests"); setSelectedInterests(profile?.interests ?? []); }
                    }}
                    disabled={step.done}
                    className={`flex-1 rounded-lg py-2 px-1 text-center transition-all ${
                      step.done
                        ? "bg-primary/10 border border-primary/20"
                        : "bg-muted/40 border border-border/40 hover:border-primary/30 active:scale-[0.97]"
                    }`}
                  >
                    {step.done ? (
                      <Check className="w-3.5 h-3.5 text-primary mx-auto mb-0.5" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border border-muted-foreground/40 mx-auto mb-0.5" />
                    )}
                    <p className={`text-[9px] leading-tight ${step.done ? "text-primary/70" : "text-muted-foreground"}`}>
                      {step.label}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Stats — tıklanabilir */}
        <div className="grid grid-cols-4 gap-2">
          {stats.map((stat) => (
            <button
              key={stat.label}
              onClick={() => setActivePanel(stat.panel)}
              className="glass rounded-xl p-3 text-center hover:border hover:border-primary/40 transition-all active:scale-95"
            >
              <span className="text-base">{stat.icon}</span>
              <p className="text-base font-bold text-foreground mt-0.5">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground">{stat.label}</p>
            </button>
          ))}
        </div>

        {/* Social Power Progress */}
        <SPProgressBar />

        {/* City Rank */}
        <RankCard />

        {/* Interests */}
        <section className="glass rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-sm font-bold text-foreground">Gece İlgi Alanları</h3>
            <button
              onClick={() => setEditSection(editSection === "interests" ? null : "interests")}
              className="text-xs text-primary font-medium"
            >
              {editSection === "interests" ? "Kapat" : "Düzenle"}
            </button>
          </div>
          {editSection === "interests" ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {INTERESTS.map((interest) => (
                  <button
                    key={interest}
                    onClick={() => toggleInterest(interest)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      selectedInterests.includes(interest)
                        ? "bg-gradient-neon text-primary-foreground neon-glow"
                        : "glass text-muted-foreground"
                    }`}
                  >
                    {interest}
                  </button>
                ))}
              </div>
              <Button
                onClick={() => handleSave({ interests: selectedInterests })}
                disabled={saving}
                className="w-full bg-primary text-primary-foreground rounded-xl"
              >
                Kaydet
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {profileInterests.length > 0 ? (
                profileInterests.map((interest) => (
                  <span key={interest} className="bg-primary/15 text-primary text-xs font-medium px-3 py-1 rounded-full border border-primary/20">
                    {interest}
                  </span>
                ))
              ) : (
                <p className="text-xs text-muted-foreground italic">İlgi alanı eklenmemiş. Düzenle'ye tıkla!</p>
              )}
            </div>
          )}
        </section>

        {/* Privacy Settings */}
        {editSection === "privacy" && (
          <section className="glass rounded-2xl p-4 border border-border animate-slide-up">
            <div className="flex items-center gap-2 mb-4">
              <Lock className="w-4 h-4 text-primary" />
              <h3 className="font-display text-sm font-bold text-foreground">Gizlilik Ayarları</h3>
            </div>
            <div className="space-y-4">
              {/* Ghost Mode — sadece premium */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">👻</span>
                  <div>
                    <p className="text-sm font-medium text-foreground flex items-center gap-1">
                      Ghost Mode
                      {!profile?.is_premium && <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">Premium</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">Profileni gizle</p>
                  </div>
                </div>
                <button
                  onClick={profile?.is_premium ? toggleGhostMode : () => toast({ title: "👑 Premium gerekli", description: "Ghost Mode sadece premium üyeler için" })}
                  className={`w-12 h-6 rounded-full transition-colors relative ${profile?.is_ghost_mode ? "bg-primary" : "bg-muted"}`}
                >
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-foreground transition-all ${profile?.is_ghost_mode ? "left-7" : "left-1"}`} />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Çevrimiçi Görünürlük</p>
                    <p className="text-xs text-muted-foreground">Aktif durumunuzu göster</p>
                  </div>
                </div>
                <button
                  onClick={() => setPrivacyOnline(!privacyOnline)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${privacyOnline ? "bg-primary" : "bg-muted"}`}
                >
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-foreground transition-all ${privacyOnline ? "left-7" : "left-1"}`} />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Okundu Bilgisi</p>
                    <p className="text-xs text-muted-foreground">Mesajları okuduğunuzda göster</p>
                  </div>
                </div>
                <button
                  onClick={() => setPrivacyReadReceipts(!privacyReadReceipts)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${privacyReadReceipts ? "bg-primary" : "bg-muted"}`}
                >
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-foreground transition-all ${privacyReadReceipts ? "left-7" : "left-1"}`} />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Check-in Geçmişini Gizle</p>
                    <p className="text-xs text-muted-foreground">Sadece siz görürsünüz</p>
                  </div>
                </div>
                <button
                  onClick={() => setPrivacyHideCheckins(!privacyHideCheckins)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${privacyHideCheckins ? "bg-primary" : "bg-muted"}`}
                >
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-foreground transition-all ${privacyHideCheckins ? "left-7" : "left-1"}`} />
                </button>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-muted-foreground" />
                  Kim mesaj gönderebilir?
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: "all", label: "Herkes" },
                    { val: "matches", label: "Eşleşmeler" },
                    { val: "none", label: "Kimse" },
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      onClick={() => setPrivacyWhoMsg(opt.val)}
                      className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                        privacyWhoMsg === opt.val ? "bg-primary text-primary-foreground neon-glow" : "glass text-muted-foreground"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <Button
                onClick={() => handleSave({
                  privacy_online_visible: privacyOnline,
                  privacy_read_receipts: privacyReadReceipts,
                  privacy_who_can_message: privacyWhoMsg,
                  privacy_hide_checkins: privacyHideCheckins,
                })}
                disabled={saving}
                className="w-full bg-primary text-primary-foreground rounded-xl"
              >
                Ayarları Kaydet
              </Button>
            </div>
          </section>
        )}

        {/* Badges preview */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-base font-bold text-foreground">Rozetler</h3>
            <button onClick={() => setActivePanel("badges")} className="text-xs text-primary font-medium flex items-center gap-0.5">
              Tümü <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto scrollbar-none pb-2">
            {BADGES.slice(0, 5).map((badge) => {
              const earned = badge.req > 0 ? xp >= badge.req : false;
              return (
                <button
                  key={badge.name}
                  onClick={() => setActivePanel("badges")}
                  className={`glass rounded-xl p-3 text-center min-w-[80px] transition-all ${earned ? "border border-primary/30" : "opacity-50"}`}
                >
                  <span className="text-2xl">{badge.icon}</span>
                  <p className="text-[10px] text-muted-foreground mt-1">{badge.name}</p>
                  {earned && <p className="text-[9px] text-primary mt-0.5">Kazanıldı</p>}
                </button>
              );
            })}
          </div>
        </section>

        {/* Premium CTA */}
        <div
          onClick={() => setActiveModal("premium")}
          className="glass rounded-2xl p-4 border border-primary/20 cursor-pointer hover:neon-glow transition-all active:scale-[0.98]"
        >
          <div className="flex items-center gap-2 mb-2">
            <Crown className="w-5 h-5 text-primary" />
            <span className="font-display font-bold text-foreground">
              {(profile as any)?.subscription_tier === "free" || !(profile as any)?.subscription_tier
                ? "City Ascension Premium"
                : `${((profile as any).subscription_tier as string).charAt(0).toUpperCase() + ((profile as any).subscription_tier as string).slice(1)} Üyelik`}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {(profile as any)?.subscription_tier === "free" || !(profile as any)?.subscription_tier
              ? "SP çarpanı, sıralama analizi, görünürlük boost ve daha fazlası"
              : "Tier'ını yönet veya yükselt"}
          </p>
          <div className="flex items-center gap-4 mt-3">
            {[
              { icon: Shield, text: "SP Boost" },
              { icon: Zap, text: "Rank Analytics" },
              { icon: Star, text: "Visibility" },
              { icon: Users, text: "Match Priority" },
            ].map((f) => (
              <div key={f.text} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <f.icon className="w-3 h-3 text-primary flex-shrink-0" />
                {f.text}
              </div>
            ))}
          </div>
        </div>

        {/* Premium Tiers Modal */}
        {activeModal === "premium" && <PremiumTiersModal onClose={() => setActiveModal(null)} />}

        {/* Menu */}
        <div className="glass rounded-2xl overflow-hidden">
          {[
            { icon: MapPin, label: "Check-in Geçmişi", action: () => setActivePanel("checkins") },
            { icon: Heart, label: "Favori Mekanlar", action: () => setActivePanel("favorites") },
            { icon: Bell, label: "Bildirim Ayarları", action: () => navigate("/notifications") },
            { icon: Users, label: "Takipçilerim", action: () => setActivePanel("followers") },
            { icon: UserCheck, label: "Takip Ettiklerim", action: () => setActivePanel("following") },
            { icon: Award, label: "Tüm Rozetler", action: () => setActivePanel("badges") },
          ].map((item) => (
            <button
              key={item.label}
              onClick={item.action}
              className="w-full flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors border-b border-border last:border-0"
            >
              <item.icon className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-foreground flex-1 text-left">{item.label}</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          ))}
        </div>

        {/* Sign Out */}
        <button
          onClick={async () => { await signOut(); navigate("/auth"); }}
          className="w-full glass rounded-2xl p-4 flex items-center gap-3 hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="w-5 h-5 text-destructive" />
          <span className="text-sm font-medium text-destructive">Çıkış Yap</span>
        </button>
      </main>

      <BottomNav />
    </div>
  );
};

export default ProfilePage;
