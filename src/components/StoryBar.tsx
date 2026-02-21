import { useState } from "react";
import { Plus } from "lucide-react";
import { NightStory } from "@/hooks/useStories";
import { useAuth } from "@/contexts/AuthContext";

interface StoryBarProps {
  stories: NightStory[];
  onCreateStory: () => void;
  onViewStory: (story: NightStory) => void;
}

const StoryBar = ({ stories, onCreateStory, onViewStory }: StoryBarProps) => {
  const { profile } = useAuth();
  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set());

  const handleView = (story: NightStory) => {
    setViewedIds((prev) => new Set([...prev, story.id]));
    onViewStory(story);
  };

  const getInitials = (name: string | null | undefined) =>
    (name ?? "?").split(" ").map((w) => w[0]).join("").toUpperCase().substring(0, 2);

  return (
    <div className="flex gap-3 overflow-x-auto scrollbar-none px-4 py-2">
      {/* Create story button */}
      <button
        onClick={onCreateStory}
        className="flex-shrink-0 flex flex-col items-center gap-1.5"
      >
        <div className="relative w-16 h-16 rounded-full glass border border-border flex items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-gradient-neon flex items-center justify-center">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
            ) : (
              <span className="text-primary-foreground text-sm font-bold">
                {getInitials(profile?.display_name)}
              </span>
            )}
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-gradient-neon border-2 border-background flex items-center justify-center">
            <Plus className="w-2.5 h-2.5 text-primary-foreground" />
          </div>
        </div>
        <span className="text-[10px] text-muted-foreground font-medium whitespace-nowrap">Hikaye ekle</span>
      </button>

      {/* Story items */}
      {stories.map((story) => {
        const viewed = viewedIds.has(story.id);
        const p = story.profiles;
        const isPremium = p?.is_premium;
        const initials = getInitials(p?.display_name);

        return (
          <button
            key={story.id}
            onClick={() => handleView(story)}
            className="flex-shrink-0 flex flex-col items-center gap-1.5"
          >
            <div className={`relative w-16 h-16 rounded-full p-[2px] ${
              viewed
                ? "bg-muted"
                : isPremium
                  ? "bg-gradient-gold gold-glow"
                  : "bg-gradient-neon neon-glow"
            }`}>
              <div className="w-full h-full rounded-full bg-background p-[2px]">
                <div className="w-full h-full rounded-full bg-gradient-neon flex items-center justify-center overflow-hidden">
                  {p?.avatar_url ? (
                    <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-primary-foreground text-sm font-bold">{initials}</span>
                  )}
                </div>
              </div>
              {/* Venue badge */}
              {story.venues && (
                <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 bg-background border border-border rounded-full px-1.5 py-0.5 whitespace-nowrap">
                  <span className="text-[8px] text-secondary font-bold">📍</span>
                </div>
              )}
              {isPremium && (
                <div className="absolute -top-0.5 -right-0.5 text-xs">✨</div>
              )}
            </div>
            <span className={`text-[10px] font-medium whitespace-nowrap max-w-[64px] truncate ${viewed ? "text-muted-foreground" : "text-foreground"}`}>
              {p?.display_name?.split(" ")[0] ?? "Kullanıcı"}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default StoryBar;
