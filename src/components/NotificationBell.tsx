import { useState, useEffect, useRef } from "react";
import {
  Bell, Heart, MessageCircle, UserPlus, MapPin, Trophy,
  Zap, Star, Check, X, Settings, ChevronRight
} from "lucide-react";
import { useNotifications, useMarkNotificationRead, useMarkAllRead, type Notification } from "@/hooks/useNotifications";
import { useNavigate } from "react-router-dom";

const TYPE_META: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  match:         { icon: Heart,          color: "text-primary",          label: "Eşleşme" },
  message:       { icon: MessageCircle,  color: "text-secondary",        label: "Mesaj" },
  like:          { icon: Heart,          color: "text-primary",           label: "Beğeni" },
  story_like:    { icon: Heart,          color: "text-primary",           label: "Beğeni" },
  story_comment: { icon: MessageCircle,  color: "text-secondary",        label: "Yorum" },
  visitor:       { icon: UserPlus,       color: "text-accent",            label: "Ziyaret" },
  checkin_same:  { icon: MapPin,         color: "text-secondary",         label: "Check-in" },
  friend_out:    { icon: MapPin,         color: "text-secondary",         label: "Arkadaş" },
  xp:            { icon: Zap,            color: "text-neon-gold",         label: "XP" },
  level_up:      { icon: Star,           color: "text-neon-gold",         label: "Seviye" },
  leaderboard:   { icon: Trophy,         color: "text-neon-gold",         label: "Sıralama" },
  mission:       { icon: Check,          color: "text-secondary",         label: "Görev" },
};

const CATEGORIES = [
  { key: "all",   label: "Tümü",       types: [] as string[] },
  { key: "match", label: "Eşleşme",    types: ["match", "like", "story_like"] },
  { key: "msg",   label: "Mesaj",      types: ["message", "story_comment"] },
  { key: "social",label: "Sosyal",     types: ["visitor", "checkin_same", "friend_out"] },
  { key: "xp",    label: "XP & Seviye",types: ["xp", "level_up", "leaderboard", "mission"] },
];

