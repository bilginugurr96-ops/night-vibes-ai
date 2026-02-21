import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, Clock, MapPin, Users, Share2, Heart, CheckCircle } from "lucide-react";
import { useEvent } from "@/hooks/useEvents";
import BottomNav from "@/components/BottomNav";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useCheckin } from "@/hooks/useCheckins";
import { useAuth } from "@/contexts/AuthContext";

const EventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: event, isLoading } = useEvent(id!);
  const checkin = useCheckin();
  const [attending, setAttending] = useState(false);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });

  const formatTime = (timeStr: string) => timeStr.substring(0, 5);

  const handleAttend = async () => {
    if (!user || !event?.venue_id) return;
    try {
      await checkin.mutateAsync(event.venue_id);
      setAttending(true);
      toast({ title: "Katılacaksın! 🎉", description: "+50 XP kazandın!" });
    } catch {
      toast({ title: "Hata", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Etkinlik bulunamadı</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="relative h-64 overflow-hidden">
        <img src={event.image_url ?? "/placeholder.svg"} alt={event.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <button onClick={() => navigate(-1)} className="absolute top-4 left-4 p-2 glass rounded-full text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="absolute top-4 right-4 flex gap-2">
          <button className="p-2 glass rounded-full text-foreground"><Heart className="w-5 h-5" /></button>
          <button className="p-2 glass rounded-full text-foreground"><Share2 className="w-5 h-5" /></button>
        </div>
        <div className="absolute bottom-4 left-4 right-4">
          <span className="bg-gradient-neon text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">Etkinlik</span>
          <h1 className="font-display text-3xl font-bold text-foreground mt-2">{event.name}</h1>
        </div>
      </div>

      <main className="px-4 space-y-5 mt-4">
        <div className="glass rounded-2xl p-4 space-y-3">
          {event.venues && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="text-sm">{event.venues.name}</span>
              {event.venues.address && <span className="text-xs text-muted-foreground">• {event.venues.address}</span>}
            </div>
          )}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-4 h-4 text-secondary" />
              <span className="text-sm">{formatDate(event.event_date)}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4 text-secondary" />
              <span className="text-sm">{formatTime(event.event_time)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="w-4 h-4 text-secondary" />
            <span className="text-sm">{event.attendees} kişi katılıyor</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {(event.tags ?? []).map((tag) => (
              <span key={tag} className="text-xs px-3 py-1 rounded-full bg-muted text-muted-foreground">{tag}</span>
            ))}
          </div>
        </div>

        {event.description && (
          <div className="glass rounded-2xl p-4">
            <h2 className="font-display text-base font-bold text-foreground mb-2">Etkinlik Hakkında</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{event.description}</p>
          </div>
        )}

        {/* Social CTA - No ticket/reservation */}
        <button
          onClick={handleAttend}
          disabled={checkin.isPending || attending || !event.venue_id}
          className="w-full bg-gradient-neon text-primary-foreground font-bold py-4 rounded-2xl neon-glow hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
        >
          <CheckCircle className="w-5 h-5" />
          {attending ? "Katılıyorsun! ✅" : checkin.isPending ? "İşleniyor..." : "Katılacağım"}
          {!attending && <span className="bg-primary-foreground/20 px-2 py-0.5 rounded-full text-xs">+50 XP</span>}
        </button>
      </main>

      <BottomNav />
    </div>
  );
};

export default EventDetail;
