import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Send, Smile, MoreVertical, Phone, CheckCheck, Check, Trash2, Copy, Reply, MapPin } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useRealTimeMessages, useSendMessage, useDeleteMessage } from "@/hooks/useMessages";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import VenueShareCard from "@/components/VenueShareCard";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const timeStr = (date: string) =>
  new Date(date).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });

const REACTIONS = ["❤️", "😂", "🔥", "👏", "😮", "😢"];

const ChatConversationPage = () => {
  const { partnerId } = useParams<{ partnerId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: messages = [], isLoading } = useRealTimeMessages(partnerId ?? "");
  const sendMessage = useSendMessage();
  const deleteMessage = useDeleteMessage();
  const [text, setText] = useState("");
  const [partner, setPartner] = useState<{ display_name: string | null; avatar_url: string | null; is_premium?: boolean | null; privacy_online_visible?: boolean | null } | null>(null);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [showReactions, setShowReactions] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!partnerId) return;
    db.from("profiles")
      .select("display_name, avatar_url, is_premium, privacy_online_visible")
      .eq("user_id", partnerId)
      .maybeSingle()
      .then(({ data }: { data: typeof partner }) => {
        if (data) setPartner(data);
      });
  }, [partnerId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim() || !partnerId) return;
    setSending(true);
    try {
      await sendMessage.mutateAsync({
        receiverId: partnerId,
        content: text.trim(),
        replyToId: replyTo ?? undefined,
      });
      setText("");
      setReplyTo(null);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDelete = async (msgId: string) => {
    if (!partnerId) return;
    try {
      await deleteMessage.mutateAsync({ messageId: msgId, partnerId });
      toast.success("Mesaj silindi");
    } catch {
      toast.error("Mesaj silinemedi");
    }
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success("Kopyalandı");
  };

  const getInitials = (name: string | null) =>
    (name ?? "?").split(" ").map((w: string) => w[0]).join("").toUpperCase().substring(0, 2);

  const replyMessage = replyTo ? messages.find((m) => m.id === replyTo) : null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 glass px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-xl glass text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`relative w-9 h-9 rounded-full bg-gradient-neon flex items-center justify-center text-primary-foreground text-sm font-bold flex-shrink-0 ${partner?.is_premium ? "neon-glow" : ""}`}>
            {partner?.avatar_url ? (
              <img src={partner.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
            ) : getInitials(partner?.display_name ?? null)}
            {partner?.privacy_online_visible && (
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-background" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground truncate">{partner?.display_name ?? "Kullanıcı"}</p>
            <p className="text-xs text-green-400">{partner?.privacy_online_visible ? "Çevrimiçi" : "Son görülme bilinmiyor"}</p>
          </div>
        </div>
        <div className="flex gap-1">
          <button className="p-2 rounded-xl glass text-muted-foreground hover:text-foreground">
            <Phone className="w-4 h-4" />
          </button>
          <button className="p-2 rounded-xl glass text-muted-foreground hover:text-foreground">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-32">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center mt-16">
            <p className="text-4xl mb-3">💞</p>
            <p className="font-display text-base font-bold text-foreground">Sohbet başlasın!</p>
            <p className="text-sm text-muted-foreground mt-1">İlk mesajı sen gönder 🌙</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMine = msg.sender_id === user?.id;
            const isConsecutive = idx > 0 && messages[idx - 1].sender_id === msg.sender_id;

            return (
              <div
                key={msg.id}
                className={`flex ${isMine ? "justify-end" : "justify-start"} ${isConsecutive ? "mt-0.5" : "mt-3"}`}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <div
                      className="relative max-w-[75%] group cursor-pointer"
                      onDoubleClick={() => setShowReactions(showReactions === msg.id ? null : msg.id)}
                    >
                      {/* Reply preview */}
                      {msg.reply_to_id && (
                        <div className={`text-xs px-3 py-1.5 rounded-xl mb-0.5 opacity-70 ${isMine ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                          <p className="line-clamp-1">↩ {messages.find((m) => m.id === msg.reply_to_id)?.content ?? "Mesaj"}</p>
                        </div>
                      )}

                      <div
                        className={`px-4 py-2.5 rounded-2xl ${
                          isMine
                            ? "bg-gradient-neon text-primary-foreground rounded-tr-sm"
                            : "glass text-foreground rounded-tl-sm"
                        }`}
                      >
                        {msg.media_url && msg.media_type === "image" && (
                          <img src={msg.media_url} alt="Media" className="rounded-xl max-w-full mb-2" />
                        )}
                        <p className="text-sm leading-relaxed">{msg.content}</p>
                        <div className={`flex items-center gap-1 mt-1 ${isMine ? "justify-end" : "justify-start"}`}>
                          <span className="text-[10px] opacity-70">{timeStr(msg.created_at)}</span>
                          {isMine && (
                            msg.is_read
                              ? <CheckCheck className="w-3 h-3 opacity-80" />
                              : <Check className="w-3 h-3 opacity-60" />
                          )}
                        </div>
                      </div>

                      {/* Reaction popup */}
                      {showReactions === msg.id && (
                        <div className={`absolute ${isMine ? "right-0" : "left-0"} -top-10 flex gap-1 glass rounded-2xl p-1.5 z-10 shadow-lg`}>
                          {REACTIONS.map((r) => (
                            <button
                              key={r}
                              onClick={(e) => { e.stopPropagation(); setShowReactions(null); }}
                              className="text-lg hover:scale-125 transition-transform"
                            >
                              {r}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align={isMine ? "end" : "start"} className="min-w-[160px]">
                    <DropdownMenuItem onClick={() => setReplyTo(msg.id)}>
                      <Reply className="w-4 h-4 mr-2" />
                      Yanıtla
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleCopy(msg.content)}>
                      <Copy className="w-4 h-4 mr-2" />
                      Kopyala
                    </DropdownMenuItem>
                    {isMine && (
                      <DropdownMenuItem
                        onClick={() => handleDelete(msg.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Sil
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </main>

      {/* Input */}
      <div className="fixed bottom-0 left-0 right-0 glass border-t border-border px-4 py-3 space-y-2">
        {replyMessage && (
          <div className="flex items-center gap-2 bg-muted/50 rounded-xl px-3 py-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-primary font-medium">Yanıtlıyorsun</p>
              <p className="text-xs text-muted-foreground truncate">{replyMessage.content}</p>
            </div>
            <button onClick={() => setReplyTo(null)} className="text-muted-foreground hover:text-foreground text-lg leading-none">×</button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <button className="p-2.5 rounded-xl glass text-muted-foreground hover:text-foreground flex-shrink-0">
            <Smile className="w-5 h-5" />
          </button>
          <div className="flex-1 relative">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Mesaj yaz..."
              rows={1}
              className="w-full bg-muted/50 border border-border rounded-2xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-none max-h-32 overflow-auto"
              style={{ minHeight: "44px" }}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={sending || !text.trim()}
            className="w-10 h-10 rounded-full bg-gradient-neon flex items-center justify-center neon-glow flex-shrink-0 disabled:opacity-40 transition-all active:scale-95"
          >
            <Send className="w-4 h-4 text-primary-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatConversationPage;