import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Star, MapPin, Clock, Users, Share2, Heart, CheckCircle, Flame, Shield } from "lucide-react";
import { useVenue } from "@/hooks/useVenues";
import { useFavorites, useToggleFavorite } from "@/hooks/useFavorites";
import { useCheckin } from "@/hooks/useCheckins";
import BottomNav from "@/components/BottomNav";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useStories } from "@/hooks/useStories";

const LEVEL_NAMES = ["", "Gece Yenisi", "Kulüp Kaşifi", "VIP Sosyalite", "Şehir Simgesi", "Global Yıldız"];
const getLevelName = (l: number) => LEVEL_NAMES[Math.min(l, LEVEL_NAMES.length - 1)] ?? "Global Yıldız";

const VenueDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: venue, isLoading } = useVenue(id!);
  const { data: favorites = [] } = useFavorites();
  const toggleFav = useToggleFavorite();
  const checkin = useCheckin();
  const { data: stories = [] } = useStories();

  const isFav = favorites.includes(id!);
  const venueStories = stories.filter((s) => s.venue_id === id).slice(0, 5);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Mekan bulunamadı</p>
      </div>
    );
  }

  const handleCheckin = async () => {
    if (!user) return;
    try {
      await checkin.mutateAsync(venue.id);
      toast({
        title: "✅ Check-in yapıldı!",
        description: `${venue.name}'da check-in yaptın. +50 XP kazandın!`,
      });
    } catch {
      toast({ title: "Hata", description: "Check-in yapılamadı", variant: "destructive" });
    }
  };

  const vibeColor = (venue.crowd_level ?? 50) >= 70 ? "text-primary" : (venue.crowd_level ?? 50) >= 40 ? "text-secondary" : "text-muted-foreground";

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Hero Image */}
      <div className="relative h-72 overflow-hidden">
        <img src={venue.image_url ?? "/placeholder.svg"} alt={venue.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />

        <button onClick={() => navigate(-1)} className="absolute top-4 left-4 p-2 glass rounded-full text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="absolute top-4 right-4 flex gap-2">
          <button
            onClick={() => toggleFav.mutate({ venueId: venue.id, isFav })}
            className="p-2 glass rounded-full text-foreground"
          >
            <Heart className={`w-5 h-5 ${isFav ? "fill-primary text-primary" : ""}`} />
          </button>
          <button className="p-2 glass rounded-full text-foreground">
            <Share2 className="w-5 h-5" />
          </button>
        </div>

        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex items-center gap-2 mb-1">
            {venue.has_vip && (
              <span className="bg-gradient-neon text-primary-foreground text-xs font-bold px-2.5 py-0.5 rounded-full">VIP</span>
            )}
            <span className={`text-xs px-2 py-0.5 rounded-full ${venue.is_open ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
              {venue.is_open ? "🟢 Açık" : "🔴 Kapalı"}
            </span>
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground">{venue.name}</h1>
        </div>
      </div>

      <main className="px-4 space-y-5 mt-4">
        {/* Live Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="glass rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-lg font-bold text-foreground">{venue.live_checkin_count ?? 0}</span>
            </div>
            <p className="text-[10px] text-muted-foreground">Şu an burada</p>
          </div>
          <div className="glass rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <Flame className={`w-4 h-4 ${vibeColor}`} />
              <span className={`text-lg font-bold ${vibeColor}`}>%{venue.crowd_level}</span>
            </div>
            <p className="text-[10px] text-muted-foreground">Doluluk</p>
          </div>
          <div className="glass rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <Star className="w-4 h-4 text-primary fill-primary" />
              <span className="text-lg font-bold text-foreground">{venue.vibe_rating ?? venue.rating ?? 4}</span>
            </div>
            <p className="text-[10px] text-muted-foreground">Vibe</p>
          </div>
        </div>

        {/* Info */}
        <div className="glass rounded-2xl p-4 space-y-3">
          {venue.address && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="text-sm">{venue.address}{venue.distance ? ` • ${venue.distance}` : ""}</span>
            </div>
          )}
          {venue.hours && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4 text-secondary flex-shrink-0" />
              <span className="text-sm">{venue.hours}</span>
            </div>
          )}
          {venue.description && <p className="text-sm text-muted-foreground">{venue.description}</p>}
          <div className="flex gap-2 flex-wrap">
            {(venue.tags ?? []).map((tag) => (
              <span key={tag} className="text-xs px-3 py-1 rounded-full bg-muted text-muted-foreground">{tag}</span>
            ))}
          </div>
        </div>

        {/* Verified Check-in CTA */}
        <div className="glass rounded-2xl p-4 border border-primary/20">
          <div className="flex items-center gap-3 mb-3">
            <Shield className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm font-bold text-foreground">Doğrulanmış Check-in</p>
              <p className="text-xs text-muted-foreground">GPS doğrulaması ile konumunuzu onayla</p>
            </div>
          </div>
          <button
            onClick={handleCheckin}
            disabled={checkin.isPending}
            className="w-full bg-gradient-neon text-primary-foreground font-bold py-3 rounded-xl neon-glow hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-5 h-5" />
            {checkin.isPending ? "Check-in yapılıyor..." : "Check-in Yap"}
            <span className="bg-primary-foreground/20 px-2 py-0.5 rounded-full text-xs">+50 XP</span>
          </button>
        </div>

        {/* Tonight Here - Live users */}
        {venueStories.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <h2 className="font-display text-base font-bold text-foreground">Bu Gece Burada</h2>
            </div>
            <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
              {venueStories.map((story) => {
                const p = story.profiles;
                const initials = (p?.display_name ?? "?").split(" ").map((w) => w[0]).join("").toUpperCase().substring(0, 2);
                return (
                  <div key={story.id} className="flex flex-col items-center gap-1 flex-shrink-0">
                    <div className={`w-12 h-12 rounded-full bg-gradient-neon flex items-center justify-center text-primary-foreground text-sm font-bold ${p?.is_premium ? "neon-glow" : ""}`}>
                      {p?.avatar_url ? (
                        <img src={p.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
                      ) : initials}
                    </div>
                    <span className="text-[10px] text-muted-foreground max-w-[48px] truncate text-center">
                      {p?.display_name?.split(" ")[0] ?? "?"}
                    </span>
                    <span className="text-[9px] text-primary font-medium">{getLevelName(p?.level ?? 1).split(" ")[0]}</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Recent Vibes */}
        {venueStories.length > 0 && (
          <section>
            <h2 className="font-display text-base font-bold text-foreground mb-3">Son Gece Hikayeleri</h2>
            <div className="space-y-3">
              {venueStories.slice(0, 3).map((story) => {
                const p = story.profiles;
                const initials = (p?.display_name ?? "?").split(" ").map((w) => w[0]).join("").toUpperCase().substring(0, 2);
                return (
                  <div key={story.id} className="glass rounded-xl p-3 flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-neon flex items-center justify-center text-primary-foreground text-xs font-bold flex-shrink-0">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-xs font-bold text-foreground">{p?.display_name ?? "Kullanıcı"}</span>
                        {story.vibe_rating && (
                          <div className="flex gap-0.5">
                            {Array.from({ length: story.vibe_rating }).map((_, i) => (
                              <Star key={i} className="w-2.5 h-2.5 text-primary fill-primary" />
                            ))}
                          </div>
                        )}
                      </div>
                      {story.content && <p className="text-xs text-muted-foreground">{story.content}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default VenueDetail;
