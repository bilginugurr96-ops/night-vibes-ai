import { useState, useRef } from "react";
import { ChevronLeft, Camera, Instagram, Briefcase, Cake, Sparkles, User, Heart } from "lucide-react";
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
  { value: "prefer_not_to_say", label: "Belirtmek istemiyorum", icon: "🤐" },
];

const INTERESTED_IN_OPTIONS = [
  { value: "men", label: "Erkekler", icon: "👨" },
  { value: "women", label: "Kadınlar", icon: "👩" },
  { value: "everyone", label: "Herkes", icon: "🌈" },
];

const VIBE_OPTIONS = [
  { value: "going_out", label: "Dışarı Çıkıyorum", emoji: "🎉", desc: "Gece hayatı & kulüpler" },
  { value: "chill", label: "Sakin Bir Akşam", emoji: "☕", desc: "Kafe & restoran" },
  { value: "exploring", label: "Keşfediyorum", emoji: "🧭", desc: "Karışık öneriler" },
];

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
    <div className="min-h-screen bg-background pb-10">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-border/30 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 glass rounded-full">
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="font-display text-lg font-bold text-foreground flex-1">Profili Düzenle</h1>
        <Button
          onClick={handleSave}
          disabled={saving}
          size="sm"
          className="bg-primary text-primary-foreground rounded-xl font-bold"
        >
          {saving ? "..." : "Kaydet"}
        </Button>
      </header>

      <main className="px-4 mt-6 space-y-6">
        {/* Avatar */}
        <div className="flex flex-col items-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gradient-neon flex items-center justify-center text-primary-foreground text-2xl font-bold overflow-hidden">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : initials}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploadingPhoto}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center neon-glow"
            >
              {uploadingPhoto ? (
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera className="w-4 h-4 text-primary-foreground" />
              )}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
          </div>
          <p className="text-xs text-muted-foreground mt-2">Fotoğrafı değiştirmek için dokun</p>
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          {/* Display Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ad Soyad</label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Adınız Soyadınız"
              className="bg-muted/50 border-border rounded-xl"
              maxLength={30}
            />
          </div>

          {/* Username */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Kullanıcı Adı</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_.]/g, "").toLowerCase())}
                placeholder="kullaniciadi"
                className="pl-8 bg-muted/50 border-border rounded-xl"
                maxLength={20}
              />
            </div>
          </div>

          {/* Bio */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Hakkında</label>
              <span className="text-[10px] text-muted-foreground">{bio.length}/150</span>
            </div>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 150))}
              placeholder="Kendinizi birkaç kelimeyle tanıtın..."
              className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2.5 text-sm text-foreground resize-none min-h-[90px] focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>

          {/* Instagram */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Instagram className="w-3.5 h-3.5" /> Instagram
            </label>
            <Input
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              placeholder="instagram_kullanici_adi"
              className="bg-muted/50 border-border rounded-xl"
            />
          </div>

          {/* Birth Date */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Cake className="w-3.5 h-3.5" /> Doğum Tarihi
            </label>
            <Input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="bg-muted/50 border-border rounded-xl"
            />
          </div>

          {/* Gender */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Cinsiyet
            </label>
            <div className="grid grid-cols-2 gap-2">
              {GENDER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setGender(opt.value)}
                  className={`px-3 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                    gender === opt.value
                      ? "bg-gradient-neon text-primary-foreground neon-glow"
                      : "glass text-muted-foreground border border-border/50"
                  }`}
                >
                  <span>{opt.icon}</span> {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Occupation */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5" /> Meslek / Ünvan
            </label>
            <Input
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
              placeholder="Yazılımcı, Öğrenci, DJ..."
              className="bg-muted/50 border-border rounded-xl"
              maxLength={40}
            />
          </div>

          {/* Tonight Vibe */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Bu Gece Ne Yapıyorsun?
            </label>
            <div className="space-y-2">
              {VIBE_OPTIONS.map((vibe) => (
                <button
                  key={vibe.value}
                  onClick={() => setTonightVibe(vibe.value)}
                  className={`w-full px-4 py-3 rounded-xl text-left transition-all flex items-center gap-3 ${
                    tonightVibe === vibe.value
                      ? "bg-gradient-neon text-primary-foreground neon-glow"
                      : "glass text-foreground border border-border/50"
                  }`}
                >
                  <span className="text-xl">{vibe.emoji}</span>
                  <div>
                    <p className="text-sm font-semibold">{vibe.label}</p>
                    <p className={`text-[10px] ${tonightVibe === vibe.value ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{vibe.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Interests */}
          <div className="space-y-2.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">İlgi Alanları</label>
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map((interest) => (
                <button
                  key={interest}
                  onClick={() => toggleInterest(interest)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    selectedInterests.includes(interest)
                      ? "bg-gradient-neon text-primary-foreground neon-glow"
                      : "glass text-muted-foreground border border-border/50"
                  }`}
                >
                  {interest}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Save Button (bottom) */}
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-gradient-neon text-primary-foreground font-semibold rounded-xl py-5 neon-glow"
        >
          {saving ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
        </Button>
      </main>
    </div>
  );
};

export default EditProfilePage;
