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
- *“Request had insufficient authentication scopes” / “Eksik izin”*: Google’ın izin ekranında kutular tek tek işaretlenebilir; Drive ya da E-Tablolar kutusu boş kalmıştır. Uygulama artık bunu girişte algılar ve izni yeniden ister. Hâlâ olursa https://myaccount.google.com/permissions adresinden “Student Analysis System” iznini kaldırıp yeniden giriş yapın ve **tüm kutuları** işaretleyin.
- *“Drive API / Sheets API etkin değil” (403)*: Google Cloud → API’ler ve Hizmetler → Kitaplık’tan ikisini de etkinleştirin.
- *Hiç pencere açılmıyor*: tarayıcı açılır pencereyi engelliyordur; adres çubuğundan izin verin.

### Birden çok cihaz (Mac + iPhone + iPad)
- Veriler tek bir yerde, Drive’daki “SAS Veritabanı”nda durur; her cihaz oradan okur. Cihazlar arasında elle bir şey yapmanız gerekmez.
- Her kayıtta veritabanına bir **sürüm** yazılır. Bir cihaz kaydetmeye çalışırken Drive’daki sürüm kendi okuduğundan farklıysa (başka cihaz değişiklik yapmıştır) **üzerine yazmaz**; güncel veriyi yükler ve işlemi tekrar yapmanızı ister. Uygulamaya geri dönüldüğünde de sürüm kontrol edilip gerekirse veriler sessizce yenilenir.
- **Oturum:** Google, sunucusuz uygulamalara 1 saatlik erişim verir. Süre dolmadan uygulamayı yeniden açarsanız giriş ekranı atlanır; süre dolduysa tek dokunuşla “Devam et” yeterlidir (hesap seçmeniz gerekmez). Kullanırken süre dolarsa “Yeniden bağlan” düğmesi çıkar. Ortak bir cihazda işiniz bitince **Çıkış yap** deyin (kayıtlı oturum silinir).
- **Veri Drive’a yazılamazsa** (ağ, kota vb.) artık kırmızı bir uyarı çıkar ve dosya “işlendi” sayılmaz. Daha önce “işlendi” denip sonuçları veritabanında bulunmayan dosyalar otomatik yeniden işlenir. Ayarlar → **Tüm dosyaları yeniden işle** ile hepsini elle de yeniden işletebilirsiniz.
- Drive klasör seçimi her cihazın kendi tarayıcısında hatırlanır; yeni cihazda klasörü bir kez seçin (aynı “Student Analysis System” klasörünü).
- **iPhone/iPad notu:** Google girişi, ana ekrana eklenmiş uygulamada (tam ekran) bazen açılır pencere yüzünden başarısız olabilir. Giriş sorun çıkarırsa önce Safari’de (normal sekmede) giriş yapın.

### C) Drive klasör yapısı
```
Student Analysis System/
├─ Öğrenci Listesi.xlsx      (her şube ayrı sekme: 8_A, 8_B …)
├─ Raporlar/
│  ├─ Denemeler/             (LGS deneme sınavları: Excel kazanım raporu + PDF toplu sonuç)
│  ├─ Föyler/                (kazanım föyleri)
│  └─ Taramalar/             (tek derslik tarama sınavları)
└─ SAS Veritabanı            (uygulama ilk açılışta kendisi oluşturur)
```
İlk girişte klasörü uygulamada seçersiniz.

**Sınav türü klasörden gelir:** Denemeler / Föyler / Taramalar klasörlerindeki dosyalar o türde sayılır (alt klasör de açabilirsiniz, ör. `Denemeler/Hafta 6`). Bu üç klasörün dışındaki dosyalarda tür dosya adından tahmin edilir. Önceden işlenmiş bir dosyayı sonradan doğru klasöre taşırsanız yeniden işlemeye gerek kalmaz; tür bir sonraki taramada düzeltilir.
- **Deneme:** genel başarıya ve LGS tahminine girer.
- **Föy:** genel başarıya girer, LGS tahminine girmez.
- **Tarama:** yalnızca ilgili dersin grafiğine girer.

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

## Yıl sonu arşivleme
Ayarlar → **Yıl sonu arşivleme → Yılı arşivle ve yeni yıla başla**.
- Mevcut veritabanı silinmez; **“SAS Veritabanı – Arşiv 2026-2027”** adıyla aynı klasörde kalır (Ayarlar’da bağlantısı listelenir). Yıl etiketi son sınavın tarihinden (Eylül–Ağustos) hesaplanır.
- Yeni, boş bir “SAS Veritabanı” açılır. Taşınanlar: ayarlar ve şablonlar, aktif öğrenciler ve veli bilgileri, isteğe bağlı olarak öğrencilerin güncel kurları.
- Arşivde kalanlar: sınav ve kazanım sonuçları, LGS puanları, kur geçmişi, veli görüşmeleri.
- Geçen yılın rapor dosyaları “Arşiv” olarak işaretlenir ve yeni yıla yeniden alınmaz. Öğrenci listesi yeniden işlenir.
- Bir adım başarısız olursa işlem geri alınır (eski veritabanının adı geri verilir). Aynı yıl ikinci kez arşivlenemez.

## Sürümler
- **Faz 1** (bu sürüm): Google girişi, klasör seçimi, öğrenci listesi, Excel kazanım okuma + sütun şablonu, “Analiz Et”, Panel, Öğrenci detayı + grafikler, Şube haritası, Kazanım analizi, Veli uyarıları (ara/WhatsApp/not), Kur önerileri (Matematik), Ayarlar.
- **Faz 2** (tamam): PDF net okuma, kur listesi içe aktarma, CSV, “Kontrol bekliyor” düzenlenebilir önizleme.
- **Faz 3** (tamam): LİDEP kuru, kur kuralları ve WhatsApp şablonu Ayarlar’dan düzenlenir.
- **Faz 4** (tamam): LGS tahmini, PDF karne. Çevrimdışı önbellek: uygulama kabuğu PWA ile önbelleğe alınır; veriler çevrimiçi Drive’dan okunur.

## Güvenlik ve KVKK notları
- Veriler çocuklara aittir: yalnızca Drive’ınızda tutulur; uygulama bunları herhangi bir sunucuya göndermez.
- “İzinli e-posta” listesi arayüzü kısıtlar. Statik bir uygulamada gerçek erişim denetimi Drive paylaşım ayarlarınızdır; klasörü yalnızca yetkili kişilerle paylaşın.
- `ornekler/` ve `tasarim/` klasörleri `.gitignore`’dadır; gerçek öğrenci dosyalarını asla commit etmeyin.
