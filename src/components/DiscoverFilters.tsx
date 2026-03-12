import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import type { DiscoverFilters } from "@/hooks/useSwipeUsers";

interface DiscoverFiltersProps {
  filters: DiscoverFilters;
  onChange: (filters: DiscoverFilters) => void;
}

const DISTANCE_OPTIONS = [
  { value: undefined, label: "Sınırsız" },
  { value: 1, label: "1 km" },
  { value: 5, label: "5 km" },
  { value: 10, label: "10 km" },
  { value: 25, label: "25 km" },
  { value: 50, label: "50 km" },
];

const AGE_PRESETS = [
  { min: 18, max: 25, label: "18-25" },
  { min: 20, max: 30, label: "20-30" },
  { min: 25, max: 35, label: "25-35" },
  { min: 30, max: 45, label: "30-45" },
  { min: undefined, max: undefined, label: "Tümü" },
];

const DiscoverFiltersPanel = ({ filters, onChange }: DiscoverFiltersProps) => {
  const [open, setOpen] = useState(false);
  const hasFilters = filters.minAge != null || filters.maxAge != null || filters.maxDistanceKm != null;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={`p-2 rounded-xl transition-colors ${
          hasFilters
            ? "bg-primary/20 text-primary border border-primary/30"
            : "glass text-muted-foreground hover:text-foreground"
        }`}
      >
        <SlidersHorizontal className="w-4 h-4" />
      </button>
    );
  }

  return (
    <div className="absolute top-full left-0 right-0 z-50 mt-2 mx-4">
      <div className="glass rounded-2xl border border-border/50 p-4 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground">Filtreler</h3>
          <button onClick={() => setOpen(false)} className="p-1 rounded-full hover:bg-muted/50 text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Distance */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">Mesafe</p>
          <div className="flex flex-wrap gap-1.5">
            {DISTANCE_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                onClick={() => onChange({ ...filters, maxDistanceKm: opt.value })}
                className={`text-[11px] px-3 py-1.5 rounded-full font-semibold transition-colors ${
                  filters.maxDistanceKm === opt.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Age range */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">Yaş Aralığı</p>
          <div className="flex flex-wrap gap-1.5">
            {AGE_PRESETS.map((preset) => {
              const isActive = filters.minAge === preset.min && filters.maxAge === preset.max;
              return (
                <button
                  key={preset.label}
                  onClick={() => onChange({ ...filters, minAge: preset.min, maxAge: preset.max })}
                  className={`text-[11px] px-3 py-1.5 rounded-full font-semibold transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Clear all */}
        {hasFilters && (
          <button
            onClick={() => onChange({})}
            className="w-full text-xs font-semibold text-destructive py-2 rounded-xl hover:bg-destructive/10 transition-colors"
          >
            Filtreleri Temizle
          </button>
        )}
      </div>
    </div>
  );
};

export default DiscoverFiltersPanel;
