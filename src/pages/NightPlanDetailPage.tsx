import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, MapPin, Users, UserPlus, UserMinus, Share2 } from "lucide-react";
import { useNightPlan, useJoinNightPlan, useLeaveNightPlan } from "@/hooks/useNightPlans";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";

const NightPlanDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: plan, isLoading } = useNightPlan(id!);
  const joinPlan = useJoinNightPlan();
  const leavePlan = useLeaveNightPlan();

  if (isLoading || !plan) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="text-muted-foreground text-sm">Yükleniyor…</span>
      </div>
    );
  }

  const isOwner = plan.user_id === user?.id;
  const isJoined = plan.participants?.some((p) => p.user_id === user?.id);

  const handleJoin = async () => {
    try {
      await joinPlan.mutateAsync(plan.id);
      toast({ title: "Plana katıldın! 🎉" });
    } catch {
      toast({ title: "Hata", variant: "destructive" });
    }
  };

  const handleLeave = async () => {
    try {
      await leavePlan.mutateAsync(plan.id);
      toast({ title: "Plandan ayrıldın" });
    } catch {
      toast({ title: "Hata", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <header className="sticky top-0 z-50 glass px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-full hover:bg-muted">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex-1">
          <h1 className="font-display text-lg font-bold text-foreground">{plan.title}</h1>
          <span className="text-xs text-muted-foreground">
            {new Date(plan.plan_date).toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" })}
          </span>
        </div>
      </header>

      <div className="px-4 mt-4 space-y-4">
        {/* Creator */}
        {plan.profiles && (
          <div className="glass rounded-xl p-3 flex items-center gap-3">
            <Avatar className="w-10 h-10 border-2 border-primary/30">
              <AvatarImage src={plan.profiles.avatar_url} />
              <AvatarFallback>{plan.profiles.display_name?.[0]}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold text-foreground">{plan.profiles.display_name}</p>
              <p className="text-xs text-muted-foreground">Plan sahibi</p>
            </div>
          </div>
        )}

        {/* Stops Timeline */}
        <div>
          <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            Rota
          </h2>
          <div className="space-y-0">
            {(plan.stops ?? []).map((stop, i) => (
              <div key={stop.id} className="flex gap-3">
                <div className="flex flex-col items-center pt-1">
                  <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                    <span className="text-[8px] font-bold text-primary-foreground">{i + 1}</span>
                  </div>
                  {i < (plan.stops?.length ?? 0) - 1 && (
                    <div className="w-0.5 flex-1 bg-primary/20 my-1" />
                  )}
                </div>
                <div
                  className="flex-1 glass rounded-xl p-3 mb-2 cursor-pointer hover:border-primary/20 transition-all"
                  onClick={() => navigate(`/venue/${stop.venue_id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{stop.venues?.name ?? "Mekan"}</p>
                      {stop.venues?.address && (
                        <p className="text-xs text-muted-foreground mt-0.5">{stop.venues.address}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-primary">
                      <Clock className="w-3.5 h-3.5" />
                      <span className="text-sm font-bold">{stop.planned_time?.slice(0, 5)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Participants */}
        <div>
          <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Katılımcılar ({(plan.participants ?? []).length})
          </h2>
          {(plan.participants ?? []).length === 0 ? (
            <div className="glass rounded-xl p-4 text-center text-muted-foreground text-sm">
              Henüz katılımcı yok
            </div>
          ) : (
            <div className="space-y-2">
              {(plan.participants ?? []).map((p) => (
                <div key={p.id} className="glass rounded-xl p-3 flex items-center gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={p.profiles?.avatar_url} />
                    <AvatarFallback className="text-xs">{p.profiles?.display_name?.[0]}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-foreground">{p.profiles?.display_name}</span>
                  <span className="ml-auto text-xs text-green-400 font-semibold">{p.status === "joined" ? "Katıldı" : "Bekliyor"}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Button */}
        {!isOwner && (
          <div className="pt-2">
            {isJoined ? (
              <button
                onClick={handleLeave}
                className="w-full py-3 rounded-xl glass border border-destructive/30 text-destructive font-semibold text-sm flex items-center justify-center gap-2"
              >
                <UserMinus className="w-4 h-4" />
                Plandan Ayrıl
              </button>
            ) : (
              <button
                onClick={handleJoin}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Plana Katıl 🎉
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NightPlanDetailPage;
