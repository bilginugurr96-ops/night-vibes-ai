import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, PartyPopper, Coffee, Compass } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

type VibeOption = "going_out" | "chill" | "exploring";

const vibeOptions: { key: VibeOption; label: string; desc: string; icon: React.ReactNode; gradient: string }[] = [
  {
    key: "going_out",
    label: "Going Out",
    desc: "Gece hayatı, kulüpler, barlar",
    icon: <PartyPopper className="w-7 h-7" />,
    gradient: "from-primary to-accent",
  },
  {
    key: "chill",
    label: "Chill Evening",
    desc: "Kafeler, restoranlar, sakin ortamlar",
    icon: <Coffee className="w-7 h-7" />,
    gradient: "from-amber-500 to-orange-600",
  },
  {
    key: "exploring",
    label: "Just Exploring",
    desc: "Her şeyden biraz, karışık öneriler",
    icon: <Compass className="w-7 h-7" />,
    gradient: "from-secondary to-cyan-600",
  },
];

const OnboardingPage = () => {
  const [selected, setSelected] = useState<VibeOption | null>(null);
  const [saving, setSaving] = useState(false);
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleContinue = async () => {
    if (!selected || !user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ tonight_vibe: selected, onboarding_complete: true } as any)
      .eq("user_id", user.id);

    if (error) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
      setSaving(false);
      return;
    }
    await refreshProfile();
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      {/* Header */}
      <div className="text-center mb-10 animate-slide-up">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-neon flex items-center justify-center neon-glow mb-4">
          <Sparkles className="w-7 h-7 text-primary-foreground" />
        </div>
        <h1 className="font-display text-2xl font-bold text-foreground">Bu gece ne yapıyorsun?</h1>
        <p className="text-muted-foreground text-sm mt-2">
          Sana en uygun içerikleri gösterelim
        </p>
      </div>

      {/* Options */}
      <div className="w-full max-w-sm space-y-3 animate-fade-in-up">
        {vibeOptions.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setSelected(opt.key)}
            className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-200 ${
              selected === opt.key
                ? "border-primary bg-primary/10 neon-glow scale-[1.02]"
                : "border-border/50 glass hover:border-border"
            }`}
          >
            <div
              className={`w-14 h-14 rounded-xl flex items-center justify-center bg-gradient-to-br ${opt.gradient} text-white flex-shrink-0`}
            >
              {opt.icon}
            </div>
            <div className="text-left">
              <p className="font-display font-bold text-foreground">{opt.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* CTA */}
      <div className="w-full max-w-sm mt-8">
        <Button
          onClick={handleContinue}
          disabled={!selected || saving}
          className="w-full bg-gradient-neon text-primary-foreground font-semibold rounded-xl py-5 neon-glow disabled:opacity-40"
        >
          {saving ? "Kaydediliyor..." : "Devam Et"}
        </Button>
        <button
          onClick={async () => {
            if (!user) return;
            await supabase
              .from("profiles")
              .update({ onboarding_complete: true } as any)
              .eq("user_id", user.id);
            await refreshProfile();
            navigate("/", { replace: true });
          }}
          className="w-full text-center mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Atla
        </button>
      </div>
    </div>
  );
};

export default OnboardingPage;
