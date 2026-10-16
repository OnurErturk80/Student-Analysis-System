import * as XLSX from 'xlsx'
import type { SinavTuru, SutunSablonu } from '../types'
import { anahtar, nfc, sayi, trUpper } from '../lib/tr'

export interface KazanimSatiri {
  sube: string; ogrenciNo: string; ogrenciAd: string
  ders: string; kod: string; kazanim: string; soru: number; yuzde: number
}
export interface KazanimDosyasi {
  sinavAd: string; sinavId: string; tur: SinavTuru; tarih: string | null; sinif: number
  satirlar: KazanimSatiri[]
}
export type Cozum =
  | { ok: true; veri: KazanimDosyasi }
  | { ok: false; neden: string; ornek: string[][] }

export const DERS_ESLE: [RegExp, string][] = [
  [/^T[ÜU]RK[ÇC]E/i, 'Türkçe'], [/^MATEMAT/i, 'Matematik'], [/^FEN/i, 'Fen Bilimleri'],
  [/^[İI]NK|^T\.?C\.?/i, 'İnkılap Tarihi'], [/^D[İI]N/i, 'Din Kültürü'], [/^[İI]NG[İI]L|^YABANCI/i, 'İngilizce'],
]
export const dersAdi = (ham: string) => {
  const t = ham.trim()
  for (const [re, ad] of DERS_ESLE) if (re.test(t)) return ad
  return t.replace(/\.\d+$/, '')
}
export const TUR_AD: Record<SinavTuru, string> = { deneme: 'Deneme', foy: 'Föy', tarama: 'Tarama', diger: 'Diğer' }
/** Drive yolundan sınav türü: "Raporlar/Denemeler/…", "Raporlar/Föyler/…", "Raporlar/Taramalar/…". Klasör adı dosya adından önce gelir. */
export function klasorTuru(yol: string): SinavTuru | null {
  for (const parca of trUpper(yol).split('/').reverse()) {
    if (parca.includes('TARAMA')) return 'tarama'
    if (parca.includes('DENEME')) return 'deneme'
    if (/F[ÖO]Y/.test(parca)) return 'foy'
  }
  return null
}
export function sinavTuru(ad: string): SinavTuru {
  const u = trUpper(ad)
  if (u.includes('TARAMA')) return 'tarama'
  if (u.includes('DENEME')) return 'deneme'
  if (/F[ÖO]Y/.test(u)) return 'foy'
  return 'diger'
}
/** "Sınavlar: 8_DENEME_SINAVI_2(fenomen)" → başlık; tarih varsa ayıklanır */
export function sinavBasligi(ham: string) {
  const ad = ham.replace(/^\s*S[ıi]navlar\s*:\s*/i, '').trim()
  const m = ad.match(/(\d{1,2})[./](\d{1,2})[./](\d{4})/)
  const tarih = m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : null
  return { ad, tarih }
}
/** Excel ve PDF aynı sınavı aynı anahtarla tanısın: sınıf öneki, tarih ve yayınevi eki atılır, "…SINAVI_2" / "…FÖY-1" / "…TARAMA_1" sonrası kesilir */
export function sinavKimligi(ad: string) {
  const t = trUpper(ad.replace(/\.(xlsx?|csv|pdf)$/i, '')).replace(/^\s*\d+\s*[_/\- ]\s*/, '')
  const m = t.match(/^(.*?(?:DENEME[_ ]?SINAVI|F[ÖO]Y|TARAMA)[_\- ]?\d+)/)
  return anahtar(m ? m[1] : t.replace(/\(?\d{1,2}[./]\d{1,2}[./]\d{4}\)?/g, ''))
}

const hucre = (v: unknown) => (v === null || v === undefined ? '' : nfc(String(v)).trim())
const OGR_RE = /^\d+\s*-\s*\S/

function tanimaBaslik(satirlar: string[][]) {
  for (let i = 0; i < Math.min(satirlar.length, 30); i++) {
    const r = satirlar[i].map(hucre)
    const ders = r.findIndex(c => anahtar(c) === 'DERS')
    const kaz = r.findIndex(c => anahtar(c) === 'KAZANIM')
    if (ders >= 0 && kaz >= 0) {
      const kod = r.findIndex(c => anahtar(c) === 'KOD')
      const soru = r.findIndex(c => anahtar(c).startsWith('SORUSAYISI'))
      const ilkOgr = r.findIndex(c => OGR_RE.test(c))
      if (soru >= 0 && ilkOgr >= 0) return { satir: i, ders, kod, kazanim: kaz, soru, ogrenciBaslangic: ilkOgr }
    }
  }
  return null
}
export const parmakIzi = (r: unknown[], ogrBas: number) =>
  r.slice(0, ogrBas).map(hucre).filter(Boolean).map(anahtar).join('|')

