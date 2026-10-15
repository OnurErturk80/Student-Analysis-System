import type { DB, Ogrenci } from '../types'
import { bosDB, KURLAR } from '../types'
import type { KazanimDosyasi, KazanimSatiri } from '../parsers/kazanim'
import { kazanimIsle } from '../analysis/ingest'

// Tamamen uydurma veri: gerçek öğrenci/veli bilgisi içermez.
function rng(seed: number) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }
const ADLAR = ['Ahmet', 'Ayşe', 'Burak', 'Elif', 'Emre', 'Hira', 'Kaan', 'Selin', 'Mert', 'Zeynep', 'Can', 'Defne', 'Ege', 'Ela', 'Kerem', 'Nil', 'Arda', 'Duru', 'Yağız', 'Ece', 'Berk', 'Asya', 'Onur', 'Su', 'Deniz', 'Ada', 'Efe', 'Mira']
const SOYADLAR = ['Çelik', 'Doğan', 'Er', 'Yılmaz', 'Güneş', 'Polat', 'Uçar', 'Akın', 'Aydın', 'Kaya', 'Demir', 'Şahin', 'Arslan', 'Koç', 'Öztürk', 'Aksoy', 'Yıldız', 'Kurt', 'Özkan', 'Tekin']
const DERS_KAZANIM: Record<string, [string, string][]> = {
  Türkçe: [['T.8.3.1', 'Metin türlerini ayırt eder'], ['T.8.3.4', 'Fiilimsilerin işlevini belirler'], ['T.8.2.2', 'Noktalama işaretlerini kullanır'], ['T.8.3.9', 'Metnin ana fikrini belirler']],
  Matematik: [['M.8.1.2.3', 'Üslü ifadelerde çarpma ve bölme'], ['M.8.1.3.2', 'Kareköklü ifadelerde toplama'], ['M.8.1.2.1', 'Tam sayıların negatif kuvvetleri'], ['M.8.1.1.2', 'EBOB ve EKOK problemleri']],
  'Fen Bilimleri': [['F.8.1.1.1', 'Mevsimlerin oluşumunu açıklar'], ['F.8.2.1.3', 'Hava olayları ve iklim farkı'], ['F.8.3.2.1', 'DNA ve genetik kod'], ['F.8.4.1.2', 'Basınç hesaplamaları']],
  'İnkılap Tarihi': [['İ.8.1.1', 'Avrupa’daki gelişmelerin yansımaları'], ['İ.8.1.3', 'Mustafa Kemal’in çocukluk ve öğrenimi'], ['İ.8.2.2', 'Milli Mücadele hazırlık dönemi']],
  İngilizce: [['E.8.1.1', 'Arkadaşlık ve iletişim'], ['E.8.3.2', 'Sağlıklı yaşam'], ['E.8.5.1', 'Çevre ve doğa']],
  'Din Kültürü': [['D.8.1.1', 'Kader ve kaza inancı'], ['D.8.2.3', 'Zekât ve sadaka']],
}
const SUBELER: [number, string][] = [[7, 'A'], [7, 'B'], [7, 'C'], [8, 'A'], [8, 'B'], [8, 'C']]
const TARIHLER = ['2026-09-10', '2026-09-17', '2026-09-24', '2026-10-01', '2026-10-08', '2026-10-15']

interface Profil { baz: Record<string, number> }
const profiller = new Map<string, Profil>()

function haftaDosyasi(db: DB, hafta: number, ad: string, tarih: string, r: () => number): KazanimDosyasi {
  const satirlar: KazanimSatiri[] = []
  for (const o of db.ogrenciler) {
    if (o.sinif !== 8 && o.sinif !== 7) continue
    const p = profiller.get(o.no)!
    for (const [ders, kazs] of Object.entries(DERS_KAZANIM)) {
      let ders_yuzde = p.baz[ders] + (r() - 0.5) * 8
      const senaryo = o.no === '214' || o.no === '231' || o.no === '305'
      // Senaryolar: ekran görüntüsündeki örnek öğrenciler
      if (o.no === '214' && ders === 'Matematik') ders_yuzde = [74, 76, 75, 78, 64, 52, 49][hafta] ?? 50
      if (o.no === '231' && ders === 'Fen Bilimleri') ders_yuzde = [80, 78, 77, 70, 62, 51, 45][hafta] ?? 45
      if (o.no === '305') ders_yuzde = [42, 40, 41, 39, 38, 38, 37][hafta] ?? 37
      for (const [kod, kad] of kazs) {
        const soru = 2 + Math.floor(r() * 3)
        const y = Math.max(0, Math.min(100, ders_yuzde + (r() - 0.5) * 30 - (kod === 'M.8.1.2.3' ? 15 : 0)))
        // Senaryo öğrencilerinde ders yüzdesi tam olarak belirtilen değer olsun
        satirlar.push({ sube: o.sube, ogrenciNo: o.no, ogrenciAd: o.adSoyad, ders, kod, kazanim: kad, soru, yuzde: senaryo && ders === ({ '214': 'Matematik', '231': 'Fen Bilimleri', '305': ders } as Record<string, string>)[o.no] ? Math.round(ders_yuzde * 10) / 10 : Math.round(y / (100 / soru)) * (100 / soru) })
      }
    }
  }
  return { sinavAd: ad, sinavId: `DEMO${hafta + 1}`, tur: 'deneme', tarih, sinif: 8, satirlar }
}