const timeAgo = (date: string) => {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "az önce";
  if (mins < 60) return `${mins}dk`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}sa`;
  return `${Math.floor(hrs / 24)}g`;
};

// ── Notification Panel ──────────────────────────────────────────────────────
const NotificationPanel = ({
  onClose,
}: {
  onClose: () => void;
}) => {
  const { data: notifications = [], isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllRead();
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState("all");
  const [showSettings, setShowSettings] = useState(false);

  const unread = notifications.filter((n) => !n.is_read).length;

  const filtered = activeCategory === "all"
    ? notifications
    : notifications.filter((n) => {
        const cat = CATEGORIES.find((c) => c.key === activeCategory);
        return cat?.types.includes(n.type) ?? true;
      });

  const handleNotifClick = (n: Notification) => {
    if (!n.is_read) markRead.mutate(n.id);
    // Navigate based on type
    if (n.type === "message" && n.data?.sender_id) {
      navigate(`/chat/${n.data.sender_id}`);
      onClose();
    } else if (n.type === "match" || n.type === "like" || n.type === "story_like") {
      navigate("/connections");
      onClose();
    } else if (n.type === "leaderboard") {
      navigate("/leaderboard");
      onClose();
    } else if (n.type === "story_comment") {
      navigate("/");
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[998] bg-background/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Slide-in panel */}
      <div
        className="fixed top-0 right-0 bottom-0 z-[999] w-full max-w-sm flex flex-col"
        style={{ animation: "slide-panel-in 0.3s cubic-bezier(0.34,1.2,0.64,1)" }}
      >
        <div className="flex flex-col h-full glass border-l border-border/40 shadow-2xl">
          {/* Header */}
          <div className="px-5 pt-12 pb-4 border-b border-border/30">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                <h2 className="font-display text-xl font-black text-gradient">Bildirimler</h2>
                {unread > 0 && (
                  <span className="bg-primary text-primary-foreground text-[10px] font-black min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1 neon-glow">
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unread > 0 && (
                  <button
                    onClick={() => markAllRead.mutate()}
                    className="text-[10px] text-primary font-bold px-2.5 py-1 glass rounded-full border border-primary/30 hover:bg-primary/10 transition-colors"
                  >
                    Tümünü oku
                  </button>
                )}
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="w-8 h-8 glass rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <button
                  onClick={onClose}
                  className="w-8 h-8 glass rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Category filter */}
            <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => setActiveCategory(cat.key)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap transition-all ${
                    activeCategory === cat.key
                      ? "bg-primary/20 text-primary border border-primary/40 neon-glow"
                      : "glass text-muted-foreground border border-transparent hover:text-foreground"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Settings panel */}
          {showSettings && (
            <div className="px-5 py-4 border-b border-border/30 bg-muted/20">
              <p className="text-xs font-bold text-foreground mb-3">Bildirim Ayarları</p>
              {[
                { label: "Yeni eşleşme", key: "match" },
                { label: "Mesaj bildirimleri", key: "msg" },
                { label: "Beğeni bildirimleri", key: "like" },
                { label: "Arkadaş aktivitesi", key: "friend" },
                { label: "Sıralama değişimi", key: "rank" },
                { label: "Haftalık görevler", key: "mission" },
              ].map((s) => (
                <div key={s.key} className="flex items-center justify-between py-2">
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                  <div className="w-9 h-5 rounded-full bg-primary/30 flex items-center px-0.5 cursor-pointer">
                    <div className="w-4 h-4 rounded-full bg-primary translate-x-4 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Notification list */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 glass rounded-2xl animate-pulse" />
              ))
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-16 text-center">
                <Bell className="w-12 h-12 text-muted-foreground/30 mb-3" />
                <p className="font-display text-base font-bold text-foreground/60">Bildirim yok</p>
                <p className="text-xs text-muted-foreground mt-1">Aktivite arttıkça bildirimler burada görünecek</p>
              </div>
            ) : (
              filtered.map((notif) => {
                const meta = TYPE_META[notif.type] ?? { icon: Bell, color: "text-muted-foreground", label: "" };
                const Icon = meta.icon;
                return (
                  <button
                    key={notif.id}
                    onClick={() => handleNotifClick(notif)}
                    className={`w-full flex items-start gap-3 p-3.5 rounded-2xl text-left transition-all ${
                      notif.is_read
                        ? "glass opacity-60 hover:opacity-80"
                        : "glass border border-primary/25 bg-primary/5 hover:bg-primary/10"
                    }`}
                  >
                    {/* Icon circle */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      notif.is_read ? "bg-muted" : "bg-primary/15 neon-glow"
                    }`}>
                      <Icon className={`w-4 h-4 ${meta.color}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold leading-snug ${
                        notif.is_read ? "text-muted-foreground" : "text-foreground"
                      }`}>
                        {notif.title}
                      </p>
                      {notif.body && (
                        <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                          {notif.body}
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground/60 mt-1">{timeAgo(notif.created_at)}</p>
                    </div>

                    {/* Right side */}
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      {!notif.is_read && (
                        <span className="w-2 h-2 rounded-full bg-primary neon-glow flex-shrink-0" />
                      )}
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40" />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slide-panel-in {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </>
  );
};

// ── Bell Button ──────────────────────────────────────────────────────────────
const NotificationBell = () => {
  const [open, setOpen] = useState(false);
  const { data: notifications = [] } = useNotifications();
  const unread = notifications.filter((n) => !n.is_read).length;
  const prevUnread = useRef(unread);
  const [pulse, setPulse] = useState(false);

  // Animate badge when new notification arrives
  useEffect(() => {
    if (unread > prevUnread.current) {
      setPulse(true);
      setTimeout(() => setPulse(false), 600);
    }
    prevUnread.current = unread;
  }, [unread]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative w-9 h-9 glass rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-all hover:neon-glow"
      >
        <Bell className={`w-4.5 h-4.5 transition-all ${unread > 0 ? "text-foreground" : ""}`} style={{ width: 18, height: 18 }} />

        {/* Badge */}
        {unread > 0 && (
          <span
            className={`absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-black flex items-center justify-center px-0.5 neon-glow ${
              pulse ? "animate-match-pop" : ""
            }`}
          >
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && <NotificationPanel onClose={() => setOpen(false)} />}
    </>
  );
};

export default NotificationBell;
