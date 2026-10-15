import { describe, expect, it } from 'vitest'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import * as XLSX from 'xlsx'
import { kazanimCoz, okuBuffer, sinavKimligi } from './kazanim'
import { kurCoz, kurTarihleri, pdfCoz, pdfTuru } from './pdf'
import { ogrenciListesiAdi } from './ogrenciListesi'
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

varsa('PDF toplu sonuç listeleri', () => {
  it('net değerlerini okur ve doğru−yanlış/3 ile doğrular', async () => {
    const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs')
    const { pdfCoz } = await import('./pdf')
    for (const f of readdirSync(kaynak!).filter(d => /\.pdf$/i.test(d))) {
      const belge = await getDocument({ data: new Uint8Array(readFileSync(join(kaynak!, f))), useSystemFonts: true }).promise
      const c = await pdfCoz(belge as never)
      if (/KURLAR/i.test(f)) { expect(c.ok, 'kur listesi sonuç listesi değildir').toBe(false); continue }
      expect(c.ok, f).toBe(true)
      if (c.ok) {
        const ogr = new Set(c.veri.satirlar.map(s => s.ogrenciNo)).size
        console.log(f.slice(9, 36), c.veri.sinavId, c.veri.tur, c.veri.tarih, 'öğrenci', ogr, 'satır', c.veri.satirlar.length, 'şüpheli', c.veri.dogrulanamayan, [...new Set(c.veri.satirlar.map(s => s.ders))].join(','))
        expect(c.veri.dogrulanamayan).toBe(0)
        if (c.veri.tur === 'deneme') { expect(c.veri.puanlar.length, 'LGS puanı').toBe(ogr); expect(c.veri.puanlar.every(p => p.puan >= 100 && p.puan <= 500)).toBe(true); console.log('örnek puan', c.veri.puanlar[0]) }
        else expect(c.veri.puanlar).toHaveLength(0)
      }
    }
  }, 60000)
})

describe('CSV', () => {
  const csv = 'Ders;Kod;Kazanım;Soru Sayısı;1-ALİ VELİ;2-AYŞE ÇİÇEK\r\nMatematik.08;M1 (100);Üslü, kök;3;66,7;100\r\nMatematik.08;M2 (100);Kareköklü;7;0;85,7\r\n'
  const baslik = 'Sınavlar: 8_MATEMATİK_TARAMA_2(20.10.2026)\r\n\r\n'
  it('UTF-8, noktalı virgül ve virgüllü ondalıkları doğru okur', () => {
    const c = kazanimCoz(okuBuffer(new TextEncoder().encode(baslik + csv), '8_A.csv'), '8_A.csv')
    expect(c.ok).toBe(true)
    if (c.ok) { expect(c.veri.satirlar).toHaveLength(4); expect(c.veri.satirlar[0].yuzde).toBeCloseTo(66.7); expect(c.veri.satirlar[0].sube).toBe('A'); expect(c.veri.tarih).toBe('2026-10-20'); expect(c.veri.sinif).toBe(8) }
  })
  it('Windows-1254 (Türkçe Excel) kodlamasını çözer', () => {
    const tr1254: Record<string, number> = { İ: 0xdd, ı: 0xfd, Ç: 0xc7, ç: 0xe7, Ş: 0xde, ş: 0xfe, Ğ: 0xd0, ğ: 0xf0, Ü: 0xdc, ü: 0xfc, Ö: 0xd6, ö: 0xf6 }
    const bytes = Uint8Array.from([...(baslik + csv)].map(ch => tr1254[ch] ?? ch.charCodeAt(0)))
    const c = kazanimCoz(okuBuffer(bytes, '8_B.csv'), '8_B.csv')
    expect(c.ok).toBe(true)
    if (c.ok) { expect(c.veri.satirlar[3].ogrenciAd).toBe('AYŞE ÇİÇEK'); expect(c.veri.satirlar[0].ders).toBe('Matematik') }
  })
})
describe('kur tarihleri', () => {
  it('Kaynaklar satırını ayrıştırır', () => {
    expect(kurTarihleri('Kaynaklar: Matematik 5 Ekim 2026; LİDEP 10 Ekim 2026.')).toEqual({ Matematik: '2026-10-05', LİDEP: '2026-10-10' })
  })
})
varsa('kur listesi ve şüpheli net (gerçek PDF)', () => {
  const pdfjs = () => import('pdfjs-dist/legacy/build/pdf.mjs')
  const al = async (ad: RegExp) => {
    const f = readdirSync(kaynak!).find(d => ad.test(d))!
    return (await pdfjs()).getDocument({ data: new Uint8Array(readFileSync(join(kaynak!, f))), useSystemFonts: true }).promise
  }
  it('kur PDF: türü tanır, tarih ve kurları okur, öğrenci listesiyle örtüşür', async () => {
    const belge = (await al(/KURLAR/)) as never
    expect(await pdfTuru(belge)).toBe('kur')
    const c = await kurCoz(belge)
    expect(c.ok).toBe(true)
    if (!c.ok) return
    expect(c.veri.tarihler).toEqual({ Matematik: '2026-10-05', LİDEP: '2026-10-10' })
    const liste = ogrenciListesiCoz(okuBuffer(readFileSync(join(kaynak!, readdirSync(kaynak!).find(d => /\.xlsx$/i.test(d))!)))).ogrenciler
    const no = new Set(liste.map(o => o.no))
    const kurOgr = new Set(c.veri.satirlar.map(s => s.ogrenciNo))
    const eslesen = [...kurOgr].filter(n => no.has(n)).length
    console.log('kur satır', c.veri.satirlar.length, 'öğrenci', kurOgr.size, 'listede', eslesen, 'okunamayan', c.veri.atlananSatir)
    expect(eslesen / kurOgr.size).toBeGreaterThan(0.95)
    expect(c.veri.atlananSatir).toBe(0)
    expect(c.veri.satirlar.every(s => 'ABCDEF'.includes(s.kur))).toBe(true)
  })
  it('bozulan bir net şüpheli işaretlenir', async () => {
    const belge = (await al(/MATEMATI_K_TARAMA_113/)) as never as { numPages: number; getPage(n: number): Promise<{ getTextContent(): Promise<{ items: { str: string; transform: number[] }[] }> }> }
    const sarmal = { numPages: belge.numPages, async getPage(n: number) {
      const p = await belge.getPage(n)
      return { async getTextContent() {
        const tc = await p.getTextContent()
        if (n !== 1) return tc
        let bozuldu = false
        return { items: tc.items.map(i => (!bozuldu && i.str === '20' && i.transform[4] > 440 ? ((bozuldu = true), { ...i, str: '19' }) : i)) }
      } }
    } }
    const c = await pdfCoz(sarmal as never)
    expect(c.ok).toBe(true)
    if (c.ok) { expect(c.veri.dogrulanamayan).toBe(1); expect(c.veri.satirlar.filter(s => s.supheli)).toHaveLength(1) }
  }, 60000)
})

