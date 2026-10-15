import type { DB, Esikler, KurTuru, Ogrenci } from '../types'
import { KURLAR } from '../types'
import { haftaAnahtari } from '../lib/weeks'
import { yuzdeYaz } from '../lib/tr'

export interface Nokta { hafta: string; yuzde: number; net?: number; max?: number }
export const GENEL = 'Genel'
const GENEL_TURLER = new Set(['deneme', 'foy'])

export interface Analiz {
  haftalar: string[]
  haftaNo: (h: string) => number
  seri: Map<string, Map<string, Nokta[]>> // ogrNo → ders|Genel → noktalar
  subeSeri: Map<string, Map<string, Nokta[]>> // "8-B" → ders|Genel → noktalar
  ogr: Map<string, Ogrenci>
  uyarilar: Uyari[]
  kurOnerileri: KurOnerisi[]
}
export interface Uyari {
  anahtar: string; ogrenciNo: string; tip: 'dusus' | 'genel'; ders: string
  degerler: number[]; hafta: string; metin: string; kural: string
}
export interface KurOnerisi { ogrenciNo: string; tur: KurTuru; mevcut: string; onerilen: string; yon: 'üst' | 'alt'; neden: string; anahtar: string }

export const subeAnahtari = (o: Pick<Ogrenci, 'sinif' | 'sube'>) => `${o.sinif}-${o.sube}`

function ortalama(xs: number[]) { return xs.reduce((a, b) => a + b, 0) / xs.length }

