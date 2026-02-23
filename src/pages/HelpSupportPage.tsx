import { useNavigate } from "react-router-dom";
import {
  ChevronLeft, MapPin, Bell, Camera, HardDrive,
  BookOpen, Flag, Mail, Shield, Info,
} from "lucide-react";

const HelpSupportPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background animate-slide-up">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/40">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-xl hover:bg-muted/40 transition-colors">
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="font-display text-lg font-bold text-foreground">Yardım & Destek</h1>
          <div className="w-9" />
        </div>
      </header>

      <main className="px-4 py-4 space-y-4 pb-12">

        {/* ── Help Links ── */}
        <Section icon={<BookOpen className="w-4 h-4" />} title="Destek">
          <LinkItem icon={<BookOpen />} label="Sıkça Sorulan Sorular" />
          <LinkItem icon={<Flag />} label="Kullanıcı Şikayet Et" />
          <LinkItem icon={<BookOpen />} label="Topluluk Kuralları" />
          <LinkItem icon={<Mail />} label="Destek ile İletişim" sub="support@vybe.app" />
        </Section>

        {/* ── Permissions We Use ── */}
        <Section icon={<Shield className="w-4 h-4" />} title="Kullandığımız İzinler">

          {/* Location */}
          <PermissionCard
            icon={<MapPin className="w-5 h-5 text-primary" />}
            title="Konum"
            items={[
              "Yakındaki mekanları ve kişileri keşfetmek için kullanılır",
              "Check-in doğrulaması için kullanılır",
              "Şehir sıralamanızı belirlemek için kullanılır",
              "İzniniz olmadan sürekli takip edilmez",
            ]}
          />

          {/* Notifications */}
          <PermissionCard
            icon={<Bell className="w-5 h-5 text-primary" />}
            title="Bildirimler"
            items={[
              "Eşleşme bildirimleri için kullanılır",
              "Süper İlgi uyarıları için kullanılır",
              "Sıralama değişiklikleri için kullanılır",
              "İstediğiniz zaman Ayarlar'dan kapatılabilir",
            ]}
          />

          {/* Camera */}
          <PermissionCard
            icon={<Camera className="w-5 h-5 text-primary" />}
            title="Kamera"
            items={[
              "Profil fotoğrafı çekmek için kullanılır",
              "Story paylaşmak için kullanılır",
              "Yalnızca siz etkinleştirdiğinizde çalışır",
            ]}
            optional
          />

          {/* Storage */}
          <PermissionCard
            icon={<HardDrive className="w-5 h-5 text-primary" />}
            title="Depolama"
            items={[
              "Galeriden fotoğraf seçmek için kullanılır",
              "Profil ve story görselleri yüklemek için kullanılır",
              "Yalnızca siz etkinleştirdiğinizde çalışır",
            ]}
            optional
          />
        </Section>

        {/* ── Why Location Is Required ── */}
        <Section icon={<Info className="w-4 h-4" />} title="Konum Neden Gerekli?">
          <div className="space-y-3">
            <InfoItem
              title="VYBE yakınlık tabanlıdır"
              desc="Mekanları ve kişileri gerçek konumunuza göre keşfetmenizi sağlar."
            />
            <InfoItem
              title="Gerçek zamanlı keşif"
              desc="Etrafınızdaki aktif kullanıcıları ve canlı mekanları anında görürsünüz."
            />
            <InfoItem
              title="Sahte konum koruması"
              desc="Konum doğrulaması, adil bir deneyim ve güvenilir sıralamalar sağlar."
            />
            <InfoItem
              title="Sadece gerektiğinde aktif"
              desc="Konum yalnızca uygulama kullanılırken alınır, arka planda sürekli takip yapılmaz."
            />
          </div>
        </Section>

        {/* Version Footer */}
        <p className="text-center text-[10px] text-muted-foreground/40 pt-6 pb-2">
          VYBE v1.0 • Social Status Platform
        </p>
      </main>
    </div>
  );
};

/* ── Sub-components ── */

const Section = ({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) => (
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

const LinkItem = ({ icon, label, sub }: { icon: React.ReactNode; label: string; sub?: string }) => (
  <div className="flex items-center gap-3 py-2">
    <span className="w-4 h-4 text-muted-foreground">{icon}</span>
    <div className="flex-1">
      <p className="text-sm font-medium text-foreground">{label}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  </div>
);

const PermissionCard = ({
  icon, title, items, optional,
}: { icon: React.ReactNode; title: string; items: string[]; optional?: boolean }) => (
  <div className="rounded-xl border border-border/30 bg-muted/20 p-3 space-y-2">
    <div className="flex items-center gap-2">
      {icon}
      <span className="text-sm font-bold text-foreground">{title}</span>
      {optional && (
        <span className="text-[10px] font-medium text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded-full ml-auto">
          Opsiyonel
        </span>
      )}
    </div>
    <ul className="space-y-1 ml-7">
      {items.map((item, i) => (
        <li key={i} className="text-xs text-muted-foreground leading-relaxed flex items-start gap-1.5">
          <span className="w-1 h-1 rounded-full bg-primary/60 mt-1.5 flex-shrink-0" />
          {item}
        </li>
      ))}
    </ul>
  </div>
);

const InfoItem = ({ title, desc }: { title: string; desc: string }) => (
  <div className="rounded-xl border border-border/30 bg-muted/20 p-3">
    <p className="text-sm font-bold text-foreground mb-0.5">{title}</p>
    <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
  </div>
);

export default HelpSupportPage;
