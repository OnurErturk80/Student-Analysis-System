import type { DB, Ogrenci, TabAdi, Veli, Ayarlar } from '../types'
import { VARSAYILAN_AYARLAR } from '../types'
import { sayi } from '../lib/tr'

type Satir = (string | number | boolean)[]
export const SEKMELER: Record<TabAdi, string[]> = {
  ogrenciler: ['okulNo', 'adSoyad', 'sinif', 'sube', 'birincilVeli', 'aktif',
    ...[1, 2, 3].flatMap(k => [`veli${k}Ad`, `veli${k}Yakinlik`, `veli${k}Tel`])],
  sinavlar: ['sinavId', 'ad', 'tur', 'tarih', 'sinif', 'yayinevi', 'kaynakDosyaId'],
  ders_sonuclari: ['sinavId', 'ogrenciNo', 'ders', 'yuzde', 'soru'],
  kazanim_sonuclari: ['sinavId', 'ogrenciNo', 'ders', 'kod', 'kazanim', 'soru', 'yuzde'],
  kur_gecmisi: ['id', 'ogrenciNo', 'tur', 'tarih', 'eskiKur', 'yeniKur', 'neden'],
  veli_gorusmeleri: ['id', 'ogrenciNo', 'uyariAnahtar', 'uyariMetni', 'durum', 'tarih', 'not'],
  kurallar: ['anahtar', 'deger'],
  islenen_dosyalar: ['dosyaId', 'ad', 'sonDegisiklik', 'durum', 'ayrinti', 'sinavId', 'islenmeTarihi'],
}
const s = (v: unknown) => (v === undefined || v === null ? '' : String(v))

export function tabloSatirlari(db: DB, tab: TabAdi): Satir[] {
  switch (tab) {
    case 'ogrenciler': return db.ogrenciler.map(o => [o.no, o.adSoyad, o.sinif, o.sube, o.birincilVeli, o.aktif ? 1 : 0,
      ...[0, 1, 2].flatMap(i => { const v = o.veliler[i]; return [v?.ad ?? '', v?.yakinlik ?? '', v?.tel ?? ''] })])
    case 'sinavlar': return db.sinavlar.map(x => [x.id, x.ad, x.tur, x.tarih, x.sinif, x.yayinevi, x.kaynakDosyaId])
    case 'ders_sonuclari': return db.dersSonuclari.map(x => [x.sinavId, x.ogrenciNo, x.ders, x.yuzde, x.soru])
    case 'kazanim_sonuclari': return db.kazanimSonuclari.map(x => [x.sinavId, x.ogrenciNo, x.ders, x.kod, x.ad, x.soru, x.yuzde])
    case 'kur_gecmisi': return db.kurGecmisi.map(x => [x.id, x.ogrenciNo, x.tur, x.tarih, x.eskiKur, x.yeniKur, x.neden])
    case 'veli_gorusmeleri': return db.gorusmeler.map(x => [x.id, x.ogrenciNo, x.uyariAnahtar, x.uyariMetni, x.durum, x.tarih, x.not])
    case 'kurallar': return [['esikler', JSON.stringify(db.ayarlar.esikler)], ['izinliEposta', JSON.stringify(db.ayarlar.izinliEposta)], ['sablonlar', JSON.stringify(db.ayarlar.sablonlar)]]
    case 'islenen_dosyalar': return db.islenenDosyalar.map(x => [x.dosyaId, x.ad, x.sonDegisiklik, x.durum, x.ayrinti, x.sinavId, x.islenmeTarihi])
  }
}

export function tabloyuYukle(db: DB, tab: TabAdi, satirlar: unknown[][]) {
  const r = satirlar.filter(x => x.some(c => c !== '' && c !== null && c !== undefined))
  switch (tab) {
    case 'ogrenciler': db.ogrenciler = r.map((x): Ogrenci => ({
      no: s(x[0]), adSoyad: s(x[1]), sinif: Number(x[2]), sube: s(x[3]), birincilVeli: Number(x[4]) || 0, aktif: Number(x[5]) !== 0,
      veliler: [0, 1, 2].map((i): Veli => ({ ad: s(x[6 + i * 3]), yakinlik: s(x[7 + i * 3]), tel: s(x[8 + i * 3]) })),
    })); break
    case 'sinavlar': db.sinavlar = r.map(x => ({ id: s(x[0]), ad: s(x[1]), tur: s(x[2]) as DB['sinavlar'][0]['tur'], tarih: s(x[3]), sinif: Number(x[4]), yayinevi: s(x[5]), kaynakDosyaId: s(x[6]) })); break
    case 'ders_sonuclari': db.dersSonuclari = r.map(x => ({ sinavId: s(x[0]), ogrenciNo: s(x[1]), ders: s(x[2]), yuzde: sayi(x[3]) ?? 0, soru: sayi(x[4]) ?? 0 })); break
    case 'kazanim_sonuclari': db.kazanimSonuclari = r.map(x => ({ sinavId: s(x[0]), ogrenciNo: s(x[1]), ders: s(x[2]), kod: s(x[3]), ad: s(x[4]), soru: sayi(x[5]) ?? 0, yuzde: sayi(x[6]) ?? 0 })); break
    case 'kur_gecmisi': db.kurGecmisi = r.map(x => ({ id: s(x[0]), ogrenciNo: s(x[1]), tur: s(x[2]) as 'Matematik' | 'LİDEP', tarih: s(x[3]), eskiKur: s(x[4]), yeniKur: s(x[5]), neden: s(x[6]) })); break
    case 'veli_gorusmeleri': db.gorusmeler = r.map(x => ({ id: s(x[0]), ogrenciNo: s(x[1]), uyariAnahtar: s(x[2]), uyariMetni: s(x[3]), durum: s(x[4]) as 'Bekliyor' | 'Görüşüldü', tarih: s(x[5]), not: s(x[6]) })); break
    case 'kurallar': {
      const a: Ayarlar = structuredClone(VARSAYILAN_AYARLAR)
      for (const x of r) {
        try {
          const v = JSON.parse(s(x[1]))
          if (x[0] === 'esikler') a.esikler = { ...a.esikler, ...v }
          if (x[0] === 'izinliEposta') a.izinliEposta = v
          if (x[0] === 'sablonlar') a.sablonlar = v
        } catch { /* bozuk satırı yok say */ }
      }
      db.ayarlar = a; break
    }
    case 'islenen_dosyalar': db.islenenDosyalar = r.map(x => ({ dosyaId: s(x[0]), ad: s(x[1]), sonDegisiklik: s(x[2]), durum: s(x[3]) as 'İşlendi', ayrinti: s(x[4]), sinavId: s(x[5]), islenmeTarihi: s(x[6]) })); break
  }
}