/** Hafta bazında ağırlıklı (soru sayısına göre) ders ve genel başarı serileri */
export function analizEt(db: DB): Analiz {
  const sinav = new Map(db.sinavlar.map(s => [s.id, s]))
  const haftaSet = new Set<string>()
  for (const s of db.sinavlar) haftaSet.add(haftaAnahtari(s.tarih))
  const haftalar = [...haftaSet].sort()
  const haftaNo = (h: string) => haftalar.indexOf(h) + 1

  // ogr|anahtar|hafta → [toplam, soru]
  const acc = new Map<string, [number, number]>()
  const ekle = (k: string, y: number, w: number) => { const a = acc.get(k) ?? [0, 0]; a[0] += y * w; a[1] += w; acc.set(k, a) }
  for (const r of db.dersSonuclari) {
    const s = sinav.get(r.sinavId); if (!s) continue
    const h = haftaAnahtari(s.tarih)
    ekle(`${r.ogrenciNo}|${r.ders}|${h}`, r.yuzde, r.soru)
    if (GENEL_TURLER.has(s.tur)) ekle(`${r.ogrenciNo}|${GENEL}|${h}`, r.yuzde, r.soru)
  }
  // Net: aynı hafta birden çok sınav varsa soru sayısı en çok olan (eşitse en yeni) sınavın neti
  const netAcc = new Map<string, { net: number; max: number; tarih: string }>()
  const netYaz = (k: string, net: number, max: number, tarih: string) => {
    const e = netAcc.get(k)
    if (!e || max > e.max || (max === e.max && tarih > e.tarih)) netAcc.set(k, { net, max, tarih })
  }
  const genelSinav = new Map<string, { net: number; max: number; n: number; hafta: string; tarih: string }>()
  for (const r of db.dersSonuclari) {
    if (r.net === null || r.net === undefined) continue
    const s = sinav.get(r.sinavId); if (!s) continue
    const h = haftaAnahtari(s.tarih)
    netYaz(`${r.ogrenciNo}|${r.ders}|${h}`, r.net, r.soru, s.tarih)
    if (GENEL_TURLER.has(s.tur)) {
      const g = genelSinav.get(r.sinavId + '|' + r.ogrenciNo) ?? { net: 0, max: 0, n: 0, hafta: h, tarih: s.tarih }
      g.net += r.net; g.max += r.soru; g.n++; genelSinav.set(r.sinavId + '|' + r.ogrenciNo, g)
    }
  }
  for (const [k, g] of genelSinav) if (g.n >= 4) netYaz(`${k.split('|')[1]}|${GENEL}|${g.hafta}`, g.net, g.max, g.tarih)
  const seri = new Map<string, Map<string, Nokta[]>>()
  for (const [k, [t, w]] of acc) {
    const [no, ders, hafta] = k.split('|')
    let m = seri.get(no); if (!m) seri.set(no, (m = new Map()))
    let l = m.get(ders); if (!l) m.set(ders, (l = []))
    const n = netAcc.get(k)
    l.push({ hafta, yuzde: Math.round((t / w) * 10) / 10, ...(n ? { net: Math.round(n.net * 100) / 100, max: n.max } : {}) })
  }
  for (const m of seri.values()) for (const l of m.values()) l.sort((a, b) => a.hafta.localeCompare(b.hafta))

  const ogr = new Map(db.ogrenciler.map(o => [o.no, o]))
  const subeAcc = new Map<string, Map<string, Map<string, Nokta[]>>>()
  for (const [no, m] of seri) {
    const o = ogr.get(no); if (!o || !o.aktif) continue
    const sk = subeAnahtari(o)
    for (const [ders, l] of m) for (const n of l) {
      const a = subeAcc.get(sk) ?? new Map(); const b = a.get(ders) ?? new Map(); const c = b.get(n.hafta) ?? []
      c.push(n); b.set(n.hafta, c); a.set(ders, b); subeAcc.set(sk, a)
    }
  }
  const subeSeri = new Map<string, Map<string, Nokta[]>>()
  for (const [sk, a] of subeAcc) {
    const m = new Map<string, Nokta[]>()
    for (const [ders, b] of a) m.set(ders, [...b].map(([hafta, v]): Nokta => {
      const nl = v.filter(x => x.net !== undefined)
      return { hafta, yuzde: Math.round(ortalama(v.map(x => x.yuzde)) * 10) / 10,
        ...(nl.length ? { net: Math.round(ortalama(nl.map(x => x.net!)) * 100) / 100, max: Math.round(ortalama(nl.map(x => x.max!)) * 10) / 10 } : {}) }
    }).sort((x, y) => x.hafta.localeCompare(y.hafta)))
    subeSeri.set(sk, m)
  }

  const analiz: Analiz = { haftalar, haftaNo, seri, subeSeri, ogr, uyarilar: [], kurOnerileri: [] }
  analiz.uyarilar = uyariUret(db, analiz)
  analiz.kurOnerileri = [...kurOner(db, analiz), ...lidepOner(db, analiz)]
  return analiz
}

export function uyariUret(db: DB, a: Analiz): Uyari[] {
  const e = db.ayarlar.esikler
  const out: Uyari[] = []
  for (const [no, m] of a.seri) {
    const o = a.ogr.get(no); if (!o?.aktif) continue
    for (const [ders, l] of m) {
      if (ders === GENEL) continue
      const son = l.slice(-(e.dususHafta + 1))
      if (son.length < e.dususHafta + 1) continue
      let ok = true
      for (let i = 1; i < son.length; i++) if (son[i - 1].yuzde - son[i].yuzde < e.dususPuan) ok = false
      if (ok) {
        const d = son.map(x => x.yuzde)
        out.push({
          anahtar: `dusus:${ders}:${son[son.length - 1].hafta}`, ogrenciNo: no, tip: 'dusus', ders, degerler: d, hafta: son[son.length - 1].hafta,
          metin: `${ders} ${e.dususHafta} haftadır düşüşte: ${d.map(x => yuzdeYaz(x)).join(' → ')}`,
          kural: `${e.dususHafta} hafta üst üste ${e.dususPuan} puan düşüş`,
        })
      }
    }
    const g = m.get(GENEL)?.at(-1)
    if (g && g.yuzde < e.genelAlt) {
      out.push({
        anahtar: `genel::${g.hafta}`, ogrenciNo: no, tip: 'genel', ders: GENEL, degerler: [g.yuzde], hafta: g.hafta,
        metin: `Genel ortalama ${yuzdeYaz(g.yuzde)}, eşik ${yuzdeYaz(e.genelAlt)}`, kural: `Genel ortalama %${e.genelAlt} altı`,
      })
    }
  }
  return out
}

