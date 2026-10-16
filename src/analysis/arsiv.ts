import type { DB, KurKaydi, KurTuru } from '../types'
import { bosDB, KUR_TURLERI } from '../types'
import { guncelKur } from './engine'
import { ogrenciListesiAdi } from '../parsers/ogrenciListesi'

/** Eğitim yılı etiketi: Eylül–Ağustos. "2026-10-15" → "2026-2027", "2027-03-01" → "2026-2027" */
export function egitimYili(tarih: string): string {
  const [y, m] = tarih.split('-').map(Number)
  const bas = m >= 9 ? y : y - 1
  return `${bas}-${bas + 1}`
}
/** Arşivlenen yılın etiketi: son sınavın tarihine göre (sınav yoksa bugüne göre) */
export function arsivEtiketi(db: DB, bugun: string): string {
  const son = db.sinavlar.map(s => s.tarih).filter(Boolean).sort().at(-1)
  return egitimYili(son ?? bugun)
}

export interface YeniYilSecenek { kurlariTasi: boolean; bugun: string; etiket: string }

/**
 * Yıl sonu: yeni (boş) veritabanının içeriği. Sınav sonuçları, görüşmeler ve kur geçmişi arşivde kalır.
 * Taşınanlar: ayarlar, aktif öğrenciler (veli bilgisiyle), istenirse her öğrencinin güncel kuru (başlangıç kaydı olarak).
 * Geçen yılın rapor dosyaları "Arşiv" olarak işaretlenir ki yeni yıla yeniden alınmasın; öğrenci listesi yeni yılda yeniden işlenir.
 */
export function yeniYilDB(eski: DB, s: YeniYilSecenek): DB {
  const db = bosDB()
  db.ayarlar = structuredClone(eski.ayarlar)
  db.ogrenciler = structuredClone(eski.ogrenciler.filter(o => o.aktif))
  if (s.kurlariTasi) {
    const kayitlar: KurKaydi[] = []
    for (const o of db.ogrenciler) for (const tur of KUR_TURLERI as readonly KurTuru[]) {
      const k = guncelKur(eski, o.no, tur)
      if (k) kayitlar.push({ id: `devir-${o.no}-${tur}`, ogrenciNo: o.no, tur, tarih: s.bugun, eskiKur: '', yeniKur: k, neden: `${s.etiket} yılından devredildi` })
    }
    db.kurGecmisi = kayitlar
  }
  db.islenenDosyalar = eski.islenenDosyalar
    .filter(d => !ogrenciListesiAdi(d.ad))
    .map(d => ({ ...d, durum: 'Arşiv' as const, ayrinti: `${s.etiket} yılı (arşivde)`, sinavId: '' }))
  return db
}
