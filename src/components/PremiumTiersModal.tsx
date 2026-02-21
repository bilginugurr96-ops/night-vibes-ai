import { useState } from "react";
import { X, Crown, Zap, Star, Shield, Eye, TrendingUp, Flame, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const TIERS = [
  {
    id: "plus",
    name: "Plus",
    price: "₺149",
    color: "from-blue-500 to-cyan-400",
    icon: Zap,
    badge: "⚡",
    multiplier: "1.15x",
    dailyCap: 350,
    features: [
      "1.15x SP çarpanı",
      "Günlük SP limiti: 350",
      "Haftalık 1 profil boost",
      "Kısmi 'Seni beğendi' görünürlük",
      "Eşleşme önceliği +1",
      "'Rising' rozet hakkı",
    ],
    psychology: "Görünür olmaya başla",
  },
  {
    id: "pro",
    name: "Pro",
    price: "₺299",
    color: "from-purple-500 to-pink-500",
    icon: Crown,
    badge: "💎",
    multiplier: "1.25x",
    dailyCap: 500,
    features: [
      "1.25x SP çarpanı",
      "Günlük SP limiti: 500",
      "Haftalık liderlik +150 SP bonus",
      "Tam 'Seni beğendi' erişimi",
      "Story keşif önceliği",
      "Animasyonlu profil çerçevesi",
      "Eşleşmede Pro etiketi ⚡",
    ],
    psychology: "Tercih edilen ol",
  },
  {
    id: "elite",
    name: "Elite",
    price: "₺499",
    color: "from-yellow-400 to-orange-500",
    icon: Star,
    badge: "👑",
    multiplier: "1.35x",
    dailyCap: 750,
    features: [
      "1.35x SP çarpanı",
      "Günlük SP limiti: 750",
      "Haftalık Top 10 öne çıkarma",
      "Altın isim levhası",
      "Elite keşif filtresi",
      "VIP ısı haritası parlaması",
      "Aylık 2x spotlight",
    ],
    psychology: "Sosyal figür ol",
  },
];

const PremiumTiersModal = ({ onClose }: { onClose: () => void }) => {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [activating, setActivating] = useState(false);
  const currentTier = (profile as any)?.subscription_tier ?? "free";

  const handleActivate = async (tierId: string) => {
    if (!user) return;
    setActivating(true);
    try {
      const { error } = await db
        .from("profiles")
        .update({
          subscription_tier: tierId,
          is_premium: true,
          premium_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq("user_id", user.id);
      if (error) throw error;
      await refreshProfile();
      toast({ title: `${tierId.charAt(0).toUpperCase() + tierId.slice(1)} aktif! 🎉`, description: "Premium özellikler etkinleştirildi." });
      onClose();
    } catch {
      toast({ title: "Hata", description: "Tier güncellenemedi", variant: "destructive" });
    }
    setActivating(false);
  };

  const handleDowngrade = async () => {
    if (!user) return;
    setActivating(true);
    try {
      await db.from("profiles").update({ subscription_tier: "free", is_premium: false, premium_expires_at: null }).eq("user_id", user.id);
      await refreshProfile();
      toast({ title: "Free plana dönüldü" });
      onClose();
    } catch {
      toast({ title: "Hata", variant: "destructive" });
    }
    setActivating(false);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg glass rounded-t-3xl p-5 pb-8 animate-slide-up max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-full glass text-muted-foreground">
          <X className="w-4 h-4" />
        </button>
        <div className="w-10 h-1 rounded-full bg-muted mx-auto mb-4" />

        <div className="text-center mb-5">
          <h2 className="font-display text-xl font-bold text-gradient">City Ascension Premium</h2>
          <p className="text-xs text-muted-foreground mt-1">Şehrinde yüksel, statünü göster</p>
        </div>

        <div className="space-y-3">
          {TIERS.map((tier) => {
            const isActive = currentTier === tier.id;
            const TierIcon = tier.icon;
            return (
              <div
                key={tier.id}
                onClick={() => setSelectedTier(selectedTier === tier.id ? null : tier.id)}
                className={`glass rounded-2xl p-4 cursor-pointer transition-all ${
                  isActive ? "border-2 border-primary neon-glow" : selectedTier === tier.id ? "border border-primary/50" : "border border-transparent"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-r ${tier.color} flex items-center justify-center`}>
                      <TierIcon className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground flex items-center gap-1">
                        {tier.badge} {tier.name}
                        {isActive && <span className="text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full ml-1">AKTİF</span>}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{tier.multiplier} SP • Günlük {tier.dailyCap} SP</p>
                    </div>
                  </div>
                  <p className="font-display text-lg font-bold text-foreground">{tier.price}<span className="text-[10px] text-muted-foreground">/ay</span></p>
                </div>

                {selectedTier === tier.id && (
                  <div className="mt-3 space-y-2 animate-fade-in">
                    <div className="space-y-1.5">
                      {tier.features.map((f) => (
                        <div key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="text-primary text-[10px]">✦</span>
                          {f}
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-primary/70 italic text-center mt-2">"{tier.psychology}"</p>
                    {!isActive && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleActivate(tier.id); }}
                        disabled={activating}
                        className={`w-full bg-gradient-to-r ${tier.color} text-white font-bold py-3 rounded-xl text-sm mt-2 transition-all active:scale-[0.98]`}
                      >
                        {activating ? "Aktifleştiriliyor..." : `${tier.name}'a Geç`}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {currentTier !== "free" && (
          <button onClick={handleDowngrade} disabled={activating} className="w-full text-xs text-muted-foreground mt-4 py-2 hover:text-destructive transition-colors">
            Free plana dön
          </button>
        )}

        <p className="text-[9px] text-muted-foreground/50 text-center mt-3">
          Mock mode: Ödeme alınmaz, tier anında değişir.
        </p>
      </div>
    </div>
  );
};

export default PremiumTiersModal;