export function guncelKur(db: DB, no: string, tur: KurTuru): string | null {
  const l = db.kurGecmisi.filter(k => k.ogrenciNo === no && k.tur === tur).sort((x, y) => x.tarih.localeCompare(y.tarih) || x.id.localeCompare(y.id))
  return l.length ? l[l.length - 1].yeniKur : null
}
const kurKaydir = (kur: string, yon: 'üst' | 'alt') => {
  const i = KURLAR.indexOf(kur as (typeof KURLAR)[number]); if (i < 0) return null
  const j = yon === 'üst' ? i - 1 : i + 1 // A en yüksek
  return KURLAR[j] ?? null
}
/** Matematik kuru: son N sınav (hafta) ortalamasına göre. LİDEP kuru LGS puanına bağlı; Faz 4'te eklenecek. */
export function kurOner(db: DB, a: Analiz): KurOnerisi[] {
  const e: Esikler = db.ayarlar.esikler
  const out: KurOnerisi[] = []
  for (const [no, m] of a.seri) {
    const o = a.ogr.get(no); if (!o?.aktif) continue
    const mevcut = guncelKur(db, no, 'Matematik'); if (!mevcut) continue
    const l = m.get('Matematik'); if (!l || l.length < e.ustKurSinav) continue
    const ort = ortalama(l.slice(-e.ustKurSinav).map(x => x.yuzde))
    const son = l[l.length - 1].hafta
    const yon = ort > e.ustKurOrt ? 'üst' : ort < e.altKurOrt ? 'alt' : null
    const onerilen = yon && kurKaydir(mevcut, yon)
    if (yon && onerilen)
      out.push({ ogrenciNo: no, tur: 'Matematik', mevcut, onerilen, yon, anahtar: `kur:Matematik:${son}`,
        neden: `Son ${e.ustKurSinav} sınav ortalaması ${yuzdeYaz(ort)}` })
  }
  return out
}

export const son = (l?: Nokta[]) => l?.at(-1)
export type Gosterim = 'yuzde' | 'net'
export const degerOf = (n: Nokta | undefined | null, g: Gosterim): number | null => (n ? (g === 'net' ? (n.net ?? null) : n.yuzde) : null)
/** Renk skalası için her zaman yüzde cinsinden karşılık (net/maks) */
export const oranOf = (n: Nokta | undefined | null): number | null => (n ? (n.net !== undefined && n.max ? Math.max(0, (n.net / n.max) * 100) : n.yuzde) : null)
export const degisim = (l?: Nokta[], g: Gosterim = 'yuzde') => {
  if (!l || l.length < 2) return null
  const a = degerOf(l[l.length - 1], g), b = degerOf(l[l.length - 2], g)
  return a === null || b === null ? null : Math.round((a - b) * (g === 'net' ? 100 : 10)) / (g === 'net' ? 100 : 10)
}

export function kazanimOrtalama(db: DB, f: (no: string) => boolean, ders: string, sinavId: string) {
  const m = new Map<string, { kod: string; ad: string; t: number; w: number }>()
  for (const r of db.kazanimSonuclari) {
    if (r.sinavId !== sinavId || r.ders !== ders || !f(r.ogrenciNo)) continue
    const x = m.get(r.kod + r.ad) ?? { kod: r.kod, ad: r.ad, t: 0, w: 0 }
    x.t += r.yuzde; x.w += 1; m.set(r.kod + r.ad, x)
  }
  return [...m.values()].map(x => ({ kod: x.kod, ad: x.ad, yuzde: Math.round(x.t / x.w) })).sort((a, b) => a.yuzde - b.yuzde)
}

