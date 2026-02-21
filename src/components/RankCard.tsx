import { useAuth } from "@/contexts/AuthContext";
import { useUserCity } from "@/hooks/useCities";
import { TrendingUp, Globe, MapPin, Crown, Flame } from "lucide-react";

const TIER_LABELS: Record<string, { label: string; badge: string; color: string }> = {
  free: { label: "Free", badge: "", color: "text-muted-foreground" },
  plus: { label: "Plus", badge: "⚡", color: "text-blue-400" },
  pro: { label: "Pro", badge: "💎", color: "text-purple-400" },
  elite: { label: "Elite", badge: "👑", color: "text-yellow-400" },
};

const RankCard = () => {
  const { profile } = useAuth();
  const { cityName } = useUserCity();
  if (!profile) return null;

  const p = profile as any;
  const tier = p.subscription_tier ?? "free";
  const tierInfo = TIER_LABELS[tier] ?? TIER_LABELS.free;
  const isPremium = tier !== "free";
  const cityRank = p.city_rank;
  const globalRank = p.global_rank;
  const weeklyRank = p.weekly_rank;
  const percentile = p.city_percentile;
  const hasMomentum = p.momentum_badge_until && new Date(p.momentum_badge_until) > new Date();

  return (
    <div className="glass rounded-2xl p-4 space-y-3">
      {/* Tier badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Crown className={`w-4 h-4 ${tierInfo.color}`} />
          <span className={`text-sm font-bold ${tierInfo.color}`}>
            {tierInfo.badge} {tierInfo.label}
          </span>
        </div>
        {hasMomentum && (
          <div className="flex items-center gap-1 bg-primary/20 px-2 py-0.5 rounded-full animate-pulse-neon">
            <Flame className="w-3 h-3 text-primary" />
            <span className="text-[10px] text-primary font-bold">Rising 🔥</span>
          </div>
        )}
      </div>

      {/* Rank grid */}
      <div className={`grid ${isPremium ? "grid-cols-3" : "grid-cols-1"} gap-2`}>
        {/* City rank - always visible */}
        <div className="glass rounded-xl p-3 text-center">
          <MapPin className="w-3.5 h-3.5 text-primary mx-auto mb-1" />
          <p className="font-display text-lg font-bold text-foreground">
            {cityRank ? `#${cityRank}` : "—"}
          </p>
          <p className="text-[9px] text-muted-foreground">#{cityName}</p>
        </div>

        {/* Global + Weekly rank - premium only */}
        {isPremium && (
          <>
            <div className="glass rounded-xl p-3 text-center">
              <Globe className="w-3.5 h-3.5 text-secondary mx-auto mb-1" />
              <p className="font-display text-lg font-bold text-foreground">
                {globalRank ? `#${globalRank}` : "—"}
              </p>
              <p className="text-[9px] text-muted-foreground">Global Sıra</p>
            </div>
            <div className="glass rounded-xl p-3 text-center">
              <TrendingUp className="w-3.5 h-3.5 text-primary mx-auto mb-1" />
              <p className="font-display text-lg font-bold text-foreground">
                {weeklyRank ? `#${weeklyRank}` : "—"}
              </p>
              <p className="text-[9px] text-muted-foreground">Haftalık</p>
            </div>
          </>
        )}
      </div>

      {/* Percentile */}
      {percentile !== null && percentile !== undefined && (
        <div className="flex items-center justify-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-secondary" />
          <span className="text-xs text-foreground font-medium">
            Top %{Math.max(1, Math.round(100 - percentile))}
          </span>
          <span className="text-[10px] text-muted-foreground">{cityName}</span>
        </div>
      )}

      {/* Premium upsell for free users */}
      {!isPremium && (
        <p className="text-[10px] text-muted-foreground text-center">
          💎 Premium ile global sıra ve haftalık analitik gör
        </p>
      )}
    </div>
  );
};

export default RankCard;
