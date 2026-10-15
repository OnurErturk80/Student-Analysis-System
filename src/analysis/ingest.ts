import type { DB, DersSonuc, Ogrenci, Sinav } from '../types'
import type { KazanimDosyasi } from '../parsers/kazanim'
import type { PdfSonucu } from '../parsers/pdf'
import { adGuzel } from '../lib/tr'

export interface IngestOzet { sinavId: string; ogrenci: number; yeniOgrenci: number; tarihKaynagi: 'dosya' | 'degisiklik' }

/** Bir kazanım dosyasını veritabanına işler. Aynı sınav tekrar gelirse eski satırları siler. */
export function kazanimIsle(db: DB, v: KazanimDosyasi, dosyaId: string, degisiklikTarihi: string): IngestOzet {
  const id = v.sinavId
  const eski = db.sinavlar.find(s => s.id === id)
  const tarih = v.tarih ?? eski?.tarih ?? degisiklikTarihi.slice(0, 10)
  const sinav: Sinav = { id, ad: v.sinavAd, tur: v.tur, tarih, sinif: v.sinif, yayinevi: eski?.yayinevi ?? '', kaynakDosyaId: dosyaId }
  db.sinavlar = [...db.sinavlar.filter(s => s.id !== id), sinav]
  // PDF'ten gelen netler Excel yeniden işlenince kaybolmasın
  const eskiNet = new Map(db.dersSonuclari.filter(r => r.sinavId === id && r.net !== null).map(r => [r.ogrenciNo + '|' + r.ders, r.net]))
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
    const t = topla.get(k) ?? { sinavId: id, ogrenciNo: s.ogrenciNo, ders: s.ders, yuzde: 0, soru: 0, net: null, toplam: 0 }
    t.toplam += s.yuzde * s.soru; t.soru += s.soru
    topla.set(k, t)
  }
  for (const t of topla.values()) db.dersSonuclari.push({ sinavId: id, ogrenciNo: t.ogrenciNo, ders: t.ders, yuzde: round(t.toplam / t.soru), soru: t.soru, net: eskiNet.get(t.ogrenciNo + '|' + t.ders) ?? null })
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

export interface NetOzet { sinavId: string; eslesen: number; atlanan: number; yeniSatir: number }
/** PDF toplu sonuç listesi: ders netlerini işler. Excel yoksa soru sayısından yüzde türetir; Excel varsa yalnızca net eklenir. */
export function netIsle(db: DB, v: PdfSonucu, dosyaId: string, degisiklikTarihi: string): NetOzet {
  const id = v.sinavId
  const bilinen = new Map(db.ogrenciler.map(o => [o.no, o]))
  const eslesen = new Set<string>(); let atlanan = 0, yeniSatir = 0
  const siniflar = new Map<number, number>()
  let sinav = db.sinavlar.find(s => s.id === id)
  const dersMap = new Map(db.dersSonuclari.filter(r => r.sinavId === id).map(r => [r.ogrenciNo + '|' + r.ders, r]))
  for (const s of v.satirlar) {
    const o = bilinen.get(s.ogrenciNo)
    if (!o) { atlanan++; continue }
    eslesen.add(o.no); siniflar.set(o.sinif, (siniflar.get(o.sinif) ?? 0) + 1)
    const var_ = dersMap.get(o.no + '|' + s.ders)
    if (var_) { var_.net = s.net; continue }
    if (!s.soru) continue
    const r: DersSonuc = { sinavId: id, ogrenciNo: o.no, ders: s.ders, yuzde: round(Math.max(0, Math.min(100, (s.net / s.soru) * 100))), soru: s.soru, net: s.net }
    db.dersSonuclari.push(r); dersMap.set(o.no + '|' + s.ders, r); yeniSatir++
  }
  const sinif = [...siniflar].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 8
  const tarih = v.tarih ?? sinav?.tarih ?? degisiklikTarihi.slice(0, 10) // PDF'teki tarih kesindir
  const yeni: Sinav = { id, ad: sinav?.ad ?? v.sinavAd, tur: sinav?.tur ?? v.tur, tarih, sinif: sinav?.sinif ?? sinif, yayinevi: sinav?.yayinevi ?? '', kaynakDosyaId: sinav?.kaynakDosyaId ?? dosyaId }
  db.sinavlar = [...db.sinavlar.filter(s => s.id !== id), yeni]
  sinav = yeni
  return { sinavId: id, eslesen: eslesen.size, atlanan, yeniSatir }
}