// ---------------------------------------------------------------- LGS
export interface LgsTahmin {
  tahmin: number | null // son N denemenin LGS puanı ortalaması
  puanlar: { sinavId: string; ad: string; tarih: string; puan: number }[]
  hedef: number
  dersNet: { ders: string; net: number; max: number }[] // son N denemenin ders net ortalaması
  n: number
}
/** Tahmin = son N deneme sınavının (PDF'teki) LGS puanı ortalaması. Resmî hesap değildir. */
export function lgsTahmin(db: DB, no: string): LgsTahmin {
  const e = db.ayarlar.esikler
  const sinav = new Map(db.sinavlar.filter(s => s.tur === 'deneme').map(s => [s.id, s]))
  const puanlar = db.lgsPuanlari.filter(p => p.ogrenciNo === no && sinav.has(p.sinavId))
    .map(p => ({ sinavId: p.sinavId, ad: sinav.get(p.sinavId)!.ad, tarih: sinav.get(p.sinavId)!.tarih, puan: p.puan }))
    .sort((a, b) => a.tarih.localeCompare(b.tarih))
  const son = puanlar.slice(-Math.max(1, e.lidepSinav))
  const tahmin = son.length ? Math.round(son.reduce((t, p) => t + p.puan, 0) / son.length) : null
  const sonIds = new Set(son.map(p => p.sinavId))
  const m = new Map<string, { t: number; max: number; n: number }>()
  for (const r of db.dersSonuclari) {
    if (r.ogrenciNo !== no || !sonIds.has(r.sinavId) || r.net === null || r.net === undefined) continue
    const x = m.get(r.ders) ?? { t: 0, max: 0, n: 0 }; x.t += r.net; x.max += r.soru; x.n++; m.set(r.ders, x)
  }
  const dersNet = [...m].map(([ders, x]) => ({ ders, net: Math.round((x.t / x.n) * 100) / 100, max: Math.round(x.max / x.n) }))
  return { tahmin, puanlar, hedef: e.lgsHedef, dersNet, n: son.length }
}
/** Puandan LİDEP kuru: lidepEsik = [A,B,C,D,E] alt sınırları, altı F */
export function lidepKurundan(puan: number, esik: number[]): string {
  const i = esik.findIndex(x => puan >= x)
  return KURLAR[i < 0 ? KURLAR.length - 1 : i]
}
/** LİDEP kuru LGS puanına göre belirlenir; öneri her seferinde bir kur kaydırır. */
export function lidepOner(db: DB, a: Analiz): KurOnerisi[] {
  const e = db.ayarlar.esikler
  const out: KurOnerisi[] = []
  for (const o of a.ogr.values()) {
    if (!o.aktif || o.sinif !== 8) continue
    const mevcut = guncelKur(db, o.no, 'LİDEP'); if (!mevcut) continue
    const t = lgsTahmin(db, o.no)
    if (t.tahmin === null || t.n < 2) continue
    const hedef = lidepKurundan(t.tahmin, e.lidepEsik)
    const i = KURLAR.indexOf(mevcut as (typeof KURLAR)[number]), j = KURLAR.indexOf(hedef as (typeof KURLAR)[number])
    if (i < 0 || i === j) continue
    const yon = j < i ? 'üst' : 'alt'
    out.push({ ogrenciNo: o.no, tur: 'LİDEP', mevcut, onerilen: KURLAR[i + (j < i ? -1 : 1)], yon, anahtar: `kur:LİDEP:${t.puanlar.at(-1)!.sinavId}`,
      neden: `Son ${t.n} denemenin LGS puanı ortalaması ${t.tahmin} (${hedef} kuru aralığı)` })
  }
  return out
}
