import { Search, MessageCircle, Plus } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { useConversations } from "@/hooks/useMessages";
import { useMatches } from "@/hooks/useConnections";
import { useAuth } from "@/contexts/AuthContext";

const timeAgo = (date: string) => {
  if (!date) return "";
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "az önce";
  if (mins < 60) return `${mins}dk`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}sa`;
  return `${Math.floor(hrs / 24)}g`;
};

const getInitials = (name: string | null) =>
  (name ?? "?").split(" ").map((w) => w[0]).join("").toUpperCase().substring(0, 2);

const ChatListPage = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { data: conversations = [], isLoading } = useConversations();
  const { data: matches = [] } = useMatches();
  const [search, setSearch] = useState("");

  const filtered = conversations.filter((c) =>
    (c.partner as { display_name?: string | null }).display_name?.toLowerCase().includes(search.toLowerCase())
  );

  // Matches with no conversation yet
  const conversationPartnerIds = new Set(conversations.map((c) => c.partner_id));
  const newMatches = matches.filter((m) => !conversationPartnerIds.has(m.target_id));

  const isPremium = profile?.is_premium;

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 glass px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="font-display text-xl font-bold text-gradient">Mesajlar</h1>
          <button className="p-2 rounded-xl glass text-muted-foreground hover:text-foreground">
            <Plus className="w-5 h-5" />
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Sohbet ara..."
            className="w-full bg-muted/50 border border-border rounded-xl pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
          />
        </div>
      </header>

      <main className="px-4 mt-2 space-y-3">
        {/* New Matches Row */}
        {newMatches.length > 0 && (
          <section>
            <p className="text-xs text-muted-foreground mb-2 px-1 font-medium uppercase tracking-wider">Yeni Eşleşmeler</p>
            <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1">
              {newMatches.map((match) => {
                const p = match.profiles;
                const initials = getInitials(p?.display_name ?? null);
                return (
                  <button
                    key={match.id}
                    onClick={() => navigate(`/chat/${match.target_id}`)}
                    className="flex flex-col items-center gap-1.5 flex-shrink-0"
                  >
                    <div className="relative w-14 h-14 rounded-full bg-gradient-neon flex items-center justify-center text-primary-foreground text-base font-bold neon-glow">
                      {p?.avatar_url ? (
                        <img src={p.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
                      ) : initials}
                      <span className="absolute -bottom-0.5 -right-0.5 text-base">❤️</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground truncate max-w-[60px]">
                      {p?.display_name?.split(" ")[0] ?? "Kullanıcı"}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Premium upsell for DMs */}
        {!isPremium && conversations.length === 0 && newMatches.length === 0 && (
          <div className="glass rounded-2xl p-5 border border-yellow-500/20 text-center">
            <span className="text-3xl block mb-2">👑</span>
            <p className="text-sm font-bold text-foreground mb-1">Premium ile daha fazla bağlantı</p>
            <p className="text-xs text-muted-foreground mb-3">Eşleşme olmadan mesaj gönder, daha fazla kişiyle tanış</p>
            <button className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold text-sm px-5 py-2 rounded-xl">
              Premium'a Geç
            </button>
          </div>
        )}

        {/* Conversations */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass rounded-2xl h-16 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 && conversations.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center mt-4">
            <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="font-display text-lg font-bold text-foreground">Henüz mesaj yok</p>
            <p className="text-sm text-muted-foreground mt-1">Eşleşmelerinden birini seç ve sohbet başlat!</p>
          </div>
        ) : (
          <div className="space-y-1">
            {filtered.map((conv) => {
              const p = conv.partner as { display_name?: string | null; avatar_url?: string | null; username?: string | null; is_premium?: boolean | null; privacy_online_visible?: boolean | null };
              const initials = getInitials(p.display_name ?? null);
              return (
                <button
                  key={conv.partner_id}
                  onClick={() => navigate(`/chat/${conv.partner_id}`)}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-muted/40 transition-colors"
                >
                  <div className={`relative w-12 h-12 rounded-full bg-gradient-neon flex items-center justify-center text-primary-foreground font-bold flex-shrink-0 ${p.is_premium ? "neon-glow" : ""}`}>
                    {p.avatar_url ? (
                      <img src={p.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
                    ) : initials}
                    {p.privacy_online_visible && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-400 border-2 border-background" />
                    )}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-semibold ${conv.unread > 0 ? "text-foreground" : "text-muted-foreground"}`}>
                        {p.display_name ?? "Kullanıcı"}
                      </span>
                      <span className="text-xs text-muted-foreground">{timeAgo(conv.last_time)}</span>
                    </div>
                    <p className={`text-xs truncate mt-0.5 ${conv.unread > 0 ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                      {conv.last_message}
                    </p>
                  </div>
                  {conv.unread > 0 && (
                    <span className="bg-primary text-primary-foreground text-xs font-bold min-w-[20px] h-5 rounded-full flex items-center justify-center flex-shrink-0 px-1">
                      {conv.unread}
                    </span>
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

export default ChatListPage;
