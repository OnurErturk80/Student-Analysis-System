import { beforeEach, describe, expect, it, vi } from 'vitest'

const istekler: { url: string; method: string }[] = []
let uzak = ''
vi.mock('./api', () => ({
  gapi: async (url: string, init: { method?: string } = {}) => {
    istekler.push({ url, method: init.method ?? 'GET' })
    if (url.includes('values/kurallar!A2%3AB30') || url.includes('kurallar%21A2%3AB30')) return { values: uzak ? [['esikler', '{}'], ['surum', uzak]] : [['esikler', '{}']] }
    return {}
  },
}))
vi.mock('./drive', () => ({ listele: async () => [], GSHEET: 'x', tasi: async () => {} }))

import { SurumCakismasi, dbKaydet } from './sheets'
import { bosDB } from '../types'
import { tabloSatirlari, tabloyuYukle } from '../data/schema'

describe('çok cihaz: sürüm kilidi', () => {
  beforeEach(() => { istekler.length = 0; uzak = '' })
  it('sürüm aynıysa yazar, yeni sürüm üretir, kurallar en sona yazılır', async () => {
    const db = bosDB(); uzak = 'abc'; db.surum = 'abc'
    await dbKaydet('SID', db, ['ders_sonuclari'])
    expect(db.surum).not.toBe('abc'); expect(db.surum.length).toBeGreaterThan(5)
    const yazilan = istekler.filter(i => i.method === 'PUT').map(i => decodeURIComponent(i.url))
    expect(yazilan).toHaveLength(1); expect(yazilan[0]).toContain('kurallar') // boş tablolara PUT yok, sürüm satırı kurallar ile gider
    const temizle = istekler.filter(i => i.url.includes(':clear')).map(i => decodeURIComponent(i.url))
    expect(temizle.at(-1)).toContain('kurallar')
  })
  it('başka cihaz yazdıysa (sürüm farklı) reddeder ve hiçbir şey yazmaz', async () => {
    const db = bosDB(); db.surum = 'eski'; uzak = 'yeni'
    await expect(dbKaydet('SID', db, ['ders_sonuclari'])).rejects.toBeInstanceOf(SurumCakismasi)
    expect(istekler.filter(i => i.method !== 'GET')).toHaveLength(0)
    expect(db.surum).toBe('eski')
  })
  it('eski veritabanı (sürüm satırı yok) sorunsuz açılır; sürüm satırı yazılıp okunur', () => {
    const db = bosDB(); db.surum = 'xyz'
    const satirlar = tabloSatirlari(db, 'kurallar')
    const yeni = bosDB(); tabloyuYukle(yeni, 'kurallar', satirlar)
    expect(yeni.surum).toBe('xyz')
    const eski = bosDB(); tabloyuYukle(eski, 'kurallar', satirlar.filter(s => s[0] !== 'surum'))
    expect(eski.surum).toBe('')
  })
})
