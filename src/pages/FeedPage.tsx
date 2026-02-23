import { useState, useMemo, useCallback } from "react";
import {
  Flame, Zap, Plus, TrendingUp, Users, Moon, Sun,
  ChevronRight, Sparkles, UserCheck, Calendar,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import NotificationBell from "@/components/NotificationBell";
import ModeToggle from "@/components/ModeToggle";
import StoryBar, { UserStoryGroup } from "@/components/StoryBar";
import StoryViewer from "@/components/StoryViewer";
import StoryCreator from "@/components/StoryCreator";
import StorySPOverlay from "@/components/StorySPOverlay";
import FeedPostCard from "@/components/FeedPostCard";
import { useStories, useLikeStory, useMyStoryLikes, NightStory } from "@/hooks/useStories";
import { useVenues, NIGHT_VENUE_TYPES, DAY_VENUE_TYPES } from "@/hooks/useVenues";
import { useFollowing } from "@/hooks/useFollows";
import { useAuth } from "@/contexts/AuthContext";
import { useDayNight } from "@/contexts/DayNightContext";
import { useUserCity } from "@/hooks/useCities";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useViewedStories } from "@/hooks/useViewedStories";

// ─── Block assignment ─────────────────────────────────────────────────────────
type Block = "day" | "night";

const getTimeBlock = (isoDate: string): Block => {
  const h = new Date(isoDate).getHours();
  // 08:00–18:59 → day, 19:00–03:59 → night, 04:00–07:59 → night tail
  if (h >= 8 && h <= 18) return "day";
  return "night";
};

