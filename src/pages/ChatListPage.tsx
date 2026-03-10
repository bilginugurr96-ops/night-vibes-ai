import { MessageCircle, Plus, Trash2, Sparkles, Users } from "lucide-react";
import { useState } from "react";
import PremiumTiersModal from "@/components/PremiumTiersModal";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { useConversations } from "@/hooks/useMessages";
import { useMatches } from "@/hooks/useConnections";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

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
  const { user, profile } = useAuth();
  const { data: conversations = [], isLoading } = useConversations();
  const { data: matches = [] } = useMatches();
  const qc = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showPremium, setShowPremium] = useState(false);

  const handleDeleteConversation = async (partnerId: string) => {
    if (!user) return;
    setDeletingId(partnerId);
    try {
      await db.from("messages").delete()
        .eq("sender_id", user.id)
        .eq("receiver_id", partnerId);
      qc.invalidateQueries({ queryKey: ["conversations", user.id] });
      toast.success("Sohbet silindi");
    } catch {
      toast.error("Sohbet silinemedi");
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = conversations;
  const conversationPartnerIds = new Set(conversations.map((c) => c.partner_id));
  const newMatches = matches.filter((m) => !conversationPartnerIds.has(m.target_id));
  const isPremium = profile?.is_premium;
  const totalUnread = conversations.reduce((acc, c) => acc + c.unread, 0);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 glass px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="font-display text-xl font-bold text-gradient">Mesajlar</h1>
            {totalUnread > 0 && (
              <span className="bg-primary text-primary-foreground text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">
                {totalUnread}
              </span>
            )}
          </div>
          <button
            onClick={() => navigate("/connections")}
            className="p-2 rounded-xl glass text-muted-foreground hover:text-foreground"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="px-4 mt-2 space-y-4">
        {/* Online friends quick strip */}
        {conversations.length > 0 && (
          <section>
            <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1">
              {conversations.slice(0, 8).map((conv) => {
                const p = conv.partner as { display_name?: string | null; avatar_url?: string | null; privacy_online_visible?: boolean | null; is_premium?: boolean | null };
                const isOnline = p.privacy_online_visible;
                return (
                  <button
                    key={conv.partner_id}
                    onClick={() => navigate(`/chat/${conv.partner_id}`)}
                    className="flex flex-col items-center gap-1 flex-shrink-0"
                  >
                    <div className={`relative w-12 h-12 rounded-full bg-gradient-neon flex items-center justify-center text-primary-foreground text-xs font-bold ${p.is_premium ? "neon-glow" : ""}`}>
                      {p.avatar_url ? (
                        <img src={p.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
                      ) : getInitials(p.display_name ?? null)}
                      {isOnline && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-400 border-2 border-background" />
                      )}
                      {conv.unread > 0 && (
                        <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                          {conv.unread}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground truncate max-w-[50px]">
                      {(p.display_name ?? "?").split(" ")[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* New Matches Row */}
        {newMatches.length > 0 && (
          <section className="glass rounded-2xl p-3">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <p className="text-xs font-semibold text-foreground">Yeni Eşleşmeler</p>
              <span className="bg-primary/20 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {newMatches.length}
              </span>
            </div>
            <div className="flex gap-3 overflow-x-auto scrollbar-none">
              {newMatches.map((match) => {
                const p = match.profiles;
                const initials = getInitials(p?.display_name ?? null);
                return (
                  <button
                    key={match.id}
                    onClick={() => navigate(`/chat/${match.target_id}`)}
                    className="flex flex-col items-center gap-1.5 flex-shrink-0"
                  >
                    <div className="relative w-14 h-14 rounded-full bg-gradient-neon flex items-center justify-center text-primary-foreground text-base font-bold neon-glow ring-2 ring-primary/30 ring-offset-2 ring-offset-background">
                      {p?.avatar_url ? (
                        <img src={p.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
                      ) : initials}
                      <span className="absolute -bottom-0.5 -right-0.5 text-base">💬</span>
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

        {/* Premium upsell */}
        {!isPremium && conversations.length === 0 && newMatches.length === 0 && (
          <div className="glass rounded-2xl p-5 border border-yellow-500/20 text-center">
            <span className="text-3xl block mb-2">👑</span>
            <p className="text-sm font-bold text-foreground mb-1">Premium ile daha fazla bağlantı</p>
            <p className="text-xs text-muted-foreground mb-3">Eşleşme olmadan mesaj gönder, daha fazla kişiyle tanış</p>
            <button
              onClick={() => setShowPremium(true)}
              className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold text-sm px-5 py-2 rounded-xl"
            >
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
        ) : filtered.length === 0 && conversations.length === 0 && newMatches.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-8 space-y-4">
            <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center">
              <MessageCircle className="w-10 h-10 text-muted-foreground opacity-50" />
            </div>
            <div className="text-center">
              <p className="font-display text-lg font-bold text-foreground">Henüz mesaj yok</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-[220px] mx-auto">
                Keşfet'ten birileriyle eşleş ve sohbete başla! 🌙
              </p>
            </div>
            <button
              onClick={() => navigate("/connections")}
              className="flex items-center gap-2 bg-gradient-neon text-primary-foreground font-bold text-sm px-5 py-2.5 rounded-xl neon-glow"
            >
              <Users className="w-4 h-4" />
              Keşfet'e Git
            </button>
          </div>
        ) : (
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground px-1 mb-1 font-medium uppercase tracking-wider">
              Sohbetler ({filtered.length})
            </p>
            {filtered.map((conv) => {
              const p = conv.partner as { display_name?: string | null; avatar_url?: string | null; username?: string | null; is_premium?: boolean | null; privacy_online_visible?: boolean | null };
              const initials = getInitials(p.display_name ?? null);
              return (
                <div
                  key={conv.partner_id}
                  className={`w-full flex items-center gap-2 p-3 rounded-2xl transition-colors group ${
                    conv.unread > 0 ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/40"
                  }`}
                >
                  <div
                    className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                    onClick={() => navigate(`/chat/${conv.partner_id}`)}
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
                        <div className="flex items-center gap-1.5">
                          <span className={`text-sm font-semibold ${conv.unread > 0 ? "text-foreground" : "text-muted-foreground"}`}>
                            {p.display_name ?? "Kullanıcı"}
                          </span>
                          {p.is_premium && <span className="text-[10px]">👑</span>}
                        </div>
                        <span className="text-[11px] text-muted-foreground">{timeAgo(conv.last_time)}</span>
                      </div>
                      <p className={`text-xs truncate mt-0.5 ${conv.unread > 0 ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                        {conv.last_message}
                      </p>
                    </div>
                    {conv.unread > 0 && (
                      <span className="bg-primary text-primary-foreground text-[10px] font-bold min-w-[20px] h-5 rounded-full flex items-center justify-center flex-shrink-0 px-1">
                        {conv.unread}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteConversation(conv.partner_id)}
                    disabled={deletingId === conv.partner_id}
                    className="p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Quick tip at bottom */}
        {conversations.length > 0 && conversations.length < 3 && (
          <div className="glass rounded-2xl p-4 text-center border border-border/50 mt-2">
            <p className="text-xs text-muted-foreground">
              💡 <span className="font-medium text-foreground">İpucu:</span> Keşfet'ten yeni kişilerle eşleşerek sohbet listeni büyüt!
            </p>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default ChatListPage;
