import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const TermsPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-12">
      <header className="sticky top-0 z-40 glass px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-xl glass text-muted-foreground hover:text-foreground">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="font-display text-lg font-bold text-foreground">Kullanım Koşulları</h1>
        </div>
      </header>

      <main className="px-5 mt-4 max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-1">
          <h2 className="font-display text-xl font-bold text-foreground">LYNE KULLANIM KOŞULLARI</h2>
          <p className="text-xs text-muted-foreground">Son Güncelleme Tarihi: 19 Şubat 2026</p>
        </div>

        <section className="glass rounded-2xl p-4 space-y-3">
          <h3 className="text-sm font-bold text-foreground">1. Taraflar</h3>
          <p className="text-sm text-muted-foreground">
            İşbu Kullanım Koşulları ("Sözleşme"), Türkiye Cumhuriyeti kanunlarına göre kurulmuş şahıs işletmesi olan UĞUR BİLGİN ("Şirket") ile LYNE mobil uygulamasını kullanan gerçek kişi ("Kullanıcı") arasında akdedilmiştir.
          </p>
          <p className="text-sm text-muted-foreground">İletişim: <a href="mailto:support@lyneapp.com" className="text-primary">support@lyneapp.com</a></p>
          <p className="text-sm text-muted-foreground">Kullanıcı, uygulamaya kayıt olarak bu sözleşmeyi elektronik ortamda kabul etmiş sayılır.</p>
        </section>

        <section className="glass rounded-2xl p-4 space-y-3">
          <h3 className="text-sm font-bold text-foreground">2. Hizmetin Niteliği</h3>
          <p className="text-sm text-muted-foreground">LYNE, kullanıcıların sosyal mekanlarda (kafe, bar, etkinlik alanı vb.) tanışmasını sağlayan konum bazlı dijital eşleşme platformudur.</p>
          <p className="text-sm text-muted-foreground">LYNE:</p>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            <li className="flex items-center gap-2"><span className="text-primary text-xs">•</span>Evlilik ajansı değildir</li>
            <li className="flex items-center gap-2"><span className="text-primary text-xs">•</span>Resmi aracılık hizmeti sunmaz</li>
            <li className="flex items-center gap-2"><span className="text-primary text-xs">•</span>Güvenlik veya kimlik doğrulama garantisi vermez</li>
            <li className="flex items-center gap-2"><span className="text-primary text-xs">•</span>Kullanıcı davranışlarını kontrol etmez</li>
          </ul>
          <p className="text-sm text-muted-foreground">Platform yalnızca dijital ortam sağlar.</p>
        </section>

        <section className="glass rounded-2xl p-4 space-y-3">
          <h3 className="text-sm font-bold text-foreground">3. Yaş Sınırı</h3>
          <p className="text-sm text-muted-foreground">LYNE yalnızca 18 yaş ve üzeri bireyler tarafından kullanılabilir.</p>
          <p className="text-sm text-muted-foreground">Kullanıcı:</p>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            <li className="flex items-center gap-2"><span className="text-primary text-xs">•</span>18 yaşından büyük olduğunu</li>
            <li className="flex items-center gap-2"><span className="text-primary text-xs">•</span>Verdiği bilgilerin doğru olduğunu</li>
          </ul>
          <p className="text-sm text-muted-foreground">beyan eder. Yaşın yanlış beyanından doğacak hukuki sorumluluk kullanıcıya aittir. Şirket gerekli gördüğünde kimlik doğrulama talep edebilir.</p>
        </section>

        <section className="glass rounded-2xl p-4 space-y-3">
          <h3 className="text-sm font-bold text-foreground">4. Kullanıcı Yükümlülükleri</h3>
          <p className="text-sm text-muted-foreground">Kullanıcı aşağıdaki eylemlerde bulunamaz:</p>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            <li className="flex items-center gap-2"><span className="text-primary text-xs">•</span>Sahte profil oluşturmak</li>
            <li className="flex items-center gap-2"><span className="text-primary text-xs">•</span>Başkasına ait fotoğraf kullanmak</li>
            <li className="flex items-center gap-2"><span className="text-primary text-xs">•</span>Taciz, tehdit veya ısrarlı takip yapmak</li>
            <li className="flex items-center gap-2"><span className="text-primary text-xs">•</span>Müstehcen içerik paylaşmak</li>
            <li className="flex items-center gap-2"><span className="text-primary text-xs">•</span>Dolandırıcılık girişiminde bulunmak</li>
            <li className="flex items-center gap-2"><span className="text-primary text-xs">•</span>Spam veya ticari kullanım yapmak</li>
          </ul>
          <p className="text-sm text-muted-foreground">İhlal halinde hesap askıya alınabilir veya kapatılabilir.</p>
        </section>

        <section className="glass rounded-2xl p-4 space-y-3">
          <h3 className="text-sm font-bold text-foreground">5. Fiziksel Buluşmalar ve Sorumluluk</h3>
          <p className="text-sm text-muted-foreground">LYNE üzerinden tanışan kullanıcıların gerçekleştirdiği fiziksel buluşmalar tamamen kullanıcıların sorumluluğundadır.</p>
          <p className="text-sm text-muted-foreground">Şirket:</p>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            <li className="flex items-center gap-2"><span className="text-primary text-xs">•</span>Kullanıcı kimliğini garanti etmez</li>
            <li className="flex items-center gap-2"><span className="text-primary text-xs">•</span>Offline gerçekleşen olaylardan sorumlu değildir</li>
            <li className="flex items-center gap-2"><span className="text-primary text-xs">•</span>Mekan güvenliğini garanti etmez</li>
          </ul>
        </section>

        <section className="glass rounded-2xl p-4 space-y-3">
          <h3 className="text-sm font-bold text-foreground">6. Konum Verisi</h3>
          <p className="text-sm text-muted-foreground">LYNE, konum verisini:</p>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            <li className="flex items-center gap-2"><span className="text-primary text-xs">•</span>Yakındaki mekanları göstermek</li>
            <li className="flex items-center gap-2"><span className="text-primary text-xs">•</span>Eşleşme optimizasyonu</li>
            <li className="flex items-center gap-2"><span className="text-primary text-xs">•</span>Check-in özelliği</li>
          </ul>
          <p className="text-sm text-muted-foreground">amaçlarıyla kullanır. Kullanıcı konum paylaşımını cihaz ayarlarından kapatabilir.</p>
        </section>

        <section className="glass rounded-2xl p-4 space-y-3">
          <h3 className="text-sm font-bold text-foreground">7. Hesap Silme</h3>
          <p className="text-sm text-muted-foreground">Kullanıcı hesabını istediği zaman silebilir.</p>
          <p className="text-sm text-muted-foreground">Hesap silindiğinde:</p>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            <li className="flex items-center gap-2"><span className="text-primary text-xs">•</span>Profil görünürlüğü kaldırılır</li>
            <li className="flex items-center gap-2"><span className="text-primary text-xs">•</span>Veriler anonimleştirilebilir</li>
            <li className="flex items-center gap-2"><span className="text-primary text-xs">•</span>Yasal yükümlülükler kapsamında saklanabilir</li>
          </ul>
        </section>

        <section className="glass rounded-2xl p-4 space-y-3">
          <h3 className="text-sm font-bold text-foreground">8. Sorumluluğun Sınırlandırılması</h3>
          <p className="text-sm text-muted-foreground">Şirket;</p>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            <li className="flex items-center gap-2"><span className="text-primary text-xs">•</span>Sistem kesintileri</li>
            <li className="flex items-center gap-2"><span className="text-primary text-xs">•</span>Veri kaybı</li>
            <li className="flex items-center gap-2"><span className="text-primary text-xs">•</span>Kullanıcı davranışları</li>
            <li className="flex items-center gap-2"><span className="text-primary text-xs">•</span>Üçüncü taraf mekan hizmetleri</li>
          </ul>
          <p className="text-sm text-muted-foreground">nedeniyle oluşabilecek zararlardan sorumlu değildir.</p>
        </section>

        <section className="glass rounded-2xl p-4 space-y-2">
          <h3 className="text-sm font-bold text-foreground">9. Yetkili Mahkeme</h3>
          <p className="text-sm text-muted-foreground">Uyuşmazlıklarda Şirket merkezinin bulunduğu yer mahkemeleri ve icra daireleri yetkilidir.</p>
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

export default TermsPage;
