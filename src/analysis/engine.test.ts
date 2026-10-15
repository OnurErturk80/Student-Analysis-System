import { describe, expect, it } from 'vitest'
import { demoDB } from '../data/demo'
import { analizEt, guncelKur } from './engine'
import { kazanimIsle } from './ingest'

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
})
