import { MapPin, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { VenueDB } from "@/hooks/useVenues";

interface VenueCardProps {
  venue: VenueDB;
  index: number;
  hasActiveUsers?: boolean;
}

const VenueCard = ({ venue, index, hasActiveUsers }: VenueCardProps) => {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/venue/${venue.id}`)}
      className={`glass rounded-2xl overflow-hidden cursor-pointer group transition-all duration-300 hover:scale-[1.02] animate-fade-in-up ${
        hasActiveUsers ? "border-primary/10" : ""
      }`}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="relative h-48 overflow-hidden">
        <img
          src={venue.image_url ?? "/placeholder.svg"}
          alt={venue.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />

        {venue.has_vip && (
          <span className="absolute top-3 right-3 text-[10px] tracking-widest uppercase text-primary/70 font-medium glass rounded-full px-2.5 py-1">
            VIP
          </span>
        )}

        <div className="absolute top-3 left-3 glass rounded-full px-2.5 py-1 flex items-center gap-1">
          <span className={`w-1.5 h-1.5 rounded-full ${venue.is_open ? "bg-green-400/70" : "bg-red-400/70"}`} />
          <span className="text-[10px] font-medium text-foreground/80">{venue.is_open ? "Open" : "Closed"}</span>
        </div>

        {/* Subtle "active nearby" indicator — no numbers */}
        {hasActiveUsers && venue.is_open && (
          <div className="absolute top-3 left-20 glass rounded-full px-2.5 py-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-pulse" />
            <span className="text-[10px] text-muted-foreground">Active</span>
          </div>
        )}

        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="font-display text-xl font-bold text-foreground">{venue.name}</h3>
          <div className="flex items-center gap-1 mt-1">
            <MapPin className="w-3 h-3 text-muted-foreground/50" />
            <span className="text-[10px] text-muted-foreground">{venue.address}</span>
            {venue.distance && <span className="text-[10px] text-muted-foreground">· {venue.distance}</span>}
          </div>
        </div>
      </div>

      <div className="p-3 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Star className="w-3.5 h-3.5 text-primary/60 fill-primary/60" />
          <span className="text-xs font-medium text-foreground/80">{venue.vibe_rating ?? venue.rating}</span>
        </div>
        <div className="flex gap-1.5">
          {(venue.tags ?? []).slice(0, 2).map((tag) => (
            <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-muted/50 text-muted-foreground">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VenueCard;
