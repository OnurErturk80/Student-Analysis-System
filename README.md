# Student Analysis System (SAS)

7. ve 8. sınıflar için haftalık sınav değerlendirme uygulaması. Tamamen tarayıcıda çalışır; sunucu yoktur.
Tüm veriler (öğrenci listesi, raporlar, analiz sonuçları) **sizin Google Drive hesabınızda** kalır. Bu depoda gizli anahtar veya öğrenci verisi bulunmaz.

## Hemen denemek (Google kurulumu olmadan)
Uygulamayı açın → **Demo modunu aç**. Sahte veriyle çalışır, hiçbir şey kaydedilmez.
Panelde “Analiz Et” ile sahte bir 7. hafta eklenir.

## Geliştirme
```
npm install
npm run dev      # http://localhost:5173/student-analysis-system/
npm test         # ayrıştırıcı ve analiz testleri
```
Gerçek örnek dosyalarla ayrıştırıcı testi için (dosyalar depoya girmez): `SAMPLES_DIR=./ornekler npm test`

---

## KURULUM REHBERİ (bir kez yapılır)

### A) GitHub Pages’i açın
1. Depo sayfasında **Settings → Pages**.
2. **Build and deployment → Source** olarak **GitHub Actions** seçin.
3. Kod `main` dalına birleştirilince (merge) uygulama otomatik yayınlanır:
   `https://<kullanıcı-adınız>.github.io/student-analysis-system/`

### B) Google Cloud projesi ve OAuth istemci kimliği
1. https://console.cloud.google.com adresine **öğretmen Google hesabınızla** girin.
2. Üstteki proje seçiciden **Yeni Proje** → ad: `Student Analysis System` → **Oluştur**.
3. Sol menü **API'ler ve Hizmetler → Kitaplık**: **Google Drive API** ve **Google Sheets API** arayıp ikisini de **Etkinleştir**.
4. **API'ler ve Hizmetler → OAuth izin ekranı** (Google Auth Platform):
   - Kullanıcı türü: **Harici**. Uygulama adı: `Student Analysis System`. Destek e-postası: kendi adresiniz.
   - **Kapsamlar** (Scopes) → şunları ekleyin: `.../auth/drive.readonly`, `.../auth/drive.file`, `.../auth/spreadsheets` (ve openid, email, profile).
   - **Test kullanıcıları**: kendi Gmail/Google adresinizi (ve kullanacak diğer öğretmenleri) ekleyin.
   - Uygulamayı “Test” durumunda bırakabilirsiniz. Not: Test durumunda erişim jetonları ve izinler 7 günde bir yenilenir; giriş ekranı tekrar çıkarsa normaldir.
5. **API'ler ve Hizmetler → Kimlik Bilgileri → Kimlik bilgisi oluştur → OAuth istemci kimliği**:
   - Uygulama türü: **Web uygulaması**.
   - **Yetkili JavaScript kaynakları**: `https://<kullanıcı-adınız>.github.io` (sonunda `/` ve yol olmadan!) ve denemek için `http://localhost:5173`.
   - **Oluştur** → çıkan **İstemci Kimliği**’ni (`...apps.googleusercontent.com`) kopyalayın. *İstemci gizli anahtarı (secret) gerekmez.*
6. GitHub’da **Settings → Secrets and variables → Actions → Variables → New repository variable**:
   - Ad: `GOOGLE_CLIENT_ID`, Değer: kopyaladığınız istemci kimliği.
7. **Actions** sekmesinden son çalışmayı yeniden çalıştırın (Re-run) veya yeni bir commit gönderin.

### C) Drive klasör yapısı
```
Student Analysis System/
├─ Öğrenci Listesi.xlsx      (her şube ayrı sekme: 8_A, 8_B …)
├─ Raporlar/                 (haftalık alt klasörler olabilir)
└─ SAS Veritabanı            (uygulama ilk açılışta kendisi oluşturur)
```
İlk girişte klasörü uygulamada seçersiniz.

### D) iPhone / iPad / Mac ana ekranına ekleme
- **iPhone/iPad (Safari)**: Paylaş düğmesi → **Ana Ekrana Ekle** (simge altında “SAS” yazar).
- **Mac (Safari)**: Dosya → **Dock’a Ekle**. Chrome’da adres çubuğundaki “Yükle” simgesi.

---

## Desteklenen rapor biçimleri (Faz 1)
- **Excel kazanım raporları** (`.xls`/`.xlsx`; yayınevinin “XML tabanlı .xls” dosyaları dahil): satır = kazanım, sütun = öğrenci (`464-AD SOYAD`), değer = başarı yüzdesi. Ders başarısı, kazanımların soru sayısıyla ağırlıklı ortalamasıdır.
- Sütunlar tanınmazsa dosya **Kontrol bekliyor**’a düşer; **Sütunları eşleştir** ile bir kez eşleştirin, şablon olarak kaydedilir.
- **Öğrenci Listesi.xlsx**: sekme adı sınıf/şubeyi (`8_A`) verir; öğrenci numarası eşleştirme anahtarıdır.
- PDF ve CSV: sonraki fazlarda.

## Sürümler
- **Faz 1** (bu sürüm): Google girişi, klasör seçimi, öğrenci listesi, Excel kazanım okuma + sütun şablonu, “Analiz Et”, Panel, Öğrenci detayı + grafikler, Şube haritası, Kazanım analizi, Veli uyarıları (ara/WhatsApp/not), Kur önerileri (Matematik), Ayarlar.
- **Faz 2**: PDF okuma + “Kontrol bekliyor” önizleme, CSV, kur PDF’inden içe aktarma.
- **Faz 3**: Kur kuralları ve LİDEP kuru, ayarların tamamı.
- **Faz 4**: LGS net/puan tahmini, PDF karne, çevrimdışı önbellek.

## Güvenlik ve KVKK notları
- Veriler çocuklara aittir: yalnızca Drive’ınızda tutulur; uygulama bunları herhangi bir sunucuya göndermez.
- “İzinli e-posta” listesi arayüzü kısıtlar. Statik bir uygulamada gerçek erişim denetimi Drive paylaşım ayarlarınızdır; klasörü yalnızca yetkili kişilerle paylaşın.
- `ornekler/` ve `tasarim/` klasörleri `.gitignore`’dadır; gerçek öğrenci dosyalarını asla commit etmeyin.
