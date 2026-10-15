import { describe, expect, it } from 'vitest'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import * as XLSX from 'xlsx'
import { kazanimCoz, okuBuffer, sinavKimligi } from './kazanim'
import { ogrenciListesiCoz } from './ogrenciListesi'
import { haftaAnahtari } from '../lib/weeks'

const kaynak = process.env.SAMPLES_DIR
const varsa = kaynak && existsSync(kaynak) ? describe : describe.skip

describe('sentetik kazanım matrisi', () => {
  const aoa = [
    ['TED'], ['Sınavlar: 8_MATEMATİK_TARAMA_1(13.10.2026)'], [],
    ['Ders', 'Kod', 'Kazanım', 'Soru Sayısı', '1-ALİ VELİ', '2-AYŞE FATMA'],
    ['Matematik.08', 'M1 (100)', 'Üslü', '3', '100', '66,7'],
    ['Matematik.08', 'M2 (100)', 'Kök', '7', '0', '100'],
  ]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), '8_A')
  it('okur', () => {
    const c = kazanimCoz(wb, 'x.xls')
    expect(c.ok).toBe(true)
    if (c.ok) {
      expect(c.veri.satirlar).toHaveLength(4)
      expect(c.veri.tur).toBe('tarama'); expect(c.veri.tarih).toBe('2026-10-13')
      expect(c.veri.satirlar[1].yuzde).toBeCloseTo(66.7)
    }
  })
  it('tanınmayan başlıkta ok:false ve örnek döner', () => {
    const w = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(w, XLSX.utils.aoa_to_sheet([['a', 'b'], ['1', '2']]), '8_A')
    const c = kazanimCoz(w, 'y.xls'); expect(c.ok).toBe(false)
  })
})
describe('hafta', () => {
  it('ISO', () => { expect(haftaAnahtari('2026-10-01')).toBe('2026-W40'); expect(haftaAnahtari('2026-10-15')).toBe('2026-W42') })
  it('kimlik PDF ve Excel için aynı', () => {
    expect(sinavKimligi('8_DENEME_SINAVI_2(fenomen)')).toBe(sinavKimligi('8/DENEME_SINAVI_2(fenomen) LGS 15.10.2026'))
    expect(sinavKimligi('8/DENEME_SINAVI_1_(01.10.2026)_ÖZGÜN LGS')).toBe(sinavKimligi('8_DENEME_SINAVI_1'))
    expect(sinavKimligi('8_KAZANIM_TED_FÖY-1')).toBe(sinavKimligi('KAZANIM_TED_FÖY-1 FÖY 8.10.2026'))
  })
})
varsa('gerçek örnek dosyalar', () => {
  const dosyalar = () => readdirSync(kaynak!)
  it('kazanım dosyaları', () => {
    for (const f of dosyalar().filter(d => /\.xls$/i.test(d))) {
      const c = kazanimCoz(okuBuffer(readFileSync(join(kaynak!, f))), f)
      expect(c.ok, f).toBe(true)
      if (c.ok) console.log(f.slice(9, 40), c.veri.sinavId, c.veri.tur, c.veri.tarih, c.veri.satirlar.length, new Set(c.veri.satirlar.map(s => s.ogrenciNo)).size)
    }
  })
  it('öğrenci listesi', () => {
    const f = dosyalar().find(d => /\.xlsx$/i.test(d))!
    const r = ogrenciListesiCoz(okuBuffer(readFileSync(join(kaynak!, f))))
    console.log('öğrenci', r.ogrenciler.length, r.uyarilar, r.ogrenciler[0].veliler[0].tel.length)
    expect(r.ogrenciler.length).toBeGreaterThan(100)
  })
})
