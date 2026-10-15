import { create } from 'zustand'
import type { DB, Gorusme, KurKaydi, KurTuru, Ayarlar, SutunSablonu, TabAdi } from './types'
import { bosDB } from './types'
import { analizEt, guncelKur, type Analiz } from './analysis/engine'
import { kazanimIsle, ogrenciListesiIsle } from './analysis/ingest'
import { demoDB, demoYeniHafta } from './data/demo'
import { CLIENT_ID, cikisYap, eposta, girisYap } from './google/auth'
import { agacDosyalari, indir, klasorAra, klasorBilgi, KLASOR, type DriveDosya } from './google/drive'
import { dbBul, dbKaydet, dbOlustur, dbYukle, DB_ADI } from './google/sheets'
import { kazanimCoz, okuBuffer, parmakIzi, type Cozum } from './parsers/kazanim'
import { ogrenciListesiCoz } from './parsers/ogrenciListesi'
import { bugun } from './lib/weeks'

export type Mod = 'giris' | 'demo' | 'google'
export interface Bekleyen { id: string; ad: string; yol: string; mimeType: string; modifiedTime: string; tur: 'ogrenciListesi' | 'rapor' }
export interface Ilerleme { toplam: number; biten: number; ad: string }
export interface Ozet { satirlar: string[]; hata: string[] }
export interface Asama { adim: 'giris' | 'klasor' | 'yukle' | 'tamam'; mesaj?: string }

const KLASOR_ANAHTAR = 'sas.klasorId'
const guvenli = {
  al: (k: string) => { try { return localStorage.getItem(k) } catch { return null } },
  yaz: (k: string, v: string) => { try { localStorage.setItem(k, v) } catch { /* */ } },
  sil: (k: string) => { try { localStorage.removeItem(k) } catch { /* */ } },
}
const DESTEK = /\.(xls|xlsx|csv)$/i
const OGR_LISTESI = /[ÖO]ğ?renci\s*Listesi/i
const yenile = (db: DB) => ({ db: { ...db }, analiz: analizEt(db) })
const kimlik = () => Math.random().toString(36).slice(2, 10)

interface State {
  mod: Mod
  asama: Asama
  email: string
  db: DB
  analiz: Analiz | null
  klasorId: string | null
  dbId: string | null
  bekleyenler: Bekleyen[]
  ilerleme: Ilerleme | null
  ozet: Ozet | null
  hata: string | null
  yuklu: boolean
  // eylemler
  demoBaslat(): void
  girisBaslat(): Promise<void>
  klasorSec(id: string): Promise<void>
  klasoruDegistir(): void
  cikis(): void
  tara(): Promise<void>
  analizEt(): Promise<void>
  kaydet(tablar: TabAdi[]): Promise<void>
  gorusmeKaydet(g: Omit<Gorusme, 'id'>): Promise<void>
  kurDegistir(no: string, tur: KurTuru, yeni: string, neden: string): Promise<void>
  ayarKaydet(a: Ayarlar): Promise<void>
  sablonKaydet(s: SutunSablonu, dosyaId: string): Promise<void>
}

