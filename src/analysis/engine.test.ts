import { describe, expect, it } from 'vitest'
import { demoDB } from '../data/demo'
import { analizEt, guncelKur } from './engine'
import { kazanimIsle, netIsle } from './ingest'

describe('analiz motoru (demo veri)', () => {
  const db = demoDB()
  const a = analizEt(db)
  it('6 haftalık seri üretir', () => expect(a.haftalar).toHaveLength(6))
  it('Elif Yılmaz için matematik düşüş uyarısı: 78 → 64 → 52', () => {
    const u = a.uyarilar.find(x => x.ogrenciNo === '214' && x.ders === 'Matematik')
    expect(u?.degerler).toEqual([78, 64, 52])
  })
  it('genel ortalaması eşik altı olan öğrenci uyarılır', () => {
    expect(a.uyarilar.some(x => x.ogrenciNo === '305' && x.tip === 'genel')).toBe(true)
  })
  it('kur: A en yüksek, üst kur önerisi harfi yukarı taşır', () => {
    for (const k of a.kurOnerileri) {
      const fark = 'ABCDEF'.indexOf(k.mevcut) - 'ABCDEF'.indexOf(k.onerilen)
      expect(k.yon === 'üst' ? fark === 1 : fark === -1).toBe(true)
      expect(guncelKur(db, k.ogrenciNo, 'Matematik')).toBe(k.mevcut)
    }
  })
  it('aynı sınav tekrar işlenirse çift kayıt oluşmaz', () => {
    const d = structuredClone(db)
    const n = d.dersSonuclari.length
    const satirlar = d.kazanimSonuclari.filter(x => x.sinavId === 'DEMO1').map(x => ({ sube: 'A', ogrenciNo: x.ogrenciNo, ogrenciAd: 'x', ders: x.ders, kod: x.kod, kazanim: x.ad, soru: x.soru, yuzde: x.yuzde }))
    kazanimIsle(d, { sinavAd: 'x', sinavId: 'DEMO1', tur: 'deneme', tarih: '2026-09-10', sinif: 8, satirlar }, 'f', '2026-09-10')
    expect(d.dersSonuclari.length).toBe(n)
  })
  it('net serisi üretilir; genel net ders netlerinin toplamıdır', () => {
    const n = a.seri.get('214')!.get('Matematik')!.at(-1)!
    expect(n.net).toBeDefined(); expect(n.net!).toBeLessThanOrEqual(n.max!)
    const toplam = ['Türkçe', 'Matematik', 'Fen Bilimleri', 'İnkılap Tarihi', 'İngilizce', 'Din Kültürü']
      .reduce((t, d) => t + a.seri.get('214')!.get(d)!.at(-1)!.net!, 0)
    expect(a.seri.get('214')!.get('Genel')!.at(-1)!.net).toBeCloseTo(toplam, 1)
  })
  it('PDF neti mevcut satıra eklenir, Excel yeniden işlenince net kaybolmaz', () => {
    const d = structuredClone(db)
    const r0 = d.dersSonuclari.find(x => x.sinavId === 'DEMO2' && x.ogrenciNo === '214' && x.ders === 'Matematik')!
    const o = netIsle(d, { sinavAd: 'Deneme 2', sinavId: 'DEMO2', tur: 'deneme', tarih: '2026-09-17', sayfaSayisi: 1, dogrulanamayan: 0, uyarilar: [],
      satirlar: [{ ogrenciNo: '214', ogrenciAd: 'x', ders: 'Matematik', net: 7.33, soru: 10 }, { ogrenciNo: '99999', ogrenciAd: 'yok', ders: 'Matematik', net: 5, soru: 10 }] }, 'pdf', '2026-09-17')
    expect(o.eslesen).toBe(1); expect(o.atlanan).toBe(1); expect(r0.net).toBe(7.33)
    const satirlar = d.kazanimSonuclari.filter(x => x.sinavId === 'DEMO2').map(x => ({ sube: 'A', ogrenciNo: x.ogrenciNo, ogrenciAd: 'x', ders: x.ders, kod: x.kod, kazanim: x.ad, soru: x.soru, yuzde: x.yuzde }))
    kazanimIsle(d, { sinavAd: 'Deneme 2', sinavId: 'DEMO2', tur: 'deneme', tarih: null, sinif: 8, satirlar }, 'xls', '2026-09-30')
    expect(d.dersSonuclari.find(x => x.sinavId === 'DEMO2' && x.ogrenciNo === '214' && x.ders === 'Matematik')!.net).toBe(7.33)
    expect(d.sinavlar.find(s => s.id === 'DEMO2')!.tarih).toBe('2026-09-17') // PDF tarihi korunur
  })
})
