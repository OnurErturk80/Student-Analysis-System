import { describe, expect, it } from 'vitest'
import { demoDB } from './demo'
import { SEKMELER, tabloSatirlari, tabloyuYukle } from './schema'
import { bosDB, type TabAdi } from '../types'
import { analizEt } from '../analysis/engine'

/** Google E-Tablolar'a yazıp geri okumayı taklit eder: JSON'dan geçer, satır sonundaki boş hücreler atılır */
const sheetsTaklidi = (rows: (string | number | boolean)[][], mod: 'ham' | 'metin') => rows.map(r => {
  const x = r.map(c => (mod === 'metin' && typeof c === 'number' ? String(c) : c))
  while (x.length && x[x.length - 1] === '') x.pop()
  return JSON.parse(JSON.stringify(x))
})

describe('veritabanı yaz → oku turu (E-Tablolar taklidi)', () => {
  for (const mod of ['ham', 'metin'] as const) {
    it(`analiz sonucu aynı kalır (${mod})`, () => {
      const a = demoDB()
      const b = bosDB()
      for (const t of Object.keys(SEKMELER) as TabAdi[]) tabloyuYukle(b, t, sheetsTaklidi(tabloSatirlari(a, t), mod))
      expect(b.ogrenciler.length).toBe(a.ogrenciler.length)
      expect(b.ogrenciler.every(o => o.aktif)).toBe(true)
      expect(b.sinavlar.length).toBe(a.sinavlar.length)
      expect(b.dersSonuclari.length).toBe(a.dersSonuclari.length)
      expect(b.kazanimSonuclari.length).toBe(a.kazanimSonuclari.length)
      const x = analizEt(a), y = analizEt(b)
      expect(y.haftalar).toEqual(x.haftalar)
      expect(y.uyarilar.length).toBe(x.uyarilar.length)
      expect(JSON.stringify([...y.seri.get('214')!])).toBe(JSON.stringify([...x.seri.get('214')!]))
    })
  }
})