export function demoDB(): DB {
  const db = bosDB()
  const r = rng(42)
  let no = 100
  for (const [sinif, sube] of SUBELER) {
    for (let i = 0; i < 12; i++) {
      no += 1 + Math.floor(r() * 7)
      const ad = ADLAR[Math.floor(r() * ADLAR.length)] + ' ' + SOYADLAR[Math.floor(r() * SOYADLAR.length)]
      db.ogrenciler.push({
        no: String(no), adSoyad: ad, sinif, sube, birincilVeli: 0, aktif: true,
        veliler: [{ ad: ADLAR[Math.floor(r() * ADLAR.length)] + ' ' + ad.split(' ')[1], yakinlik: 'Anne', tel: '90532000' + String(1000 + no).slice(-4) }, { ad: '', yakinlik: '', tel: '' }, { ad: '', yakinlik: '', tel: '' }],
      })
    }
  }
  // Ekran görüntülerindeki kişiler (uydurma)
  const ozel = (n: string, ad: string, sinif: number, sube: string, veli: string): Ogrenci => ({
    no: n, adSoyad: ad, sinif, sube, birincilVeli: 0, aktif: true,
    veliler: [{ ad: veli, yakinlik: 'Anne', tel: '905320000214' }, { ad: '', yakinlik: '', tel: '' }, { ad: '', yakinlik: '', tel: '' }],
  })
  db.ogrenciler.push(ozel('214', 'Elif Yılmaz', 8, 'B', 'Ayşe Yılmaz'), ozel('231', 'Zeynep Kaya', 8, 'A', 'Hülya Kaya'), ozel('305', 'Kerem Aydın', 7, 'A', 'Murat Aydın'))
  for (const o of db.ogrenciler) {
    const seviye = 55 + r() * 35
    profiller.set(o.no, { baz: Object.fromEntries(Object.keys(DERS_KAZANIM).map(d => [d, Math.max(30, Math.min(97, seviye + (r() - 0.5) * 20))])) })
    const kur = KURLAR[Math.min(5, Math.max(0, Math.round((100 - seviye) / 9)))]
    db.kurGecmisi.push({ id: `k-${o.no}-m`, ogrenciNo: o.no, tur: 'Matematik', tarih: '2026-09-07', eskiKur: '', yeniKur: kur, neden: 'Başlangıç' })
    if (o.sinif === 8) db.kurGecmisi.push({ id: `k-${o.no}-l`, ogrenciNo: o.no, tur: 'LİDEP', tarih: '2026-09-07', eskiKur: '', yeniKur: kur, neden: 'Başlangıç' })
  }
  TARIHLER.forEach((t, h) => kazanimIsle(db, haftaDosyasi(db, h, `Deneme ${h + 1}`, t, r), `demo-${h}`, t))
  db.islenenDosyalar = TARIHLER.map((t, h) => ({ dosyaId: `demo-${h}`, ad: `Deneme ${h + 1}.xls`, sonDegisiklik: t, durum: 'İşlendi' as const, ayrinti: '', sinavId: `DEMO${h + 1}`, islenmeTarihi: t }))
  db.ayarlar.izinliEposta = []
  return db
}
/** Demo modunda "yeni dosya": bir sonraki haftanın sahte raporu */
export function demoYeniHafta(db: DB) {
  const h = db.sinavlar.length
  if (h >= 7) return null
  const tarih = '2026-10-22'
  return { dosya: haftaDosyasi(db, h, `Deneme ${h + 1}`, tarih, rng(1000 + h)), tarih }
}
