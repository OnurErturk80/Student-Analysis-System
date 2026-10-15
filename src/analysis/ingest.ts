import type { DB, DersSonuc, Ogrenci, Sinav } from '../types'
import type { KazanimDosyasi } from '../parsers/kazanim'
import { adGuzel } from '../lib/tr'

export interface IngestOzet { sinavId: string; ogrenci: number; yeniOgrenci: number; tarihKaynagi: 'dosya' | 'degisiklik' }

/** Bir kazanım dosyasını veritabanına işler. Aynı sınav tekrar gelirse eski satırları siler. */
export function kazanimIsle(db: DB, v: KazanimDosyasi, dosyaId: string, degisiklikTarihi: string): IngestOzet {
  const id = v.sinavId
  const eski = db.sinavlar.find(s => s.id === id)
  const tarih = v.tarih ?? eski?.tarih ?? degisiklikTarihi.slice(0, 10)
  const sinav: Sinav = { id, ad: v.sinavAd, tur: v.tur, tarih, sinif: v.sinif, yayinevi: eski?.yayinevi ?? '', kaynakDosyaId: dosyaId }
  db.sinavlar = [...db.sinavlar.filter(s => s.id !== id), sinav]
  db.dersSonuclari = db.dersSonuclari.filter(r => r.sinavId !== id)
  db.kazanimSonuclari = db.kazanimSonuclari.filter(r => r.sinavId !== id)

  const bilinen = new Map(db.ogrenciler.map(o => [o.no, o]))
  let yeni = 0
  const topla = new Map<string, DersSonuc & { toplam: number }>()
  const gorulen = new Set<string>()
  for (const s of v.satirlar) {
    gorulen.add(s.ogrenciNo)
    if (!bilinen.has(s.ogrenciNo)) {
      const o: Ogrenci = { no: s.ogrenciNo, adSoyad: adGuzel(s.ogrenciAd), sinif: v.sinif, sube: s.sube, veliler: [], birincilVeli: 0, aktif: true }
      db.ogrenciler.push(o); bilinen.set(o.no, o); yeni++
    }
    db.kazanimSonuclari.push({ sinavId: id, ogrenciNo: s.ogrenciNo, ders: s.ders, kod: s.kod, ad: s.kazanim, soru: s.soru, yuzde: round(s.yuzde) })
    const k = s.ogrenciNo + '|' + s.ders
    const t = topla.get(k) ?? { sinavId: id, ogrenciNo: s.ogrenciNo, ders: s.ders, yuzde: 0, soru: 0, toplam: 0 }
    t.toplam += s.yuzde * s.soru; t.soru += s.soru
    topla.set(k, t)
  }
  for (const t of topla.values()) db.dersSonuclari.push({ sinavId: id, ogrenciNo: t.ogrenciNo, ders: t.ders, yuzde: round(t.toplam / t.soru), soru: t.soru })
  return { sinavId: id, ogrenci: gorulen.size, yeniOgrenci: yeni, tarihKaynagi: v.tarih ? 'dosya' : 'degisiklik' }
}
const round = (n: number) => Math.round(n * 10) / 10

/** Öğrenci listesi: ad, şube, veli güncellenir; listede olmayanlar silinmez ama pasif yapılır. */
export function ogrenciListesiIsle(db: DB, liste: Ogrenci[]) {
  const mevcut = new Map(db.ogrenciler.map(o => [o.no, o]))
  let eklenen = 0, guncellenen = 0
  const listedeki = new Set<string>()
  for (const o of liste) {
    listedeki.add(o.no)
    const e = mevcut.get(o.no)
    if (!e) { db.ogrenciler.push(o); eklenen++; continue }
    const degisti = e.adSoyad !== o.adSoyad || e.sube !== o.sube || e.sinif !== o.sinif || JSON.stringify(e.veliler) !== JSON.stringify(o.veliler)
    Object.assign(e, { adSoyad: o.adSoyad, sinif: o.sinif, sube: o.sube, veliler: o.veliler, birincilVeli: e.birincilVeli < o.veliler.length ? e.birincilVeli : o.birincilVeli, aktif: true })
    if (degisti) guncellenen++
  }
  let pasif = 0
  for (const e of db.ogrenciler) if (!listedeki.has(e.no) && e.aktif) { e.aktif = false; pasif++ }
  return { eklenen, guncellenen, pasif }
}
