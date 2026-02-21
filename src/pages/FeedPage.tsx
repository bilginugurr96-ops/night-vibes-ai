import { useState, useMemo } from "react";
import {
  Flame, Zap, Plus, TrendingUp, Users, Moon, Sun,
  ChevronRight, Sparkles,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import NotificationBell from "@/components/NotificationBell";
import ModeToggle from "@/components/ModeToggle";
import StoryBar from "@/components/StoryBar";
import StoryViewer from "@/components/StoryViewer";
import StoryCreator from "@/components/StoryCreator";
import FeedPostCard from "@/components/FeedPostCard";
import { useStories, useLikeStory, useMyStoryLikes, NightStory } from "@/hooks/useStories";
import { useVenues } from "@/hooks/useVenues";
import { useAuth } from "@/contexts/AuthContext";
import { useDayNight } from "@/contexts/DayNightContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

// ─── helpers ──────────────────────────────────────────────────────────────────
const isNightTime = () => {
  const h = new Date().getHours();
  return h >= 20 || h < 4;
};

const isRecent = (iso: string, hours: number) =>
  Date.now() - new Date(iso).getTime() < hours * 3_600_000;

// ─── Smart feed ranking ────────────────────────────────────────────────────────
const rankStories = (stories: NightStory[]): NightStory[] => {
  const night = isNightTime();
  return [...stories].sort((a, b) => {
    let scoreA = 0;
    let scoreB = 0;

    // Premium boost
    if (a.profiles?.is_premium) scoreA += 20;
    if (b.profiles?.is_premium) scoreB += 20;

    // Recency: last 6h
    if (isRecent(a.created_at, 6)) scoreA += 30;
    if (isRecent(b.created_at, 6)) scoreB += 30;

    // Night hours → extra boost for recent live
    if (night && isRecent(a.created_at, 2)) scoreA += 25;
    if (night && isRecent(b.created_at, 2)) scoreB += 25;

    // Engagement
    scoreA += Math.min((a.likes_count ?? 0) * 2 + (a.views_count ?? 0) * 0.5, 20);
    scoreB += Math.min((b.likes_count ?? 0) * 2 + (b.views_count ?? 0) * 0.5, 20);

    // Venue-tagged = higher quality
    if (a.venue_id) scoreA += 10;
    if (b.venue_id) scoreB += 10;

    return scoreB - scoreA;
  });
};

// FOMO label logic
const getFomoLabel = (story: NightStory): string | undefined => {
  if (!story.venue_id) return undefined;
  if (isRecent(story.created_at, 1)) return "Az önce çekildi";
  if (isRecent(story.created_at, 3)) return "Bu gece burada";
  return undefined;
};

// ─── Component ────────────────────────────────────────────────────────────────
const FeedPage = () => {
  const { profile } = useAuth();
  const { isNight, mode } = useDayNight();
  const { data: stories = [], isLoading } = useStories();
  const { data: myLikes = [] } = useMyStoryLikes();
  const likeStory = useLikeStory();
  const { data: venues = [] } = useVenues();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [showCreate, setShowCreate] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "night" | "following">("all");
  const [viewingIndex, setViewingIndex] = useState<number | null>(null);

  // FOMO stats
  const openVenues = useMemo(() => venues.filter((v) => v.is_open), [venues]);
  const totalLive = useMemo(() => openVenues.reduce((acc, v) => acc + (v.live_checkin_count ?? 0), 0), [openVenues]);
  const topVenues = useMemo(
    () => [...openVenues].sort((a, b) => (b.crowd_level ?? 0) - (a.crowd_level ?? 0)).slice(0, 3),
    [openVenues],
  );
  const night = isNight;
  const rankedStories = useMemo(() => {
    let filtered = stories;
    if (activeFilter === "night") {
      filtered = stories.filter((s) => isRecent(s.created_at, 6));
    }
    return rankStories(filtered);
  }, [stories, activeFilter]);

  // Story bar stories (last 24h, premium first)
  const storyBarItems = useMemo(
    () => [...stories].sort((a, b) => (b.profiles?.is_premium ? 1 : 0) - (a.profiles?.is_premium ? 1 : 0)),
    [stories],
  );

  const handleLike = async (storyId: string) => {
    const liked = myLikes.includes(storyId);
    try {
      await likeStory.mutateAsync({ storyId, liked });
    } catch {
      toast({ title: "Hata", description: "Beğeni işlemi başarısız", variant: "destructive" });
    }
  };

  const handleOpenStory = (story: NightStory) => {
    const idx = storyBarItems.findIndex((s) => s.id === story.id);
    setViewingIndex(idx >= 0 ? idx : 0);
  };

  const handleNavigateStory = (idx: number) => {
    setViewingIndex(idx);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 glass border-b border-border/30">
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-gradient">NightHub</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              {night ? (
                <>
                  <Moon className="w-3 h-3 text-primary" />
                  <span className="text-[11px] text-primary font-medium">Gece aktif</span>
                </>
              ) : (
                <>
                  <Sun className="w-3 h-3 text-amber-400" />
                  <span className="text-[11px] text-muted-foreground">Gündüz modu</span>
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
          onCreateStory={() => setShowCreate(true)}
          onViewStory={handleOpenStory}
        />
      </div>

      <main className="px-4 mt-4 space-y-4">
        {/* Filter tabs */}
        <div className="flex gap-2">
          {[
            { key: "all", label: "Keşfet", icon: <Sparkles className="w-3.5 h-3.5" /> },
            { key: "night", label: night ? "Bu Gece" : "Dün Gece", icon: <Moon className="w-3.5 h-3.5" /> },
            { key: "following", label: "Takip", icon: <Users className="w-3.5 h-3.5" /> },
          ].map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setActiveFilter(key as typeof activeFilter)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                activeFilter === key
                  ? "bg-gradient-neon text-primary-foreground neon-glow"
                  : "glass text-muted-foreground hover:text-foreground border border-border/50"
              }`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>

        {/* Trending venues strip (night only) */}
        {night && topVenues.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold text-foreground">Bu Gece Trend</span>
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
                    <img
                      src={venue.image_url ?? "/placeholder.svg"}
                      alt={venue.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
                    <span className="absolute top-2 left-2 font-display text-base font-black text-primary">
                      #{i + 1}
                    </span>
                  </div>
                  <div className="px-3 py-2">
                    <p className="text-xs font-bold text-foreground truncate">{venue.name}</p>
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-secondary" />
                        <span className="text-[10px] text-secondary font-medium">{venue.live_checkin_count ?? 0}</span>
                      </div>
                      <div className="w-12 h-1 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-neon rounded-full"
                          style={{ width: `${venue.crowd_level}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Daytime highlight label */}
        {!night && (
          <div className="glass rounded-2xl px-4 py-3 flex items-center gap-3 border border-yellow-400/20">
            <Sun className="w-5 h-5 text-yellow-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-foreground">Dün Gecenin Öne Çıkanları</p>
              <p className="text-xs text-muted-foreground">Aktif gece 20:00'dan itibaren başlar</p>
            </div>
          </div>
        )}

        {/* FOMO connections inject */}
        {stories.length > 0 && (
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
              <span className="text-foreground font-semibold">{stories.length} kişi</span> bu gece dışarıda — sen ne yapıyorsun?
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
        ) : rankedStories.length === 0 ? (
          <div className="glass rounded-2xl p-10 text-center mt-4 border border-border/30">
            <span className="text-5xl block mb-3">🌙</span>
            <p className="font-display text-lg font-bold text-foreground">Henüz hikaye yok</p>
            <p className="text-sm text-muted-foreground mt-1">İlk geceyi sen başlat!</p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-4 bg-gradient-neon text-primary-foreground text-sm font-bold px-5 py-2.5 rounded-full neon-glow"
            >
              + Hikaye Paylaş
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {rankedStories.map((story, idx) => (
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
      {viewingIndex !== null && storyBarItems[viewingIndex] && (
        <StoryViewer
          story={storyBarItems[viewingIndex]}
          allStories={storyBarItems}
          currentIndex={viewingIndex}
          onClose={() => setViewingIndex(null)}
          onNavigate={handleNavigateStory}
        />
      )}

      {/* ── Story Creator ── */}
      {showCreate && (
        <StoryCreator
          venues={venues}
          onClose={() => setShowCreate(false)}
          onSuccess={() => setShowCreate(false)}
        />
      )}

      <BottomNav />
    </div>
  );
};

export default FeedPage;
