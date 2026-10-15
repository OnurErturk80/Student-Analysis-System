import { beforeEach, describe, expect, it, vi } from 'vitest'

interface Istek { url: string; method: string; govde?: string }
const istekler: Istek[] = []
let uzak = ''
let satirSiniri = 1000 // taklit: E-Tablo sekmesinin satır sayısı
vi.mock('./api', () => ({
  gapi: async (url: string, init: { method?: string; body?: string } = {}) => {
    const u = decodeURIComponent(url)
    istekler.push({ url: u, method: init.method ?? 'GET', govde: init.body })
    if (u.includes('kurallar!A2:B30')) return { values: uzak ? [['esikler', '{}'], ['surum', uzak]] : [['esikler', '{}']] }
    if (u.includes('fields=sheets.properties')) return { sheets: ['ogrenciler', 'sinavlar', 'ders_sonuclari', 'kazanim_sonuclari', 'lgs_puanlari', 'kur_gecmisi', 'veli_gorusmeleri', 'kurallar', 'islenen_dosyalar'].map((title, i) => ({ properties: { sheetId: i, title, gridProperties: { rowCount: satirSiniri, columnCount: 26 } } })) }
    if (u.includes(':batchUpdate') && init.body?.includes('updateSheetProperties')) satirSiniri = Math.max(...JSON.parse(init.body).requests.map((r: { updateSheetProperties: { properties: { gridProperties: { rowCount: number } } } }) => r.updateSheetProperties.properties.gridProperties.rowCount))
    // gerçek API gibi: sınır aşan yazmayı reddet
    const m = u.match(/values\/(\w+)!A(\d+)\?/)
    if (m && init.method === 'PUT' && Number(m[2]) - 1 + JSON.parse(init.body!).values.length > satirSiniri - 1) throw new Error('Google API 400: Range exceeds grid limits')
    return {}
  },
}))
vi.mock('./drive', () => ({ listele: async () => [], GSHEET: 'x', tasi: async () => {} }))

import { SurumCakismasi, dbKaydet } from './sheets'
import { bosDB } from '../types'
import { tabloSatirlari, tabloyuYukle } from '../data/schema'

const satir = (n: number) => Array.from({ length: n }, (_, i) => ({ sinavId: 'S', ogrenciNo: String(i), ders: 'Matematik', yuzde: 50, soru: 10, net: null }))

describe('çok cihaz: sürüm kilidi', () => {
  beforeEach(() => { istekler.length = 0; uzak = ''; satirSiniri = 1000 })
  it('sürüm aynıysa yazar ve yeni sürüm üretir', async () => {
    const db = bosDB(); uzak = 'abc'; db.surum = 'abc'
    await dbKaydet('SID', db, ['ders_sonuclari'])
    expect(db.surum).not.toBe('abc'); expect(db.surum.length).toBeGreaterThan(5)
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

describe('Drive yazma güvenliği', () => {
  beforeEach(() => { istekler.length = 0; uzak = ''; satirSiniri = 1000 })
  it('1000 satırı aşan tablo yazılmadan önce sekme büyütülür (yoksa Sheets “grid limits” hatası verir)', async () => {
    const db = bosDB(); db.dersSonuclari = satir(5000)
    await expect(dbKaydet('SID', db, ['ders_sonuclari'])).resolves.toBeUndefined()
    const buyutme = istekler.find(i => i.url.includes(':batchUpdate') && i.govde?.includes('updateSheetProperties'))
    expect(buyutme, 'sekme büyütme isteği').toBeTruthy()
    expect(JSON.parse(buyutme!.govde!).requests[0].updateSheetProperties.properties.gridProperties.rowCount).toBeGreaterThanOrEqual(5002)
  })
  it('sıra: sonuç tabloları → işlenen dosyalar → kurallar (sürüm) en sonda', async () => {
    const db = bosDB(); db.dersSonuclari = satir(3); db.islenenDosyalar = [{ dosyaId: 'f', ad: 'a.xls', sonDegisiklik: 't', durum: 'İşlendi', ayrinti: '', sinavId: 'S', islenmeTarihi: 't' }]
    await dbKaydet('SID', db, ['islenen_dosyalar', 'ders_sonuclari'])
    const sira = istekler.filter(i => i.method === 'PUT').map(i => i.url.match(/values\/(\w+)!/)![1])
    expect(sira).toEqual(['ders_sonuclari', 'islenen_dosyalar', 'kurallar'])
  })
  it('önce yeni veri yazılır, sonra artık satırlar silinir (tablo hiç boşalmaz)', async () => {
    const db = bosDB(); db.dersSonuclari = satir(3)
    await dbKaydet('SID', db, ['ders_sonuclari'])
    const d = istekler.filter(i => i.url.includes('ders_sonuclari!'))
    expect(d[0].method).toBe('PUT'); expect(d[1].url).toContain(':clear'); expect(d[1].url).toContain('ders_sonuclari!A5:')
  })
})
