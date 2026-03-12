import { useState } from "react";
import { X, Send } from "lucide-react";
import { useSendMessageRequest } from "@/hooks/useMessageRequests";
import { toast } from "sonner";

interface Props {
  receiverId: string;
  receiverName: string;
  onClose: () => void;
}

const MessageRequestModal = ({ receiverId, receiverName, onClose }: Props) => {
  const [message, setMessage] = useState("");
  const sendRequest = useSendMessageRequest();

  const handleSend = async () => {
    if (!message.trim()) return;
    try {
      await sendRequest.mutateAsync({
        receiverId,
        messagePreview: message.trim(),
      });
      toast.success("Mesaj isteği gönderildi!");
      onClose();
    } catch (err: any) {
      toast.error(err.message ?? "Hata oluştu");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md glass rounded-t-3xl sm:rounded-3xl border border-border/50 p-5 space-y-4 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-base font-bold text-foreground">Mesaj İsteği Gönder</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-muted/50">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{receiverName}</span> kişisine mesaj isteği gönder.
          Kabul ederse sohbet başlatabilirsin.
        </p>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Merhaba! Tanışmak ister misin? 👋"
          maxLength={200}
          rows={3}
          className="w-full bg-muted/50 border border-border rounded-2xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-none"
        />

        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">{message.length}/200</span>
          <button
            onClick={handleSend}
            disabled={!message.trim() || sendRequest.isPending}
            className="flex items-center gap-2 bg-gradient-neon text-primary-foreground font-bold text-sm px-5 py-2.5 rounded-xl neon-glow disabled:opacity-40 transition-all"
          >
            <Send className="w-4 h-4" />
            Gönder
          </button>
        </div>
      </div>
    </div>
  );
};

export default MessageRequestModal;