describe('macOS ayrışık Unicode (NFD) dayanıklılığı', () => {
  it('"Öğrenci Listesi" dosya adı NFD ya da NFC gelse de tanınır', () => {
    for (const ad of ['Öğrenci Listesi.xlsx', 'Öğrenci Listesi.xlsx'.normalize('NFD'), 'Ogrenci_Listesi.xlsx', 'O_g_renci_Listesi.xlsx', 'öğrenci listesi (1).xlsx'.normalize('NFD')]) expect(ogrenciListesiAdi(ad), ad).toBe(true)
    expect(ogrenciListesiAdi('Fenomen deneme.xls')).toBe(false)
  })
  it('NFD başlıklı öğrenci listesi ve kazanım matrisi okunur', () => {
    const nfd = (x: string) => x.normalize('NFD')
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([[], [nfd('TED Antalya Koleji Ortaokulu\nÖğrenci Listesi')], [], [], [], ['#', nfd('Öğrenci Numara'), nfd('Öğrenci Tam Adı'), nfd('Veli (1) Tam Adı'), nfd('Veli (1) Velinin Yakınlığı'), nfd('Veli (1) Mesaj Gönderi (Cep Tel)')], ['1', '464', nfd('AHMET EREN ALTUNTAŞ'), nfd('AYŞE ÇİÇEK'), 'Anne', '+90 532 111 22 33']]), '8_A')
    const r = ogrenciListesiCoz(wb)
    expect(r.ogrenciler).toHaveLength(1)
    expect(r.ogrenciler[0].adSoyad).toBe('Ahmet Eren Altuntaş'); expect(r.ogrenciler[0].veliler[0].ad).toBe('Ayşe Çiçek'); expect(r.ogrenciler[0].veliler[0].tel).toBe('905321112233')
    const w2 = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(w2, XLSX.utils.aoa_to_sheet([[], [nfd('Sınavlar: 8_MATEMATİK_TARAMA_1(13.10.2026)')], [], [nfd('Ders'), 'Kod', nfd('Kazanım'), nfd('Soru Sayısı'), nfd('464-AHMET EREN ALTUNTAŞ')], [nfd('Matematik.08'), 'M1 (100)', nfd('Üslü'), '3', '66,7']]), '8_A')
    const c = kazanimCoz(w2, 'x.xls'); expect(c.ok).toBe(true)
  })
})
