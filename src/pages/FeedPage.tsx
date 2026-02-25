import { useState, useMemo, useCallback } from "react";
import {
  Flame, Zap, Plus, TrendingUp, Users, Moon, Sun,
  ChevronRight, Sparkles, UserCheck, Calendar,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import NotificationBell from "@/components/NotificationBell";
import ModeToggle from "@/components/ModeToggle";
import { UserStoryGroup } from "@/components/StoryBar";
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
  // 18:00–04:59 → night, 05:00–17:59 → day
  if (h >= 18 || h < 5) return "night";
  return "day";
};

const getStoryBlock = (story: NightStory): Block => {
  // Priority 1: venue type determines section
  if (story.venue_id && story.venues) {
    const vType = story.venues.type;
    if (NIGHT_VENUE_TYPES.includes(vType)) return "night";
    if (DAY_VENUE_TYPES.includes(vType)) return "day";
  }
  // Priority 2: venue_mode field
  if (story.venues?.venue_mode) {
    return story.venues.venue_mode === "day" ? "day" : "night";
  }
  // Fallback: post time
  return getTimeBlock(story.created_at);
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const isRecent = (iso: string, hours: number) =>
  Date.now() - new Date(iso).getTime() < hours * 3_600_000;

const hoursAgo = (iso: string) => (Date.now() - new Date(iso).getTime()) / 3_600_000;

const INACTIVE_THRESHOLD_MS = 7 * 24 * 3_600_000; // 7 days

// ─── Relevance scoring with boost rules ──────────────────────────────────────
const computeRelevanceScore = (story: NightStory, followingIds: string[]): number => {
  let score = 0;

  // Recency: max 30 pts for very recent, decays over 12h
  const h = hoursAgo(story.created_at);
  score += Math.max(0, 30 - (h / 12) * 30);

  // Interaction velocity: likes as proxy
  score += Math.min((story.likes_count ?? 0) * 2, 25);

  // Follow relationship boost
  if (followingIds.includes(story.user_id)) score += 15;

  // Active user boost (last_active < 24h approximated by recent post)
  if (isRecent(story.created_at, 24)) score += 20;

  // SP boost: level / 10 (level is SP proxy)
  score += Math.min((story.profiles?.level ?? 1), 15);

  // Venue check-in boost (same venue viewers get +30, approximated as having venue)
  if (story.venue_id) score += 30;

  // Premium / trend momentum
  if (story.profiles?.is_premium) score += 5;

  return score;
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

// Discover tab: block-filtered, relevance-scored, excludes inactive & followed
const rankDiscoverStories = (
  stories: NightStory[],
  followingIds: string[],
  block: Block,
): NightStory[] => {
  const now = Date.now();
  const filtered = stories
    .filter(s => getStoryBlock(s) === block) // section filter
    .filter(s => !followingIds.includes(s.user_id)) // exclude followed
    .filter(s => isRecent(s.created_at, 7 * 24)); // exclude inactive (7+ days)

  const scored = filtered.map(s => ({
    story: s,
    score: computeRelevanceScore(s, followingIds) + Math.random() * 10, // 10% randomness
  }));

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 50)
    .map(s => s.story);
};

// FOMO label
const getFomoLabel = (story: NightStory): string | undefined => {
  if (!story.venue_id) return undefined;
  if (isRecent(story.created_at, 1)) return "Az önce çekildi";
  if (isRecent(story.created_at, 3)) return "Şu an burada";
  return undefined;
};

// ─── Tabs ─────────────────────────────────────────────────────────────────────
type MainTab = "following" | "discover" | "mine";

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
  const [mainTab, setMainTab] = useState<MainTab>("discover");
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

  // ── Block-filtered stories (used for following tab too) ──
  const blockStories = useMemo(() => {
    return stories
      .filter(s => getStoryBlock(s) === blockView)
      .filter(s => isRecent(s.created_at, 7 * 24))
      .sort((a, b) => computeRelevanceScore(b, followingIds) - computeRelevanceScore(a, followingIds))
      .slice(0, 50);
  }, [stories, blockView, followingIds]);

  // ── Following tab stories (also block-filtered) ──
  const followingStories = useMemo(() => {
    const filtered = stories
      .filter(s => followingIds.includes(s.user_id))
      .filter(s => getStoryBlock(s) === blockView);
    return rankFollowingStories(filtered);
  }, [stories, followingIds, blockView]);

  // ── Discover tab stories (block-filtered + relevance scored) ──
  const discoverStories = useMemo(() => {
    return rankDiscoverStories(stories, followingIds, blockView);
  }, [stories, followingIds, blockView]);

  // ── My stories (also block-filtered) ──
  const { user } = useAuth();
  const myStories = useMemo(() => {
    if (!user) return [];
    return stories
      .filter(s => s.user_id === user.id)
      .filter(s => getStoryBlock(s) === blockView)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [stories, user, blockView]);

  // Active tab stories
  const activeStories = useMemo(() => {
    switch (mainTab) {
      case "following": return followingStories;
      case "discover": return discoverStories;
      case "mine": return myStories;
    }
  }, [mainTab, followingStories, blockStories, discoverStories, myStories]);

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
            <button
              onClick={() => setBlockView(blockView === "night" ? "day" : "night")}
              className="flex items-center gap-1.5 mt-0.5 group cursor-pointer"
            >
              {blockView === "night" ? (
                <>
                  <Moon className="w-3 h-3 text-primary" />
                  <span className="text-[11px] text-primary font-medium">Gece modu</span>
                </>
              ) : (
                <>
                  <Sun className="w-3 h-3 text-amber-400" />
                  <span className="text-[11px] text-muted-foreground">Gündüz modu</span>
                </>
              )}
              <span className="text-[9px] text-muted-foreground/60 group-hover:text-foreground transition-colors">⇄</span>
            </button>
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


      <main className="px-4 mt-4 space-y-4">
        {/* ── Main 3 Tabs ── */}
        <div className="flex gap-1.5 p-1 glass rounded-2xl">
          {([
            { key: "following" as MainTab, label: "TAKİP", icon: <UserCheck className="w-3.5 h-3.5" /> },
            { key: "discover" as MainTab, label: "KEŞFET", icon: <Sparkles className="w-3.5 h-3.5" /> },
            { key: "mine" as MainTab, label: "BENİM", icon: <Users className="w-3.5 h-3.5" /> },
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


        {/* ── KEŞFET Header ── */}
        {mainTab === "discover" && (
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold text-foreground">Yükselen & Trend</span>
            <div className="flex-1 h-px bg-border/30" />
          </div>
        )}

        {/* ── BENİM Header ── */}
        {mainTab === "mine" && (
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold text-foreground">Paylaşımlarım</span>
            <div className="flex-1 h-px bg-border/30" />
            <span className="text-[10px] text-muted-foreground font-medium">
              {myStories.length} paylaşım
            </span>
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

        {/* Trending venues strip (only in discover tab) */}
        {mainTab === "discover" && topVenues.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold text-foreground">Trend Mekanlar</span>
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
        {mainTab === "discover" && stories.length > 0 && (
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
              şu an aktif — sen ne yapıyorsun?
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
                  : mainTab === "mine"
                    ? "Henüz paylaşımın yok"
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
