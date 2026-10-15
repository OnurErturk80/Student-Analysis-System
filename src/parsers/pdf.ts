import type { SinavTuru } from '../types'
import { trUpper } from '../lib/tr'
import { sinavKimligi, sinavTuru } from './kazanim'
import { KURLAR, KUR_TURLERI, type KurTuru } from '../types'

export interface NetSatiri { ogrenciNo: string; ogrenciAd: string; ders: string; net: number; soru: number | null; supheli?: boolean }
export interface PdfSonucu {
  sinavAd: string; sinavId: string; tur: SinavTuru; tarih: string | null
  satirlar: NetSatiri[]; sayfaSayisi: number
  dogrulanamayan: number // net = doğru − yanlış/3 kontrolünden geçmeyen hücre sayısı
  uyarilar: string[]
}
export type PdfCozum = { ok: true; veri: PdfSonucu } | { ok: false; neden: string }

interface Oge { x: number; y: number; s: string }
interface PdfjsBelge { numPages: number; getPage(n: number): Promise<{ getTextContent(): Promise<{ items: { str: string; transform: number[] }[] }> }> }

const SAYI = /^-?\d+(,\d+)?$/
const CIFT = /^(\d+) (\d+)$/
const ATLA = new Set(['SN', 'S', 'N', 'GRP', 'ÖĞRENCİ', 'PUAN', 'TÜRLERİ', 'PUAN TÜRLERİ', 'ANA DERS LİSTESİ', 'ORTALAMA'])
const f = (s: string) => Number(s.replace(',', '.'))

export function dersTani(metin: string): string | null {
  const u = trUpper(metin)
  if (/[İI]NK[İI]LAP|ATAT/.test(u)) return 'İnkılap Tarihi'
  if (/D[İI]N/.test(u)) return 'Din Kültürü'
  if (/FEN/.test(u)) return 'Fen Bilimleri'
  if (/MAT/.test(u)) return 'Matematik'
  if (/YABANCI|[İI]NG[İI]L/.test(u)) return 'İngilizce'
  if (/^T[ÜU]RK?/.test(u.replace(/^T\.?C\.?\s*/, 'X'))) return 'Türkçe'
  return null
}

/** "8_TÜRKÇE TARAMA_1 TEST 9.10.2026 TED Antalya…" → ad, tür sözcüğü, tarih */
export function pdfBasligi(satir: string) {
  const m = satir.match(/^(.*?)\s+(LGS|F[ÖO]Y|TARAMA|TEST|DENEME)\s+(\d{1,2})\.(\d{1,2})\.(\d{4})/i)
  if (!m) return null
  return { ad: m[1].trim(), kelime: m[2], tarih: `${m[5]}-${m[4].padStart(2, '0')}-${m[3].padStart(2, '0')}` }
}

