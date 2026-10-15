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

**Sorun giderme (Google girişi)**
- *“Google istemci kimliği tanımlı değil” / düğme pasif*: GitHub’da `GOOGLE_CLIENT_ID` değişkeni (Variables, Secrets değil) yok ya da kimlik eklendikten sonra yayın yeniden çalıştırılmadı (Actions → Run workflow).
- *Google penceresinde “Error 400: origin_mismatch”*: Kimlik bilgileri → istemci → “Yetkili JavaScript kaynakları” listesine tam adres eklenmeli: `https://<kullanıcı-adınız>.github.io` (yol ve sondaki `/` olmadan, harf büyüklüğüne dikkat). Giriş ekranındaki hata kutusu tarayıcının kullandığı adresi gösterir.
- *“Erişim engellendi” / “access_denied”*: OAuth izin ekranında hesabınız **Test kullanıcıları**nda değil.
- *“Google bu uygulamayı doğrulamadı” uyarısı*: normaldir (uygulama kendi kullanımınız için “Test” durumunda). **Gelişmiş → Student Analysis System’e git (güvenli değil)** deyin; Drive ve E-Tablolar izinlerini onaylayın.
- *Hiç pencere açılmıyor*: tarayıcı açılır pencereyi engelliyordur; adres çubuğundan izin verin.

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
- **PDF toplu sonuç listeleri** (“Toplu Sonuç Listesi”, “Şube Sıralı” dahil): ders netleri okunur ve her öğrenci için net = doğru − yanlış/3 ile doğrulanır. Sınav adı ve tarihi PDF’in başlığından alınır; aynı sınavın Excel’i ile otomatik birleşir. Grafiklerde **Yüzde / Net** düğmesi bu verilerle çalışır.
- **Kur listesi PDF’i** (“Şubelere göre Kurlar”): Matematik ve LİDEP kurları (A en yüksek, F en düşük) okunur, tarihi “Kaynaklar” satırından alınır ve kur geçmişine yazılır. Tekrar işlemek çift kayıt üretmez; listeden daha yeni, elle yapılmış bir değişiklik ezilmez.
- **CSV** (UTF-8 veya Türkçe Excel’in Windows-1254 kodlaması; `;` `,` ya da sekme ayracı; `66,7` gibi virgüllü ondalıklar): Excel kazanım raporuyla aynı düzende okunur. Şube, dosya adından (`8_A.csv`) alınır.
- **Kontrol bekliyor:** PDF tanınmazsa ya da bir net, doğru−yanlış/3 ile uyuşmazsa dosya bu listeye düşer. Şüpheli satırları önizlemede düzeltip onaylayabilir ya da dosyayı atlayabilirsiniz.

## LGS tahmini, LİDEP kuru ve karne
- **LGS puanı** deneme sınavlarının PDF sonuç listesinden okunur (500 üzerinden). **LGS tahmini** = son N denemenin (varsayılan 3) puan ortalamasıdır; resmî hesap değildir. Hedef puan Ayarlar’dadır.
- **LİDEP kuru** LGS puanına bağlıdır: Ayarlar’daki A–E alt puan sınırlarına göre öneri üretilir (her seferinde bir kur). **Varsayılan sınırlar örnektir; kendi gruplarınıza göre değiştirin.**
- **Karne PDF’i**: öğrenci sayfasındaki **Karne** düğmesi A4 gelişim karnesi üretir (ders tablosu, haftalık grafik, çalışılacak kazanımlar, LGS, kur geçmişi, not satırları). Görüşme notları karneye **konmaz**. Türkçe karakterler için Liberation Sans yazı tipi (`public/fonts`) kullanılır.
- Eski veritabanlarında eksik sekmeler (ör. `lgs_puanlari`) ilk açılışta otomatik eklenir.

## Sürümler
- **Faz 1** (bu sürüm): Google girişi, klasör seçimi, öğrenci listesi, Excel kazanım okuma + sütun şablonu, “Analiz Et”, Panel, Öğrenci detayı + grafikler, Şube haritası, Kazanım analizi, Veli uyarıları (ara/WhatsApp/not), Kur önerileri (Matematik), Ayarlar.
- **Faz 2** (tamam): PDF net okuma, kur listesi içe aktarma, CSV, “Kontrol bekliyor” düzenlenebilir önizleme.
- **Faz 3** (tamam): LİDEP kuru, kur kuralları ve WhatsApp şablonu Ayarlar’dan düzenlenir.
- **Faz 4** (tamam): LGS tahmini, PDF karne. Çevrimdışı önbellek: uygulama kabuğu PWA ile önbelleğe alınır; veriler çevrimiçi Drive’dan okunur.

## Güvenlik ve KVKK notları
- Veriler çocuklara aittir: yalnızca Drive’ınızda tutulur; uygulama bunları herhangi bir sunucuya göndermez.
- “İzinli e-posta” listesi arayüzü kısıtlar. Statik bir uygulamada gerçek erişim denetimi Drive paylaşım ayarlarınızdır; klasörü yalnızca yetkili kişilerle paylaşın.
- `ornekler/` ve `tasarim/` klasörleri `.gitignore`’dadır; gerçek öğrenci dosyalarını asla commit etmeyin.
