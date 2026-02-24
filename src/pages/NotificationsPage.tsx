import { Bell, Heart, MessageCircle, UserPlus, MapPin, Trophy, Zap, Star, Check, Settings } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useNotifications, useMarkNotificationRead, useMarkAllRead } from "@/hooks/useNotifications";
import { useState } from "react";

const TYPE_ICONS: Record<string, { icon: React.ElementType; color: string }> = {
  match: { icon: Heart, color: "text-primary" },
  message: { icon: MessageCircle, color: "text-secondary" },
  like: { icon: Heart, color: "text-rose-400" },
  story_like: { icon: Heart, color: "text-rose-400" },
  story_comment: { icon: MessageCircle, color: "text-secondary" },
  visitor: { icon: UserPlus, color: "text-violet-400" },
  checkin_same: { icon: MapPin, color: "text-green-400" },
  friend_out: { icon: MapPin, color: "text-cyan-400" },
  xp: { icon: Zap, color: "text-yellow-400" },
  level_up: { icon: Star, color: "text-yellow-400" },
  leaderboard: { icon: Trophy, color: "text-orange-400" },
  mission: { icon: Check, color: "text-emerald-400" },
};

const CATEGORIES = ["Tümü", "Eşleşme", "Mesaj", "Sosyal", "XP & Seviye"];

const CATEGORY_TYPES: Record<string, string[]> = {
  "Tümü": [],
  "Eşleşme": ["match", "like", "story_like"],
  "Mesaj": ["message", "story_comment"],
  "Sosyal": ["visitor", "checkin_same", "friend_out"],
  "XP & Seviye": ["xp", "level_up", "leaderboard", "mission"],
};

const timeAgo = (date: string) => {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "az önce";
  if (mins < 60) return `${mins}dk`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}sa`;
  return `${Math.floor(hrs / 24)}g`;
};

const NotificationsPage = () => {
  const { data: notifications = [], isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllRead();
  const [activeCategory, setActiveCategory] = useState("Tümü");

  const filtered = activeCategory === "Tümü"
    ? notifications
    : notifications.filter((n) => CATEGORY_TYPES[activeCategory]?.includes(n.type));

  const unread = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 glass px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            <h1 className="font-display text-xl font-bold text-gradient">Bildirimler</h1>
            {unread > 0 && (
              <span className="bg-primary text-primary-foreground text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {unread > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                className="text-xs text-primary font-medium px-3 py-1.5 glass rounded-full hover:bg-primary/10 transition-colors"
              >
                Tümünü oku
              </button>
            )}
            <button className="p-2 rounded-xl glass text-muted-foreground hover:text-foreground">
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
        {/* Category Filter */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                activeCategory === cat
                  ? "bg-primary text-primary-foreground neon-glow"
                  : "glass text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </header>

      <main className="px-4 mt-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="glass rounded-2xl h-16 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center mt-8">
            <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="font-display text-lg font-bold text-foreground">Bildirim yok</p>
            <p className="text-sm text-muted-foreground mt-1">Aktivite arttıkça bildirimler burada görünecek</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((notif) => {
              const typeInfo = TYPE_ICONS[notif.type] ?? { icon: Bell, color: "text-muted-foreground" };
              const Icon = typeInfo.icon;
              return (
                <button
                  key={notif.id}
                  onClick={() => !notif.is_read && markRead.mutate(notif.id)}
                  className={`w-full flex items-start gap-3 p-4 rounded-2xl transition-all text-left ${
                    notif.is_read ? "glass opacity-70" : "glass border border-primary/20 bg-primary/5"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    notif.is_read ? "bg-muted" : "bg-primary/10"
                  }`}>
                    <Icon className={`w-5 h-5 ${typeInfo.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${notif.is_read ? "text-muted-foreground" : "text-foreground"}`}>
                      {notif.title}
                    </p>
                    {notif.body && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.body}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">{timeAgo(notif.created_at)}</p>
                  </div>
                  {!notif.is_read && (
                    <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default NotificationsPage;
