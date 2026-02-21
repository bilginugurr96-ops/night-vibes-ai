import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, Clock, MapPin, Heart, Share2 } from "lucide-react";
import { useEvent } from "@/hooks/useEvents";
import BottomNav from "@/components/BottomNav";
import { useToast } from "@/hooks/use-toast";
import { useState, useCallback } from "react";
import { usePremiumCheckin } from "@/hooks/useCheckins";
import CheckinConfirmation from "@/components/CheckinConfirmation";
import { useAuth } from "@/contexts/AuthContext";

const EventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: event, isLoading } = useEvent(id!);
  const checkin = usePremiumCheckin();
  const [showConfirmation, setShowConfirmation] = useState<{ name: string; minutes: number } | null>(null);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
  const formatTime = (timeStr: string) => timeStr.substring(0, 5);

  const handleAttend = useCallback(async () => {
    if (!user || !event?.venue_id) return;
    try {
      const result = await checkin.mutateAsync(event.venue_id);
      if (result.success) {
        setShowConfirmation({
          name: result.venue_name ?? event.name,
          minutes: result.boost_minutes ?? 60,
        });
      } else {
        toast({ title: result.error ?? "Check-in failed" });
      }
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    }
  }, [user, event, checkin, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border border-primary/30 border-t-primary/70 animate-spin" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Event not found</p>
      </div>
    );
  }

  return (
    <>
      {showConfirmation && (
        <CheckinConfirmation
          venueName={showConfirmation.name}
          boostMinutes={showConfirmation.minutes}
          onComplete={() => setShowConfirmation(null)}
        />
      )}

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
            <h1 className="font-display text-3xl font-bold text-foreground">{event.name}</h1>
          </div>
        </div>

        <main className="px-4 space-y-4 mt-4">
          <div className="space-y-3">
            {event.venues && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4 text-muted-foreground/50" />
                <span className="text-sm">{event.venues.name}</span>
              </div>
            )}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4 text-muted-foreground/50" />
                <span className="text-sm">{formatDate(event.event_date)}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4 text-muted-foreground/50" />
                <span className="text-sm">{formatTime(event.event_time)}</span>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {(event.tags ?? []).map((tag) => (
                <span key={tag} className="text-[10px] px-3 py-1 rounded-full bg-muted/50 text-muted-foreground">{tag}</span>
              ))}
            </div>
          </div>

          {event.description && (
            <p className="text-sm text-muted-foreground/70 leading-relaxed">{event.description}</p>
          )}

          {event.venue_id && (
            <button
              onClick={handleAttend}
              disabled={checkin.isPending}
              className="w-full border border-border/40 text-foreground font-medium py-3.5 rounded-xl hover:bg-muted/20 transition-all disabled:opacity-40 flex items-center justify-center gap-2 text-sm"
            >
              <MapPin className="w-4 h-4 text-primary/60" />
              {checkin.isPending ? "Verifying..." : "Go Live at Event"}
            </button>
          )}
        </main>

        <BottomNav />
      </div>
    </>
  );
};

export default EventDetail;
