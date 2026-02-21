import { useState, useEffect } from "react";
import { MapPin } from "lucide-react";

interface BoostTimerProps {
  expiresAt: string;
  venueName?: string;
}

const BoostTimer = ({ expiresAt, venueName }: BoostTimerProps) => {
  const [remaining, setRemaining] = useState("");
  const [progress, setProgress] = useState(100);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const expiry = new Date(expiresAt).getTime();
    // Assume 60 min total (or calculate from creation)
    const totalMs = 60 * 60 * 1000;

    const tick = () => {
      const now = Date.now();
      const diff = expiry - now;
      if (diff <= 0) {
        setExpired(true);
        setRemaining("00:00");
        setProgress(0);
        return;
      }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setRemaining(`${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`);
      setProgress(Math.max(0, (diff / totalMs) * 100));
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  if (expired) return null;

  return (
    <div className="glass rounded-xl px-4 py-3 flex items-center gap-3">
      <div className="w-8 h-8 rounded-full border border-primary/20 flex items-center justify-center flex-shrink-0">
        <MapPin className="w-3.5 h-3.5 text-primary/60" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground truncate">
            {venueName ? `Live at ${venueName}` : "You're Live"}
          </span>
          <span className="text-xs font-mono text-foreground/70 ml-2">{remaining}</span>
        </div>
        <div className="w-full h-0.5 bg-border/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary/30 rounded-full transition-all duration-1000"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default BoostTimer;
