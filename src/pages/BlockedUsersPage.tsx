import { useNavigate } from "react-router-dom";
import { ChevronLeft, Ban, Shield } from "lucide-react";
import { useBlockedList, useUnblockUser } from "@/hooks/useBlockedUsers";
import { Button } from "@/components/ui/button";

const BlockedUsersPage = () => {
  const navigate = useNavigate();
  const { data: blockedList = [], isLoading } = useBlockedList();
  const unblock = useUnblockUser();

  return (
    <div className="min-h-screen bg-background animate-slide-up">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/40">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-xl hover:bg-muted/40 transition-colors">
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="font-display text-lg font-bold text-foreground">Engellenen Kullanıcılar</h1>
          <div className="w-9" />
        </div>
      </header>

      <main className="px-4 py-4 space-y-3 pb-12">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : blockedList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Shield className="w-12 h-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Engellenen kullanıcı yok</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Engellediğiniz kullanıcılar burada görünür</p>
          </div>
        ) : (
          blockedList.map((item: any) => {
            const p = item.profile;
            const initials = (p?.display_name ?? "?").split(" ").map((w: string) => w[0]).join("").toUpperCase().substring(0, 2);
            return (
              <div key={item.id} className="glass rounded-xl p-3 flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full bg-gradient-neon flex items-center justify-center text-primary-foreground text-sm font-bold overflow-hidden cursor-pointer"
                  onClick={() => navigate(`/profile?uid=${item.blocked_id}`)}
                >
                  {p?.avatar_url ? (
                    <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{p?.display_name ?? "Kullanıcı"}</p>
                  <p className="text-[11px] text-muted-foreground">@{p?.username ?? "kullanici"}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => unblock.mutate(item.blocked_id)}
                  disabled={unblock.isPending}
                  className="rounded-xl text-xs h-8"
                >
                  <Ban className="w-3 h-3 mr-1" />
                  Engeli Kaldır
                </Button>
              </div>
            );
          })
        )}
      </main>
    </div>
  );
};

export default BlockedUsersPage;
