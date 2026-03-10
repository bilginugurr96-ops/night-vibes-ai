import { useState, useRef } from "react";
import { ChevronLeft, Camera, Instagram, Briefcase, Cake, Sparkles, User, Heart, Loader2, Check } from "lucide-react";
import ProfilePhotoGallery from "@/components/ProfilePhotoGallery";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const INTERESTS = [
  "Club", "Rooftop", "Techno", "Hip-Hop", "Cocktails", "Festival",
  "Jazz", "House", "R&B", "Karaoke", "Lounge", "EDM", "Latin", "Live Music",
];

const GENDER_OPTIONS = [
  { value: "male", label: "Erkek", icon: "♂️" },
  { value: "female", label: "Kadın", icon: "♀️" },
  { value: "non_binary", label: "Non-binary", icon: "⚧️" },
  { value: "prefer_not_to_say", label: "Belirtme", icon: "🤐" },
];

const INTERESTED_IN_OPTIONS = [
  { value: "men", label: "Erkekler", icon: "👨" },
  { value: "women", label: "Kadınlar", icon: "👩" },
  { value: "everyone", label: "Herkes", icon: "🌈" },
];

const VIBE_OPTIONS = [
  { value: "going_out", label: "Dışarı Çıkıyorum", emoji: "🎉", desc: "Gece hayatı & kulüpler" },
  { value: "chill", label: "Sakin Akşam", emoji: "☕", desc: "Kafe & restoran" },
  { value: "exploring", label: "Keşfediyorum", emoji: "🧭", desc: "Karışık öneriler" },
];

