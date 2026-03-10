import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ChevronLeft, MapPin, MessageSquare, UserPlus, UserCheck, MoreHorizontal,
  Grid3X3, MapPinned, Activity, Award, Heart, Eye, Flame, Crown, Globe,
  TrendingUp, Shield, Ban, Share2, CheckCircle2, Zap, Users,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useFollowCounts, useIsFollowing, useToggleFollow } from "@/hooks/useFollows";
import { useBlockUser } from "@/hooks/useBlockedUsers";
import {
  useUserProfileData, useUserStories, useUserCheckins, useUserBadges,
  useMutualFollows, useMutualVenues, useSPLevels,
} from "@/hooks/useUserProfile";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

import { tr } from "date-fns/locale";

type TabKey = "posts" | "checkins" | "activity" | "badges";

const BADGE_DEFS = [
  { icon: "🌙", name: "Gece Yenisi", desc: "İlk gece check-in", mode: "night" as const, spReq: 0, checkinReq: 1 },
  { icon: "🎵", name: "Kulüp Kaşifi", desc: "10 gece check-in", mode: "night" as const, checkinReq: 10 },
  { icon: "🦉", name: "Gece Baykuşu", desc: "25 gece check-in", mode: "night" as const, checkinReq: 25 },
  { icon: "⭐", name: "VIP Sosyalite", desc: "100 check-in", mode: "night" as const, checkinReq: 100 },
  { icon: "👑", name: "Gece Efsanesi", desc: "2000 Night SP", mode: "night" as const, spReq: 2000 },
  { icon: "☀️", name: "Gündüz Kaşifi", desc: "İlk gündüz aktivitesi", mode: "day" as const, checkinReq: 1 },
  { icon: "☕", name: "Kafe Gurusu", desc: "10 gündüz check-in", mode: "day" as const, checkinReq: 10 },
  { icon: "🏆", name: "Gündüz Şampiyonu", desc: "2000 Day SP", mode: "day" as const, spReq: 2000 },
  { icon: "👥", name: "Sosyal Kelebek", desc: "10 bağlantı", mode: "both" as const },
  { icon: "🏙️", name: "Şehir Simgesi", desc: "5000 SP", mode: "both" as const, spReq: 5000 },
  { icon: "🌍", name: "Global Yıldız", desc: "10000 SP", mode: "both" as const, spReq: 10000 },
];

