import { useState, useEffect } from "react";
import { Trophy, Flame, Star, Crown, Clock, TrendingUp, Zap, ChevronUp, ChevronDown, Award, X, MapPin, Instagram, MessageCircle, Calendar } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useMissions, useClaimMission } from "@/hooks/useMissions";
import { useWeeklyLeaderboard, useMyWeeklyRank, getWeekResetCountdown, useMonthlyLeaderboard, useMyMonthlyRank, getMonthResetCountdown, LeaderboardEntry } from "@/hooks/useNightRank";
import { useAuth } from "@/contexts/AuthContext";
import { useUserCity } from "@/hooks/useCities";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const RANK_BADGES = ["🥇", "🥈", "🥉"];
const RANK_TITLES = ["King of the Night", "Night Star", "Rising Flame"];

const POINT_TABLE = [
  { action: "Night Check-in", points: "+25 SP" },
  { action: "Day Check-in", points: "+15 SP" },
  { action: "Hikaye paylaş", points: "+20 SP" },
  { action: "Beğeni al", points: "+2 SP" },
  { action: "Eşleşme", points: "+10 SP" },
  { action: "7 gün streak", points: "+50 SP" },
  { action: "Plus çarpan", points: "×1.15" },
  { action: "Pro çarpan", points: "×1.25" },
  { action: "Elite çarpan", points: "×1.35" },
  { action: "Günlük SP (Free)", points: "250" },
  { action: "Günlük SP (Plus)", points: "350" },
  { action: "Günlük SP (Pro)", points: "500" },
  { action: "Günlük SP (Elite)", points: "750" },
  { action: "Haftalık SP limiti", points: "1200" },
];

const LEVEL_NAMES = ["", "Gece Yenisi", "Kulüp Kaşifi", "VIP Sosyalite", "Şehir Simgesi", "Global Yıldız"];
const getLevelName = (l: number) => LEVEL_NAMES[Math.min(l, LEVEL_NAMES.length - 1)] ?? "Global Yıldız";

