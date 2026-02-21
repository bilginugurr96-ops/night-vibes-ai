import { useSPProgress } from "@/hooks/useSocialPower";
import { useUserCity } from "@/hooks/useCities";
import { Flame, Zap, Moon, Sun, TrendingUp } from "lucide-react";

const SPProgressBar = () => {
  const { cityName } = useUserCity();
  const {
    currentLevel,
    nextLevel,
    progressPct,
    spToNext,
    totalSP,
    nightSP,
    daySP,
    percentile,
    streakDays,
    tier,
  } = useSPProgress();

  const TIER_BADGE: Record<string, string> = { free: "", plus: "⚡", pro: "💎", elite: "👑" };

  if (!currentLevel) return null;

  return (
    <div className="glass rounded-2xl p-4 space-y-3">
      {/* Level Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{currentLevel.badge_icon}</span>
          <div>
            <p className="text-sm font-bold text-foreground">{currentLevel.name}</p>
            <p className="text-[10px] text-muted-foreground">Social Power Lv.{currentLevel.level}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-display text-lg font-bold text-primary">
            {TIER_BADGE[tier] ? `${TIER_BADGE[tier]} ` : ""}{totalSP.toLocaleString()}
          </p>
          <p className="text-[10px] text-muted-foreground">SP</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div>
        <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
          <span>{currentLevel.name}</span>
          {nextLevel && <span>{spToNext.toLocaleString()} SP kaldı</span>}
          <span>{nextLevel?.name ?? "MAX"}</span>
        </div>
        <div className="h-2.5 bg-muted rounded-full overflow-hidden relative">
          <div
            className="h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
            style={{
              width: `${progressPct}%`,
              background: "linear-gradient(90deg, hsl(271 100% 59%), hsl(191 100% 50%))",
            }}
          >
            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_2s_infinite]" />
          </div>
        </div>
      </div>

      {/* Night/Day Split */}
      <div className="grid grid-cols-2 gap-2">
        <div className="glass rounded-xl p-2.5 flex items-center gap-2">
          <Moon className="w-4 h-4 text-primary flex-shrink-0" />
          <div>
            <p className="text-xs font-bold text-foreground">{nightSP.toLocaleString()}</p>
            <p className="text-[9px] text-muted-foreground">Night SP</p>
          </div>
        </div>
        <div className="glass rounded-xl p-2.5 flex items-center gap-2">
          <Sun className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <div>
            <p className="text-xs font-bold text-foreground">{daySP.toLocaleString()}</p>
            <p className="text-[9px] text-muted-foreground">Day SP</p>
          </div>
        </div>
      </div>

      {/* Percentile + Streak */}
      <div className="flex items-center justify-between">
        {percentile !== null && (
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-secondary" />
            <span className="text-xs text-foreground font-medium">Top %{Math.max(1, Math.round(100 - percentile))}</span>
            <span className="text-[10px] text-muted-foreground">{cityName}</span>
          </div>
        )}
        {streakDays > 0 && (
          <div className="flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-bold text-foreground">{streakDays} gün</span>
            <span className="text-[10px] text-muted-foreground">streak</span>
          </div>
        )}
      </div>

      {/* Next level FOMO */}
      {nextLevel && spToNext > 0 && spToNext < 200 && (
        <div className="bg-primary/10 rounded-xl px-3 py-2">
          <p className="text-xs text-primary font-medium">
            ⚡ {nextLevel.name} seviyesine sadece {spToNext} SP kaldı!
          </p>
        </div>
      )}
    </div>
  );
};

export default SPProgressBar;
