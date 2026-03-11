import { useMemo } from "react";
import { Plus } from "lucide-react";
import { NightStory } from "@/hooks/useStories";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export interface UserStoryGroup {
  user_id: string;
  profiles: NightStory["profiles"];
  stories: NightStory[];
  latestAt: string;
  hasActiveCheckin?: boolean;
}

interface StoryBarProps {
  stories: NightStory[];
  viewedUserIds: Set<string>;
  onCreateStory: () => void;
  onViewUserStories: (group: UserStoryGroup) => void;
}

const isRecent = (iso: string, hours: number) =>
  Date.now() - new Date(iso).getTime() < hours * 3_600_000;

const StoryBar = ({ stories, viewedUserIds, onCreateStory, onViewUserStories }: StoryBarProps) => {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const getInitials = (name: string | null | undefined) =>
    (name ?? "?").split(" ").map((w) => w[0]).join("").toUpperCase().substring(0, 2);

  const userGroups = useMemo(() => {
    const map = new Map<string, UserStoryGroup>();
    for (const story of stories) {
      const existing = map.get(story.user_id);
      if (existing) {
        existing.stories.push(story);
        if (story.created_at > existing.latestAt) existing.latestAt = story.created_at;
        if (story.venue_id) existing.hasActiveCheckin = true;
      } else {
        map.set(story.user_id, {
          user_id: story.user_id,
          profiles: story.profiles,
          stories: [story],
          latestAt: story.created_at,
          hasActiveCheckin: !!story.venue_id,
        });
      }
    }

    // Sort each user's stories oldest→newest
    for (const group of map.values()) {
      group.stories.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }

    // Sort groups: newest story first (most recent user on left)
    return Array.from(map.values()).sort((a, b) => {
      return new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime();
    });
  }, [stories]);

  // Top 5% threshold
  const top5Threshold = Math.max(1, Math.ceil(userGroups.length * 0.05));

  return (
    <div
      className="flex gap-3.5 overflow-x-auto scrollbar-none px-4 py-3 snap-x snap-mandatory"
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      {/* Create story */}
      <button onClick={onCreateStory} className="flex-shrink-0 snap-start flex flex-col items-center gap-1.5 w-[72px]">
        <div className="relative w-[68px] h-[68px] rounded-full">
          <div className="w-full h-full rounded-full p-[3px] bg-border/50">
            <div className="w-full h-full rounded-full overflow-hidden bg-card flex items-center justify-center">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-muted-foreground text-sm font-bold">{getInitials(profile?.display_name)}</span>
              )}
            </div>
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-primary flex items-center justify-center border-[2.5px] border-background">
            <Plus className="w-3 h-3 text-primary-foreground" />
          </div>
        </div>
        <span className="text-[10px] text-muted-foreground font-medium">Hikaye</span>
      </button>

      {/* User groups */}
      {userGroups.map((group, idx) => {
        const viewed = viewedUserIds.has(group.user_id);
        const p = group.profiles;
        const initials = getInitials(p?.display_name);
        const isTop5 = idx < top5Threshold;
        const hasCheckin = group.hasActiveCheckin;

        // Ring gradient: stronger for check-in, gold for premium, subtle glow for top 5%
        const ringClass = viewed
          ? "bg-muted/60"
          : hasCheckin
            ? "bg-gradient-neon"
            : p?.is_premium
              ? "bg-gradient-gold"
              : "bg-gradient-purple";

        const glowClass = !viewed && isTop5 ? "animate-story-ring" : "";

        return (
          <div
            key={group.user_id}
            className="flex-shrink-0 snap-start flex flex-col items-center gap-1.5 w-[72px]"
          >
            <button
              onClick={() => onViewUserStories(group)}
              className={`relative w-[68px] h-[68px] rounded-full ${glowClass}`}
            >
              {/* Gradient ring */}
              <div className={`w-full h-full rounded-full p-[2.5px] ${ringClass} transition-all duration-300`}>
                <div className="w-full h-full rounded-full p-[2px] bg-background">
                  <div className="w-full h-full rounded-full overflow-hidden bg-card flex items-center justify-center">
                    {p?.avatar_url ? (
                      <img
                        src={p.avatar_url}
                        alt=""
                        className={`w-full h-full object-cover transition-opacity duration-300 ${viewed ? "opacity-50" : "opacity-100"}`}
                      />
                    ) : (
                      <span className={`text-sm font-bold transition-opacity duration-300 ${viewed ? "text-muted-foreground/50" : "text-foreground"}`}>
                        {initials}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* XP Level badge - top left */}
              <div className="absolute -top-1 -left-1 w-auto min-w-[20px] h-5 rounded-full bg-primary/90 border-2 border-background flex items-center justify-center z-10 px-1">
                <span className="text-[7px] text-primary-foreground font-black whitespace-nowrap">Lv.{p?.level ?? 1}</span>
              </div>

              {/* Multi-story count badge */}
              {group.stories.length > 1 && (
                <div className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-secondary border-2 border-background flex items-center justify-center">
                  <span className="text-[9px] text-secondary-foreground font-bold">{group.stories.length}</span>
                </div>
              )}

              {/* Active check-in dot */}
              {hasCheckin && !viewed && (
                <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2">
                  <div className="w-2 h-2 rounded-full bg-green-400 border-[1.5px] border-background" />
                </div>
              )}
            </button>

            <span
              onClick={(e) => { e.stopPropagation(); navigate(`/profile?uid=${group.user_id}`); }}
              className={`text-[10px] font-medium truncate max-w-[64px] cursor-pointer transition-colors duration-200 ${
                viewed ? "text-muted-foreground/50" : "text-foreground/80 hover:text-primary"
              }`}
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
