import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Moon, Plus, MapPin, Clock, Users, ChevronRight, Trash2 } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useMyNightPlans, useNightPlans, useJoinNightPlan, useLeaveNightPlan, useDeleteNightPlan } from "@/hooks/useNightPlans";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

const NightPlanPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: myPlans = [], isLoading: myLoading } = useMyNightPlans();
  const { data: publicPlans = [], isLoading: publicLoading } = useNightPlans();
  const joinPlan = useJoinNightPlan();
  const leavePlan = useLeaveNightPlan();
  const deletePlan = useDeleteNightPlan();

  const handleJoin = async (planId: string) => {
    try {
      await joinPlan.mutateAsync(planId);
      toast({ title: "Plana katıldın! 🎉" });
    } catch {
      toast({ title: "Katılım başarısız", variant: "destructive" });
    }
  };

  const handleDelete = async (planId: string) => {
    try {
      await deletePlan.mutateAsync(planId);
      toast({ title: "Plan silindi" });
    } catch {
      toast({ title: "Silme başarısız", variant: "destructive" });
    }
  };

  const isJoined = (plan: typeof publicPlans[0]) => {
    return plan.participants?.some((p) => p.user_id === user?.id);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 glass px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Moon className="w-5 h-5 text-primary" />
            <h1 className="font-display text-xl font-bold text-gradient">Gece Planı</h1>
          </div>
          <button
            onClick={() => navigate("/night-plan/create")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold"
          >
            <Plus className="w-4 h-4" />
            Oluştur
          </button>
        </div>
      </header>

      <Tabs defaultValue="my" className="px-4 mt-3">
        <TabsList className="w-full glass">
          <TabsTrigger value="my" className="flex-1">Planlarım</TabsTrigger>
          <TabsTrigger value="public" className="flex-1">Keşfet</TabsTrigger>
        </TabsList>

        <TabsContent value="my" className="mt-3 space-y-3">
          {myLoading ? (
            <div className="text-center py-12 text-muted-foreground text-sm">Yükleniyor…</div>
          ) : myPlans.length === 0 ? (
            <div className="text-center py-12">
              <Moon className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Henüz plan oluşturmadın</p>
              <button
                onClick={() => navigate("/night-plan/create")}
                className="mt-3 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold"
              >
                İlk Planını Oluştur
              </button>
            </div>
          ) : (
            myPlans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                isOwner
                onDelete={() => handleDelete(plan.id)}
                onTap={() => navigate(`/night-plan/${plan.id}`)}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="public" className="mt-3 space-y-3">
          {publicLoading ? (
            <div className="text-center py-12 text-muted-foreground text-sm">Yükleniyor…</div>
          ) : publicPlans.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">Henüz paylaşılan plan yok</div>
          ) : (
            publicPlans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                isJoined={isJoined(plan)}
                onJoin={() => handleJoin(plan.id)}
                onTap={() => navigate(`/night-plan/${plan.id}`)}
              />
            ))
          )}
        </TabsContent>
      </Tabs>

      <BottomNav />
    </div>
  );
};

function PlanCard({
  plan,
  isOwner,
  isJoined,
  onDelete,
  onJoin,
  onTap,
}: {
  plan: any;
  isOwner?: boolean;
  isJoined?: boolean;
  onDelete?: () => void;
  onJoin?: () => void;
  onTap: () => void;
}) {
  const stops = plan.stops ?? plan.plan_stops ?? [];
  const participants = plan.participants ?? plan.plan_participants ?? [];

  return (
    <div
      onClick={onTap}
      className="glass rounded-2xl p-4 cursor-pointer group hover:border-primary/20 transition-all animate-fade-in-up"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-display text-base font-bold text-foreground">{plan.title}</h3>
          <span className="text-xs text-muted-foreground">
            {new Date(plan.plan_date).toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {participants.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="w-3 h-3" />
              {participants.length}
            </div>
          )}
          {isOwner && onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-1.5 rounded-full hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          {!isOwner && !isJoined && onJoin && (
            <button
              onClick={(e) => { e.stopPropagation(); onJoin(); }}
              className="px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold"
            >
              Katıl
            </button>
          )}
          {isJoined && (
            <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs font-semibold">Katıldın</span>
          )}
        </div>
      </div>

      {/* Stops timeline */}
      {stops.length > 0 && (
        <div className="space-y-2">
          {stops.slice(0, 4).map((stop: any, i: number) => {
            const venue = stop.venues;
            return (
              <div key={stop.id || i} className="flex items-center gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary border-2 border-background" />
                  {i < stops.length - 1 && <div className="w-0.5 h-4 bg-primary/30" />}
                </div>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Clock className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                  <span className="text-xs font-semibold text-foreground">{stop.planned_time?.slice(0, 5)}</span>
                  <MapPin className="w-3 h-3 text-primary flex-shrink-0" />
                  <span className="text-xs text-muted-foreground truncate">{venue?.name ?? "Mekan"}</span>
                </div>
                <ChevronRight className="w-3 h-3 text-muted-foreground/50 flex-shrink-0" />
              </div>
            );
          })}
        </div>
      )}

      {/* Creator */}
      {plan.profiles && (
        <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border/30">
          <Avatar className="w-5 h-5">
            <AvatarImage src={plan.profiles.avatar_url} />
            <AvatarFallback className="text-[8px]">{plan.profiles.display_name?.[0]}</AvatarFallback>
          </Avatar>
          <span className="text-xs text-muted-foreground">{plan.profiles.display_name}</span>
        </div>
      )}
    </div>
  );
}

export default NightPlanPage;