export async function pdfCoz(pdf: PdfjsBelge): Promise<PdfCozum> {
  const sayfalar: Oge[][] = []
  for (let p = 1; p <= pdf.numPages; p++) {
    const tc = await (await pdf.getPage(p)).getTextContent()
    sayfalar.push(tc.items.filter(i => i.str.trim()).map(i => ({ x: i.transform[4], y: i.transform[5], s: i.str.trim() })))
  }
  const ilk = sayfalar[0] ?? []
  const baslikSatiri = [...ilk].sort((a, b) => b.y - a.y).slice(0, 4).sort((a, b) => b.y - a.y || a.x - b.x).map(o => o.s).join(' ')
  const baslik = pdfBasligi(baslikSatiri)
  if (!baslik) return { ok: false, neden: 'Sınav başlığı (ad, tür, tarih) okunamadı' }

  // Sütun ankorları: "Ortalama" satırındaki sayıların x konumları
  const ort = ilk.find(o => trUpper(o.s) === 'ORTALAMA')
  if (!ort) return { ok: false, neden: '"Ortalama" satırı bulunamadı; format tanınmadı' }
  const anc = ilk.filter(o => Math.abs(o.y - ort.y) < 3 && o.x > ort.x + 20 && SAYI.test(o.s)).map(o => o.x).sort((a, b) => a - b)
  if (anc.length < 2) return { ok: false, neden: 'Sütunlar tanınmadı' }
  const enYakin = (x: number) => { let b = 0; anc.forEach((a, i) => { if (Math.abs(a - x) < Math.abs(anc[b] - x)) b = i }); return Math.abs(anc[b] - x) <= 28 ? b : -1 }

  // Başlık parçalarından ders adı ve soru sayısı
  const gk = ilk.find(o => o.s.startsWith('Genel Katılım'))
  const ust = gk ? gk.y - 8 : Infinity
  const metin: string[][] = anc.map(() => [])
  const maxSoru: (number | null)[] = anc.map(() => null)
  for (const o of ilk) {
    if (o.y >= ust || o.y <= ort.y + 6 || ATLA.has(trUpper(o.s))) continue
    const c = enYakin(o.x); if (c < 0) continue
    const par = o.s.match(/^\((\d+)\)$/)
    if (par) maxSoru[c] = Number(par[1]); else metin[c].push(o.s)
  }
  const dersler = metin.map(m => dersTani(m.join(' ')))
  if (!dersler.some(Boolean)) return { ok: false, neden: 'Ders sütunları tanınmadı' }

  const satirlar: NetSatiri[] = []
  let dogrulanamayan = 0
  const uyarilar: string[] = []
  const ilkAnc = anc[0]
  for (const ogeler of sayfalar) {
    const sn = ogeler.filter(o => /^\d+$/.test(o.s) && o.x < ilkAnc - 40).sort((a, b) => b.y - a.y)
    // SN: ilk sütunlardan solda kalan, satır numarası (x en küçük sütun)
    const minX = Math.min(...sn.map(o => o.x), Infinity)
    const sirano = sn.filter(o => o.x < minX + 12)
    if (!sirano.length) continue
    const blok = new Map<number, Oge[]>()
    for (const o of ogeler) {
      if (o.y > ort.y + 6 && ogeler === sayfalar[0]) continue // başlık bölgesi
      let k = 0; sirano.forEach((a, i) => { if (Math.abs(a.y - o.y) < Math.abs(sirano[k].y - o.y)) k = i })
      if (Math.abs(sirano[k].y - o.y) > 12) continue
      ;(blok.get(k) ?? blok.set(k, []).get(k)!).push(o)
    }
    for (const [, b] of blok) {
      const ad = b.filter(o => /[A-ZÇĞİÖŞÜ]{2}/.test(o.s) && o.x > minX + 14 && o.x < ilkAnc - 5 && !/^\d\/[A-Z]$/.test(o.s) && !/^\d+-\d+$/.test(o.s))
        .sort((p, q) => q.y - p.y || p.x - q.x).map(o => o.s).join(' ')
      const m = ad.match(/^(\d+)\s*-\s*(.+)$/); if (!m) continue
      const sayisal = b.filter(o => SAYI.test(o.s) && o.x >= ilkAnc - 12)
      if (!sayisal.length) continue
      const aY = Math.max(...sayisal.map(o => o.y))
      const A = sayisal.filter(o => Math.abs(o.y - aY) < 2.5)
      const pairler = b.filter(o => CIFT.test(o.s))
      anc.forEach((_, c) => {
        const ders = dersler[c]; if (!ders) return
        const h = A.find(o => enYakin(o.x) === c); if (!h) return
        const net = f(h.s)
        const p = pairler.find(o => enYakin(o.x) === c)
        let supheli = false
        if (p) { const [, d, y] = p.s.match(CIFT)!; if (Math.abs(Number(d) - Number(y) / 3 - net) > 0.03) { dogrulanamayan++; supheli = true } }
        if (maxSoru[c] !== null && (net > maxSoru[c]! + 0.01 || net < -maxSoru[c]! / 3 - 0.01)) { if (!supheli) dogrulanamayan++; supheli = true }
        satirlar.push({ ogrenciNo: String(Number(m[1])), ogrenciAd: m[2], ders, net, soru: maxSoru[c], ...(supheli ? { supheli } : {}) })
      })
    }
  }
  if (!satirlar.length) return { ok: false, neden: 'Okunabilir öğrenci satırı bulunamadı' }
  // Aynı ders birden çok sütunda çıkabilir (ör. "TEST" ve "Mat"): tek satıra indir
  const tek = new Map<string, NetSatiri>()
  for (const s of satirlar) tek.set(s.ogrenciNo + '|' + s.ders, s)
  const son = [...tek.values()]
  if (dogrulanamayan > Math.max(3, son.length * 0.02)) uyarilar.push(`${dogrulanamayan} hücrede net, doğru−yanlış/3 ile uyuşmuyor`)
  return {
    ok: true,
    veri: {
      sinavAd: baslik.ad, sinavId: sinavKimligi(baslik.ad), tur: sinavTuru(baslik.ad + ' ' + baslik.kelime), tarih: baslik.tarih,
      satirlar: son, sayfaSayisi: pdf.numPages, dogrulanamayan, uyarilar,
    },
  }
}

// ---------------------------------------------------------------- Kur listesi
export interface KurSatiri { ogrenciNo: string; ogrenciAd: string; tur: KurTuru; kur: string }
export interface KurSonucu { satirlar: KurSatiri[]; tarihler: Partial<Record<KurTuru, string>>; atlananSatir: number; sayfaSayisi: number }
export type KurCozum = { ok: true; veri: KurSonucu } | { ok: false; neden: string }
const AYLAR = ['OCAK', 'ŞUBAT', 'MART', 'NİSAN', 'MAYIS', 'HAZİRAN', 'TEMMUZ', 'AĞUSTOS', 'EYLÜL', 'EKİM', 'KASIM', 'ARALIK']

