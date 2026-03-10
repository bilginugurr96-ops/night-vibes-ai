import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, PartyPopper, Coffee, Compass, ChevronRight, User, Cake, Camera, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

type VibeOption = "going_out" | "chill" | "exploring";

const TOTAL_STEPS = 5;

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
  { key: "going_out", label: "Going Out", desc: "Gece hayatı, kulüpler, barlar", icon: <PartyPopper className="w-7 h-7" />, gradient: "from-primary to-accent" },
  { key: "chill", label: "Chill Evening", desc: "Kafeler, restoranlar, sakin ortamlar", icon: <Coffee className="w-7 h-7" />, gradient: "from-amber-500 to-orange-600" },
  { key: "exploring", label: "Just Exploring", desc: "Her şeyden biraz, karışık öneriler", icon: <Compass className="w-7 h-7" />, gradient: "from-secondary to-cyan-600" },
];

const OnboardingPage = () => {
  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState<string | null>(null);
  const [interestedIn, setInterestedIn] = useState<string | null>(null);
  const [selectedVibe, setSelectedVibe] = useState<VibeOption | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  // Age validation: must be 18+
  const isValidAge = () => {
    if (!birthDate) return false;
    const bd = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - bd.getFullYear();
    const m = today.getMonth() - bd.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < bd.getDate())) age--;
    return age >= 18;
  };

  const canProceed = () => {
    switch (step) {
      case 1: return displayName.trim().length >= 2 && !!avatarFile;
      case 2: return isValidAge();
      case 3: return !!gender;
      case 4: return !!interestedIn;
      case 5: return !!selectedVibe;
      default: return false;
    }
  };

  const handleFinish = async () => {
    if (!user) return;
    setSaving(true);

    try {
      let avatarUrl: string | null = null;

      // Upload avatar if selected
      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop();
        const path = `${user.id}/avatar_${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("avatars").upload(path, avatarFile, { upsert: true });
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
          avatarUrl = urlData.publicUrl;
        }
      }

      const updateData: Record<string, unknown> = {
        display_name: displayName.trim(),
        birth_date: birthDate,
        gender,
        interested_in: interestedIn,
        tonight_vibe: selectedVibe,
        onboarding_complete: true,
      };
      if (avatarUrl) updateData.avatar_url = avatarUrl;

      const { error } = await db
        .from("profiles")
        .update(updateData)
        .eq("user_id", user.id);

      if (error) throw error;

      await refreshProfile();
      navigate("/", { replace: true });
    } catch (err: any) {
      toast({ title: "Hata", description: err?.message ?? "Bir şeyler ters gitti", variant: "destructive" });
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      {/* Step indicator */}
      <div className="flex gap-2 mb-8">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((s) => (
          <div
            key={s}
            className={`h-1.5 rounded-full transition-all ${
              s === step ? "w-8 bg-primary" : s < step ? "w-8 bg-primary/40" : "w-4 bg-muted"
            }`}
          />
        ))}
      </div>

      {/* Step 1: Name + Avatar */}
      {step === 1 && (
        <div className="w-full max-w-sm animate-fade-in-up">
          <div className="text-center mb-8">
            <h1 className="font-display text-2xl font-bold text-foreground">Profilini oluştur</h1>
            <p className="text-muted-foreground text-sm mt-2">İsmini ve fotoğrafını ekle</p>
          </div>

          {/* Avatar */}
          <div className="flex justify-center mb-6">
            <label className="relative cursor-pointer group">
              <div className="w-24 h-24 rounded-full bg-muted/50 border-2 border-dashed border-border flex items-center justify-center overflow-hidden transition-all group-hover:border-primary/50">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-8 h-8 text-muted-foreground" />
                )}
              </div>
              <div className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-primary flex items-center justify-center">
                <Camera className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </label>
          </div>

          {/* Name input */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> İsim
            </label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Adını gir"
              maxLength={30}
              className="bg-card/60 border-border/40 rounded-xl h-12 text-base"
            />
            <p className="text-[10px] text-muted-foreground">Diğer kullanıcılar seni bu isimle görecek</p>
          </div>
        </div>
      )}

      {/* Step 2: Birth Date */}
      {step === 2 && (
        <div className="w-full max-w-sm animate-fade-in-up">
          <div className="text-center mb-8">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-neon flex items-center justify-center neon-glow mb-4">
              <Cake className="w-7 h-7 text-primary-foreground" />
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground">Doğum tarihin</h1>
            <p className="text-muted-foreground text-sm mt-2">18 yaş ve üzeri olmalısın</p>
          </div>
          <Input
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split("T")[0]}
            className="bg-card/60 border-border/40 rounded-xl h-12 text-base"
          />
          {birthDate && !isValidAge() && (
            <p className="text-destructive text-xs mt-2">18 yaşından büyük olmalısın</p>
          )}
        </div>
      )}

      {/* Step 3: Gender */}
      {step === 3 && (
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

      {/* Step 4: Interested In */}
      {step === 4 && (
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

      {/* Step 5: Tonight Vibe */}
      {step === 5 && (
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
        <div className="flex gap-3">
          {step > 1 && (
            <Button
              variant="outline"
              onClick={() => setStep(step - 1)}
              className="rounded-xl py-5 px-6"
            >
              Geri
            </Button>
          )}
          <Button
            onClick={() => {
              if (step < TOTAL_STEPS) setStep(step + 1);
              else handleFinish();
            }}
            disabled={!canProceed() || saving}
            className="flex-1 bg-gradient-neon text-primary-foreground font-semibold rounded-xl py-5 neon-glow disabled:opacity-40"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : step < TOTAL_STEPS ? (
              <span className="flex items-center gap-2">Devam Et <ChevronRight className="w-4 h-4" /></span>
            ) : (
              "Başla 🚀"
            )}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-4">
          Adım {step}/{TOTAL_STEPS}
        </p>
      </div>
    </div>
  );
};

export default OnboardingPage;
