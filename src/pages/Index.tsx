import { useState } from "react";
import { Search, Flame, Zap, TrendingUp } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import VenueCard from "@/components/VenueCard";
import CategoryFilter from "@/components/CategoryFilter";
import { useVenues } from "@/hooks/useVenues";
import { useAuth } from "@/contexts/AuthContext";
import { useStories } from "@/hooks/useStories";

const LEVEL_NAMES = ["", "Gece Yenisi", "Kulüp Kaşifi", "VIP Sosyalite", "Şehir Simgesi", "Global Yıldız"];
const getLevelName = (l: number) => LEVEL_NAMES[Math.min(l, LEVEL_NAMES.length - 1)] ?? "Global Yıldız";

const Index = () => {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const { profile } = useAuth();
  const { data: venues = [], isLoading: venuesLoading } = useVenues(selectedCategory);
  const { data: stories = [] } = useStories();

  // FOMO calculations
  const openVenues = venues.filter((v) => v.is_open);
  const totalLive = openVenues.reduce((acc, v) => acc + (v.live_checkin_count ?? 0), 0);
  const trendingVenues = [...venues].sort((a, b) => (b.crowd_level ?? 0) - (a.crowd_level ?? 0)).slice(0, 3);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 glass">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-gradient">VYBE</h1>
            <p className="text-xs text-muted-foreground">{profile?.location ?? "Istanbul, Türkiye"}</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-xl glass text-muted-foreground hover:text-foreground transition-colors">
              <Search className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-1.5 glass rounded-xl px-3 py-2">
              <span className="text-xs font-bold text-primary">{getLevelName(profile?.level ?? 1).split(" ")[0]}</span>
              <span className="text-xs text-muted-foreground">{profile?.xp ?? 0} XP</span>
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 space-y-6 mt-4">
        {/* FOMO Dashboard */}
        <div className="glass rounded-2xl p-4 neon-glow animate-slide-up">
          <div className="flex items-center gap-2 mb-3">
            <Flame className="w-5 h-5 text-primary" />
            <span className="text-sm font-bold text-foreground">Bu Gece İstanbul'da</span>
            <span className="ml-auto flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-green-400 font-medium">Canlı</span>
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="font-display text-xl font-bold text-primary">{totalLive}</p>
              <p className="text-[10px] text-muted-foreground">Kişi dışarıda</p>
            </div>
            <div className="text-center">
              <p className="font-display text-xl font-bold text-secondary">{openVenues.length}</p>
              <p className="text-[10px] text-muted-foreground">Açık mekan</p>
            </div>
            <div className="text-center">
              <p className="font-display text-xl font-bold text-accent">{stories.length}</p>
              <p className="text-[10px] text-muted-foreground">Aktif hikaye</p>
            </div>
          </div>
          {trendingVenues[0] && (
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground">
                🔥 <span className="text-foreground font-medium">{trendingVenues[0].name}</span> en hareketli yer — %{trendingVenues[0].crowd_level} doluluk
              </p>
            </div>
          )}
        </div>

        {/* Tonight Trending */}
        {trendingVenues.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-primary" />
              <h2 className="font-display text-lg font-bold text-foreground">Bu Gece Trend</h2>
            </div>
            <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1">
              {trendingVenues.map((venue, i) => (
                <div key={venue.id} className="glass rounded-2xl overflow-hidden min-w-[200px] flex-shrink-0 cursor-pointer hover:neon-glow transition-all">
                  <div className="relative h-28 overflow-hidden">
                    <img src={venue.image_url ?? "/placeholder.svg"} alt={venue.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                    <span className="absolute top-2 left-2 text-sm font-bold text-primary">#{i + 1}</span>
                    <div className="absolute bottom-2 left-2 right-2">
                      <p className="text-xs font-bold text-foreground">{venue.name}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Zap className="w-3 h-3 text-secondary" />
                        <span className="text-[10px] text-secondary">{venue.live_checkin_count ?? 0} kişi şu an burada</span>
                      </div>
                    </div>
                  </div>
                  <div className="px-3 py-2 flex items-center justify-between">
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-neon rounded-full" style={{ width: `${venue.crowd_level}%` }} />
                    </div>
                    <span className="text-[10px] text-muted-foreground ml-2 flex-shrink-0">%{venue.crowd_level}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Categories */}
        <CategoryFilter selected={selectedCategory} onSelect={setSelectedCategory} />

        {/* Venues */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg font-bold text-foreground">Tüm Mekanlar</h2>
          </div>
          {venuesLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="glass rounded-2xl h-52 animate-pulse" />
              ))}
            </div>
          ) : venues.length === 0 ? (
            <div className="glass rounded-2xl p-6 text-center">
              <p className="text-muted-foreground text-sm">Bu kategoride mekan yok</p>
            </div>
          ) : (
            <div className="space-y-4">
              {venues.map((venue, i) => (
                <VenueCard key={venue.id} venue={venue} index={i} />
              ))}
            </div>
          )}
        </section>
      </main>

      <BottomNav />
    </div>
  );
};

export default Index;
