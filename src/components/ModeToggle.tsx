import { Moon, Sun, Zap } from "lucide-react";
import { useDayNight } from "@/contexts/DayNightContext";

const ModeToggle = () => {
  const { mode, preference, setPreference } = useDayNight();

  const options = [
    { key: "auto" as const, label: "Oto", icon: <Zap className="w-3 h-3" /> },
    { key: "night" as const, label: "Gece", icon: <Moon className="w-3 h-3" /> },
    { key: "day" as const, label: "Gündüz", icon: <Sun className="w-3 h-3" /> },
  ];

  return (
    <div className="flex items-center glass rounded-full p-0.5">
      {options.map((opt) => (
        <button
          key={opt.key}
          onClick={() => setPreference(opt.key)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all ${
            preference === opt.key
              ? mode === "night"
                ? "bg-primary text-primary-foreground neon-glow"
                : "bg-amber-500 text-white"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {opt.icon}
          {opt.label}
        </button>
      ))}
    </div>
  );
};

export default ModeToggle;
