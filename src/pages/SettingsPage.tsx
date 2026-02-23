import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft, ChevronRight, Shield, Eye, EyeOff, MapPin, Ban,
  Bell, BellOff, Zap, TrendingUp, CheckCircle2,
  HelpCircle, Flag, BookOpen, Mail,
  LogOut, Trash2, X,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

type VisibilityOption = "public" | "city" | "private";

const SettingsPage = () => {
  const { profile, user, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const p = profile as any;

  // Privacy state
  const [visibility, setVisibility] = useState<VisibilityOption>(
    p?.privacy_hide_checkins ? "private" : p?.privacy_online_visible === false ? "city" : "public"
  );
  const [showOnline, setShowOnline] = useState(p?.privacy_online_visible ?? true);
  const [showSP, setShowSP] = useState(true); // no DB column yet, local only
  const [saving, setSaving] = useState(false);

  // Notifications state
  const [matchNotif, setMatchNotif] = useState(true);
  const [superNotif, setSuperNotif] = useState(true);
  const [rankNotif, setRankNotif] = useState(true);
  const [checkinNotif, setCheckinNotif] = useState(true);
  const [pushMaster, setPushMaster] = useState(true);

  // Delete account
  const [deleteStep, setDeleteStep] = useState(0); // 0=hidden, 1=first confirm, 2=second confirm
  const [deleting, setDeleting] = useState(false);

  const handlePrivacySave = async (updates: Record<string, unknown>) => {
    if (!user) return;
    setSaving(true);
    const { error } = await db.from("profiles").update(updates).eq("user_id", user.id);
    if (!error) {
      await refreshProfile();
      toast({ title: "Ayarlar güncellendi ✅" });
    } else {
      toast({ title: "Hata", variant: "destructive" });
    }
    setSaving(false);
  };

  const handleVisibilityChange = (v: VisibilityOption) => {
    setVisibility(v);
    handlePrivacySave({
      privacy_online_visible: v !== "private",
      privacy_hide_checkins: v === "private",
    });
  };

  const handleToggleOnline = () => {
    const newVal = !showOnline;
    setShowOnline(newVal);
    handlePrivacySave({ privacy_online_visible: newVal });
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      // Soft delete: clear profile data, deactivate
      await db.from("profiles").update({
        display_name: "[Silindi]",
        bio: null,
        avatar_url: null,
        interests: null,
        instagram_url: null,
        social_power: 0,
        night_sp: 0,
        day_score: 0,
        weekly_sp: 0,
        sp_level: 1,
        city_rank: null,
        global_rank: null,
        weekly_rank: null,
        is_ghost_mode: true,
        selected_badge: null,
      }).eq("user_id", user.id);

      // Remove connections
      await db.from("connections").delete().eq("user_id", user.id);
      await db.from("connections").delete().eq("target_id", user.id);

      // Sign out
      await signOut();
      toast({ title: "Hesabınız silindi" });
      navigate("/auth");
    } catch {
      toast({ title: "Hesap silinemedi", variant: "destructive" });
    }
    setDeleting(false);
  };

  return (
    <div className="min-h-screen bg-background animate-slide-up">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/40">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-xl hover:bg-muted/40 transition-colors">
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="font-display text-lg font-bold text-foreground">Ayarlar</h1>
          <div className="w-9" />
        </div>
      </header>

      <main className="px-4 py-4 space-y-4 pb-12">

        {/* ── 🔒 Security & Privacy ── */}
        <SettingsSection icon={<Shield className="w-4 h-4" />} title="Güvenlik & Gizlilik">
          {/* Profile Visibility */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Profil Görünürlüğü</p>
            <div className="grid grid-cols-3 gap-2">
              {([
                { val: "public" as const, label: "Herkese Açık", icon: Eye },
                { val: "city" as const, label: "Sadece Şehir", icon: MapPin },
                { val: "private" as const, label: "Gizli", icon: EyeOff },
              ]).map((opt) => (
                <button
                  key={opt.val}
                  onClick={() => handleVisibilityChange(opt.val)}
                  className={`flex flex-col items-center gap-1.5 py-3 rounded-xl text-xs font-semibold transition-all ${
                    visibility === opt.val
                      ? "bg-primary/15 border border-primary/40 text-primary"
                      : "glass text-muted-foreground hover:border-border/60"
                  }`}
                >
                  <opt.icon className="w-4 h-4" />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <SettingsToggle
            label="Çevrimiçi Durumu Göster"
            desc="Aktif olduğunuzda diğerleri görür"
            checked={showOnline}
            onChange={handleToggleOnline}
          />

          <SettingsToggle
            label="SP Skorunu Göster"
            desc="Social Power puanınız profilde görünür"
            checked={showSP}
            onChange={() => setShowSP(!showSP)}
          />

          <SettingsLink
            label="Engellenen Kullanıcılar"
            icon={<Ban className="w-4 h-4 text-muted-foreground" />}
            onClick={() => navigate("/blocked-users")}
          />

          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-3">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">Konum İzni</p>
                <p className="text-[11px] text-muted-foreground">Tarayıcı konum erişimi</p>
              </div>
            </div>
            <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">Aktif</span>
          </div>
        </SettingsSection>

        {/* ── 🔔 Notifications ── */}
        <SettingsSection icon={<Bell className="w-4 h-4" />} title="Bildirimler">
          <SettingsToggle
            label="Push Bildirimleri"
            desc="Tüm bildirimleri aç/kapat"
            checked={pushMaster}
            onChange={() => setPushMaster(!pushMaster)}
            bold
          />

          {pushMaster && (
            <>
              <SettingsToggle
                label="Eşleşme Bildirimleri"
                desc="Yeni eşleşmelerde bildirim al"
                checked={matchNotif}
                onChange={() => setMatchNotif(!matchNotif)}
              />
              <SettingsToggle
                label="Süper İlgi Bildirimleri"
                desc="Biri sana süper ilgi gösterdiğinde"
                checked={superNotif}
                onChange={() => setSuperNotif(!superNotif)}
              />
              <SettingsToggle
                label="Sıralama Değişiklikleri"
                desc="Şehir sıralamanız değiştiğinde"
                checked={rankNotif}
                onChange={() => setRankNotif(!rankNotif)}
              />
              <SettingsToggle
                label="Check-in Uyarıları"
                desc="Arkadaşların check-in yaptığında"
                checked={checkinNotif}
                onChange={() => setCheckinNotif(!checkinNotif)}
              />
            </>
          )}
        </SettingsSection>

        {/* ── 🆘 Help & Support ── */}
        <SettingsSection icon={<HelpCircle className="w-4 h-4" />} title="Yardım & Destek">
          <SettingsLink
            label="Yardım & Destek Sayfası"
            icon={<BookOpen className="w-4 h-4 text-muted-foreground" />}
            onClick={() => navigate("/help")}
          />
        </SettingsSection>

        {/* ── ⚙️ Account ── */}
        <SettingsSection icon={<LogOut className="w-4 h-4" />} title="Hesap">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 py-3 text-foreground hover:text-primary transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-medium">Çıkış Yap</span>
          </button>

          <div className="border-t border-border/30 pt-3">
            <button
              onClick={() => setDeleteStep(1)}
              className="w-full flex items-center gap-3 py-3 text-destructive hover:text-destructive/80 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span className="text-sm font-medium">Hesabı Sil</span>
            </button>
          </div>
        </SettingsSection>

        {/* App version */}
        <p className="text-center text-[10px] text-muted-foreground/40 pt-4">
          VYBE v1.0.0 • Social Status Platform
        </p>
      </main>

      {/* Delete Account Modal */}
      {deleteStep > 0 && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="glass rounded-2xl p-6 mx-4 max-w-sm w-full border border-destructive/20 space-y-4 animate-slide-up">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-destructive">
                {deleteStep === 1 ? "Hesabı Sil?" : "Emin misin?"}
              </h3>
              <button onClick={() => setDeleteStep(0)} className="p-1 rounded-lg hover:bg-muted/40">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {deleteStep === 1 && (
              <>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>Hesabını sildiğinde aşağıdakiler <span className="text-destructive font-bold">kalıcı olarak</span> kaldırılır:</p>
                  <ul className="space-y-1.5 ml-1">
                    <li className="flex items-center gap-2"><Zap className="w-3 h-3 text-destructive" /> SP puanın ve seviye ilerlemendir</li>
                    <li className="flex items-center gap-2"><TrendingUp className="w-3 h-3 text-destructive" /> Şehir ve global sıralaman</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-destructive" /> Check-in geçmişin ve rozetlerin</li>
                    <li className="flex items-center gap-2"><Ban className="w-3 h-3 text-destructive" /> Tüm bağlantıların ve eşleşmelerin</li>
                  </ul>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setDeleteStep(0)} className="flex-1 rounded-xl">
                    Vazgeç
                  </Button>
                  <Button
                    onClick={() => setDeleteStep(2)}
                    className="flex-1 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Devam Et
                  </Button>
                </div>
              </>
            )}

            {deleteStep === 2 && (
              <>
                <p className="text-sm text-muted-foreground">
                  Bu işlem <span className="text-destructive font-bold">geri alınamaz</span>. Hesabın ve tüm verilerin kalıcı olarak silinecek.
                </p>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setDeleteStep(0)} className="flex-1 rounded-xl">
                    İptal
                  </Button>
                  <Button
                    onClick={handleDeleteAccount}
                    disabled={deleting}
                    className="flex-1 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleting ? (
                      <div className="w-4 h-4 border-2 border-destructive-foreground border-t-transparent rounded-full animate-spin" />
                    ) : (
                      "Hesabımı Sil"
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Reusable sub-components ── */

const SettingsSection = ({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) => (
  <section className="glass rounded-2xl overflow-hidden">
    <div className="flex items-center gap-2 px-4 pt-4 pb-2">
      <span className="text-primary">{icon}</span>
      <h2 className="font-display text-sm font-bold text-foreground tracking-wide">{title}</h2>
    </div>
    <div className="px-4 pb-4 space-y-3">
      {children}
    </div>
  </section>
);

const SettingsToggle = ({
  label, desc, checked, onChange, bold,
}: { label: string; desc: string; checked: boolean; onChange: () => void; bold?: boolean }) => (
  <div className="flex items-center justify-between py-1">
    <div className="flex-1 min-w-0 mr-3">
      <p className={`text-sm ${bold ? "font-bold" : "font-medium"} text-foreground`}>{label}</p>
      <p className="text-[11px] text-muted-foreground">{desc}</p>
    </div>
    <button
      onClick={onChange}
      className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${checked ? "bg-primary" : "bg-muted"}`}
    >
      <span className={`absolute top-1 w-4 h-4 rounded-full bg-foreground transition-all ${checked ? "left-6" : "left-1"}`} />
    </button>
  </div>
);

const SettingsLink = ({ label, icon, onClick }: { label: string; icon: React.ReactNode; onClick: () => void }) => (
  <button onClick={onClick} className="w-full flex items-center gap-3 py-2 group">
    {icon}
    <span className="text-sm font-medium text-foreground flex-1 text-left group-hover:text-primary transition-colors">{label}</span>
    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
  </button>
);

export default SettingsPage;
