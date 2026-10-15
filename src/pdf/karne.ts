import type { DB } from '../types'
import { DERSLER } from '../types'
import { GENEL, degisim, lgsTahmin, subeAnahtari, type Analiz } from '../analysis/engine'
import { tarihGuzel } from '../lib/weeks'

export interface Fontlar { normal: ArrayBuffer; kalin: ArrayBuffer }
const MAVI: [number, number, number] = [51, 85, 224], YESIL: [number, number, number] = [17, 120, 90], TURUNCU: [number, number, number] = [194, 65, 12]
const METIN: [number, number, number] = [21, 23, 28], GRI: [number, number, number] = [107, 114, 128], CIZGI: [number, number, number] = [230, 232, 236], ZEMIN: [number, number, number] = [244, 245, 247]

function base64(ab: ArrayBuffer) {
  const b = new Uint8Array(ab); let s = ''
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000))
  return btoa(s)
}
const yz = (n: number, o = 0) => '%' + n.toFixed(o).replace('.', ',')
const nt = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',')
const ok = (d: number | null) => (d === null ? '–' : Math.abs(d) < 0.05 ? '= 0' : `${d > 0 ? '▲' : '▼'} ${Math.abs(d).toFixed(Math.abs(d) % 1 ? 1 : 0).replace('.', ',')}`)

