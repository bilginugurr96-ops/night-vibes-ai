import { useDayNight } from "@/contexts/DayNightContext";
import { NIGHT_CATEGORIES, DAY_CATEGORIES } from "@/data/mockData";

interface CategoryFilterProps {
  selected: string;
  onSelect: (id: string) => void;
}

const CategoryFilter = ({ selected, onSelect }: CategoryFilterProps) => {
  const { isNight } = useDayNight();
  const cats = isNight ? NIGHT_CATEGORIES : DAY_CATEGORIES;

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-none py-1 px-1">
      {cats.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.id)}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300 ${
            selected === cat.id
              ? isNight
                ? "bg-gradient-neon text-primary-foreground neon-glow"
                : "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/20"
              : "glass text-muted-foreground hover:text-foreground"
          }`}
        >
          <span>{cat.icon}</span>
          <span>{cat.label}</span>
        </button>
      ))}
    </div>
  );
};

export default CategoryFilter;