/* ── Section wrapper ── */
const Section = ({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) => (
  <div className="space-y-3">
    <div className="flex items-center gap-2 px-1">
      {icon && <span className="text-primary">{icon}</span>}
      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{title}</h3>
    </div>
    <div className="bg-card/60 backdrop-blur-sm rounded-2xl border border-border/40 p-4">
      {children}
    </div>
  </div>
);

const EditProfilePage = () => {
  const { profile, user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [username, setUsername] = useState((profile as any)?.username ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [instagram, setInstagram] = useState(profile?.instagram_url ?? "");
  const [selectedInterests, setSelectedInterests] = useState<string[]>(profile?.interests ?? []);
  const [birthDate, setBirthDate] = useState((profile as any)?.birth_date ?? "");
  const [gender, setGender] = useState((profile as any)?.gender ?? "");
  const [interestedIn, setInterestedIn] = useState((profile as any)?.interested_in ?? "");
  const [occupation, setOccupation] = useState((profile as any)?.occupation ?? "");
  const [tonightVibe, setTonightVibe] = useState((profile as any)?.tonight_vibe ?? "");
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const initials = (profile?.display_name ?? user?.email ?? "?")
    .split(" ").map((w) => w[0]).join("").toUpperCase().substring(0, 2);

  const moderateText = async (text: string, textType: "name" | "bio"): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke("moderate-content", {
        body: { text, textType },
      });
      if (error) return true;
      return data?.safe !== false;
    } catch { return true; }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingPhoto(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);

      try {
        const { data: modResult } = await supabase.functions.invoke("moderate-content", {
          body: { imageUrl: urlData.publicUrl, type: "profile" },
        });
        if (modResult?.safe === false) {
          await supabase.storage.from("avatars").remove([path]);
          toast({ title: "⚠️ Uygunsuz Fotoğraf", description: "Bu fotoğraf kullanılamaz.", variant: "destructive" });
          setUploadingPhoto(false);
          return;
        }
      } catch { /* allow */ }

      await db.from("profiles").update({ avatar_url: urlData.publicUrl }).eq("user_id", user.id);
      await refreshProfile();
      toast({ title: "Fotoğraf güncellendi 📸" });
    } catch {
      toast({ title: "Fotoğraf yüklenemedi", variant: "destructive" });
    }
    setUploadingPhoto(false);
  };

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const name = displayName.trim();
    if (name.length < 2 || name.length > 30) {
      toast({ title: "İsim 2-30 karakter olmalı", variant: "destructive" });
      setSaving(false);
      return;
    }
    if (bio.length > 150) {
      toast({ title: "Bio en fazla 150 karakter", variant: "destructive" });
      setSaving(false);
      return;
    }

    const nameOk = await moderateText(name, "name");
    if (!nameOk) {
      toast({ title: "⚠️ Uygunsuz İsim", variant: "destructive" });
      setSaving(false);
      return;
    }
    if (bio.trim().length > 0) {
      const bioOk = await moderateText(bio, "bio");
      if (!bioOk) {
        toast({ title: "⚠️ Uygunsuz Bio", variant: "destructive" });
        setSaving(false);
        return;
      }
    }

    const { error } = await db.from("profiles").update({
      display_name: name,
      username: username.trim() || null,
      bio: bio.trim() || null,
      instagram_url: instagram.trim() || null,
      birth_date: birthDate || null,
      gender: gender || null,
      interested_in: interestedIn || null,
      occupation: occupation.trim() || null,
      tonight_vibe: tonightVibe || null,
      interests: selectedInterests,
    }).eq("user_id", user.id);

    if (error) {
      toast({ title: "Hata", description: "Profil güncellenemedi", variant: "destructive" });
    } else {
      await refreshProfile();
      toast({ title: "Profil güncellendi ✅" });
      navigate(-1);
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* ── Sticky Header ── */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Geri</span>
          </button>
          <h1 className="font-display text-base font-bold text-foreground">Profili Düzenle</h1>
          <Button
            onClick={handleSave}
            disabled={saving}
            size="sm"
            className="h-8 px-4 rounded-full bg-primary text-primary-foreground font-semibold text-xs"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Check className="w-3.5 h-3.5" /> Kaydet</>}
          </Button>
        </div>
      </header>

      <main className="px-4 py-6 pb-20 space-y-5 max-w-lg mx-auto">
        {/* ── Avatar + Photo Gallery ── */}
        <div className="bg-card/60 backdrop-blur-sm rounded-2xl border border-border/40 p-5 space-y-5">
          {/* Avatar */}
          <div className="flex flex-col items-center">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full ring-4 ring-primary/20 ring-offset-4 ring-offset-background overflow-hidden bg-muted flex items-center justify-center">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-muted-foreground">{initials}</span>
                )}
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploadingPhoto}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg ring-3 ring-background transition-transform hover:scale-110"
              >
                {uploadingPhoto ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Camera className="w-3.5 h-3.5" />
                )}
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">Profil fotoğrafını değiştir</p>
          </div>

          {/* Divider */}
          <div className="border-t border-border/30" />

          {/* Photo Gallery */}
          {user && <ProfilePhotoGallery userId={user.id} editable />}
        </div>

        {/* ── Basic Info ── */}
        <Section title="Temel Bilgiler" icon={<User className="w-3.5 h-3.5" />}>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-muted-foreground">Ad Soyad</label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Adınız Soyadınız"
                className="h-11 bg-muted/30 border-border/50 rounded-xl text-sm"
                maxLength={30}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-muted-foreground">Kullanıcı Adı</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_.]/g, "").toLowerCase())}
                  placeholder="kullaniciadi"
                  className="h-11 pl-8 bg-muted/30 border-border/50 rounded-xl text-sm"
                  maxLength={20}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-medium text-muted-foreground">Hakkında</label>
                <span className={`text-[10px] font-medium ${bio.length > 140 ? "text-destructive" : "text-muted-foreground"}`}>{bio.length}/150</span>
              </div>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, 150))}
                placeholder="Kendinizi birkaç kelimeyle tanıtın..."
                className="w-full bg-muted/30 border border-border/50 rounded-xl px-3 py-3 text-sm text-foreground resize-none h-24 focus:outline-none focus:ring-2 focus:ring-ring/50 transition-all placeholder:text-muted-foreground"
              />
            </div>
          </div>
        </Section>

        {/* ── Social Links ── */}
        <Section title="Sosyal" icon={<Instagram className="w-3.5 h-3.5" />}>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-muted-foreground">Instagram</label>
              <div className="relative">
                <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  placeholder="kullanici_adi"
                  className="h-11 pl-10 bg-muted/30 border-border/50 rounded-xl text-sm"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-muted-foreground">Meslek / Ünvan</label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  placeholder="Yazılımcı, Öğrenci, DJ..."
                  className="h-11 pl-10 bg-muted/30 border-border/50 rounded-xl text-sm"
                  maxLength={40}
                />
              </div>
            </div>
          </div>
        </Section>

        {/* ── Personal Details ── */}
        <Section title="Kişisel" icon={<Cake className="w-3.5 h-3.5" />}>
          <div className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-muted-foreground">Doğum Tarihi</label>
              <Input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="h-11 bg-muted/30 border-border/50 rounded-xl text-sm"
              />
            </div>

            {/* Gender */}
            <div className="space-y-2.5">
              <label className="text-[11px] font-medium text-muted-foreground">Cinsiyet</label>
              <div className="grid grid-cols-2 gap-2">
                {GENDER_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setGender(opt.value)}
                    className={`h-11 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                      gender === opt.value
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "bg-muted/30 text-muted-foreground border border-border/50 hover:border-primary/30"
                    }`}
                  >
                    <span>{opt.icon}</span> {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Interested In */}
            <div className="space-y-2.5">
              <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                <Heart className="w-3 h-3" /> Kimleri Keşfetmek İstersin?
              </label>
              <div className="grid grid-cols-3 gap-2">
                {INTERESTED_IN_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setInterestedIn(opt.value)}
                    className={`py-3 rounded-xl text-xs font-semibold transition-all flex flex-col items-center gap-1.5 ${
                      interestedIn === opt.value
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "bg-muted/30 text-muted-foreground border border-border/50 hover:border-primary/30"
                    }`}
                  >
                    <span className="text-lg">{opt.icon}</span>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* ── Tonight Vibe ── */}
        <Section title="Bu Gece" icon={<Sparkles className="w-3.5 h-3.5" />}>
          <div className="space-y-2">
            {VIBE_OPTIONS.map((vibe) => (
              <button
                key={vibe.value}
                onClick={() => setTonightVibe(vibe.value)}
                className={`w-full px-4 py-3.5 rounded-xl text-left transition-all flex items-center gap-3 ${
                  tonightVibe === vibe.value
                    ? "bg-primary/15 border-2 border-primary text-foreground"
                    : "bg-muted/20 border border-border/40 text-foreground hover:border-primary/30"
                }`}
              >
                <span className="text-xl w-8 text-center">{vibe.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{vibe.label}</p>
                  <p className="text-[10px] text-muted-foreground">{vibe.desc}</p>
                </div>
                {tonightVibe === vibe.value && (
                  <Check className="w-4 h-4 text-primary flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </Section>

        {/* ── Photo Gallery ── */}
        {user && (
          <Section title="Fotoğraf Galerisi" icon={<Camera className="w-3.5 h-3.5" />}>
            <ProfilePhotoGallery userId={user.id} editable />
          </Section>
        )}

        {/* ── Interests ── */}
        <Section title="İlgi Alanları">
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map((interest) => (
              <button
                key={interest}
                onClick={() => toggleInterest(interest)}
                className={`px-3.5 py-2 rounded-full text-xs font-semibold transition-all ${
                  selectedInterests.includes(interest)
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/30 text-muted-foreground border border-border/50 hover:border-primary/30 hover:text-foreground"
                }`}
              >
                {interest}
              </button>
            ))}
          </div>
        </Section>

        {/* ── Save Button ── */}
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full h-12 bg-primary text-primary-foreground font-semibold rounded-2xl text-sm shadow-lg"
        >
          {saving ? (
            <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Kaydediliyor...</>
          ) : (
            <><Check className="w-4 h-4 mr-2" /> Değişiklikleri Kaydet</>
          )}
        </Button>
      </main>
    </div>
  );
};

export default EditProfilePage;
