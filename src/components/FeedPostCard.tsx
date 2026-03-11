import { useState, useEffect } from "react";
import { Heart, MessageCircle, Flame, MapPin, Star, Eye, Zap, UserPlus, X, Send, Check, Trash2 } from "lucide-react";
import { NightStory, useDeleteStory } from "@/hooks/useStories";
import { useNavigate } from "react-router-dom";
import { useToggleFollow, useFollowing } from "@/hooks/useFollows";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

interface StoryComment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: { display_name: string | null; avatar_url: string | null };
}

interface FeedPostCardProps {
  story: NightStory;
  liked: boolean;
  onLike: (id: string) => void;
  onViewProfile?: (userId: string) => void;
  fomoLabel?: string;
  index: number;
}

const LEVEL_NAMES = ["", "Gece Yenisi", "Kulüp Kaşifi", "VIP Sosyalite", "Şehir Simgesi", "Global Yıldız"];
const getLevelName = (l: number) => LEVEL_NAMES[Math.min(l, LEVEL_NAMES.length - 1)] ?? "Global Yıldız";

const FeedPostCard = ({ story, liked, onLike, fomoLabel, index }: FeedPostCardProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const toggleFollow = useToggleFollow();
  const { data: followingIds = [] } = useFollowing();

  const [localLiked, setLocalLiked] = useState(liked);
  const [likeCount, setLikeCount] = useState(story.likes_count);
  const [likeAnim, setLikeAnim] = useState(false);
  const [fireReacted, setFireReacted] = useState(false);

  // Sync with props when they change (e.g. after query refetch)
  useEffect(() => { setLocalLiked(liked); }, [liked]);
  useEffect(() => { setLikeCount(story.likes_count); }, [story.likes_count]);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState<StoryComment[]>([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const isFollowing = followingIds.includes(story.user_id);
  const [followLoading, setFollowLoading] = useState(false);

  // Load comments from DB when section is opened
  useEffect(() => {
    if (!showComments || commentsLoaded) return;
    const loadComments = async () => {
      const { data } = await db
        .from("story_comments")
        .select("*, profiles(display_name, avatar_url)")
        .eq("story_id", story.id)
        .order("created_at", { ascending: true });
      if (data) setComments(data as StoryComment[]);
      setCommentsLoaded(true);
    };
    loadComments();
  }, [showComments, commentsLoaded, story.id]);

  const p = story.profiles;
  const initials = (p?.display_name ?? "?").split(" ").map((w) => w[0]).join("").toUpperCase().substring(0, 2);
  const isPremium = p?.is_premium;
  const isOwnStory = user?.id === story.user_id;

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "az önce";
    if (mins < 60) return `${mins}dk`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}sa`;
    return `${Math.floor(hrs / 24)}g`;
  };

  const handleLike = () => {
    setLikeAnim(true);
    setTimeout(() => setLikeAnim(false), 300);
    if (localLiked) {
      setLikeCount((c) => Math.max(0, c - 1));
    } else {
      setLikeCount((c) => c + 1);
    }
    setLocalLiked((v) => !v);
    onLike(story.id);
  };

  const handleFire = () => setFireReacted((v) => !v);

  const handleProfileClick = () => {
    navigate(`/profile?uid=${story.user_id}`);
  };

  const handleVenueClick = () => {
    if (story.venue_id) {
      navigate(`/venue/${story.venue_id}`);
    }
  };

  const handleFollow = async () => {
    if (isOwnStory || followLoading) return;
    setFollowLoading(true);
    try {
      await toggleFollow.mutateAsync({ targetUserId: story.user_id, isFollowing });
      toast({ title: isFollowing ? "Takipten çıkıldı" : "👍 Takip edildi", description: isFollowing ? undefined : `${p?.display_name ?? "Kullanıcı"} takip ediliyor` });
    } catch {
      toast({ title: "Hata", description: "İşlem başarısız", variant: "destructive" });
    } finally {
      setFollowLoading(false);
    }
  };

  const handleSendComment = async () => {
    if (!commentText.trim() || !user) return;
    const content = commentText.trim();
    setCommentText("");

    // Insert comment into DB
    const { data: newComment } = await db
      .from("story_comments")
      .insert({ story_id: story.id, user_id: user.id, content })
      .select("*, profiles(display_name, avatar_url)")
      .single();

    if (newComment) {
      setComments((prev) => [...prev, newComment as StoryComment]);
    }

    // Send notification to story owner
    if (story.user_id !== user.id) {
      const myName = (await db.from("profiles").select("display_name").eq("user_id", user.id).single()).data?.display_name ?? "Birisi";
      await db.rpc("create_notification", {
        p_user_id: story.user_id,
        p_type: "story_comment",
        p_title: "Hikayene yorum yapıldı 💬",
        p_body: `${myName}: ${content.substring(0, 80)}`,
        p_data: { story_id: story.id, commenter_id: user.id },
      });
    }

    toast({ title: "Yorum gönderildi 💬" });
  };

  return (
    <div
      className="glass rounded-2xl overflow-hidden animate-fade-in-up"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <button onClick={handleProfileClick} className="relative flex-shrink-0">
          <div className={`w-11 h-11 rounded-full flex items-center justify-center text-primary-foreground text-sm font-bold overflow-hidden
            ${isPremium ? "ring-2 ring-offset-2 ring-offset-card ring-yellow-400 gold-glow" : "ring-1 ring-primary/30"}`}>
            {p?.avatar_url ? (
              <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-neon flex items-center justify-center">
                <span>{initials}</span>
              </div>
            )}
          </div>
          {isPremium && <span className="absolute -top-1 -right-1 text-xs">✨</span>}
          <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-400 border-2 border-card" />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button onClick={handleProfileClick} className="text-sm font-bold text-foreground truncate hover:text-primary transition-colors">
              {p?.display_name ?? "Kullanıcı"}
            </button>
            <span className="text-[10px] bg-primary/15 text-primary px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap">
              {getLevelName(p?.level ?? 1)}
            </span>
            {isPremium && (
              <span className="text-[10px] bg-yellow-400/15 text-yellow-400 px-1.5 py-0.5 rounded-full font-bold">
                PREMIUM
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            {story.venues && (
              <>
                <button onClick={handleVenueClick} className="flex items-center gap-1 hover:opacity-80 transition-opacity">
                  <MapPin className="w-3 h-3 text-secondary flex-shrink-0" />
                  <span className="text-xs text-secondary font-medium truncate">{story.venues.name}</span>
                </button>
                <span className="text-xs text-muted-foreground">•</span>
              </>
            )}
            <span className="text-xs text-muted-foreground">{timeAgo(story.created_at)}</span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {story.vibe_rating && (
            <div className="flex items-center gap-0.5">
              <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
              <span className="text-xs font-bold text-foreground">{story.vibe_rating}</span>
            </div>
          )}
          {fomoLabel && (
            <span className="text-[9px] text-orange-400 bg-orange-400/10 border border-orange-400/20 px-1.5 py-0.5 rounded-full font-bold whitespace-nowrap">
              🔥 {fomoLabel}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      {story.content && (
        <p className="px-4 pb-3 text-sm text-foreground leading-relaxed">{story.content}</p>
      )}

      {/* Image */}
      {story.image_url && (
        <div className="relative">
          <img src={story.image_url} alt="Story" className="w-full aspect-video object-cover" />
          {story.venues && (
            <button
              onClick={handleVenueClick}
              className="absolute bottom-3 left-3 glass rounded-full px-3 py-1.5 flex items-center gap-1.5 hover:bg-white/10 transition-colors"
            >
              <MapPin className="w-3 h-3 text-secondary" />
              <span className="text-xs text-secondary font-medium">{story.venues.name}</span>
            </button>
          )}
        </div>
      )}

      {/* FOMO bar */}
      {story.venues && (
        <div className="mx-4 mb-3 mt-1 glass rounded-xl px-3 py-2 flex items-center gap-2 border border-primary/10">
          <Zap className="w-3.5 h-3.5 text-primary flex-shrink-0" />
          <span className="text-xs text-muted-foreground">
            <span className="text-foreground font-semibold">{story.venues.name}</span>'da bu gece hareketli
          </span>
          <button
            onClick={handleVenueClick}
            className="ml-auto text-[10px] text-secondary font-bold border border-secondary/30 rounded-full px-2 py-0.5 hover:bg-secondary/10 transition-colors whitespace-nowrap"
          >
            Mekanı gör
          </button>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 px-4 py-3 border-t border-border/50">
        <button
          onClick={handleLike}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all ${
            localLiked ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary hover:bg-primary/5"
          } ${likeAnim ? "animate-like-pop" : ""}`}
        >
          <Heart className={`w-5 h-5 transition-all ${localLiked ? "fill-primary scale-110" : ""}`} />
          <span className="text-xs font-bold">{likeCount}</span>
        </button>

        <button
          onClick={handleFire}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all ${
            fireReacted ? "text-orange-400 bg-orange-400/10" : "text-muted-foreground hover:text-orange-400 hover:bg-orange-400/5"
          }`}
        >
          <Flame className={`w-5 h-5 ${fireReacted ? "fill-orange-400" : ""}`} />
        </button>

        <button
          onClick={() => setShowComments((v) => !v)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all ${
            showComments ? "text-secondary bg-secondary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
          }`}
        >
          <MessageCircle className="w-5 h-5" />
          <span className="text-xs font-medium">{comments.length > 0 ? comments.length : "Yorum"}</span>
        </button>

        <div className="ml-auto flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{story.views_count}</span>

          {!isOwnStory && (
            <button
              onClick={handleFollow}
              disabled={followLoading}
              className={`ml-2 flex items-center gap-1 text-[10px] font-bold border rounded-full px-2.5 py-1 transition-colors whitespace-nowrap ${
                isFollowing
                  ? "text-green-400 border-green-400/30 bg-green-400/10"
                  : "text-secondary border-secondary/30 hover:bg-secondary/10"
              }`}
            >
              {isFollowing ? <Check className="w-3 h-3" /> : <UserPlus className="w-3 h-3" />}
              {isFollowing ? "Takip" : followLoading ? "..." : "Takip Et"}
            </button>
          )}
        </div>
      </div>

      {/* Comments section */}
      {showComments && (
        <div className="border-t border-border/30 px-4 py-3 space-y-2">
          {comments.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">İlk yorumu sen yaz 💬</p>
          ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {comments.map((c) => (
                <div key={c.id} className="flex gap-2 items-start">
                  <div className="w-6 h-6 rounded-full bg-gradient-neon flex-shrink-0 flex items-center justify-center text-[9px] text-primary-foreground font-bold overflow-hidden">
                    {c.profiles?.avatar_url ? (
                      <img src={c.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      (c.profiles?.display_name ?? "?")[0]
                    )}
                  </div>
                  <div className="glass rounded-xl px-3 py-1.5 flex-1">
                    <p className="text-[10px] text-muted-foreground font-semibold mb-0.5">{c.profiles?.display_name ?? "Kullanıcı"}</p>
                    <p className="text-xs text-foreground">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2 items-center mt-2">
            <input
              type="text"
              placeholder="Yorum yaz..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendComment()}
              className="flex-1 glass rounded-full px-3 py-2 text-xs text-foreground placeholder-muted-foreground bg-transparent border border-border/50 focus:outline-none focus:border-primary/60"
            />
            <button
              onClick={handleSendComment}
              disabled={!commentText.trim()}
              className="w-8 h-8 bg-gradient-neon rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5 text-primary-foreground" />
            </button>
            <button
              onClick={() => setShowComments(false)}
              className="w-8 h-8 glass rounded-full flex items-center justify-center border border-border/50"
            >
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedPostCard;
