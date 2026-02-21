import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Star, MapPin, Clock, Share2, Heart } from "lucide-react";
import { useVenue } from "@/hooks/useVenues";
import { useFavorites, useToggleFavorite } from "@/hooks/useFavorites";
import { usePremiumCheckin, useActiveCheckin } from "@/hooks/useCheckins";
import BottomNav from "@/components/BottomNav";
import BoostTimer from "@/components/BoostTimer";
import CheckinConfirmation from "@/components/CheckinConfirmation";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useCallback } from "react";

const VenueDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: venue, isLoading } = useVenue(id!);
  const { data: favorites = [] } = useFavorites();
  const toggleFav = useToggleFavorite();
  const checkin = usePremiumCheckin();
  const { data: activeCheckin } = useActiveCheckin();
  const [showConfirmation, setShowConfirmation] = useState<{ name: string; minutes: number } | null>(null);

  const isFav = favorites.includes(id!);
  const hasActiveBoost = activeCheckin?.venue_id === id;

  const handleCheckin = useCallback(async () => {
    if (!user || !venue) return;
    try {
      const result = await checkin.mutateAsync(venue.id);
      if (result.success) {
        setShowConfirmation({
          name: result.venue_name ?? venue.name,
          minutes: result.boost_minutes ?? 60,
        });
      } else {
        // Handle specific errors
        if (result.retry_after) {
          const mins = Math.ceil((result.retry_after ?? 0) / 60);
          toast({
            title: result.error ?? "Please wait",
            description: `Try again in ${mins} minutes`,
          });
        } else if (result.distance) {
          toast({
            title: "Too far from venue",
            description: `You're ${result.distance}m away. Get closer to check in.`,
          });
        } else {
          toast({ title: result.error ?? "Check-in failed" });
        }
      }
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    }
  }, [user, venue, checkin, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border border-primary/30 border-t-primary/70 animate-spin" />
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Venue not found</p>
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
        {/* Hero */}
        <div className="relative h-72 overflow-hidden">
          <img src={venue.image_url ?? "/placeholder.svg"} alt={venue.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />

          <button onClick={() => navigate(-1)} className="absolute top-4 left-4 p-2 glass rounded-full text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="absolute top-4 right-4 flex gap-2">
            <button onClick={() => toggleFav.mutate({ venueId: venue.id, isFav })} className="p-2 glass rounded-full text-foreground">
              <Heart className={`w-5 h-5 ${isFav ? "fill-primary text-primary" : ""}`} />
            </button>
            <button className="p-2 glass rounded-full text-foreground">
              <Share2 className="w-5 h-5" />
            </button>
          </div>

          <div className="absolute bottom-4 left-4 right-4">
            <div className="flex items-center gap-2 mb-1">
              {venue.has_vip && (
                <span className="text-[10px] tracking-widest uppercase text-primary/70 font-medium">VIP</span>
              )}
              <span className={`text-[10px] ${venue.is_open ? "text-green-400/70" : "text-red-400/70"}`}>
                {venue.is_open ? "Open" : "Closed"}
              </span>
            </div>
            <h1 className="font-display text-3xl font-bold text-foreground">{venue.name}</h1>
          </div>
        </div>

        <main className="px-4 space-y-4 mt-4">
          {/* Active boost timer */}
          {hasActiveBoost && activeCheckin?.boost_expires_at && (
            <BoostTimer
              expiresAt={activeCheckin.boost_expires_at}
              venueName={venue.name}
            />
          )}

          {/* Info */}
          <div className="space-y-3">
            {venue.address && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
                <span className="text-sm">{venue.address}{venue.distance ? ` · ${venue.distance}` : ""}</span>
              </div>
            )}
            {venue.hours && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
                <span className="text-sm">{venue.hours}</span>
              </div>
            )}
            {(venue.vibe_rating || venue.rating) && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Star className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
                <span className="text-sm">{venue.vibe_rating ?? venue.rating} rating</span>
              </div>
            )}
          </div>

          {venue.description && (
            <p className="text-sm text-muted-foreground/70 leading-relaxed">{venue.description}</p>
          )}

          {(venue.tags ?? []).length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {venue.tags!.map((tag) => (
                <span key={tag} className="text-[10px] px-3 py-1 rounded-full bg-muted/50 text-muted-foreground">{tag}</span>
              ))}
            </div>
          )}

          {/* Premium Check-in CTA */}
          {!hasActiveBoost && (
            <div className="pt-2">
              <button
                onClick={handleCheckin}
                disabled={checkin.isPending}
                className="w-full border border-border/40 text-foreground font-medium py-3.5 rounded-xl hover:bg-muted/20 transition-all disabled:opacity-40 flex items-center justify-center gap-2 text-sm"
              >
                <MapPin className="w-4 h-4 text-primary/60" />
                {checkin.isPending ? "Verifying location..." : "Go Live Here"}
              </button>
              <p className="text-[10px] text-muted-foreground/40 text-center mt-2">
                Boost your visibility for 60 minutes
              </p>
            </div>
          )}
        </main>

        <BottomNav />
      </div>
    </>
  );
};

export default VenueDetail;