export function kazanimCoz(wb: XLSX.WorkBook, dosyaAdi: string, sablonlar: SutunSablonu[] = []): Cozum {
  const satirlar: KazanimSatiri[] = []
  let baslikHam = ''
  let ornek: string[][] = []
  for (const adi of wb.SheetNames) {
    const sh = wb.Sheets[adi]
    const tablo = XLSX.utils.sheet_to_json<unknown[]>(sh, { header: 1, raw: true, defval: '' }) as unknown[][]
    const tabloStr = tablo.map(r => r.map(hucre))
    if (!ornek.length) ornek = tabloStr.slice(0, 12).map(r => r.slice(0, 10))
    if (!baslikHam) {
      const s = tabloStr.slice(0, 6).flat().find(c => /^S[ıi]navlar\s*:/i.test(c))
      if (s) baslikHam = s
    }
    let b = tanimaBaslik(tabloStr)
    if (!b) {
      // kayıtlı şablonlardan dene
      for (const t of sablonlar) {
        const r = tablo[t.baslikSatiri]
        if (r && parmakIzi(r, t.ogrenciBaslangic) === t.parmakIzi)
          { b = { satir: t.baslikSatiri, ders: t.ders, kod: t.kod, kazanim: t.kazanim, soru: t.soru, ogrenciBaslangic: t.ogrenciBaslangic }; break }
      }
    }
    if (!b) return { ok: false, neden: `"${adi}" sekmesinde sütunlar tanınmadı`, ornek }
    const m = adi.match(/(\d+)\s*[_\-/ ]\s*([A-ZÇĞİÖŞÜ])/i) ?? dosyaAdi.match(/(\d+)\s*[_\-/ ]?\s*([A-F])(?![A-Za-zÇĞİÖŞÜçğıöşü])/i)
    const sube = m ? trUpper(m[2]) : '?'
    const baslik = tablo[b.satir]
    const ogrenciler: { kol: number; no: string; ad: string }[] = []
    for (let k = b.ogrenciBaslangic; k < baslik.length; k++) {
      const h = hucre(baslik[k])
      if (!h) continue
      const mm = h.match(/^(\d+)\s*-\s*(.+)$/)
      if (mm) ogrenciler.push({ kol: k, no: mm[1], ad: mm[2].trim() })
    }
    for (let i = b.satir + 1; i < tablo.length; i++) {
      const r = tablo[i]
      const ders = hucre(r[b.ders])
      const soru = sayi(r[b.soru])
      if (!ders || !soru || soru <= 0) continue
      for (const o of ogrenciler) {
        const y = sayi(r[o.kol])
        if (y === null) continue
        satirlar.push({
          sube, ogrenciNo: o.no, ogrenciAd: o.ad, ders: dersAdi(ders),
          kod: b.kod >= 0 ? hucre(r[b.kod]).replace(/\s*\(\d+\)\s*$/, '') : '',
          kazanim: hucre(r[b.kazanim]), soru, yuzde: Math.min(100, Math.max(0, y)),
        })
      }
    }
  }
  if (!satirlar.length) return { ok: false, neden: 'Okunabilir sonuç satırı bulunamadı', ornek }
  const { ad, tarih } = sinavBasligi(baslikHam || dosyaAdi)
  const sinif = Number((ad.match(/^\s*(\d{1,2})\s*[_/\- ]/) ?? wb.SheetNames[0].match(/^(\d+)/) ?? dosyaAdi.match(/(?:^|[^\d])(\d)\s*[_\-/. ]/) ?? [0, '8'])[1])
  return {
    ok: true,
    veri: { sinavAd: ad, sinavId: sinavKimligi(ad), tur: sinavTuru(ad), tarih: tarih ?? dosyaTarihi(dosyaAdi), sinif, satirlar },
  }
}
export function dosyaTarihi(ad: string): string | null {
  const m = ad.match(/(\d{1,2})[._-](\d{1,2})[._-](\d{4})/)
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : null
}
/** Excel (.xls/.xlsx, XML tabanlı .xls dahil) ve CSV okur. CSV: UTF-8 ya da Windows-1254 (Türkçe Excel), ; , veya sekme ayracı. */
export function okuBuffer(buf: ArrayBuffer | Uint8Array, ad = '') {
  if (/\.csv$/i.test(ad)) {
    const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
    let metin: string
    try { metin = new TextDecoder('utf-8', { fatal: true }).decode(b) } catch { metin = new TextDecoder('windows-1254').decode(b) }
    // raw: "66,7" gibi virgüllü ondalıklar sayıya çevrilip bozulmasın (66,7 → 667 olurdu)
    return XLSX.read(metin.replace(/^\uFEFF/, ''), { type: 'string', raw: true })
  }
  return XLSX.read(buf, { type: 'array', cellDates: false })
}
export { XLSX }
