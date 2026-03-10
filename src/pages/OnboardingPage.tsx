import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, PartyPopper, Coffee, Compass, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

type VibeOption = "going_out" | "chill" | "exploring";

const GENDER_OPTIONS = [
  { value: "male", label: "Erkek", icon: "♂️" },
  { value: "female", label: "Kadın", icon: "♀️" },
  { value: "non_binary", label: "Non-binary", icon: "⚧️" },
  { value: "prefer_not_to_say", label: "Belirtmek istemiyorum", icon: "🤐" },
];

const INTERESTED_IN_OPTIONS = [
  { value: "men", label: "Erkekler", icon: "👨" },
  { value: "women", label: "Kadınlar", icon: "👩" },
  { value: "everyone", label: "Herkes", icon: "🌈" },
];

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
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [gender, setGender] = useState<string | null>(null);
  const [interestedIn, setInterestedIn] = useState<string | null>(null);
  const [selectedVibe, setSelectedVibe] = useState<VibeOption | null>(null);
  const [saving, setSaving] = useState(false);
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleFinish = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await db
      .from("profiles")
      .update({
        gender: gender || null,
        interested_in: interestedIn || null,
        tonight_vibe: selectedVibe || null,
        onboarding_complete: true,
      })
      .eq("user_id", user.id);

    if (error) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
      setSaving(false);
      return;
    }
    await refreshProfile();
    navigate("/", { replace: true });
  };

  const handleSkip = async () => {
    if (!user) return;
    await db.from("profiles").update({ onboarding_complete: true }).eq("user_id", user.id);
    await refreshProfile();
    navigate("/", { replace: true });
  };

  const canProceed = step === 1 ? !!gender : step === 2 ? !!interestedIn : !!selectedVibe;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      {/* Step indicator */}
      <div className="flex gap-2 mb-8">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`h-1.5 rounded-full transition-all ${
              s === step ? "w-8 bg-primary" : s < step ? "w-8 bg-primary/40" : "w-4 bg-muted"
            }`}
          />
        ))}
      </div>

      {/* Step 1: Gender */}
      {step === 1 && (
        <div className="w-full max-w-sm animate-fade-in-up">
          <div className="text-center mb-8">
            <h1 className="font-display text-2xl font-bold text-foreground">Cinsiyetin nedir?</h1>
            <p className="text-muted-foreground text-sm mt-2">Keşfet deneyimini kişiselleştirmek için</p>
          </div>
          <div className="space-y-3">
            {GENDER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setGender(opt.value)}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-200 ${
                  gender === opt.value
                    ? "border-primary bg-primary/10 neon-glow scale-[1.02]"
                    : "border-border/50 glass hover:border-border"
                }`}
              >
                <span className="text-2xl">{opt.icon}</span>
                <p className="font-display font-bold text-foreground">{opt.label}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Interested In */}
      {step === 2 && (
        <div className="w-full max-w-sm animate-fade-in-up">
          <div className="text-center mb-8">
            <h1 className="font-display text-2xl font-bold text-foreground">Kimleri keşfetmek istersin?</h1>
            <p className="text-muted-foreground text-sm mt-2">Sana en uygun kişileri gösterelim</p>
          </div>
          <div className="space-y-3">
            {INTERESTED_IN_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setInterestedIn(opt.value)}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-200 ${
                  interestedIn === opt.value
                    ? "border-primary bg-primary/10 neon-glow scale-[1.02]"
                    : "border-border/50 glass hover:border-border"
                }`}
              >
                <span className="text-2xl">{opt.icon}</span>
                <p className="font-display font-bold text-foreground">{opt.label}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Tonight Vibe */}
      {step === 3 && (
        <div className="w-full max-w-sm animate-fade-in-up">
          <div className="text-center mb-8">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-neon flex items-center justify-center neon-glow mb-4">
              <Sparkles className="w-7 h-7 text-primary-foreground" />
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground">Bu gece ne yapıyorsun?</h1>
            <p className="text-muted-foreground text-sm mt-2">Sana en uygun içerikleri gösterelim</p>
          </div>
          <div className="space-y-3">
            {vibeOptions.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setSelectedVibe(opt.key)}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-200 ${
                  selectedVibe === opt.key
                    ? "border-primary bg-primary/10 neon-glow scale-[1.02]"
                    : "border-border/50 glass hover:border-border"
                }`}
              >
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center bg-gradient-to-br ${opt.gradient} text-white flex-shrink-0`}>
                  {opt.icon}
                </div>
                <div className="text-left">
                  <p className="font-display font-bold text-foreground">{opt.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="w-full max-w-sm mt-8">
        <Button
          onClick={() => {
            if (step < 3) setStep((step + 1) as 1 | 2 | 3);
            else handleFinish();
          }}
          disabled={!canProceed || saving}
          className="w-full bg-gradient-neon text-primary-foreground font-semibold rounded-xl py-5 neon-glow disabled:opacity-40"
        >
          {saving ? "Kaydediliyor..." : step < 3 ? (
            <span className="flex items-center gap-2">Devam Et <ChevronRight className="w-4 h-4" /></span>
          ) : "Başla"}
        </Button>
        <button onClick={handleSkip} className="w-full text-center mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors">
          Atla
        </button>
      </div>
    </div>
  );
};

export default OnboardingPage;