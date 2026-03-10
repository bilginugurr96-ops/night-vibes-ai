import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PrivacyPolicyPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-12">
      <header className="sticky top-0 z-40 glass px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-xl glass text-muted-foreground hover:text-foreground">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="font-display text-lg font-bold text-foreground">Gizlilik Politikası</h1>
        </div>
      </header>

      <main className="px-5 mt-4 max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-1">
          <h2 className="font-display text-xl font-bold text-foreground">LYNE GİZLİLİK POLİTİKASI</h2>
          <p className="text-xs text-muted-foreground">Son Güncelleme Tarihi: 19 Şubat 2026</p>
        </div>

        <section className="glass rounded-2xl p-4 space-y-2">
          <h3 className="text-sm font-bold text-foreground">Veri Sorumlusu</h3>
          <p className="text-sm text-muted-foreground">UĞUR BİLGİN</p>
          <p className="text-sm text-muted-foreground">İletişim: <a href="mailto:support@lyneapp.com" className="text-primary">support@lyneapp.com</a></p>
        </section>

        <section className="glass rounded-2xl p-4 space-y-3">
          <h3 className="text-sm font-bold text-foreground">1. İşlenen Veriler</h3>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            <li className="flex items-center gap-2"><span className="text-primary text-xs">•</span>Profil bilgileri</li>
            <li className="flex items-center gap-2"><span className="text-primary text-xs">•</span>Fotoğraflar</li>
            <li className="flex items-center gap-2"><span className="text-primary text-xs">•</span>Konum verisi</li>
            <li className="flex items-center gap-2"><span className="text-primary text-xs">•</span>Mesaj içerikleri</li>
            <li className="flex items-center gap-2"><span className="text-primary text-xs">•</span>IP adresi</li>
            <li className="flex items-center gap-2"><span className="text-primary text-xs">•</span>Cihaz bilgileri</li>
          </ul>
        </section>

        <section className="glass rounded-2xl p-4 space-y-3">
          <h3 className="text-sm font-bold text-foreground">2. Veri İşleme Amaçları</h3>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            <li className="flex items-center gap-2"><span className="text-primary text-xs">•</span>Eşleşme sağlamak</li>
            <li className="flex items-center gap-2"><span className="text-primary text-xs">•</span>Güvenliği artırmak</li>
            <li className="flex items-center gap-2"><span className="text-primary text-xs">•</span>Sahte hesapları önlemek</li>
            <li className="flex items-center gap-2"><span className="text-primary text-xs">•</span>Hizmeti geliştirmek</li>
          </ul>
        </section>

        <section className="glass rounded-2xl p-4 space-y-3">
          <h3 className="text-sm font-bold text-foreground">3. Veri Güvenliği</h3>
          <p className="text-sm text-muted-foreground">LYNE:</p>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            <li className="flex items-center gap-2"><span className="text-primary text-xs">•</span>Şifreleme teknolojileri kullanır</li>
            <li className="flex items-center gap-2"><span className="text-primary text-xs">•</span>Yetkisiz erişimi engelleyen teknik önlemler alır</li>
          </ul>
        </section>

        <section className="glass rounded-2xl p-4 space-y-3">
          <h3 className="text-sm font-bold text-foreground">4. Kullanıcı Hakları</h3>
          <p className="text-sm text-muted-foreground">KVKK kapsamında:</p>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            <li className="flex items-center gap-2"><span className="text-primary text-xs">•</span>Veriye erişim</li>
            <li className="flex items-center gap-2"><span className="text-primary text-xs">•</span>Düzeltme</li>
            <li className="flex items-center gap-2"><span className="text-primary text-xs">•</span>Silme</li>
            <li className="flex items-center gap-2"><span className="text-primary text-xs">•</span>İşlemeye itiraz</li>
          </ul>
          <p className="text-sm text-muted-foreground mt-2">
            Haklarınızı <a href="mailto:support@lyneapp.com" className="text-primary">support@lyneapp.com</a> adresine iletebilirsiniz.
          </p>
        </section>

        <div className="text-center space-y-1 pt-4 border-t border-border/40">
          <p className="text-xs text-muted-foreground">© 2026 LYNE – Tüm Hakları Saklıdır</p>
          <p className="text-xs text-muted-foreground">
            <a href="mailto:support@lyneapp.com" className="text-primary">support@lyneapp.com</a>
          </p>
        </div>
      </main>
    </div>
  );
};

export default PrivacyPolicyPage;