const getStoryBlock = (story: NightStory): Block => {
  // Priority: venue category > time fallback
  if (story.venues?.venue_mode) {
    return story.venues.venue_mode === "day" ? "day" : "night";
  }
  if (story.venue_id && story.venues) {
    const vType = story.venues.type;
    if (DAY_VENUE_TYPES.includes(vType)) return "day";
    if (NIGHT_VENUE_TYPES.includes(vType)) return "night";
  }
  return getTimeBlock(story.created_at);
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const isRecent = (iso: string, hours: number) =>
  Date.now() - new Date(iso).getTime() < hours * 3_600_000;

const hoursAgo = (iso: string) => (Date.now() - new Date(iso).getTime()) / 3_600_000;

// ─── Block ranking algorithm ─────────────────────────────────────────────────
// Score = 30% recent + 25% interaction velocity (proxy) + 15% follow + 15% SP + 10% city + 5% trend
const rankBlockStories = (
  stories: NightStory[],
  followingIds: string[],
): NightStory[] => {
  return [...stories].sort((a, b) => {
    let sA = 0, sB = 0;

    // 30% Recent activity (last 4 hours weighted highest)
    const hA = hoursAgo(a.created_at);
    const hB = hoursAgo(b.created_at);
    sA += Math.max(0, 30 - (hA / 4) * 30);
    sB += Math.max(0, 30 - (hB / 4) * 30);

    // 25% Interaction velocity proxy (likes_count as proxy for first-hour reactions)
    sA += Math.min((a.likes_count ?? 0) * 2, 25);
    sB += Math.min((b.likes_count ?? 0) * 2, 25);

    // 15% Follow relationship (mutual > following > follower)
    if (followingIds.includes(a.user_id)) sA += 15;
    if (followingIds.includes(b.user_id)) sB += 15;

    // 15% SP score (level as proxy)
    sA += Math.min((a.profiles?.level ?? 1) * 2, 15);
    sB += Math.min((b.profiles?.level ?? 1) * 2, 15);

    // 10% Venue check-in boost (city proximity proxy)
    if (a.venue_id) sA += 10;
    if (b.venue_id) sB += 10;

    // 5% Trend momentum (premium as proxy)
    if (a.profiles?.is_premium) sA += 5;
    if (b.profiles?.is_premium) sB += 5;

    return sB - sA;
  });
};

// Following tab ranking: last 3h, interaction, SP light
const rankFollowingStories = (stories: NightStory[]): NightStory[] => {
  return [...stories].sort((a, b) => {
    let sA = 0, sB = 0;
    if (isRecent(a.created_at, 3)) sA += 40;
    if (isRecent(b.created_at, 3)) sB += 40;
    sA += Math.min((a.likes_count ?? 0), 20);
    sB += Math.min((b.likes_count ?? 0), 20);
    sA += Math.min((a.profiles?.level ?? 1) * 2, 10);
    sB += Math.min((b.profiles?.level ?? 1) * 2, 10);
    return sB - sA;
  });
};

// Discover tab: rising users, cross-city, 15% randomness
const rankDiscoverStories = (stories: NightStory[], followingIds: string[]): NightStory[] => {
  // Exclude already-followed users for discovery
  const nonFollowed = stories.filter(s => !followingIds.includes(s.user_id));
  return [...nonFollowed].sort((a, b) => {
    let sA = 0, sB = 0;
    // Rising users: recent + engagement
    if (isRecent(a.created_at, 6)) sA += 30;
    if (isRecent(b.created_at, 6)) sB += 30;
    sA += Math.min((a.likes_count ?? 0) * 3, 25);
    sB += Math.min((b.likes_count ?? 0) * 3, 25);
    sA += Math.min((a.profiles?.level ?? 1) * 2, 15);
    sB += Math.min((b.profiles?.level ?? 1) * 2, 15);
    // 15% controlled randomness
    sA += Math.random() * 15;
    sB += Math.random() * 15;
    return sB - sA;
  });
};

// FOMO label
const getFomoLabel = (story: NightStory): string | undefined => {
  if (!story.venue_id) return undefined;
  if (isRecent(story.created_at, 1)) return "Az önce çekildi";
  if (isRecent(story.created_at, 3)) return "Şu an burada";
  return undefined;
};

// ─── Tabs ─────────────────────────────────────────────────────────────────────
type MainTab = "following" | "today" | "discover";

// ─── Component ────────────────────────────────────────────────────────────────
const FeedPage = () => {
  const { profile } = useAuth();
  const { isNight, mode } = useDayNight();
  const { data: stories = [], isLoading } = useStories();
  const { data: myLikes = [] } = useMyStoryLikes();
  const { data: followingIds = [] } = useFollowing();
  const likeStory = useLikeStory();
  const { data: venues = [] } = useVenues(undefined, isNight ? "night" : "day");
  const { toast } = useToast();
  const navigate = useNavigate();
  const { viewedUserIds, markViewed } = useViewedStories();

  const [showCreate, setShowCreate] = useState(false);
  const [spOverlay, setSPOverlay] = useState<number | null>(null);
  const [mainTab, setMainTab] = useState<MainTab>("today");
  const [blockView, setBlockView] = useState<Block>(isNight ? "night" : "day");
  const [viewingGroup, setViewingGroup] = useState<UserStoryGroup | null>(null);
  const [viewingIndex, setViewingIndex] = useState(0);

  const night = isNight;
  const { cityName: userCity } = useUserCity();
  const cityName = userCity ?? profile?.location ?? "Şehrim";

  // ── FOMO stats ──
  const openVenues = useMemo(() => venues.filter((v) => v.is_open), [venues]);
  const totalLive = useMemo(() => openVenues.reduce((acc, v) => acc + (v.live_checkin_count ?? 0), 0), [openVenues]);
  const topVenues = useMemo(
    () => [...openVenues].sort((a, b) => (b.crowd_level ?? 0) - (a.crowd_level ?? 0)).slice(0, 3),
    [openVenues],
  );

  // ── Block-filtered stories for BUGÜN tab ──
  const blockStories = useMemo(() => {
    const filtered = stories.filter(s => getStoryBlock(s) === blockView);
    return rankBlockStories(filtered, followingIds);
  }, [stories, blockView, followingIds]);

  // ── Following tab stories ──
  const followingStories = useMemo(() => {
    const filtered = stories.filter(s => followingIds.includes(s.user_id));
    return rankFollowingStories(filtered);
  }, [stories, followingIds]);

  // ── Discover tab stories ──
  const discoverStories = useMemo(() => {
    return rankDiscoverStories(stories, followingIds);
  }, [stories, followingIds]);

  // Active tab stories
  const activeStories = useMemo(() => {
    switch (mainTab) {
      case "following": return followingStories;
      case "today": return blockStories;
      case "discover": return discoverStories;
    }
  }, [mainTab, followingStories, blockStories, discoverStories]);

  // Story bar items
  const storyBarItems = useMemo(() => stories, [stories]);

  // Build user groups for cross-group navigation
  const userGroups = useMemo(() => {
    const map = new Map<string, UserStoryGroup>();
    for (const story of storyBarItems) {
      const existing = map.get(story.user_id);
      if (existing) {
        existing.stories.push(story);
        if (story.created_at > existing.latestAt) existing.latestAt = story.created_at;
      } else {
        map.set(story.user_id, {
          user_id: story.user_id,
          profiles: story.profiles,
          stories: [story],
          latestAt: story.created_at,
        });
      }
    }
    return Array.from(map.values());
  }, [storyBarItems]);

  const handleOpenUserStories = (group: UserStoryGroup) => {
    markViewed(group.user_id);
    setViewingGroup(group);
    setViewingIndex(0);
  };

  const handleLike = async (storyId: string) => {
    const liked = myLikes.includes(storyId);
    try {
      await likeStory.mutateAsync({ storyId, liked });
    } catch {
      toast({ title: "Hata", description: "Beğeni işlemi başarısız", variant: "destructive" });
    }
  };

  const handleNavigateStory = (idx: number) => {
    setViewingIndex(idx);
  };

  const handleStoryClose = () => {
    if (!viewingGroup) { setViewingGroup(null); return; }
    const currentGroupIdx = userGroups.findIndex(g => g.user_id === viewingGroup.user_id);
    if (currentGroupIdx >= 0 && currentGroupIdx < userGroups.length - 1) {
      const nextGroup = userGroups[currentGroupIdx + 1];
      markViewed(nextGroup.user_id);
      setViewingGroup(nextGroup);
      setViewingIndex(0);
    } else {
      setViewingGroup(null);
    }
  };

  // Dynamic header for BUGÜN
  const blockHeader = blockView === "day"
    ? `☀️ ${cityName} Day Energy`
    : `🌃 ${cityName} Night Pulse`;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 glass border-b border-border/30">
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-gradient">VYBE</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              {night ? (
                <>
                  <Moon className="w-3 h-3 text-primary" />
                  <span className="text-[11px] text-primary font-medium">Gece aktif</span>
                </>
              ) : (
                <>
                  <Sun className="w-3 h-3 text-amber-400" />
                  <span className="text-[11px] text-muted-foreground">Gündüz aktif</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ModeToggle />
            <NotificationBell />
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 bg-gradient-neon text-primary-foreground text-xs font-bold px-3 py-2 rounded-xl neon-glow"
            >
              <Plus className="w-3.5 h-3.5" />
              Paylaş
            </button>
          </div>
        </div>

        {/* Live FOMO stats */}
        <div className="flex gap-2.5 overflow-x-auto scrollbar-none px-4 pb-3">
          <div className="flex items-center gap-1.5 glass rounded-full px-3 py-1.5 whitespace-nowrap flex-shrink-0 border border-green-400/20">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
            <span className="text-xs text-foreground font-bold">{totalLive}</span>
            <span className="text-xs text-muted-foreground">kişi dışarıda</span>
          </div>
          <div className="flex items-center gap-1.5 glass rounded-full px-3 py-1.5 whitespace-nowrap flex-shrink-0 border border-primary/20">
            <Zap className="w-3 h-3 text-primary flex-shrink-0" />
            <span className="text-xs text-muted-foreground">{stories.length} aktif hikaye</span>
          </div>
          {topVenues[0] && (
            <button
              onClick={() => navigate(`/venue/${topVenues[0].id}`)}
              className="flex items-center gap-1.5 glass rounded-full px-3 py-1.5 whitespace-nowrap flex-shrink-0 border border-orange-400/20 hover:bg-orange-400/5 transition-colors"
            >
              <Flame className="w-3 h-3 text-orange-400 flex-shrink-0" />
              <span className="text-xs text-muted-foreground">{topVenues[0].name} 🔥{topVenues[0].crowd_level}%</span>
            </button>
          )}
        </div>
      </header>

      {/* ── Story Bar ── */}
      <div className="border-b border-border/30 py-1">
        <StoryBar
          stories={storyBarItems}
          viewedUserIds={viewedUserIds}
          onCreateStory={() => setShowCreate(true)}
          onViewUserStories={handleOpenUserStories}
        />
      </div>

      <main className="px-4 mt-4 space-y-4">
        {/* ── Main 3 Tabs ── */}
        <div className="flex gap-1.5 p-1 glass rounded-2xl">
          {([
            { key: "following" as MainTab, label: "TAKİP", icon: <UserCheck className="w-3.5 h-3.5" /> },
            { key: "today" as MainTab, label: "BUGÜN", icon: <Calendar className="w-3.5 h-3.5" /> },
            { key: "discover" as MainTab, label: "KEŞFET", icon: <Sparkles className="w-3.5 h-3.5" /> },
          ]).map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setMainTab(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all duration-200 ${
                mainTab === key
                  ? "bg-gradient-neon text-primary-foreground neon-glow shadow-lg"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>

        {/* ── BUGÜN: Day/Night Block Toggle ── */}
        {mainTab === "today" && (
          <div className="space-y-3">
            {/* Block sub-toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setBlockView("day")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                  blockView === "day"
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/20"
                    : "glass text-muted-foreground hover:text-foreground border border-border/50"
                }`}
              >
                <Sun className="w-4 h-4" />
                Gündüz
              </button>
              <button
                onClick={() => setBlockView("night")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                  blockView === "night"
                    ? "bg-gradient-neon text-primary-foreground neon-glow shadow-lg"
                    : "glass text-muted-foreground hover:text-foreground border border-border/50"
                }`}
              >
                <Moon className="w-4 h-4" />
                Gece
              </button>
            </div>

            {/* Dynamic block header */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-foreground">{blockHeader}</span>
              <div className="flex-1 h-px bg-border/30" />
              <span className="text-[10px] text-muted-foreground font-medium">
                {blockStories.length} hikaye
              </span>
            </div>
          </div>
        )}

        {/* ── KEŞFET Header ── */}
        {mainTab === "discover" && (
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold text-foreground">Yükselen & Trend</span>
            <div className="flex-1 h-px bg-border/30" />
          </div>
        )}

        {/* ── TAKİP Header ── */}
        {mainTab === "following" && (
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-secondary" />
            <span className="text-sm font-bold text-foreground">Takip Ettiklerin</span>
            <div className="flex-1 h-px bg-border/30" />
            <span className="text-[10px] text-muted-foreground font-medium">
              {followingStories.length} hikaye
            </span>
          </div>
        )}

        {/* Trending venues strip (only in today tab) */}
        {mainTab === "today" && topVenues.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold text-foreground">
                  {blockView === "night" ? "Bu Gece Trend" : "Bugün Popüler"}
                </span>
              </div>
              <button
                onClick={() => navigate("/map")}
                className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-secondary transition-colors"
              >
                Tümü <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1">
              {topVenues.map((venue, i) => (
                <button
                  key={venue.id}
                  onClick={() => navigate(`/venue/${venue.id}`)}
                  className="relative glass rounded-2xl overflow-hidden min-w-[150px] flex-shrink-0 hover:neon-glow transition-all border border-border/30"
                >
                  <div className="relative h-20 overflow-hidden">
                    <img src={venue.image_url ?? "/placeholder.svg"} alt={venue.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
                    <span className="absolute top-2 left-2 font-display text-base font-black text-primary">#{i + 1}</span>
                  </div>
                  <div className="px-3 py-2">
                    <p className="text-xs font-bold text-foreground truncate">{venue.name}</p>
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-secondary" />
                        <span className="text-[10px] text-secondary font-medium">{venue.live_checkin_count ?? 0}</span>
                      </div>
                      <div className="w-12 h-1 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-neon rounded-full" style={{ width: `${venue.crowd_level}%` }} />
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* FOMO connections inject */}
        {mainTab === "today" && stories.length > 0 && (
          <div className="glass rounded-xl px-4 py-3 border border-secondary/15 flex items-center gap-3">
            <div className="flex -space-x-2">
              {storyBarItems.slice(0, 3).map((s) => (
                <div
                  key={s.id}
                  className="w-8 h-8 rounded-full bg-gradient-neon flex items-center justify-center text-primary-foreground text-[10px] font-bold ring-2 ring-background overflow-hidden"
                >
                  {s.profiles?.avatar_url ? (
                    <img src={s.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    (s.profiles?.display_name ?? "?")[0].toUpperCase()
                  )}
                </div>
              ))}
            </div>
            <span className="text-xs text-muted-foreground flex-1">
              <span className="text-foreground font-semibold">{stories.length} kişi</span>{" "}
              {blockView === "night" ? "bu gece dışarıda" : "bugün aktif"} — sen ne yapıyorsun?
            </span>
            <button
              onClick={() => setShowCreate(true)}
              className="text-[10px] font-bold text-primary border border-primary/30 px-2.5 py-1 rounded-full hover:bg-primary/10 transition-colors whitespace-nowrap"
            >
              Paylaş
            </button>
          </div>
        )}

        {/* Feed posts */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass rounded-2xl h-52 animate-pulse" />
            ))}
          </div>
        ) : activeStories.length === 0 ? (
          <div className="glass rounded-2xl p-10 text-center mt-4 border border-border/30">
            <span className="text-5xl block mb-3">
              {mainTab === "following" ? "👥" : mainTab === "discover" ? "🔭" : blockView === "night" ? "🌙" : "☀️"}
            </span>
            <p className="font-display text-lg font-bold text-foreground">
              {mainTab === "following"
                ? "Takip ettiklerinin hikayesi yok"
                : mainTab === "discover"
                  ? "Keşfedilecek hikaye yok"
                  : "Henüz hikaye yok"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {mainTab === "following"
                ? "Daha fazla kişi takip et!"
                : "İlk hikayeyi sen paylaş!"}
            </p>
            <button
              onClick={() => mainTab === "following" ? navigate("/connections") : setShowCreate(true)}
              className="mt-4 bg-gradient-neon text-primary-foreground text-sm font-bold px-5 py-2.5 rounded-full neon-glow"
            >
              {mainTab === "following" ? "Kişileri Keşfet" : "+ Hikaye Paylaş"}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {activeStories.map((story, idx) => (
              <FeedPostCard
                key={story.id}
                story={story}
                liked={myLikes.includes(story.id)}
                onLike={handleLike}
                fomoLabel={getFomoLabel(story)}
                index={idx}
              />
            ))}
          </div>
        )}
      </main>

      {/* ── Story Viewer ── */}
      {viewingGroup && viewingGroup.stories[viewingIndex] && (
        <StoryViewer
          story={viewingGroup.stories[viewingIndex]}
          allStories={viewingGroup.stories}
          currentIndex={viewingIndex}
          onClose={handleStoryClose}
          onNavigate={handleNavigateStory}
        />
      )}

      {/* ── Story Creator ── */}
      {showCreate && (
        <StoryCreator
          venues={venues}
          onClose={() => setShowCreate(false)}
          onSuccess={(sp: number) => {
            setShowCreate(false);
            setSPOverlay(sp);
          }}
        />
      )}

      {/* SP Overlay */}
      {spOverlay !== null && (
        <div className="fixed inset-0 z-[300]">
          <StorySPOverlay spAmount={spOverlay} onComplete={() => setSPOverlay(null)} />
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default FeedPage;