/** Öğrenci gelişim karnesi (A4). Gizlilik: görüşme notları karneye konmaz. */
export async function karneOlustur(db: DB, a: Analiz, no: string, fontlar: Fontlar): Promise<Blob> {
  const o = db.ogrenciler.find(x => x.no === no)
  if (!o) throw new Error('Öğrenci bulunamadı')
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  doc.addFileToVFS('LiberationSans-Regular.ttf', base64(fontlar.normal)); doc.addFont('LiberationSans-Regular.ttf', 'Lib', 'normal')
  doc.addFileToVFS('LiberationSans-Bold.ttf', base64(fontlar.kalin)); doc.addFont('LiberationSans-Bold.ttf', 'Lib', 'bold')
  doc.setProperties({ title: `Student Analysis System · Gelişim Karnesi · ${o.adSoyad}`, author: 'Student Analysis System', creator: 'Student Analysis System' })

  const W = 210, M = 14, IC = W - 2 * M
  let y = 0
  const yaz = (t: string, x: number, yy: number, boyut = 10, stil: 'normal' | 'bold' = 'normal', renk = METIN, hiza: 'left' | 'right' | 'center' = 'left') => {
    doc.setFont('Lib', stil); doc.setFontSize(boyut); doc.setTextColor(...renk); doc.text(t, x, yy, { align: hiza })
  }
  const sayfa = (gerek: number) => { if (y + gerek > 280) { doc.addPage(); y = 18 } }
  const baslik = (t: string) => { sayfa(14); yaz(t, M, y, 12, 'bold'); doc.setDrawColor(...CIZGI); doc.setLineWidth(0.3); doc.line(M, y + 2, W - M, y + 2); y += 8 }

  // --- üst bant
  doc.setFillColor(...MAVI); doc.rect(0, 0, W, 26, 'F')
  yaz('Student Analysis System', M, 12, 16, 'bold', [255, 255, 255])
  yaz('Öğrenci Gelişim Karnesi', M, 19, 10, 'normal', [255, 255, 255])
  const bugun = new Date().toISOString().slice(0, 10)
  yaz(tarihGuzel(bugun) + ' ' + bugun.slice(0, 4), W - M, 12, 10, 'normal', [255, 255, 255], 'right')
  yaz('Gizlidir · yalnızca veli ile paylaşım içindir', W - M, 19, 8, 'normal', [220, 228, 255], 'right')
  y = 38

  // --- öğrenci
  yaz(o.adSoyad, M, y, 20, 'bold'); y += 7
  const mk = db.kurGecmisi.filter(k => k.ogrenciNo === no && k.tur === 'Matematik').sort((p, q) => q.tarih.localeCompare(p.tarih))[0]?.yeniKur
  const lk = db.kurGecmisi.filter(k => k.ogrenciNo === no && k.tur === 'LİDEP').sort((p, q) => q.tarih.localeCompare(p.tarih))[0]?.yeniKur
  const sinavlar = [...db.sinavlar].sort((p, q) => p.tarih.localeCompare(q.tarih))
  yaz([`${o.sinif}/${o.sube}`, `No ${o.no}`, mk && `Matematik kuru ${mk}`, lk && `LİDEP kuru ${lk}`].filter(Boolean).join('   ·   '), M, y, 10, 'normal', GRI); y += 5
  if (sinavlar.length) { yaz(`Dönem: ${tarihGuzel(sinavlar[0].tarih)} – ${tarihGuzel(sinavlar.at(-1)!.tarih)} · ${sinavlar.length} sınav`, M, y, 9, 'normal', GRI); y += 8 } else y += 3

  const seri = a.seri.get(no)
  const sube = a.subeSeri.get(subeAnahtari(o))
  const gen = seri?.get(GENEL)
  if (!seri) { yaz('Bu öğrenci için henüz sınav verisi yok.', M, y + 6, 11, 'normal', GRI); return doc.output('blob') }

  // --- özet kutuları
  const sg = gen?.at(-1), dg = degisim(gen)
  const kutu = (x: number, w: number, et: string, deger: string, alt: string, renk = METIN) => {
    doc.setFillColor(...ZEMIN); doc.roundedRect(x, y, w, 22, 3, 3, 'F')
    yaz(et, x + 4, y + 6, 8.5, 'normal', GRI); yaz(deger, x + 4, y + 15, 17, 'bold', renk); yaz(alt, x + 4, y + 20, 8, 'normal', GRI)
  }
  const kw = (IC - 8) / 3
  kutu(M, kw, 'Genel başarı (son sınav)', sg ? yz(sg.yuzde, 1) : '–', sg?.net !== undefined ? `${nt(sg.net)} / ${sg.max} net` : 'deneme ve föylerden')
  kutu(M + kw + 4, kw, 'Geçen sınava göre', ok(dg).replace('= 0', '0') + (dg !== null ? ' puan' : ''), 'genel başarıdaki değişim', dg === null ? METIN : dg >= 0 ? YESIL : TURUNCU)
  const sa = sube?.get(GENEL)?.at(-1)
  kutu(M + 2 * (kw + 4), kw, `${o.sinif}/${o.sube} şube ortalaması`, sa ? yz(sa.yuzde, 1) : '–', sg && sa ? `öğrenci ${sg.yuzde >= sa.yuzde ? 'üstünde' : 'altında'} (${ok(Math.round((sg.yuzde - sa.yuzde) * 10) / 10)})` : '')
  y += 30

  // --- ders tablosu
  baslik('Ders bazında durum')
  const kol = [M, M + 52, M + 80, M + 106, M + 132, M + 150]
  doc.setFillColor(...ZEMIN); doc.rect(M, y - 4.5, IC, 7, 'F')
  ;['Ders', 'Son sınav', 'Net', 'Değişim', 'Şube ort.', 'Seyir'].forEach((t, i) => yaz(t, kol[i] + 2, y, 8.5, 'bold', GRI))
  y += 7
  for (const d of DERSLER) {
    const l = seri.get(d); if (!l?.length) continue
    sayfa(10)
    const son = l.at(-1)!, dl = degisim(l), sd = sube?.get(d)?.at(-1)
    yaz(d, kol[0] + 2, y, 10)
    yaz(yz(son.yuzde), kol[1] + 2, y, 10, 'bold', son.yuzde < 50 ? TURUNCU : METIN)
    yaz(son.net !== undefined ? `${nt(son.net)} / ${son.max}` : '–', kol[2] + 2, y, 10)
    yaz(ok(dl), kol[3] + 2, y, 10, 'bold', dl === null ? GRI : dl >= 0 ? YESIL : TURUNCU)
    yaz(sd ? yz(sd.yuzde) : '–', kol[4] + 2, y, 10, 'normal', GRI)
    const v = l.map(x => x.yuzde)
    if (v.length > 1) {
      const mn = Math.min(...v), mx = Math.max(...v), r = mx - mn || 1
      doc.setDrawColor(...((dl ?? 0) < 0 ? TURUNCU : YESIL)); doc.setLineWidth(0.5)
      const pts = v.map((p, i) => [kol[5] + 2 + (i / (v.length - 1)) * 24, y + 1 - ((p - mn) / r) * 6] as const)
      for (let i = 1; i < pts.length; i++) doc.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1])
    }
    doc.setDrawColor(...CIZGI); doc.setLineWidth(0.2); doc.line(M, y + 3, W - M, y + 3)
    y += 8
  }
  y += 4

  // --- genel başarı grafiği
  const ozg = a.haftalar.map(h => ({ h, o: gen?.find(n => n.hafta === h)?.yuzde ?? null, s: sube?.get(GENEL)?.find(n => n.hafta === h)?.yuzde ?? null })).filter(p => p.o !== null || p.s !== null)
  if (ozg.length > 1) {
    sayfa(70); baslik('Genel başarı: haftalık seyir')
    const gx = M + 10, gy = y + 2, gw = IC - 14, gh = 44
    doc.setLineWidth(0.2)
    for (const t of [0, 25, 50, 75, 100]) {
      const yy = gy + gh - (t / 100) * gh
      doc.setDrawColor(...CIZGI); doc.line(gx, yy, gx + gw, yy); yaz(String(t), gx - 2, yy + 1, 7.5, 'normal', GRI, 'right')
    }
    const px = (i: number) => gx + (ozg.length === 1 ? 0 : (i / (ozg.length - 1)) * gw), py = (v: number) => gy + gh - (v / 100) * gh
    // şube ortalaması (kesikli)
    doc.setDrawColor(...GRI); doc.setLineWidth(0.4); doc.setLineDashPattern([1.5, 1.5], 0)
    let onceki: number | null = null
    ozg.forEach((p, i) => { if (p.s === null) return; if (onceki !== null) doc.line(px(onceki), py(ozg[onceki].s!), px(i), py(p.s)); onceki = i })
    doc.setLineDashPattern([], 0)
    doc.setDrawColor(...MAVI); doc.setLineWidth(0.7); onceki = null
    ozg.forEach((p, i) => { if (p.o === null) return; if (onceki !== null) doc.line(px(onceki), py(ozg[onceki].o!), px(i), py(p.o)); onceki = i })
    doc.setFillColor(...MAVI)
    ozg.forEach((p, i) => { if (p.o === null) return; doc.circle(px(i), py(p.o), 0.9, 'F'); yaz(String(Math.round(p.o)), px(i), py(p.o) - 2.2, 7.5, 'bold', METIN, 'center') })
    ozg.forEach((p, i) => yaz('H' + a.haftaNo(p.h), px(i), gy + gh + 5, 7.5, 'normal', GRI, 'center'))
    doc.setDrawColor(...MAVI); doc.setLineWidth(0.7); doc.line(gx, gy + gh + 10, gx + 6, gy + gh + 10); yaz(o.adSoyad.split(' ')[0], gx + 8, gy + gh + 11, 8, 'normal', METIN)
    doc.setDrawColor(...GRI); doc.setLineWidth(0.4); doc.setLineDashPattern([1.5, 1.5], 0); doc.line(gx + 36, gy + gh + 10, gx + 42, gy + gh + 10); doc.setLineDashPattern([], 0)
    yaz(`${o.sinif}/${o.sube} ortalaması`, gx + 44, gy + gh + 11, 8, 'normal', METIN)
    y = gy + gh + 18
  }

  // --- eksik kazanımlar (her dersin son sınavı)
  const zayif: { ders: string; ad: string; yuzde: number; sinav: string }[] = []
  for (const d of DERSLER) {
    const son = sinavlar.filter(s => db.kazanimSonuclari.some(k => k.sinavId === s.id && k.ogrenciNo === no && k.ders === d)).at(-1)
    if (!son) continue
    for (const k of db.kazanimSonuclari.filter(k => k.sinavId === son.id && k.ogrenciNo === no && k.ders === d && k.yuzde < 70)) zayif.push({ ders: d, ad: k.ad, yuzde: k.yuzde, sinav: son.ad })
  }
  zayif.sort((p, q) => p.yuzde - q.yuzde)
  if (zayif.length) {
    sayfa(30); baslik('Çalışılması önerilen kazanımlar')
    for (const z of zayif.slice(0, 8)) {
      sayfa(8)
      yaz(z.ders, M + 2, y, 9, 'bold', GRI)
      const satir = doc.splitTextToSize(z.ad, 104) as string[]
      yaz(satir[0] + (satir.length > 1 ? '…' : ''), M + 32, y, 9.5)
      yaz(yz(z.yuzde), W - M - 2, y, 9.5, 'bold', z.yuzde < 50 ? TURUNCU : METIN, 'right')
      doc.setFillColor(...ZEMIN); doc.roundedRect(M + 32, y + 1.5, 104, 1.6, 0.8, 0.8, 'F')
      doc.setFillColor(...(z.yuzde < 50 ? TURUNCU : [217, 138, 61] as [number, number, number])); doc.roundedRect(M + 32, y + 1.5, Math.max(1.5, 104 * z.yuzde / 100), 1.6, 0.8, 0.8, 'F')
      y += 8
    }
    y += 3
  }

  // --- LGS (8. sınıf)
  if (o.sinif === 8) {
    const t = lgsTahmin(db, no)
    if (t.tahmin !== null) {
      sayfa(34); baslik('LGS tahmini')
      yaz(String(t.tahmin), M + 2, y + 6, 24, 'bold', MAVI)
      yaz(`hedef ${t.hedef} · ${t.tahmin >= t.hedef ? 'hedefin üstünde' : `hedefe ${t.hedef - t.tahmin} puan var`}`, M + 34, y + 3, 10)
      yaz(`Son ${t.n} denemenin LGS puanı: ${t.puanlar.slice(-t.n).map(p => Math.round(p.puan)).join(' → ')}`, M + 34, y + 9, 9, 'normal', GRI)
      doc.setFillColor(...ZEMIN); doc.roundedRect(M + 2, y + 13, IC - 4, 2.4, 1.2, 1.2, 'F')
      doc.setFillColor(...MAVI); doc.roundedRect(M + 2, y + 13, Math.max(2, (IC - 4) * Math.min(1, (t.tahmin - 100) / (t.hedef - 100))), 2.4, 1.2, 1.2, 'F')
      yaz('Tahmin, deneme sınavlarının LGS puanı ortalamasıdır; resmî bir hesap değildir.', M + 2, y + 21, 8, 'normal', GRI)
      y += 28
    }
  }

  // --- kur geçmişi
  const kurlar = db.kurGecmisi.filter(k => k.ogrenciNo === no).sort((p, q) => q.tarih.localeCompare(p.tarih)).slice(0, 5)
  if (kurlar.length) {
    sayfa(14 + kurlar.length * 6); baslik('Kur geçmişi')
    for (const k of kurlar) { yaz(`${k.tur}: ${k.eskiKur ? `${k.eskiKur} → ${k.yeniKur}` : `Kur ${k.yeniKur} ile başladı`}`, M + 2, y, 10, 'bold'); yaz(`${tarihGuzel(k.tarih)} ${k.tarih.slice(0, 4)}`, W - M - 2, y, 9, 'normal', GRI, 'right'); y += 6 }
    y += 3
  }

  // --- veli toplantısı notları
  sayfa(46); baslik('Görüşme notları')
  doc.setDrawColor(...CIZGI); doc.setLineWidth(0.2)
  for (let i = 0; i < 5; i++) { doc.line(M, y + 6 + i * 8, W - M, y + 6 + i * 8) }

  // --- alt bilgi
  const n = doc.getNumberOfPages()
  for (let p = 1; p <= n; p++) {
    doc.setPage(p)
    yaz('Student Analysis System', M, 290, 8, 'normal', GRI); yaz(`${o.adSoyad} · Sayfa ${p}/${n}`, W - M, 290, 8, 'normal', GRI, 'right')
  }
  return doc.output('blob')
}
