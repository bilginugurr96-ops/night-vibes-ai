import { useState, useEffect } from "react";
import { MapPin, Zap } from "lucide-react";
import { useActiveCheckin } from "@/hooks/useActiveCheckin";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const MOODS = ["Vibing", "Keşfediyor", "Takılıyor", "Eğleniyor", "Çalışıyor"];

function pickMood(venueType: string): string {
  switch (venueType) {
    case "club":
    case "concert":
      return "Eğleniyor";
    case "bar":
    case "lounge":
      return "Vibing";
    case "cafe":
    case "coworking":
      return "Çalışıyor";
    case "restaurant":
    case "brunch":
      return "Takılıyor";
    case "beach":
      return "Keşfediyor";
    default:
      return "Vibing";
  }
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "0:00";
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const ActiveCheckinChip = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { data: activeCheckin } = useActiveCheckin();
  const isPremium = profile?.is_premium ?? false;

  const [remaining, setRemaining] = useState<number>(0);

  useEffect(() => {
    if (!activeCheckin) return;

    const update = () => {
      const diff = new Date(activeCheckin.boostExpiresAt).getTime() - Date.now();
      setRemaining(Math.max(0, diff));
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [activeCheckin]);

  if (!activeCheckin || remaining <= 0) return null;

  const isNightVenue = ["club", "bar", "concert", "lounge"].includes(activeCheckin.venueType);
  const hubLabel = isNightVenue ? "NightHub" : "DayHub";
  const mood = pickMood(activeCheckin.venueType);

  return (
    <button
      onClick={() => navigate(`/venue/${activeCheckin.venueId}`)}
      className={`flex items-center gap-2.5 rounded-2xl px-4 py-2.5 backdrop-blur-xl border transition-all ${
        isNightVenue
          ? "bg-purple-950/60 border-purple-500/30"
          : "bg-amber-950/40 border-amber-500/25"
      } ${isPremium ? "shadow-[0_0_16px_rgba(168,85,247,0.15)]" : ""}`}
      style={{
        animation: isPremium ? "gentle-pulse 3s ease-in-out infinite" : undefined,
      }}
    >
      <MapPin className={`w-3.5 h-3.5 flex-shrink-0 ${isNightVenue ? "text-purple-400" : "text-amber-400"}`} />

      <div className="flex flex-col items-start min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={`text-xs font-bold ${isNightVenue ? "text-purple-300" : "text-amber-300"}`}>
            {activeCheckin.venueName}
          </span>
          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${
            isNightVenue ? "bg-purple-500/20 text-purple-400" : "bg-amber-500/20 text-amber-400"
          }`}>
            {hubLabel}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <Zap className={`w-2.5 h-2.5 ${isNightVenue ? "text-purple-400/60" : "text-amber-400/60"}`} />
          <span className={`text-[10px] ${isNightVenue ? "text-purple-300/70" : "text-amber-300/70"}`}>
            Boost aktif – {formatCountdown(remaining)}
          </span>
          <span className="text-[10px] text-muted-foreground/50">·</span>
          <span className={`text-[10px] italic ${isNightVenue ? "text-purple-300/50" : "text-amber-300/50"}`}>
            {mood}
          </span>
        </div>
      </div>
    </button>
  );
};

export default ActiveCheckinChip;
