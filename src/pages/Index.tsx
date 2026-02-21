import { useState } from "react";
import { Search } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import VenueCard from "@/components/VenueCard";
import CategoryFilter from "@/components/CategoryFilter";
import BoostTimer from "@/components/BoostTimer";
import DiscoveryBanner from "@/components/DiscoveryBanner";
import { useVenues } from "@/hooks/useVenues";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveCheckin } from "@/hooks/useCheckins";

const Index = () => {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const { profile } = useAuth();
  const { data: venues = [], isLoading: venuesLoading } = useVenues(selectedCategory);
  const { data: activeCheckin } = useActiveCheckin();

  const hasBoost = !!activeCheckin;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 glass">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-gradient">VYBE</h1>
            <p className="text-[10px] text-muted-foreground">{profile?.location ?? "—"}</p>
          </div>
          <button className="p-2 rounded-xl glass text-muted-foreground hover:text-foreground transition-colors">
            <Search className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="px-4 space-y-4 mt-4">
        {/* Active boost timer */}
        {hasBoost && activeCheckin.boost_expires_at && (
          <BoostTimer
            expiresAt={activeCheckin.boost_expires_at}
            venueName={(activeCheckin as any).venues?.name}
          />
        )}

        {/* Discovery banner — only if no active boost */}
        {!hasBoost && <DiscoveryBanner type="go-live" />}

        {/* Categories */}
        <CategoryFilter selected={selectedCategory} onSelect={setSelectedCategory} />

        {/* Venues */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg font-bold text-foreground">Explore</h2>
          </div>
          {venuesLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="glass rounded-2xl h-52 animate-pulse" />
              ))}
            </div>
          ) : venues.length === 0 ? (
            <div className="glass rounded-2xl p-6 text-center">
              <p className="text-muted-foreground text-sm">No venues in this category</p>
            </div>
          ) : (
            <div className="space-y-4">
              {venues.map((venue, i) => (
                <VenueCard
                  key={venue.id}
                  venue={venue}
                  index={i}
                  hasActiveUsers={(venue.live_checkin_count ?? 0) > 0}
                />
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