/** "Kaynaklar: Matematik 5 Ekim 2026; LİDEP 10 Ekim 2026." → { Matematik: 2026-10-05, LİDEP: 2026-10-10 } */
export function kurTarihleri(satir: string): Partial<Record<KurTuru, string>> {
  const out: Partial<Record<KurTuru, string>> = {}
  for (const parca of satir.replace(/^.*?:/, '').split(/[;\n]/)) {
    const m = trUpper(parca).match(/([A-ZÇĞİÖŞÜ]+)\s+(\d{1,2})\s+([A-ZÇĞİÖŞÜ]+)\s+(\d{4})/)
    const ay = m ? AYLAR.indexOf(m[3]) : -1
    const tur = m ? KUR_TURLERI.find(t => trUpper(t) === m[1]) : undefined
    if (m && ay >= 0 && tur) out[tur] = `${m[4]}-${String(ay + 1).padStart(2, '0')}-${m[2].padStart(2, '0')}`
  }
  return out
}

export async function kurCoz(pdf: PdfjsBelge): Promise<KurCozum> {
  const satirlar: KurSatiri[] = []
  const tarihler: Partial<Record<KurTuru, string>> = {}
  let atlanan = 0
  for (let p = 1; p <= pdf.numPages; p++) {
    const tc = await (await pdf.getPage(p)).getTextContent()
    const ogeler: Oge[] = tc.items.filter(i => i.str.trim()).map(i => ({ x: i.transform[4], y: i.transform[5], s: i.str.trim() }))
    const kaynak = ogeler.find(o => /^Kaynaklar\s*:/i.test(o.s))
    if (kaynak) Object.assign(tarihler, kurTarihleri(kaynak.s))
    // sütun başlıkları: "Matematik Kuru", "LİDEP Kuru"
    const sutunlar = ogeler.map(o => { const m = o.s.match(/^(.+?)\s+Kuru$/i); const tur = m ? KUR_TURLERI.find(t => trUpper(t) === trUpper(m[1])) : undefined; return tur ? { tur, x: o.x, y: o.y } : null }).filter((x): x is { tur: KurTuru; x: number; y: number } => !!x)
    if (!sutunlar.length) continue
    const basY = Math.min(...sutunlar.map(s => s.y))
    const noBaslik = ogeler.find(o => trUpper(o.s) === 'ÖĞRENCİ NO')
    const adBaslik = ogeler.find(o => trUpper(o.s) === 'AD SOYAD')
    if (!noBaslik || !adBaslik) continue
    const satirY = [...new Set(ogeler.filter(o => o.y < basY - 5 && /^\d+$/.test(o.s) && Math.abs(o.x - noBaslik.x) < 40 && o.x > noBaslik.x - 20).map(o => o.y))].sort((a, b) => b - a)
    for (const y of satirY) {
      const s = ogeler.filter(o => Math.abs(o.y - y) < 4)
      const no = s.find(o => /^\d+$/.test(o.s) && Math.abs(o.x - noBaslik.x) < 40 && o.x > noBaslik.x - 20)!
      const ad = s.filter(o => o.x > no.x + 20 && o.x < Math.min(...sutunlar.map(c => c.x)) - 5 && /[A-ZÇĞİÖŞÜa-zçğıöşü]/.test(o.s)).sort((a, b) => a.x - b.x).map(o => o.s).join(' ')
      let bulundu = false
      for (const c of sutunlar) {
        const h = s.filter(o => o.x >= c.x - 30 && o.x <= c.x + 60 && /^[A-Z]$/.test(o.s)).sort((a, b) => Math.abs(a.x - c.x) - Math.abs(b.x - c.x))[0]
        if (h && (KURLAR as readonly string[]).includes(h.s)) { satirlar.push({ ogrenciNo: String(Number(no.s)), ogrenciAd: ad, tur: c.tur, kur: h.s }); bulundu = true }
        else if (!h) continue
        else atlanan++
      }
      if (!bulundu) atlanan++
    }
  }
  if (!satirlar.length) return { ok: false, neden: 'Kur listesinde okunabilir satır bulunamadı' }
  return { ok: true, veri: { satirlar, tarihler, atlananSatir: atlanan, sayfaSayisi: pdf.numPages } }
}

/** İlk sayfa metnine bakarak belge türünü ayırt eder */
export async function pdfTuru(pdf: PdfjsBelge): Promise<'kur' | 'sonuc'> {
  const tc = await (await pdf.getPage(1)).getTextContent()
  return tc.items.some(i => /Kur\s+Listesi/i.test(i.str)) ? 'kur' : 'sonuc'
}