export const useStore = create<State>((set, get) => ({
  mod: 'giris', asama: { adim: 'giris' }, email: '', db: bosDB(), analiz: null, klasorId: null, dbId: null,
  bekleyenler: [], ilerleme: null, ozet: null, hata: null, yuklu: false,

  demoBaslat() {
    const db = demoDB()
    set({ mod: 'demo', asama: { adim: 'tamam' }, email: 'demo@ornek.local', ...yenile(db), yuklu: true, bekleyenler: [], ozet: null, hata: null })
    void get().tara()
  },

  async girisBaslat() {
    set({ hata: null })
    try {
      if (!CLIENT_ID) throw new Error('Google istemci kimliği tanımlı değil. Kurulum adımları için README\'ye bakın; şimdilik Demo modunu deneyebilirsiniz.')
      await girisYap()
      const email = await eposta()
      set({ mod: 'google', email, asama: { adim: 'klasor' } })
      const kayitli = guvenli.al(KLASOR_ANAHTAR)
      if (kayitli) await get().klasorSec(kayitli)
    } catch (e) { set({ hata: (e as Error).message, asama: { adim: 'giris' }, mod: 'giris' }) }
  },

  async klasorSec(id) {
    set({ asama: { adim: 'yukle', mesaj: 'Veritabanı açılıyor…' }, hata: null })
    try {
      const bilgi = await klasorBilgi(id)
      if (bilgi.mimeType !== KLASOR) throw new Error('Seçilen öğe bir klasör değil')
      let dbId = await dbBul(id)
      let db: DB
      if (!dbId) {
        set({ asama: { adim: 'yukle', mesaj: `"${DB_ADI}" oluşturuluyor…` } })
        dbId = await dbOlustur(id)
        db = bosDB()
        db.ayarlar.izinliEposta = [get().email] // ilk kurulumu yapan kişi yetkili
        await dbKaydet(dbId, db, ['kurallar'])
      } else {
        set({ asama: { adim: 'yukle', mesaj: 'Veriler okunuyor…' } })
        db = await dbYukle(dbId)
      }
      const izinli = db.ayarlar.izinliEposta.map(e => e.toLowerCase())
      if (izinli.length && !izinli.includes(get().email.toLowerCase())) {
        cikisYap()
        throw new Error(`${get().email} bu uygulamayı kullanmaya yetkili değil. Ayarlardaki izinli e-posta listesine eklenmeniz gerekir.`)
      }
      guvenli.yaz(KLASOR_ANAHTAR, id)
      set({ klasorId: id, dbId, ...yenile(db), asama: { adim: 'tamam' }, yuklu: true })
      void get().tara()
    } catch (e) { set({ hata: (e as Error).message, asama: { adim: get().mod === 'google' ? 'klasor' : 'giris' } }) }
  },
  klasoruDegistir() { guvenli.sil(KLASOR_ANAHTAR); set({ asama: { adim: 'klasor' }, yuklu: false }) },
  cikis() { cikisYap(); guvenli.sil(KLASOR_ANAHTAR); set({ mod: 'giris', asama: { adim: 'giris' }, email: '', db: bosDB(), analiz: null, klasorId: null, dbId: null, yuklu: false, bekleyenler: [], ozet: null, hata: null }) },

  async tara() {
    const { mod, db, klasorId } = get()
    if (mod === 'demo') {
      const y = demoYeniHafta(db)
      set({ bekleyenler: y ? [{ id: 'demo-yeni', ad: `${y.dosya.sinavAd}.xls`, yol: 'Raporlar/Hafta ' + (db.sinavlar.length + 1) + '/', mimeType: 'demo', modifiedTime: y.tarih, tur: 'rapor' }] : [] })
      return
    }
    if (!klasorId) return
    try {
      const dosyalar = await agacDosyalari(klasorId)
      const islenen = new Map(db.islenenDosyalar.map(d => [d.dosyaId, d]))
      const bek: Bekleyen[] = []
      for (const f of dosyalar) {
        if (f.name === DB_ADI) continue
        const gsheet = f.mimeType === 'application/vnd.google-apps.spreadsheet'
        if (!gsheet && !DESTEK.test(f.name)) continue
        const e = islenen.get(f.id)
        if (e && e.sonDegisiklik === f.modifiedTime && e.durum !== 'Hata') continue
        bek.push({ id: f.id, ad: f.name, yol: f.yol, mimeType: f.mimeType, modifiedTime: f.modifiedTime, tur: OGR_LISTESI.test(f.name) && f.yol === '' ? 'ogrenciListesi' : 'rapor' })
      }
      bek.sort((a, b) => Number(b.tur === 'ogrenciListesi') - Number(a.tur === 'ogrenciListesi') || a.ad.localeCompare(b.ad, 'tr'))
      set({ bekleyenler: bek })
    } catch (e) { set({ hata: (e as Error).message }) }
  },

  async analizEt() {
    const { mod, bekleyenler } = get()
    if (!bekleyenler.length) return
    const db = structuredClone(get().db)
    const ozet: Ozet = { satirlar: [], hata: [] }
    const dokunulan = new Set<TabAdi>(['islenen_dosyalar'])
    const simdi = new Date().toISOString()
    set({ ilerleme: { toplam: bekleyenler.length, biten: 0, ad: '' }, ozet: null, hata: null })
    const kaydet = (b: Bekleyen, durum: 'İşlendi' | 'Kontrol bekliyor' | 'Hata', ayrinti: string, sinavId = '') => {
      db.islenenDosyalar = [...db.islenenDosyalar.filter(d => d.dosyaId !== b.id), { dosyaId: b.id, ad: b.ad, sonDegisiklik: b.modifiedTime, durum, ayrinti, sinavId, islenmeTarihi: simdi }]
    }
    let i = 0
    for (const b of bekleyenler) {
      set({ ilerleme: { toplam: bekleyenler.length, biten: i++, ad: b.ad } })
      await new Promise(r => setTimeout(r, 0))
      try {
        if (mod === 'demo') {
          const y = demoYeniHafta(db)!
          const o = kazanimIsle(db, y.dosya, b.id, y.tarih)
          ;(['sinavlar', 'ders_sonuclari', 'kazanim_sonuclari'] as TabAdi[]).forEach(t => dokunulan.add(t))
          kaydet(b, 'İşlendi', '', o.sinavId); ozet.satirlar.push(`${b.ad}: ${o.ogrenci} öğrenci işlendi`)
          continue
        }
        const wb = okuBuffer(await indir({ id: b.id, name: b.ad, mimeType: b.mimeType, modifiedTime: b.modifiedTime } as DriveDosya))
        if (b.tur === 'ogrenciListesi') {
          const { ogrenciler, uyarilar } = ogrenciListesiCoz(wb)
          if (!ogrenciler.length) throw new Error('Öğrenci bulunamadı: ' + uyarilar.join('; '))
          const s = ogrenciListesiIsle(db, ogrenciler); dokunulan.add('ogrenciler')
          kaydet(b, 'İşlendi', ''); ozet.satirlar.push(`Öğrenci listesi: ${s.eklenen} yeni, ${s.guncellenen} güncellendi${s.pasif ? `, ${s.pasif} pasif` : ''}`)
          continue
        }
        const c = kazanimCoz(wb, b.ad, db.ayarlar.sablonlar)
        if (!c.ok) { kaydet(b, 'Kontrol bekliyor', c.neden); ozet.hata.push(`${b.ad}: ${c.neden}, "Kontrol bekliyor" listesine alındı`); continue }
        const o = kazanimIsle(db, c.veri, b.id, b.modifiedTime)
        ;(['sinavlar', 'ders_sonuclari', 'kazanim_sonuclari', 'ogrenciler'] as TabAdi[]).forEach(t => dokunulan.add(t))
        kaydet(b, 'İşlendi', o.tarihKaynagi === 'degisiklik' ? 'Tarih dosya değişiklik tarihinden alındı' : '', o.sinavId)
        ozet.satirlar.push(`${c.veri.sinavAd}: ${o.ogrenci} öğrenci${o.yeniOgrenci ? `, ${o.yeniOgrenci} listede olmayan öğrenci eklendi` : ''}${o.tarihKaynagi === 'degisiklik' ? ' (tarih dosya tarihinden)' : ''}`)
      } catch (e) {
        kaydet(b, 'Hata', (e as Error).message); ozet.hata.push(`${b.ad}: ${(e as Error).message}`)
      }
    }
    set({ ilerleme: { toplam: bekleyenler.length, biten: bekleyenler.length, ad: 'Kaydediliyor…' } })
    try {
      set({ ...yenile(db) })
      if (mod === 'google') await dbKaydet(get().dbId!, db, [...dokunulan])
    } catch (e) { ozet.hata.push('Veritabanına yazılamadı: ' + (e as Error).message) }
    set({ ilerleme: null, ozet })
    await get().tara()
  },

  async kaydet(tablar) {
    set({ ...yenile(get().db) })
    if (get().mod === 'google') await dbKaydet(get().dbId!, get().db, tablar)
  },
  async gorusmeKaydet(g) {
    const db = get().db
    const var_ = db.gorusmeler.find(x => x.ogrenciNo === g.ogrenciNo && x.uyariAnahtar === g.uyariAnahtar && g.uyariAnahtar)
    if (var_) Object.assign(var_, g)
    else db.gorusmeler = [...db.gorusmeler, { ...g, id: kimlik() }]
    await get().kaydet(['veli_gorusmeleri'])
  },
  async kurDegistir(no, tur, yeni, neden) {
    const db = get().db
    const eski = guncelKur(db, no, tur) ?? ''
    if (eski === yeni) return
    const k: KurKaydi = { id: kimlik(), ogrenciNo: no, tur, tarih: bugun(), eskiKur: eski, yeniKur: yeni, neden }
    db.kurGecmisi = [...db.kurGecmisi, k]
    await get().kaydet(['kur_gecmisi'])
  },
  async ayarKaydet(a) { get().db.ayarlar = a; await get().kaydet(['kurallar']) },
  async sablonKaydet(s, dosyaId) {
    const db = get().db
    db.ayarlar.sablonlar = [...db.ayarlar.sablonlar.filter(x => x.id !== s.id), s]
    // kontrol bekleyen dosyayı yeniden işlenebilir yap
    db.islenenDosyalar = db.islenenDosyalar.filter(d => d.dosyaId !== dosyaId)
    await get().kaydet(['kurallar', 'islenen_dosyalar'])
    await get().tara()
  },
}))
export { klasorAra, parmakIzi }
export type { Cozum }
