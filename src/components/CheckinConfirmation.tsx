import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";

interface CheckinConfirmationProps {
  venueName: string;
  boostMinutes: number;
  onComplete: () => void;
}

const CheckinConfirmation = ({ venueName, boostMinutes, onComplete }: CheckinConfirmationProps) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onComplete, 300);
    }, 1500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Dark blurred background */}
      <div className="absolute inset-0 bg-background/95 backdrop-blur-xl" />

      {/* Soft glow pulse */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-64 h-64 rounded-full bg-primary/5 animate-pulse-neon" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-8 animate-fade-in-up">
        {/* Subtle pin icon */}
        <div className="w-12 h-12 rounded-full border border-border/30 flex items-center justify-center mx-auto mb-6">
          <MapPin className="w-5 h-5 text-primary/70" />
        </div>

        <p className="text-xs tracking-[0.3em] uppercase text-muted-foreground mb-3">
          You're Live in the City
        </p>

        <h1 className="font-display text-2xl font-light text-foreground mb-2">
          {venueName}
        </h1>

        <div className="w-12 h-px bg-border mx-auto my-5" />

        {/* Minimal progress indicator */}
        <p className="text-xs text-muted-foreground/60">
          Boost active for {boostMinutes} minutes
        </p>

        {/* Thin progress bar */}
        <div className="w-32 h-0.5 bg-border/30 rounded-full mx-auto mt-4 overflow-hidden">
          <div
            className="h-full bg-primary/40 rounded-full"
            style={{
              animation: "shrink-bar 1.5s linear forwards",
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes shrink-bar {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
};

export default CheckinConfirmation;
