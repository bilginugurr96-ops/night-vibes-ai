import { useEffect, useState } from "react";

interface StorySPOverlayProps {
  spAmount: number;
  onComplete: () => void;
}

/**
 * Minimal SP overlay shown after story publish.
 * Fade in 200ms → visible 900ms → fade out 300ms
 * No confetti, no gamified visuals.
 */
const StorySPOverlay = ({ spAmount, onComplete }: StorySPOverlayProps) => {
  const [phase, setPhase] = useState<"in" | "visible" | "out" | "done">("in");

  useEffect(() => {
    // Fade in: 200ms
    const t1 = setTimeout(() => setPhase("visible"), 200);
    // Start fade out after 200 + 900 = 1100ms
    const t2 = setTimeout(() => setPhase("out"), 1100);
    // Complete after 200 + 900 + 300 = 1400ms
    const t3 = setTimeout(() => {
      setPhase("done");
      onComplete();
    }, 1400);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onComplete]);

  if (phase === "done") return null;

  const opacity =
    phase === "in" ? 0 :
    phase === "visible" ? 1 :
    0;

  return (
    <div
      className="absolute inset-0 z-30 flex flex-col items-center justify-center pointer-events-none"
      style={{
        opacity,
        transition: phase === "out" ? "opacity 300ms ease-out" : "opacity 200ms ease-in",
      }}
    >
      <div className="bg-black/40 backdrop-blur-sm rounded-2xl px-6 py-4 border border-white/8 text-center">
        {spAmount > 0 ? (
          <>
            <p className="text-white/90 text-lg font-semibold tracking-wide">+{spAmount} SP</p>
            <p className="text-white/40 text-xs mt-1">City Influence Increased</p>
          </>
        ) : (
          <>
            <p className="text-white/60 text-sm font-medium">Story Shared</p>
            <p className="text-white/30 text-xs mt-1">SP limit reached for today</p>
          </>
        )}
      </div>
    </div>
  );
};

export default StorySPOverlay;