const LeaderboardPage = () => {
  const [tab, setTab] = useState<"nightrank" | "missions">("nightrank");
  const [period, setPeriod] = useState<"weekly" | "monthly">("weekly");
  const { cityName } = useUserCity();
  const { data: weeklyLeaderboard = [] } = useWeeklyLeaderboard(cityName, 100);
  const { data: monthlyLeaderboard = [] } = useMonthlyLeaderboard(cityName, 100);
  const { data: myWeeklyRank } = useMyWeeklyRank(cityName);
  const { data: myMonthlyRank } = useMyMonthlyRank(cityName);
  const { data: missions = [] } = useMissions();
  const { profile, user } = useAuth();
  const isPremium = profile?.is_premium ?? false;
  const tier = (profile as any)?.subscription_tier ?? "free";
  const visibleLimit = isPremium ? 100 : 50;
  const claimMission = useClaimMission();
  const navigate = useNavigate();

  const [weekCountdown, setWeekCountdown] = useState(getWeekResetCountdown());
  const [monthCountdown, setMonthCountdown] = useState(getMonthResetCountdown());
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setWeekCountdown(getWeekResetCountdown());
      setMonthCountdown(getMonthResetCountdown());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Select data based on period
  const leaderboard = period === "weekly"
    ? weeklyLeaderboard.map(e => ({ ...e, score: e.weekly_score }))
    : monthlyLeaderboard.map(e => ({ ...e, score: (e as any).monthly_score, weekly_score: (e as any).monthly_score }));
  const myRank = period === "weekly" ? myWeeklyRank : myMonthlyRank;
  const countdown = period === "weekly" ? weekCountdown : monthCountdown;
  const periodLabel = period === "weekly" ? "haftalık" : "aylık";

  const fomoMessage = (() => {
    if (!myRank || myRank.rank === 0) return `Bu ${period === "weekly" ? "hafta" : "ay"} puan kazan ve sıralamaya gir! 🔥`;
    if (myRank.rank <= 3) return `👑 Bu ${period === "weekly" ? "hafta" : "ay"} zirvede parıldıyorsun!`;
    if (myRank.rank <= 10) return `Top 3'e ${myRank.points_to_next} puan kaldı — devam et! 🚀`;
    return `Top 10'a ${myRank.points_to_next} puan kaldı 🔥`;
  })();

  const displayLeaderboard = leaderboard.slice(0, visibleLimit);

  const handleUserClick = (userId: string) => {
    if (userId === user?.id) return; // Don't open own profile card
    setSelectedUserId(userId);
  };

  // Find selected entry from leaderboard for quick info
  const selectedEntry = displayLeaderboard.find((e) => e.user_id === selectedUserId);

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 glass px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="font-display text-xl font-bold text-gradient">CityRank • {cityName}</h1>
          <div className="flex items-center gap-1.5 glass rounded-xl px-3 py-1.5">
            <Clock className="w-3.5 h-3.5 text-primary" />
            <span className="text-[10px] font-medium text-muted-foreground">
              {countdown.days}g {countdown.hours}s {countdown.minutes}dk
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          {(["nightrank", "missions"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                tab === t ? "bg-primary text-primary-foreground neon-glow" : "glass text-muted-foreground"
              }`}
            >
              {t === "nightrank" ? "🏆 CityRank" : "🎯 Görevler"}
            </button>
          ))}
        </div>
        {tab === "nightrank" && (
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => setPeriod("weekly")}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${
                period === "weekly" ? "bg-secondary text-secondary-foreground" : "glass text-muted-foreground"
              }`}
            >
              📅 Haftalık
            </button>
            <button
              onClick={() => setPeriod("monthly")}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${
                period === "monthly" ? "bg-secondary text-secondary-foreground" : "glass text-muted-foreground"
              }`}
            >
              📆 Aylık
            </button>
          </div>
        )}
      </header>

      <main className="px-4 mt-3">
        {tab === "nightrank" && (
          <div className="space-y-3">
            {/* My Rank Card */}
            <div className="glass rounded-2xl p-4 border border-primary/20 neon-glow">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold text-foreground">
                  {period === "weekly" ? "Bu Haftaki Sıran" : "Bu Ayki Sıran"}
                </span>
              </div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-display text-3xl font-bold text-primary">
                    {myRank && myRank.rank > 0 ? `#${myRank.rank}` : "—"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {myRank && myRank.rank > 0 && myRank.rank <= 3 ? RANK_TITLES[myRank.rank - 1] : "Sıralamaya gir!"}
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 justify-end">
                    <Zap className="w-4 h-4 text-secondary" />
                    <span className="font-display text-2xl font-bold text-foreground">{myRank?.weekly_score ?? 0}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{periodLabel} puan</p>
                </div>
              </div>
              {myRank && myRank.rank > 1 && myRank.points_to_next > 0 && (
                <div className="mb-2">
                  <div className="flex items-center justify-between text-[10px] mb-1">
                    <span className="text-muted-foreground">Bir üst sıraya</span>
                    <span className="text-primary font-medium">{myRank.points_to_next} puan</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-neon rounded-full transition-all"
                      style={{ width: `${Math.min(100, (myRank.weekly_score / (myRank.weekly_score + myRank.points_to_next)) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
              <div className="bg-primary/10 rounded-xl px-3 py-2 mt-1">
                <p className="text-xs text-primary font-medium">{fomoMessage}</p>
              </div>
            </div>

            {/* Point structure info */}
            <details className="glass rounded-2xl overflow-hidden">
              <summary className="px-4 py-3 flex items-center gap-2 cursor-pointer text-sm font-bold text-foreground">
                <Award className="w-4 h-4 text-secondary" />
                Puan Tablosu
              </summary>
              <div className="px-4 pb-3 space-y-1.5">
                {POINT_TABLE.map((p) => (
                  <div key={p.action} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{p.action}</span>
                    <span className="text-primary font-bold">{p.points}</span>
                  </div>
                ))}
              </div>
            </details>

            {/* Top 3 podium */}
            {displayLeaderboard.length >= 3 && (
              <div className="glass rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Flame className="w-4 h-4 text-primary" />
                  <span className="text-sm font-bold text-foreground">Gecenin Kralları</span>
                </div>
                <div className="flex items-end justify-center gap-3">
                  <PodiumCard entry={displayLeaderboard[1]} position={2} isMe={displayLeaderboard[1]?.user_id === user?.id} onClick={() => handleUserClick(displayLeaderboard[1]?.user_id)} />
                  <PodiumCard entry={displayLeaderboard[0]} position={1} isMe={displayLeaderboard[0]?.user_id === user?.id} onClick={() => handleUserClick(displayLeaderboard[0]?.user_id)} />
                  <PodiumCard entry={displayLeaderboard[2]} position={3} isMe={displayLeaderboard[2]?.user_id === user?.id} onClick={() => handleUserClick(displayLeaderboard[2]?.user_id)} />
                </div>
              </div>
            )}

            {/* Full leaderboard */}
            <div className="space-y-2">
              {displayLeaderboard.slice(3).map((entry) => {
                const isMe = entry.user_id === user?.id;
                const isTop10 = entry.rank <= 10;
                const initials = (entry.display_name ?? "?").split(" ").map((w: string) => w[0]).join("").toUpperCase().substring(0, 2);
                return (
                  <div
                    key={entry.user_id}
                    onClick={() => handleUserClick(entry.user_id)}
                    className={`glass rounded-2xl p-3 flex items-center gap-3 transition-all cursor-pointer active:scale-[0.98] ${
                      isMe ? "border border-primary/30 neon-glow" : isTop10 ? "border border-secondary/20" : ""
                    }`}
                  >
                    <div className="w-8 text-center flex-shrink-0">
                      <span className={`font-display font-bold text-sm ${isMe ? "text-primary" : isTop10 ? "text-secondary" : "text-muted-foreground"}`}>
                        #{entry.rank}
                      </span>
                    </div>
                    <div className={`relative w-10 h-10 rounded-full bg-gradient-neon flex items-center justify-center text-primary-foreground text-xs font-bold flex-shrink-0 ${
                      entry.is_premium ? "ring-2 ring-yellow-400/50" : isTop10 ? "ring-2 ring-secondary/30" : ""
                    }`}>
                      {entry.avatar_url ? (
                        <img src={entry.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
                      ) : initials}
                      {entry.is_premium && <span className="absolute -top-1 -right-1 text-[10px]">💎</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={`text-sm font-bold truncate block ${
                        isMe ? "text-primary" : entry.is_premium ? "text-yellow-400" : "text-foreground"
                      }`}>
                        {entry.display_name ?? "Kullanıcı"} {isMe && "(Sen)"}
                      </span>
                      <span className="text-[10px] text-muted-foreground">Lv.{entry.level}</span>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="flex items-center gap-1 justify-end">
                        <Zap className="w-3.5 h-3.5 text-secondary" />
                        <span className="text-sm font-bold text-foreground">{entry.weekly_score}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {!isPremium && leaderboard.length > 50 && (
              <div className="glass rounded-2xl p-4 text-center border border-primary/20">
                <p className="text-xs text-muted-foreground mb-1">Premium ile Top 100'ü gör</p>
                <p className="text-[10px] text-primary font-medium">⚡ Plus: 1.15x SP • 💎 Pro: 1.25x SP • 👑 Elite: 1.35x SP</p>
              </div>
            )}

            {displayLeaderboard.length === 0 && (
              <div className="glass rounded-2xl p-8 text-center">
                <Trophy className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Bu hafta henüz sıralama yok</p>
                <p className="text-xs text-muted-foreground mt-1">Check-in yap, hikaye paylaş ve puan kazan!</p>
              </div>
            )}
          </div>
        )}

        {tab === "missions" && (
          <div className="space-y-3">
            <div className="glass rounded-2xl p-4 mb-2">
              <div className="flex items-center gap-2 mb-1">
                <Trophy className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold text-foreground">Bu Haftalık Görevler</span>
              </div>
              <p className="text-xs text-muted-foreground">Görevleri tamamla, ödülünü claim et! Her hafta yeni görevler gelir.</p>
            </div>

            {missions.map((mission: {
              id: string;
              title: string;
              description: string | null;
              xp_reward: number;
              mission_type: string;
              target_count: number;
              userProgress: { progress: number; completed: boolean; claimed_at: string | null } | null;
            }) => {
              const progress = mission.userProgress?.progress ?? 0;
              const completed = mission.userProgress?.completed ?? false;
              const claimed = !!mission.userProgress?.claimed_at;
              const pct = Math.min((progress / mission.target_count) * 100, 100);
              const typeEmoji = mission.mission_type === "checkin" ? "📍" : mission.mission_type === "story" ? "📸" : mission.mission_type === "like" ? "❤️" : mission.mission_type === "streak" ? "🔥" : "💞";
              return (
                <div
                  key={mission.id}
                  className={`glass rounded-2xl p-4 ${claimed ? "border border-green-500/20 opacity-70" : completed ? "border border-primary/30 neon-glow" : ""}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{typeEmoji}</span>
                      <div>
                        <p className="text-sm font-bold text-foreground">{mission.title}</p>
                        <p className="text-xs text-muted-foreground">{mission.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                      {claimed ? (
                        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-medium">✓ Alındı</span>
                      ) : completed ? (
                        <button
                          onClick={() => claimMission.mutate(mission.id)}
                          disabled={claimMission.isPending}
                          className="text-xs bg-primary text-primary-foreground px-3 py-1 rounded-full font-bold animate-pulse-neon active:scale-95 transition-transform"
                        >
                          🎁 Claim
                        </button>
                      ) : (
                        <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-medium">+{mission.xp_reward} XP</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${claimed ? "bg-green-500" : completed ? "bg-primary" : "bg-gradient-neon"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {progress}/{mission.target_count}
                    </span>
                  </div>
                  {completed && !claimed && (
                    <p className="text-[10px] text-primary mt-1.5 font-medium text-center">🎉 Tamamlandı! Ödülünü almak için Claim'e bas</p>
                  )}
                </div>
              );
            })}

            {missions.length === 0 && (
              <div className="glass rounded-2xl p-8 text-center">
                <Trophy className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Görev bulunamadı</p>
                <p className="text-xs text-muted-foreground mt-1">Bu hafta görevler yüklenecek!</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Profile Card Modal */}
      {selectedUserId && (
        <ProfileCardModal
          userId={selectedUserId}
          entry={selectedEntry}
          viewerTier={tier}
          onClose={() => setSelectedUserId(null)}
          onMessage={(userId) => {
            setSelectedUserId(null);
            navigate(`/chat/${userId}`);
          }}
          onViewProfile={(userId) => {
            setSelectedUserId(null);
            navigate(`/profile?uid=${userId}`);
          }}
        />
      )}

      <BottomNav />
    </div>
  );
};

/* Profile Card Modal */
const ProfileCardModal = ({
  userId,
  entry,
  viewerTier,
  onClose,
  onMessage,
  onViewProfile,
}: {
  userId: string;
  entry?: LeaderboardEntry;
  viewerTier: string;
  onClose: () => void;
  onMessage: (userId: string) => void;
  onViewProfile: (userId: string) => void;
}) => {
  const { data: fullProfile, isLoading } = useQuery({
    queryKey: ["profile-card", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: badges = [] } = useQuery({
    queryKey: ["user-badges", userId],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("user_badges")
        .select("*, badges(name, icon, description)")
        .eq("user_id", userId);
      if (error) throw error;
      return data ?? [];
    },
  });

  const p = fullProfile;
  const initials = (p?.display_name ?? "?").split(" ").map((w: string) => w[0]).join("").toUpperCase().substring(0, 2);
  const rankTitle = entry && entry.rank <= 3 ? RANK_TITLES[entry.rank - 1] : null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg glass rounded-t-3xl p-5 pb-8 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-full glass text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>

        {/* Handle bar */}
        <div className="w-10 h-1 rounded-full bg-muted mx-auto mb-4" />

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Avatar + Name */}
            <div className="flex items-center gap-4">
              <div className={`relative w-20 h-20 rounded-full bg-gradient-neon flex items-center justify-center text-primary-foreground text-xl font-bold flex-shrink-0 ${
                p?.is_premium ? "ring-2 ring-yellow-400/50" : ""
              }`}>
                {p?.avatar_url ? (
                  <img src={p.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
                ) : initials}
                {p?.is_premium && <span className="absolute -bottom-1 -right-1 text-lg">💎</span>}
                {entry && entry.rank <= 3 && (
                  <span className="absolute -top-2 -left-1 text-2xl">{RANK_BADGES[entry.rank - 1]}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h2
                  onClick={() => onViewProfile(userId)}
                  className={`text-lg font-display font-bold truncate cursor-pointer hover:underline ${p?.is_premium ? "text-yellow-400" : "text-foreground"}`}
                >
                  {p?.display_name ?? "Kullanıcı"}
                </h2>
                {p?.username && (
                  <p
                    onClick={() => onViewProfile(userId)}
                    className="text-xs text-muted-foreground cursor-pointer hover:underline"
                  >
                    @{p.username}
                  </p>
                )}
                {rankTitle && (
                  <span className="inline-block mt-1 text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-medium">
                    {rankTitle}
                  </span>
                )}
              </div>
            </div>

            {/* Bio */}
            {p?.bio && (
              <p className="text-xs text-muted-foreground leading-relaxed">{p.bio}</p>
            )}

            {/* Stats row */}
            <div className="grid grid-cols-4 gap-2">
              <div className="glass rounded-xl p-2.5 text-center">
                <p className="font-display text-base font-bold text-primary">{getLevelName(p?.level ?? 1).split(" ")[0]}</p>
                <p className="text-[9px] text-muted-foreground">Seviye</p>
              </div>
              <div className="glass rounded-xl p-2.5 text-center">
                <p className="font-display text-base font-bold text-foreground">{p?.xp ?? 0}</p>
                <p className="text-[9px] text-muted-foreground">XP</p>
              </div>
              <div className="glass rounded-xl p-2.5 text-center">
                <p className="font-display text-base font-bold text-foreground">{p?.total_checkins ?? 0}</p>
                <p className="text-[9px] text-muted-foreground">Check-in</p>
              </div>
              <div className="glass rounded-xl p-2.5 text-center">
                <p className="font-display text-base font-bold text-secondary">{entry?.weekly_score ?? 0}</p>
                <p className="text-[9px] text-muted-foreground">Haftalık</p>
              </div>
            </div>

            {/* Weekly rank */}
            {entry && (
              <div className="glass rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold text-foreground">NightRank Sırası</span>
                </div>
                <span className="font-display text-lg font-bold text-primary">#{entry.rank}</span>
              </div>
            )}

            {/* Interests */}
            {p?.interests && p.interests.length > 0 && (
              <div>
                <p className="text-[10px] text-muted-foreground mb-1.5">İlgi Alanları</p>
                <div className="flex flex-wrap gap-1.5">
                  {p.interests.map((interest: string) => (
                    <span key={interest} className="text-[10px] px-2 py-0.5 rounded-full glass text-muted-foreground">
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Badges */}
            {badges.length > 0 && (
              <div>
                <p className="text-[10px] text-muted-foreground mb-1.5">Rozetler</p>
                <div className="flex gap-2 overflow-x-auto scrollbar-none">
                  {badges.map((b: { id: string; badges: { icon: string; name: string } }) => (
                    <div key={b.id} className="glass rounded-lg px-2.5 py-1.5 text-center min-w-[60px] flex-shrink-0">
                      <span className="text-lg">{b.badges?.icon}</span>
                      <p className="text-[8px] text-muted-foreground mt-0.5">{b.badges?.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Location + Instagram */}
            <div className="flex items-center gap-3 flex-wrap">
              {p?.location && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  <span>{p.location}</span>
                </div>
              )}
              {p?.instagram_url && (
                <a
                  href={p.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <Instagram className="w-3 h-3" />
                  <span>Instagram</span>
                </a>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 pt-1">
              {viewerTier === "free" ? (
                <div className="flex-1 flex items-center justify-center gap-2 bg-muted text-muted-foreground rounded-xl py-3 text-sm font-medium">
                  <MessageCircle className="w-4 h-4" />
                  <span>💎 Premium ile mesaj gönder</span>
                </div>
              ) : (
                <button
                  onClick={() => onMessage(userId)}
                  className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-3 text-sm font-bold transition-all hover:opacity-90 active:scale-[0.98]"
                >
                  <MessageCircle className="w-4 h-4" />
                  Mesaj Gönder
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* Podium card for top 3 */
const PodiumCard = ({ entry, position, isMe, onClick }: { entry: LeaderboardEntry; position: 1 | 2 | 3; isMe: boolean; onClick: () => void }) => {
  const heights = { 1: "h-28", 2: "h-20", 3: "h-16" };
  const sizes = { 1: "w-16 h-16", 2: "w-12 h-12", 3: "w-12 h-12" };
  const initials = (entry.display_name ?? "?").split(" ").map((w: string) => w[0]).join("").toUpperCase().substring(0, 2);

  return (
    <div className="flex flex-col items-center gap-1.5 flex-1 cursor-pointer" onClick={onClick}>
      <div className={`relative ${sizes[position]} rounded-full bg-gradient-neon flex items-center justify-center text-primary-foreground font-bold text-sm flex-shrink-0 ${
        position === 1 ? "ring-2 ring-yellow-400 animate-float" : position === 2 ? "ring-2 ring-slate-300" : "ring-2 ring-amber-600"
      }`}>
        {entry.avatar_url ? (
          <img src={entry.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
        ) : initials}
        <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-lg">{RANK_BADGES[position - 1]}</span>
      </div>
      <p className={`text-xs font-bold text-center truncate w-full ${isMe ? "text-primary" : entry.is_premium ? "text-yellow-400" : "text-foreground"}`}>
        {entry.display_name?.split(" ")[0] ?? "?"} {isMe && "🫵"}
      </p>
      <p className="text-[10px] text-muted-foreground">{RANK_TITLES[position - 1]}</p>
      <div className={`w-full ${heights[position]} bg-gradient-to-t rounded-t-xl flex items-center justify-center ${
        position === 1 ? "from-yellow-400/20 to-yellow-400/5" : position === 2 ? "from-slate-300/20 to-slate-300/5" : "from-amber-600/20 to-amber-600/5"
      }`}>
        <div className="flex items-center gap-0.5">
          <Zap className="w-3 h-3 text-secondary" />
          <span className="text-sm font-bold text-foreground">{entry.weekly_score}</span>
        </div>
      </div>
    </div>
  );
};

export default LeaderboardPage;
