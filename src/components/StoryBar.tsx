import { useState, useMemo } from "react";
import { Plus } from "lucide-react";
import { NightStory } from "@/hooks/useStories";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export interface UserStoryGroup {
  user_id: string;
  profiles: NightStory["profiles"];
  stories: NightStory[];
  latestAt: string;
}

interface StoryBarProps {
  stories: NightStory[];
  onCreateStory: () => void;
  onViewUserStories: (group: UserStoryGroup) => void;
}

const StoryBar = ({ stories, onCreateStory, onViewUserStories }: StoryBarProps) => {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const [viewedUserIds, setViewedUserIds] = useState<Set<string>>(new Set());

  const getInitials = (name: string | null | undefined) =>
    (name ?? "?").split(" ").map((w) => w[0]).join("").toUpperCase().substring(0, 2);

  // Group stories by user
  const userGroups = useMemo(() => {
    const map = new Map<string, UserStoryGroup>();
    for (const story of stories) {
      const existing = map.get(story.user_id);
      if (existing) {
        existing.stories.push(story);
        if (story.created_at > existing.latestAt) {
          existing.latestAt = story.created_at;
        }
      } else {
        map.set(story.user_id, {
          user_id: story.user_id,
          profiles: story.profiles,
          stories: [story],
          latestAt: story.created_at,
        });
      }
    }
    // Sort: premium first, then by latest story
    return Array.from(map.values()).sort((a, b) => {
      const premA = a.profiles?.is_premium ? 1 : 0;
      const premB = b.profiles?.is_premium ? 1 : 0;
      if (premA !== premB) return premB - premA;
      return new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime();
    });
  }, [stories]);

  const handleView = (group: UserStoryGroup) => {
    setViewedUserIds((prev) => new Set([...prev, group.user_id]));
    onViewUserStories(group);
  };

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

      {/* User story groups */}
      {userGroups.map((group) => {
        const viewed = viewedUserIds.has(group.user_id);
        const p = group.profiles;
        const isPremium = p?.is_premium;
        const initials = getInitials(p?.display_name);
        const storyCount = group.stories.length;

        return (
          <div key={group.user_id} className={`flex-shrink-0 flex flex-col items-center gap-1.5 transition-opacity duration-300 ${viewed ? "opacity-50" : "opacity-100"}`}>
            <button
              onClick={() => handleView(group)}
              className="relative"
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
                {/* Story count badge */}
                {storyCount > 1 && (
                  <div className="absolute -top-0.5 -left-0.5 w-5 h-5 rounded-full bg-primary border-2 border-background flex items-center justify-center">
                    <span className="text-[9px] text-primary-foreground font-bold">{storyCount}</span>
                  </div>
                )}
                {isPremium && (
                  <div className="absolute -top-0.5 -right-0.5 text-xs">✨</div>
                )}
                {/* Venue badge */}
                {group.stories[0]?.venues && (
                  <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 bg-background border border-border rounded-full px-1.5 py-0.5 whitespace-nowrap">
                    <span className="text-[8px] text-secondary font-bold">📍</span>
                  </div>
                )}
              </div>
            </button>
            <span
              onClick={() => navigate(`/profile?uid=${group.user_id}`)}
              className={`text-[10px] font-medium whitespace-nowrap max-w-[64px] truncate cursor-pointer hover:text-primary transition-colors ${viewed ? "text-muted-foreground" : "text-foreground"}`}
            >
              {p?.display_name?.split(" ")[0] ?? "Kullanıcı"}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default StoryBar;
