import { describe, expect, it } from 'vitest'
import { demoDB } from '../data/demo'
import { arsivEtiketi, egitimYili, yeniYilDB } from './arsiv'
import { guncelKur } from './engine'

describe('yıl sonu arşivleme', () => {
  it('eğitim yılı Eylül–Ağustos', () => {
    expect(egitimYili('2026-09-01')).toBe('2026-2027')
    expect(egitimYili('2026-10-15')).toBe('2026-2027')
    expect(egitimYili('2027-06-20')).toBe('2026-2027')
    expect(egitimYili('2027-08-31')).toBe('2026-2027')
    expect(egitimYili('2027-09-01')).toBe('2027-2028')
  })
  it('etiket son sınavın tarihinden, sınav yoksa bugünden', () => {
    const db = demoDB()
    expect(arsivEtiketi(db, '2027-07-01')).toBe('2026-2027')
    db.sinavlar = []
    expect(arsivEtiketi(db, '2027-10-01')).toBe('2027-2028')
  })
  it('yeni yıl: sonuçlar boş; ayarlar, aktif öğrenciler ve (istenirse) kurlar taşınır; eski dosyalar arşiv', () => {
    const eski = demoDB()
    eski.ayarlar.esikler.lgsHedef = 470
    eski.ogrenciler[0].aktif = false
    eski.islenenDosyalar.push({ dosyaId: 'liste', ad: 'Öğrenci Listesi.xlsx'.normalize('NFD'), sonDegisiklik: 't', durum: 'İşlendi', ayrinti: '', sinavId: '', islenmeTarihi: 't' })
    const y = yeniYilDB(eski, { kurlariTasi: true, bugun: '2027-07-01', etiket: '2026-2027' })
    expect(y.sinavlar).toHaveLength(0); expect(y.dersSonuclari).toHaveLength(0); expect(y.kazanimSonuclari).toHaveLength(0)
    expect(y.lgsPuanlari).toHaveLength(0); expect(y.gorusmeler).toHaveLength(0)
    expect(y.ayarlar.esikler.lgsHedef).toBe(470)
    expect(y.ogrenciler).toHaveLength(eski.ogrenciler.length - 1)
    expect(y.ogrenciler[0].veliler.length).toBeGreaterThan(0)
    // kur: güncel kur başlangıç kaydı olarak
    const no = y.ogrenciler[0].no
    expect(guncelKur(y, no, 'Matematik')).toBe(guncelKur(eski, no, 'Matematik'))
    expect(y.kurGecmisi.every(k => k.eskiKur === '' && k.neden.includes('2026-2027'))).toBe(true)
    // eski rapor dosyaları "Arşiv", öğrenci listesi yeniden işlensin diye taşınmaz
    expect(y.islenenDosyalar.every(d => d.durum === 'Arşiv' && d.sinavId === '')).toBe(true)
    expect(y.islenenDosyalar.some(d => d.dosyaId === 'liste')).toBe(false)
    expect(y.islenenDosyalar).toHaveLength(eski.islenenDosyalar.length - 1)
    // eski veri değişmemeli
    expect(eski.sinavlar.length).toBeGreaterThan(0)
  })
  it('kurlar taşınmasın denirse kur geçmişi boş başlar', () => {
    const y = yeniYilDB(demoDB(), { kurlariTasi: false, bugun: '2027-07-01', etiket: '2026-2027' })
    expect(y.kurGecmisi).toHaveLength(0)
  })
})
