import { beforeEach, describe, expect, it, vi } from 'vitest'

const cagri: string[] = []
let olusturHata = false, mevcutArsiv: string[] = []
vi.mock('./google/sheets', () => ({
  DB_ADI: 'SAS Veritabanı', ARSIV_ONEKI: 'SAS Veritabanı – Arşiv',
  uzakSurum: async () => 's1',
  arsivleriBul: async () => mevcutArsiv.map(name => ({ id: 'a', name })),
  dbOlustur: async () => { cagri.push('olustur'); if (olusturHata) throw new Error('kota'); return 'YENI' },
  dbKaydet: async (id: string) => { cagri.push('kaydet:' + id) },
  dbBulHepsi: async () => [], dbYukle: async () => ({}), SurumCakismasi: class extends Error {},
}))
vi.mock('./google/drive', async orj => ({
  ...(await orj<typeof import('./google/drive')>()),
  guncelle: async (id: string, a: { name?: string; trashed?: boolean }) => { cagri.push(`guncelle:${id}:${a.name ?? ''}${a.trashed ? 'cop' : ''}`) },
  agacDosyalari: async () => ({ dosyalar: [], klasorSayisi: 1 }),
}))

import { useStore } from './store'
import { demoDB } from './data/demo'

describe('yıl sonu arşivleme (Drive taklidi)', () => {
  beforeEach(() => {
    cagri.length = 0; olusturHata = false; mevcutArsiv = []
    const db = demoDB(); db.surum = 's1'
    useStore.setState({ mod: 'google', dbId: 'ESKI', klasorId: 'K', db })
  })
  it('eski veritabanını yeniden adlandırır, yenisini oluşturup yazar ve ona geçer', async () => {
    const r = await useStore.getState().yilSonuArsivle(true)
    expect(r.arsivAdi).toBe('SAS Veritabanı – Arşiv 2026-2027')
    expect(cagri).toEqual(['guncelle:ESKI:SAS Veritabanı – Arşiv 2026-2027', 'olustur', 'kaydet:YENI'])
    const s = useStore.getState()
    expect(s.dbId).toBe('YENI'); expect(s.db.sinavlar).toHaveLength(0); expect(s.db.ogrenciler.length).toBeGreaterThan(0)
  })
  it('yeni veritabanı oluşturulamazsa eski adı geri verilir, veri değişmez', async () => {
    olusturHata = true
    await expect(useStore.getState().yilSonuArsivle(true)).rejects.toThrow(/eski hâlinde/)
    expect(cagri).toEqual(['guncelle:ESKI:SAS Veritabanı – Arşiv 2026-2027', 'olustur', 'guncelle:ESKI:SAS Veritabanı'])
    expect(useStore.getState().dbId).toBe('ESKI'); expect(useStore.getState().db.sinavlar.length).toBeGreaterThan(0)
  })
  it('aynı yıl zaten arşivlenmişse hiçbir şey yapmaz', async () => {
    mevcutArsiv = ['SAS Veritabanı – Arşiv 2026-2027']
    await expect(useStore.getState().yilSonuArsivle(true)).rejects.toThrow(/zaten var/)
    expect(cagri).toHaveLength(0)
  })
})
