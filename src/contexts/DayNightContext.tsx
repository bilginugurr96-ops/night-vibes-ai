import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";

type AppMode = "night" | "day";
type ModePreference = "auto" | "night" | "day";

interface DayNightContextType {
  mode: AppMode;
  preference: ModePreference;
  setPreference: (pref: ModePreference) => void;
  isNight: boolean;
  isDay: boolean;
}

const DayNightContext = createContext<DayNightContextType | undefined>(undefined);

const getAutoMode = (): AppMode => {
  const h = new Date().getHours();
  return h >= 18 || h < 6 ? "night" : "day";
};

export const DayNightProvider = ({ children }: { children: ReactNode }) => {
  const [preference, setPreferenceState] = useState<ModePreference>(() => {
    return (localStorage.getItem("nighthub-mode") as ModePreference) || "auto";
  });
  const [autoMode, setAutoMode] = useState<AppMode>(getAutoMode);

  // Update auto mode every minute
  useEffect(() => {
    const interval = setInterval(() => setAutoMode(getAutoMode()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const setPreference = useCallback((pref: ModePreference) => {
    setPreferenceState(pref);
    localStorage.setItem("nighthub-mode", pref);
  }, []);

  const mode: AppMode = preference === "auto" ? autoMode : preference;
  const isNight = mode === "night";
  const isDay = mode === "day";

  // Apply CSS class on root for theme switching
  useEffect(() => {
    document.documentElement.setAttribute("data-mode", mode);
  }, [mode]);

  return (
    <DayNightContext.Provider value={{ mode, preference, setPreference, isNight, isDay }}>
      {children}
    </DayNightContext.Provider>
  );
};

export const useDayNight = () => {
  const ctx = useContext(DayNightContext);
  if (!ctx) throw new Error("useDayNight must be used within DayNightProvider");
  return ctx;
};
