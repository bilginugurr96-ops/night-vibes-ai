import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  Users,
  Trophy,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Flame,
  Star,
  Zap,
  Sun,
  Moon,
} from "lucide-react";

const slides = [
  {
    icon: <Sparkles className="w-10 h-10" />,
    gradient: "from-primary to-accent",
    title: "Night Vibes'a Hoş Geldin! 🎉",
    desc: "Gece hayatını keşfet, yeni insanlarla tanış ve sosyal gücünü artır. İşte seni neler bekliyor:",
  },
  {
    icon: <MapPin className="w-10 h-10" />,
    gradient: "from-emerald-500 to-teal-600",
    title: "Check-in Yap",
    desc: "Gittiğin mekanlara check-in yaparak XP kazan, streak'ini koru ve sıralamalarda yüksel. Mekan ne kadar popülerse, o kadar çok puan!",
  },
  {
    icon: <Users className="w-10 h-10" />,
    gradient: "from-pink-500 to-rose-600",
    title: "Keşfet & Bağlan",
    desc: "Aynı mekanda olan kişileri keşfet, swipe ile ilgi göster ve eşleşmelerle sohbet başlat. Ortak mekan = daha yüksek eşleşme skoru!",
  },
  {
    icon: <Flame className="w-10 h-10" />,
    gradient: "from-orange-500 to-amber-600",
    title: "Hikayeler & Feed",
    desc: "Gece hikayelerini paylaş, arkadaşlarının neler yaptığını gör. Hikaye paylaşmak da SP kazandırır!",
  },
  {
    icon: <Trophy className="w-10 h-10" />,
    gradient: "from-yellow-500 to-orange-500",
    title: "Liderlik Tablosu",
    desc: "Haftalık ve aylık sıralamalarda şehrindeki en aktif kullanıcılarla yarış. İlk 3'e giren özel rozetler kazanır!",
  },
  {
    icon: <Zap className="w-10 h-10" />,
    gradient: "from-violet-500 to-purple-600",
    title: "Social Power (SP)",
    desc: "Check-in, hikaye, eşleşme ve streak gibi aktivitelerle SP topla. SP seviyen yükseldikçe profilin daha çok öne çıkar!",
  },
  {
    icon: <Star className="w-10 h-10" />,
    gradient: "from-secondary to-cyan-500",
    title: "Hazırsın! 🚀",
    desc: "Şimdi uygulamayı keşfetmeye başla. İlk check-in'ini yap ve gece macerana başla!",
  },
];

const AppGuidePage = () => {
  const [current, setCurrent] = useState(0);
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();

  const isLast = current === slides.length - 1;
  const slide = slides[current];

  const handleFinish = async () => {
    if (user) {
      // Mark guide as seen
      await (supabase as any)
        .from("profiles")
        .update({ guide_complete: true })
        .eq("user_id", user.id);
      await refreshProfile();
    }
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      {/* Dots */}
      <div className="flex gap-1.5 mb-8">
        {slides.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === current
                ? "w-8 bg-primary"
                : i < current
                ? "w-6 bg-primary/40"
                : "w-3 bg-muted"
            }`}
          />
        ))}
      </div>

      {/* Card */}
      <div className="w-full max-w-sm animate-fade-in-up" key={current}>
        <div className="flex flex-col items-center text-center">
          <div
            className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${slide.gradient} flex items-center justify-center text-white mb-6 shadow-lg`}
          >
            {slide.icon}
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground mb-3">
            {slide.title}
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
            {slide.desc}
          </p>
        </div>
      </div>

      {/* Navigation */}
      <div className="w-full max-w-sm mt-10">
        <div className="flex gap-3">
          {current > 0 && (
            <Button
              variant="outline"
              onClick={() => setCurrent(current - 1)}
              className="rounded-xl py-5 px-5"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
          )}
          <Button
            onClick={() => {
              if (isLast) handleFinish();
              else setCurrent(current + 1);
            }}
            className="flex-1 bg-gradient-neon text-primary-foreground font-semibold rounded-xl py-5 neon-glow"
          >
            {isLast ? (
              "Başla 🚀"
            ) : (
              <span className="flex items-center gap-2">
                Devam Et <ChevronRight className="w-4 h-4" />
              </span>
            )}
          </Button>
        </div>

        {!isLast && (
          <button
            onClick={handleFinish}
            className="w-full text-xs text-muted-foreground mt-4 hover:text-foreground transition-colors"
          >
            Atla
          </button>
        )}

        <p className="text-[10px] text-muted-foreground text-center mt-3">
          {current + 1}/{slides.length}
        </p>
      </div>
    </div>
  );
};

export default AppGuidePage;
