import { Search, MessageCircle } from "lucide-react";
import BottomNav from "@/components/BottomNav";

const chats = [
  { id: 1, name: "Elif S.", lastMsg: "Bu gece Neon Pulse'a gidelim mi?", time: "21:30", unread: 2, avatar: "E" },
  { id: 2, name: "Rock Riot Grubu", lastMsg: "Mert: Sahne önü alayım mı?", time: "20:15", unread: 5, avatar: "R" },
  { id: 3, name: "Can B.", lastMsg: "VIP masa ayarladım 🎉", time: "19:45", unread: 0, avatar: "C" },
  { id: 4, name: "Ayşe K.", lastMsg: "Fotoğrafları gördün mü?", time: "18:00", unread: 1, avatar: "A" },
];

const ChatPage = () => {
  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 glass px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-xl font-bold text-gradient">Mesajlar</h1>
          <button className="p-2 rounded-xl glass text-muted-foreground hover:text-foreground">
            <Search className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="px-4 mt-2">
        <div className="space-y-1">
          {chats.map((chat) => (
            <button
              key={chat.id}
              className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-muted/50 transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-neon flex items-center justify-center text-primary-foreground font-bold flex-shrink-0">
                {chat.avatar}
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">{chat.name}</span>
                  <span className="text-xs text-muted-foreground">{chat.time}</span>
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{chat.lastMsg}</p>
              </div>
              {chat.unread > 0 && (
                <span className="bg-primary text-primary-foreground text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">
                  {chat.unread}
                </span>
              )}
            </button>
          ))}
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default ChatPage;
