import { Check, X, MessageCircle } from "lucide-react";
import { useReceivedRequests, useAcceptRequest, useRejectRequest } from "@/hooks/useMessageRequests";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

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

const MessageRequestsTab = () => {
  const { data: requests = [], isLoading } = useReceivedRequests();
  const acceptRequest = useAcceptRequest();
  const rejectRequest = useRejectRequest();
  const navigate = useNavigate();

  const handleAccept = async (reqId: string, senderId: string) => {
    try {
      await acceptRequest.mutateAsync(reqId);
      toast.success("İstek kabul edildi!");
      navigate(`/chat/${senderId}`);
    } catch {
      toast.error("Hata oluştu");
    }
  };

  const handleReject = async (reqId: string) => {
    try {
      await rejectRequest.mutateAsync(reqId);
      toast.success("İstek reddedildi");
    } catch {
      toast.error("Hata oluştu");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2 px-4">
        {[1, 2].map((i) => (
          <div key={i} className="glass rounded-2xl h-20 animate-pulse" />
        ))}
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center mt-12 space-y-3 px-4">
        <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center">
          <MessageCircle className="w-8 h-8 text-muted-foreground opacity-50" />
        </div>
        <p className="font-display text-sm font-bold text-foreground">Mesaj isteği yok</p>
        <p className="text-xs text-muted-foreground text-center max-w-[220px]">
          Birileri sana mesaj isteği gönderdiğinde burada görünecek
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 px-4">
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2">
        İstekler ({requests.length})
      </p>
      {requests.map((req) => {
        const p = req.sender_profile;
        return (
          <div key={req.id} className="glass rounded-2xl p-4 flex items-center gap-3 border border-primary/10">
            <button
              onClick={() => navigate(`/user/${req.sender_id}`)}
              className="flex-shrink-0"
            >
              <div className={`w-12 h-12 rounded-full bg-gradient-neon flex items-center justify-center text-primary-foreground text-sm font-bold ${p?.is_premium ? "neon-glow" : ""}`}>
                {p?.avatar_url ? (
                  <img src={p.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
                ) : getInitials(p?.display_name ?? null)}
              </div>
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-foreground truncate">
                  {p?.display_name ?? "Kullanıcı"}
                </span>
                {p?.is_premium && <span className="text-[10px]">👑</span>}
                <span className="text-[10px] text-muted-foreground">· {timeAgo(req.created_at)}</span>
              </div>
              {req.message_preview && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  "{req.message_preview}"
                </p>
              )}
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
              <button
                onClick={() => handleAccept(req.id, req.sender_id)}
                disabled={acceptRequest.isPending}
                className="w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center hover:bg-primary/25 transition-colors"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleReject(req.id)}
                disabled={rejectRequest.isPending}
                className="w-9 h-9 rounded-full bg-muted/50 text-muted-foreground flex items-center justify-center hover:bg-destructive/15 hover:text-destructive transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MessageRequestsTab;
