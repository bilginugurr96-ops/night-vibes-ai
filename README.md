# Remix of Night Life Navigator

Uygulama Adı: NightHub

Amaç: Kullanıcıların kulüp, bar ve konser mekanlarında rezervasyon yapabileceği, etkinlikleri keşfedebileceği ve sosyal paylaşımda bulunabileceği AI destekli sosyal-gece hayatı uygulaması.

Platform: iOS ve Android

UI/UX: Modern, minimalist, genç odaklı, görseller ön planda, animasyonlu component’ler ve interaktif harita.



Ekranlar ve Component Mapping:



1. Giriş/Kayıt:

- Wireframe: Logo + Uygulama adı, E-posta/Telefon/Google/Apple login, Kayıt ol, Şifre unuttum

- Components: InputField (E-posta, Şifre), Button (Giriş, Kayıt, Sosyal Giriş), Link (Şifre unuttum)



2. Ana Feed/Keşfet:

- Wireframe: Filtre çubuğu, Mekan/Etkinlik card’ları, AI öneri carousel, Alt menü (Keşfet, Harita, Chat, Profil)

- Components: Card (Mekan/Etkinlik), Carousel (AI öneri), Button (Check-in, Paylaşım), BottomNav



3. Mekan Profil:

- Wireframe: Mekan adı + Fotoğraf slider, Adres, Harita, Çalışma saatleri, Yoğunluk, Etkinlik listesi, Rezervasyon/VIP buton, Yorumlar

- Components: ImageSlider, MapView, Button (Rezervasyon, VIP), ListView (Etkinlikler, Yorumlar), RatingStars



4. Etkinlik Detay:

- Wireframe: Etkinlik görseli + isim, Mekan ve tarih, Açıklama, Rezervasyon + QR kod, Takvim ekleme, Paylaşım

- Components: ImageBanner, Button (Rezervasyon, Takvim, Paylaşım), QRCodeGenerator



5. Kullanıcı Profil:

- Wireframe: Profil fotoğrafı, isim, seviye/rozetler, Gittiği mekanlar, Check-in geçmişi, Paylaşımlar, Arkadaş/takipçiler, Ayarlar

- Components: ProfileHeader, ListView (Gittiği mekanlar/Paylaşımlar), SettingsButton



6. Chat/Mesajlaşma:

- Wireframe: Arkadaş listesi + arama, Mesaj penceresi (tekli/grup), Mesaj input + gönder

- Components: ChatList, ChatBubble, InputField + SendButton



7. Harita/Konum:

- Wireframe: Harita full screen, Yakındaki mekan ve etkinlik pinleri, Filtre, Navigasyon butonu

- Components: MapView, Pin/Marker, FilterDropdown, NavigationButton



Backend / Veri Modeli:

- Kullanıcı: id, isim, profil fotoğrafı, seviye/rozetler, check-in geçmişi, favori mekanlar, takip edilen kullanıcılar, premium abonelik durumu

- Mekan: id, isim, adres, konum, fotoğraflar, çalışma saatleri, kapasite, etkinlik listesi, VIP alan bilgisi, yorumlar

- Etkinlik: id, isim, mekan_id, tarih, saat, görsel, bilet durumu, katılımcı sayısı

- Rezervasyon: id, kullanıcı_id, mekan_id, etkinlik_id, tarih, saat, VIP alan bilgisi, QR kod

- Push/Bildirim: rezervasyon, etkinlik hatırlatmaları, arkadaş aktiviteleri, AI öneri



Premium / Monetizasyon:

- Premium üyelik: erken rezervasyon, VIP alan, AI feed özelleştirmesi

- Mekan sponsorluğu: etkinlikleri ön plana çıkarma

- Gamification: check-in, paylaşım, etkinlik katılımı ile puan ve rozet kazanma



AI ve Kişiselleştirme:

- AI öneri motoru: kullanıcı geçmişi ve arkadaş aktivitelerine göre mekan ve etkinlik önerisi

- Dinamik feed: kullanıcı ilgi alanına göre filtrelenmiş içerik

- Akıllı bildirimler: lokasyon ve ilgi alanına göre push bildirim



Test ve QA:

- Kullanıcı kaydı/girişi ve profil düzenleme

- Rezervasyon oluşturma, değiştirme ve iptal

- Chat ve feed akışı doğruluğu

- Etkinliklerin doğru tarihler ve mekanlarla görünmesi

- Harita ve konum doğruluğu

- Premium ve VIP alan testleri

- Push bildirim ve AI öneri testi

- Gamification / rozet kazanımı



Özel Notlar:

- UI animasyonları: check-in, rozet kazanımı, paylaşım gibi küçük animasyonlar ile kullanıcı etkileşimi artırılacak

- Offline veri erişimi: mekan bilgileri ve etkinlik tarihleri offline görülebilecek

- QR kod entegrasyonu: rezervasyon sonrası girişte hızlı doğrulama

- AI öneri ve premium feed özelleştirmesi: kullanıcı deneyimini kişiselleştirir

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://night-vibes-ai.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a1f3e6da-df3f-4084-aa29-68cea705a24d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
