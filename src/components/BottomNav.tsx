import { Compass, Map, MessageCircle, User, Heart, Trophy, Flame, Moon } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useConversations } from "@/hooks/useMessages";
import { useDayNight } from "@/contexts/DayNightContext";

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: conversations = [] } = useConversations();
  const { isNight } = useDayNight();
  const unreadMsgs = conversations.reduce((acc, c) => acc + c.unread, 0);

  const navItems = [
    { icon: Compass,       label: "Feed",        path: "/" },
    { icon: Map,           label: "Harita",      path: "/map" },
    { icon: Trophy,        label: "Rank",        path: "/leaderboard" },
    { icon: Heart,         label: "Keşfet",      path: "/connections" },
    { icon: User,          label: "Profil",      path: "/profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border">
      <div className="flex items-center justify-around py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`relative flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all duration-300 ${
                isActive ? "text-primary neon-glow" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? "animate-float" : ""}`} />
              <span className="text-[9px] font-medium">{item.label}</span>
              {'badge' in item && !!(item as any).badge && (item as any).badge > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[9px] font-bold min-w-[16px] h-4 rounded-full flex items-center justify-center px-0.5">
                  {(item as any).badge > 9 ? "9+" : (item as any).badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
