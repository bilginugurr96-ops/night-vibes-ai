import { Calendar, Clock, MapPin, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { EventDB } from "@/hooks/useEvents";

interface EventCardProps {
  event: EventDB;
}

const EventCard = ({ event }: EventCardProps) => {
  const navigate = useNavigate();

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
  };

  const formatTime = (timeStr: string) => timeStr.substring(0, 5);

  return (
    <div
      onClick={() => navigate(`/event/${event.id}`)}
      className="glass rounded-2xl overflow-hidden cursor-pointer min-w-[280px] snap-start group transition-all duration-300 hover:neon-glow"
    >
      <div className="relative h-36 overflow-hidden">
        <img
          src={event.image_url ?? "/placeholder.svg"}
          alt={event.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
        <div className="absolute bottom-2 left-3 right-3">
          <h4 className="font-display text-base font-bold text-foreground truncate">{event.name}</h4>
          <div className="flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3 text-primary" />
            <span className="text-xs text-muted-foreground">{event.venues?.name ?? "Mekan"}</span>
          </div>
        </div>
        <span className="absolute top-2 right-2 bg-gradient-neon text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
          {event.price}
        </span>
      </div>
      <div className="p-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Calendar className="w-3 h-3" />
            <span className="text-xs">{formatDate(event.event_date)}</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span className="text-xs">{formatTime(event.event_time)}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 text-secondary">
          <Users className="w-3 h-3" />
          <span className="text-xs font-medium">{event.attendees}</span>
        </div>
      </div>
    </div>
  );
};

export default EventCard;
