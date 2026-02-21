import { MapPin, Star, Users, Flame, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { VenueDB } from "@/hooks/useVenues";

interface VenueCardProps {
  venue: VenueDB;
  index: number;
}

const VenueCard = ({ venue, index }: VenueCardProps) => {
  const navigate = useNavigate();

  const crowdColor = (venue.crowd_level ?? 50) >= 70 ? "text-primary" : (venue.crowd_level ?? 50) >= 40 ? "text-secondary" : "text-muted-foreground";

  return (
    <div
      onClick={() => navigate(`/venue/${venue.id}`)}
      className="glass rounded-2xl overflow-hidden cursor-pointer group transition-all duration-300 hover:scale-[1.02] hover:neon-glow animate-fade-in-up"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="relative h-48 overflow-hidden">
        <img
          src={venue.image_url ?? "/placeholder.svg"}
          alt={venue.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />

        {venue.has_vip && (
          <span className="absolute top-3 right-3 bg-gradient-neon text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
            VIP
          </span>
        )}

        <div className="absolute top-3 left-3 glass rounded-full px-2.5 py-1 flex items-center gap-1">
          <span className={`w-2 h-2 rounded-full ${venue.is_open ? "bg-green-400 animate-pulse" : "bg-red-400"}`} />
          <span className="text-xs font-medium text-foreground">{venue.is_open ? "Açık" : "Kapalı"}</span>
        </div>

        {/* Live count badge */}
        {venue.is_open && (venue.live_checkin_count ?? 0) > 0 && (
          <div className="absolute top-3 left-20 glass rounded-full px-2.5 py-1 flex items-center gap-1">
            <Zap className="w-3 h-3 text-secondary" />
            <span className="text-xs font-medium text-secondary">{venue.live_checkin_count} kişi</span>
          </div>
        )}

        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="font-display text-xl font-bold text-foreground">{venue.name}</h3>
          <div className="flex items-center gap-1 mt-1">
            <MapPin className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{venue.address}</span>
            {venue.distance && <span className="text-xs text-muted-foreground">• {venue.distance}</span>}
          </div>
        </div>
      </div>

      <div className="p-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 text-primary fill-primary" />
            <span className="text-sm font-semibold text-foreground">{venue.rating}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Flame className={`w-4 h-4 ${crowdColor}`} />
            <div className="w-14 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-cyan rounded-full transition-all duration-500"
                style={{ width: `${venue.crowd_level}%` }}
              />
            </div>
            <span className={`text-xs ${crowdColor} font-medium`}>%{venue.crowd_level}</span>
          </div>
        </div>
        <div className="flex gap-1.5">
          {(venue.tags ?? []).slice(0, 2).map((tag) => (
            <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VenueCard;
