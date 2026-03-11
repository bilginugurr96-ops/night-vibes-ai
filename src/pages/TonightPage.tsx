import { useNavigate } from "react-router-dom";
import { Flame, MapPin, Users, Crown, Zap, Star, ChevronRight } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useHeatMap, HEAT_TIERS, HeatVenue } from "@/hooks/useHeatMap";
import { useDayNight } from "@/contexts/DayNightContext";
import ModeToggle from "@/components/ModeToggle";

const TonightPage = () => {
  const navigate = useNavigate();
  const { isNight } = useDayNight();
  const { data: venues = [], isLoading } = useHeatMap(isNight ? "night" : "day");

  // Sort by heat score descending (most active first)
  const rankedVenues = venues.filter((v) => v.is_open).slice(0, 20);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 glass px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-bold text-gradient">
              {isNight ? "🌙 Bu Gece" : "☀️ Bugün"}
            </h1>
            <p className="text-xs text-muted-foreground">Şehirdeki en aktif mekanlar</p>
          </div>
          <ModeToggle />
        </div>
      </header>

      <div className="px-4 mt-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Flame className="w-6 h-6 text-destructive animate-pulse mr-2" />
            <span className="text-sm text-muted-foreground">Yükleniyor…</span>
          </div>
        ) : rankedVenues.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground text-sm">
            Şu an aktif mekan bulunamadı
          </div>
        ) : (
          <div className="space-y-3">
            {rankedVenues.map((venue, i) => (
              <VenueRankCard key={venue.id} venue={venue} rank={i + 1} onTap={() => navigate(`/venue/${venue.id}`)} />
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

function VenueRankCard({ venue, rank, onTap }: { venue: HeatVenue; rank: number; onTap: () => void }) {
  const tier = HEAT_TIERS[venue.heatTier];
  const isTop3 = rank <= 3;
  const rankColors = ["", "from-amber-500 to-yellow-400", "from-slate-300 to-slate-400", "from-amber-700 to-amber-600"];
  const rankEmoji = ["", "👑", "🥈", "🥉"];

  return (
    <div
      onClick={onTap}
      className={`glass rounded-2xl overflow-hidden cursor-pointer group transition-all duration-300 hover:scale-[1.01] animate-fade-in-up ${
        isTop3 ? "border border-primary/20" : ""
      }`}
      style={isTop3 ? { boxShadow: `0 0 20px ${tier.glowColor}` } : {}}
    >
      <div className="flex gap-3 p-3">
        {/* Rank Badge */}
        <div className="flex flex-col items-center justify-center w-12 flex-shrink-0">
          {isTop3 ? (
            <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${rankColors[rank]} flex items-center justify-center`}>
              <span className="text-lg">{rankEmoji[rank]}</span>
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full glass flex items-center justify-center">
              <span className="text-sm font-bold text-muted-foreground">#{rank}</span>
            </div>
          )}
        </div>

        {/* Image */}
        <div className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
          <img
            src={venue.image_url ?? "/placeholder.svg"}
            alt={venue.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="font-display text-sm font-bold text-foreground truncate">{venue.name}</h3>
              {venue.has_vip && <Crown className="w-3 h-3 text-amber-400" />}
            </div>
            {venue.address && (
              <div className="flex items-center gap-1 mb-1">
                <MapPin className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                <span className="text-xs text-muted-foreground truncate">{venue.address}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-primary fill-primary" />
              <span className="text-xs font-semibold">{venue.rating}</span>
            </div>
            <div
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
              style={{ background: `${tier.color}22`, color: tier.color }}
            >
              {tier.emoji} {venue.heatScore}
            </div>
            {venue.isTrending && (
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white"
                style={{ background: tier.color }}
              >
                🔥 HOT
              </span>
            )}
          </div>
        </div>

        <ChevronRight className="w-4 h-4 text-muted-foreground/40 self-center flex-shrink-0" />
      </div>
    </div>
  );
}

export default TonightPage;