const UserProfilePage = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabKey>("posts");
  const [showMenu, setShowMenu] = useState(false);
  const [avatarLightbox, setAvatarLightbox] = useState(false);

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

  const p = profile as any;
  const totalSP = p.social_power ?? 0;
  const nightSP = p.night_sp ?? 0;
  const daySP = p.day_score ?? 0;
  const spLevel = p.sp_level ?? 1;
  const currentLevel = spLevels.find((l: any) => l.level === spLevel) ?? spLevels[0];
  const nextLevel = spLevels.find((l: any) => l.level === spLevel + 1);
  const progressPct = currentLevel && nextLevel
    ? Math.min(((totalSP - (currentLevel as any).min_sp) / ((nextLevel as any).min_sp - (currentLevel as any).min_sp)) * 100, 100)
    : 100;
  const percentile = p.city_percentile;
  const streakDays = p.streak_days ?? 0;
  const tier = p.subscription_tier ?? "free";
  const TIER_INFO: Record<string, { label: string; badge: string; cls: string }> = {
    free: { label: "Free", badge: "", cls: "text-muted-foreground" },
    plus: { label: "Plus", badge: "⚡", cls: "text-blue-400" },
    pro: { label: "Pro", badge: "💎", cls: "text-purple-400" },
    elite: { label: "Elite", badge: "👑", cls: "text-yellow-400" },
  };
  const tierInfo = TIER_INFO[tier] ?? TIER_INFO.free;
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
    { key: "checkins", icon: <MapPinned className="w-5 h-5" />, label: "Check-ins" },
    { key: "activity", icon: <Activity className="w-5 h-5" />, label: "Aktivite" },
    { key: "badges", icon: <Award className="w-5 h-5" />, label: "Rozetler" },
  ];

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header bar */}
      <header className="sticky top-0 z-40 glass border-b border-border/30 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 glass rounded-full">
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="font-display text-base font-bold text-foreground flex-1 truncate">
          {p.username ? `@${p.username}` : p.display_name ?? "Profil"}
        </h1>
        {!isOwnProfile && (
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} className="p-2 glass rounded-full">
              <MoreHorizontal className="w-5 h-5 text-foreground" />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-10 z-50 glass rounded-xl border border-border/50 py-1 min-w-[160px] shadow-xl">
                  <button onClick={handleShare} className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 text-foreground hover:bg-muted/50">
                    <Share2 className="w-4 h-4" /> Profili Paylaş
                  </button>
                  <button onClick={handleBlock} className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 text-destructive hover:bg-muted/50">
                    <Ban className="w-4 h-4" /> Engelle
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </header>

      <main className="px-4 mt-4 space-y-5">
        {/* ── Profile Header ── */}
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <button onClick={() => p.avatar_url && setAvatarLightbox(true)} className="flex-shrink-0">
            <div className="w-20 h-20 rounded-full bg-gradient-neon flex items-center justify-center text-primary-foreground text-xl font-bold overflow-hidden ring-2 ring-primary/30 ring-offset-2 ring-offset-background">
              {p.avatar_url ? (
                <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : initials}
            </div>
          </button>

          {/* Stats row */}
          <div className="flex-1">
            <div className="grid grid-cols-4 text-center gap-1">
              <div>
                <p className="font-display text-lg font-bold text-foreground">{stories.length}</p>
                <p className="text-[10px] text-muted-foreground">Gönderi</p>
              </div>
              <div>
                <p className="font-display text-lg font-bold text-foreground">{followCounts?.followers ?? 0}</p>
                <p className="text-[10px] text-muted-foreground">Takipçi</p>
              </div>
              <div>
                <p className="font-display text-lg font-bold text-foreground">{followCounts?.following ?? 0}</p>
                <p className="text-[10px] text-muted-foreground">Takip</p>
              </div>
              <div>
                <p className="font-display text-lg font-bold text-foreground">{p.total_checkins ?? 0}</p>
                <p className="text-[10px] text-muted-foreground">Check-in</p>
              </div>
            </div>
          </div>
        </div>

        {/* Name & details */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-lg font-bold text-foreground">{p.display_name}</h2>
            {p.selected_badge && <span className="text-lg">{p.selected_badge}</span>}
            {tier !== "free" && <span className={`text-sm ${tierInfo.cls}`}>{tierInfo.badge}</span>}
            {hasMomentum && <Flame className="w-4 h-4 text-primary animate-pulse" />}
          </div>
          {p.username && (
            <p className="text-sm text-muted-foreground">@{p.username}</p>
          )}
          {p.location && (
            <div className="flex items-center gap-1 text-muted-foreground text-xs">
              <MapPin className="w-3 h-3" />
              {p.location}
            </div>
          )}
          {/* SP badge inline */}
          {currentLevel && (
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-sm">{(currentLevel as any).badge_icon}</span>
              <span className="text-xs font-semibold text-foreground">{(currentLevel as any).name}</span>
              <span className="text-[10px] text-muted-foreground">·</span>
              <span className="text-xs text-primary font-bold">{totalSP.toLocaleString()} SP</span>
            </div>
          )}
        </div>

        {/* Bio */}
        {p.bio && (
          <p className="text-sm text-foreground leading-relaxed">{p.bio}</p>
        )}

        {/* Interest tags */}
        {p.interests && p.interests.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {p.interests.map((tag: string) => (
              <span key={tag} className="px-2.5 py-1 rounded-full glass text-[10px] font-semibold text-muted-foreground border border-border/40">
                {tag}
              </span>
            ))}
          </div>
        )}


        {/* Action buttons */}
        {!isOwnProfile && (
          <div className="flex gap-2">
            <Button
              onClick={handleFollow}
              disabled={toggleFollow.isPending}
              className={`flex-1 rounded-xl font-semibold ${
                isFollowing
                  ? "glass border border-border text-foreground hover:bg-muted/50"
                  : "bg-gradient-neon text-primary-foreground neon-glow"
              }`}
              variant={isFollowing ? "outline" : "default"}
            >
              {isFollowing ? (
                <><UserCheck className="w-4 h-4 mr-1.5" /> Takip Ediliyor</>
              ) : (
                <><UserPlus className="w-4 h-4 mr-1.5" /> Takip Et</>
              )}
            </Button>
            <Button
              onClick={() => navigate(`/chat/${userId}`)}
              variant="outline"
              className="rounded-xl glass border-border"
            >
              <MessageSquare className="w-4 h-4" />
            </Button>
          </div>
        )}

        {isOwnProfile && (
          <Button onClick={() => navigate("/edit-profile")} variant="outline" className="w-full rounded-xl glass border-border font-semibold">
            Profili Düzenle
          </Button>
        )}

        {/* Mutual connections */}
        {mutualFollows.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {mutualFollows.slice(0, 3).map((mf: any) => (
                <div key={mf.user_id} className="w-6 h-6 rounded-full bg-muted border-2 border-background overflow-hidden">
                  {mf.avatar_url ? <img src={mf.avatar_url} alt="" className="w-full h-full object-cover" /> : null}
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              <span className="font-semibold text-foreground">{mutualFollows[0]?.display_name}</span>
              {mutualFollows.length > 1 && ` ve ${mutualFollows.length - 1} kişi daha`} tarafından takip ediliyor
            </p>
          </div>
        )}

        {/* ── Social Power Card ── */}
        <div className="glass rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {currentLevel && <span className="text-2xl">{(currentLevel as any).badge_icon}</span>}
              <div>
                <p className="text-sm font-bold text-foreground">{currentLevel ? (currentLevel as any).name : "—"}</p>
                <p className="text-[10px] text-muted-foreground">Social Power Lv.{spLevel}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-display text-lg font-bold text-primary">{totalSP.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">SP</p>
            </div>
          </div>
          {/* Progress bar */}
          <div>
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
              <span>Lv.{spLevel}</span>
              <span>Lv.{nextLevel ? (nextLevel as any).level : "MAX"}</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{ width: `${progressPct}%`, background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--secondary)))" }}
              />
            </div>
          </div>
          {/* Night/Day SP split */}
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
          {/* Rank & streak */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              {p.city_rank && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-primary" />
                  <span className="font-bold text-foreground">#{p.city_rank}</span>
                  <span className="text-muted-foreground">Şehir</span>
                </div>
              )}
              {p.weekly_rank && (
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-secondary" />
                  <span className="font-bold text-foreground">#{p.weekly_rank}</span>
                  <span className="text-muted-foreground">Haftalık</span>
                </div>
              )}
            </div>
            {streakDays > 0 && (
              <div className="flex items-center gap-1">
                <Flame className="w-3 h-3 text-primary" />
                <span className="font-bold text-foreground">{streakDays} gün</span>
              </div>
            )}
          </div>
          {percentile !== null && percentile !== undefined && (
            <div className="text-center">
              <span className="text-[10px] text-muted-foreground">Şehrinde Top </span>
              <span className="text-xs font-bold text-primary">%{Math.max(1, Math.round(100 - percentile))}</span>
            </div>
          )}
        </div>

        {/* Mutual venues */}
        {mutualVenues.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ortak Mekanlar</h3>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {mutualVenues.map((v: any) => (
                <button
                  key={v.id}
                  onClick={() => navigate(`/venue/${v.id}`)}
                  className="flex-shrink-0 glass rounded-xl p-2.5 flex items-center gap-2 border border-border/30"
                >
                  <div className="w-8 h-8 rounded-lg bg-muted overflow-hidden">
                    {v.image_url && <img src={v.image_url} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <span className="text-xs font-semibold text-foreground whitespace-nowrap">{v.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Tabs ── */}
        <div className="flex border-b border-border/30">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-3 transition-all relative ${
                activeTab === tab.key ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {tab.icon}
              <span className="text-[9px] font-semibold">{tab.label}</span>
              {activeTab === tab.key && (
                <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* ── Tab Content ── */}
        {activeTab === "posts" && (
          <div>
            {stories.length === 0 ? (
              <div className="py-12 text-center">
                <Grid3X3 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Henüz gönderi yok</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-0.5">
                {stories.map((story: any) => (
                  <div key={story.id} className="aspect-square relative overflow-hidden bg-muted group">
                    {story.image_url ? (
                      <img src={story.image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20 p-2">
                        <p className="text-[10px] text-foreground text-center line-clamp-3">{story.text_overlay || story.content}</p>
                      </div>
                    )}
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                      <div className="flex items-center gap-1 text-white text-xs font-bold">
                        <Heart className="w-4 h-4 fill-white" /> {story.likes_count ?? 0}
                      </div>
                      <div className="flex items-center gap-1 text-white text-xs font-bold">
                        <Eye className="w-4 h-4" /> {story.views_count ?? 0}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "checkins" && (
          <div className="space-y-2">
            {checkins.length === 0 ? (
              <div className="py-12 text-center">
                <MapPinned className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Henüz check-in yok</p>
              </div>
            ) : (
              checkins.map((ci: any) => (
                <button
                  key={ci.id}
                  onClick={() => ci.venues?.id && navigate(`/venue/${ci.venues.id}`)}
                  className="w-full glass rounded-xl p-3 flex items-center gap-3 text-left"
                >
                  <div className="w-12 h-12 rounded-xl bg-muted overflow-hidden flex-shrink-0">
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
              ))
            )}
          </div>
        )}

        {activeTab === "activity" && (
          <div className="space-y-2">
            {checkins.length === 0 && stories.length === 0 ? (
              <div className="py-12 text-center">
                <Activity className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Henüz aktivite yok</p>
              </div>
            ) : (
              <>
                {/* Merge and sort activity by date */}
                {[
                  ...stories.slice(0, 10).map((s: any) => ({ type: "story" as const, date: s.created_at, data: s })),
                  ...checkins.slice(0, 10).map((c: any) => ({ type: "checkin" as const, date: c.checked_in_at, data: c })),
                ]
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .slice(0, 15)
                  .map((item, i) => (
                    <div key={i} className="glass rounded-xl p-3 flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                        item.type === "story" ? "bg-primary/20" : "bg-secondary/20"
                      }`}>
                        {item.type === "story" ? (
                          <Grid3X3 className="w-4 h-4 text-primary" />
                        ) : (
                          <MapPinned className="w-4 h-4 text-secondary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground">
                          {item.type === "story" ? "Hikaye paylaştı" : `${item.data.venues?.name ?? "Mekan"}'a check-in yaptı`}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(item.date), { addSuffix: true, locale: tr })}
                        </p>
                      </div>
                    </div>
                  ))}
              </>
            )}
          </div>
        )}

        {activeTab === "badges" && (
          <div className="space-y-3">
            {/* Earned badges from DB */}
            {badges.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Kazanılan Rozetler</h3>
                <div className="grid grid-cols-4 gap-2">
                  {badges.map((b: any) => (
                    <div key={b.id} className="glass rounded-xl p-3 text-center">
                      <span className="text-2xl">{b.badges?.icon ?? "🏅"}</span>
                      <p className="text-[10px] font-semibold text-foreground mt-1 leading-tight">{b.badges?.name ?? "Rozet"}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Badge catalog */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Statü Rozetleri</h3>
              <div className="grid grid-cols-4 gap-2">
                {BADGE_DEFS.map((badge, i) => {
                  const earned =
                    (badge.spReq && totalSP >= badge.spReq) ||
                    (badge.checkinReq && (p.total_checkins ?? 0) >= badge.checkinReq);
                  return (
                    <div key={i} className={`glass rounded-xl p-3 text-center transition-all ${earned ? "" : "opacity-30 grayscale"}`}>
                      <span className="text-2xl">{badge.icon}</span>
                      <p className="text-[10px] font-semibold text-foreground mt-1 leading-tight">{badge.name}</p>
                      <p className="text-[8px] text-muted-foreground">{badge.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Status card */}
            <div className="glass rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crown className={`w-4 h-4 ${tierInfo.cls}`} />
                  <span className={`text-sm font-bold ${tierInfo.cls}`}>{tierInfo.badge} {tierInfo.label}</span>
                </div>
                {hasMomentum && (
                  <div className="flex items-center gap-1 bg-primary/20 px-2 py-0.5 rounded-full animate-pulse">
                    <Flame className="w-3 h-3 text-primary" />
                    <span className="text-[10px] text-primary font-bold">Rising 🔥</span>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="glass rounded-xl p-2.5 text-center">
                  <MapPin className="w-3 h-3 text-primary mx-auto mb-1" />
                  <p className="font-display text-base font-bold text-foreground">{p.city_rank ? `#${p.city_rank}` : "—"}</p>
                  <p className="text-[8px] text-muted-foreground">Şehir</p>
                </div>
                <div className="glass rounded-xl p-2.5 text-center">
                  <Globe className="w-3 h-3 text-secondary mx-auto mb-1" />
                  <p className="font-display text-base font-bold text-foreground">{p.global_rank ? `#${p.global_rank}` : "—"}</p>
                  <p className="text-[8px] text-muted-foreground">Global</p>
                </div>
                <div className="glass rounded-xl p-2.5 text-center">
                  <TrendingUp className="w-3 h-3 text-primary mx-auto mb-1" />
                  <p className="font-display text-base font-bold text-foreground">{p.weekly_rank ? `#${p.weekly_rank}` : "—"}</p>
                  <p className="text-[8px] text-muted-foreground">Haftalık</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Avatar lightbox */}
      {avatarLightbox && p.avatar_url && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={() => setAvatarLightbox(false)}>
          <img src={p.avatar_url} alt="" className="max-w-[90%] max-h-[80vh] rounded-2xl object-contain" />
        </div>
      )}
    </div>
  );
};

export default UserProfilePage;