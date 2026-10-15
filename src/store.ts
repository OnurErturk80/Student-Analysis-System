import { create } from 'zustand'
import type { DB, Gorusme, KurKaydi, KurTuru, Ayarlar, SutunSablonu, TabAdi } from './types'
import { bosDB } from './types'
import { analizEt, guncelKur, type Analiz, type Gosterim } from './analysis/engine'
import { kazanimIsle, kurIsle, netIsle, ogrenciListesiIsle } from './analysis/ingest'
import { demoDB, demoNetEkle, demoPuanEkle, demoYeniHafta } from './data/demo'
import { CLIENT_ID, cikisYap, eposta, girisYap, kayitliEposta, kayitliOturum, oturumDinle } from './google/auth'
import { agacDosyalari, indir, klasorAra, klasorBilgi, KLASOR, type DriveDosya } from './google/drive'
import { dbBulHepsi, dbKaydet, dbOlustur, dbYukle, DB_ADI, SurumCakismasi, uzakSurum } from './google/sheets'
import { kazanimCoz, okuBuffer, parmakIzi, type Cozum } from './parsers/kazanim'
import { ogrenciListesiCoz } from './parsers/ogrenciListesi'
import { pdfOku } from './parsers/pdfYukle'
import type { PdfSonucu } from './parsers/pdf'
import { bugun } from './lib/weeks'

export type Mod = 'giris' | 'demo' | 'google'
export interface Bekleyen { id: string; ad: string; yol: string; mimeType: string; modifiedTime: string; tur: 'ogrenciListesi' | 'rapor' }
export interface Ilerleme { toplam: number; biten: number; ad: string }
export interface Ozet { satirlar: string[]; hata: string[] }
export interface TaramaSatiri { ad: string; yol: string; durum: string }
export interface Tarama { klasor: number; toplam: number; satirlar: TaramaSatiri[]; zaman: string }
export interface Asama { adim: 'giris' | 'klasor' | 'yukle' | 'tamam'; mesaj?: string }

const KLASOR_ANAHTAR = 'sas.klasorId'
const guvenli = {
  al: (k: string) => { try { return localStorage.getItem(k) } catch { return null } },
  yaz: (k: string, v: string) => { try { localStorage.setItem(k, v) } catch { /* */ } },
  sil: (k: string) => { try { localStorage.removeItem(k) } catch { /* */ } },
}
const DESTEK = /\.(xls|xlsx|csv|pdf)$/i
const PDF = /\.pdf$/i
const OGR_LISTESI = /[ÖO]ğ?renci\s*Listesi/i
const yenile = (db: DB) => ({ db: { ...db }, analiz: analizEt(db) })
const CAKISMA = 'Veriler başka bir cihazda değişmiş; güncel veriler yüklendi. Az önceki işleminizi tekrar yapın.'
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
  tarama: Tarama | null
  ilerleme: Ilerleme | null
  ozet: Ozet | null
  hata: string | null
  yuklu: boolean
  sonKontrol: number
  dbSayisi: number
  oturumGerekli: boolean
  gosterim: Gosterim
  gosterimDegis(g: Gosterim): void
  // eylemler
  demoBaslat(): void
  girisBaslat(): Promise<void>
  klasorSec(id: string): Promise<void>
  klasoruDegistir(): void
  cikis(): void
  tara(): Promise<void>
  analizEt(): Promise<void>
  kaydet(tablar: TabAdi[]): Promise<void>
  yenidenYukle(mesaj?: string): Promise<void>
  tumunuYenidenIsle(): Promise<void>
  otomatikGiris(): Promise<void>
  oturumYenile(): Promise<void>
  hesapDegistir(): Promise<void>
  yenileGerekirse(): Promise<void>
  gorusmeKaydet(g: Omit<Gorusme, 'id'>): Promise<void>
  kurDegistir(no: string, tur: KurTuru, yeni: string, neden: string): Promise<void>
  ayarKaydet(a: Ayarlar): Promise<void>
  sablonKaydet(s: SutunSablonu, dosyaId: string): Promise<void>
  pdfOnayla(dosyaId: string, veri: PdfSonucu): Promise<void>
  dosyaAtla(dosyaId: string): Promise<void>
}

export const useStore = create<State>((set, get) => ({
  mod: 'giris', asama: { adim: 'giris' }, email: '', db: bosDB(), analiz: null, klasorId: null, dbId: null,
  bekleyenler: [], tarama: null, ilerleme: null, ozet: null, hata: null, yuklu: false,
  sonKontrol: 0,
  dbSayisi: 0,
  oturumGerekli: false,
  gosterim: guvenli.al('sas.gosterim') === 'net' ? 'net' : 'yuzde',
  gosterimDegis(g) { guvenli.yaz('sas.gosterim', g); set({ gosterim: g }) },

  demoBaslat() {
    const db = demoDB()
    set({ mod: 'demo', asama: { adim: 'tamam' }, email: 'demo@ornek.local', ...yenile(db), yuklu: true, bekleyenler: [], ozet: null, hata: null })
    void get().tara()
  },

  /** Uygulama açılırken: süresi dolmamış kayıtlı oturum varsa giriş ekranı gösterilmeden devam edilir */
  async otomatikGiris() { if (CLIENT_ID && kayitliOturum() && !get().yuklu) await get().girisBaslat() },
  async oturumYenile() {
    try { await girisYap(); set({ oturumGerekli: false, hata: null }); void get().tara() } catch (e) { set({ hata: (e as Error).message }) }
  },
  async hesapDegistir() { cikisYap(); await get().girisBaslat() },
  async girisBaslat() {
    set({ hata: null })
    try {
      if (!CLIENT_ID) throw new Error('Google istemci kimliği tanımlı değil. Kurulum adımları için README\'ye bakın; şimdilik Demo modunu deneyebilirsiniz.')
      const oturum = kayitliOturum()
      if (!oturum) await girisYap()
      const email = oturum ? kayitliEposta() : await eposta()
      set({ mod: 'google', email, asama: { adim: 'klasor' } })
      const klasor = guvenli.al(KLASOR_ANAHTAR)
      if (klasor) await get().klasorSec(klasor)
    } catch (e) { set({ hata: (e as Error).message, asama: { adim: 'giris' }, mod: 'giris' }) }
  },

  async klasorSec(id) {
    set({ asama: { adim: 'yukle', mesaj: 'Veritabanı açılıyor…' }, hata: null })
    try {
      const bilgi = await klasorBilgi(id)
      if (bilgi.mimeType !== KLASOR) throw new Error('Seçilen öğe bir klasör değil')
      const adaylar = await dbBulHepsi(id)
      let dbId: string | null = adaylar[0]?.id ?? null
      set({ dbSayisi: adaylar.length })
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
      set({ klasorId: id, dbId, ...yenile(db), asama: { adim: 'tamam' }, yuklu: true, sonKontrol: Date.now() })
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
      const { dosyalar, klasorSayisi } = await agacDosyalari(klasorId)
      const islenen = new Map(db.islenenDosyalar.map(d => [d.dosyaId, d]))
      const bek: Bekleyen[] = []
      const satirlar: TaramaSatiri[] = []
      for (const f of dosyalar) {
        const gst = (durum: string) => satirlar.push({ ad: f.name, yol: f.yol, durum })
        if (f.name === DB_ADI) { gst('Veritabanı dosyası, atlandı'); continue }
        const gsheet = f.mimeType === 'application/vnd.google-apps.spreadsheet'
        if (!gsheet && !DESTEK.test(f.name)) { gst(`Atlandı: desteklenmeyen tür (${f.mimeType.replace('application/', '')})`); continue }
        const e = islenen.get(f.id)
        // "İşlendi" denmiş ama sonuçları veritabanında yoksa (eski yazma hatası, başka cihaz) dosya yeniden işlenir
        const eksik = !!e && e.durum === 'İşlendi' && ((e.sinavId !== '' && !(db.sinavlar.some(s => s.id === e.sinavId) && db.dersSonuclari.some(r => r.sinavId === e.sinavId))) || (e.sinavId === '' && OGR_LISTESI.test(e.ad) && db.ogrenciler.length === 0))
        if (e && !eksik && e.sonDegisiklik === f.modifiedTime && e.durum !== 'Hata') { gst(e.durum === 'İşlendi' ? 'İşlendi' : e.durum + (e.ayrinti ? `: ${e.ayrinti}` : '')); continue }
        gst(eksik ? 'Veritabanında sonuçları yok, yeniden işlenecek' : e ? 'Değişmiş, işlenmeyi bekliyor' : 'Yeni, işlenmeyi bekliyor')
        bek.push({ id: f.id, ad: f.name, yol: f.yol, mimeType: f.mimeType, modifiedTime: f.modifiedTime, tur: OGR_LISTESI.test(f.name) && f.yol === '' ? 'ogrenciListesi' : 'rapor' })
      }
      set({ tarama: { klasor: klasorSayisi, toplam: dosyalar.length, satirlar, zaman: new Date().toISOString() }, hata: null })
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
          demoNetEkle(db, o.sinavId, Math.random); demoPuanEkle(db, o.sinavId)
          ;(['sinavlar', 'ders_sonuclari', 'kazanim_sonuclari'] as TabAdi[]).forEach(t => dokunulan.add(t))
          kaydet(b, 'İşlendi', '', o.sinavId); ozet.satirlar.push(`${b.ad}: ${o.ogrenci} öğrenci işlendi`)
          continue
        }
        const veri = await indir({ id: b.id, name: b.ad, mimeType: b.mimeType, modifiedTime: b.modifiedTime } as DriveDosya)
        if (PDF.test(b.ad)) {
          const icerik = await pdfOku(veri)
          if (icerik.tur === 'kur') {
            const c = icerik.c
            if (!c.ok) { kaydet(b, 'Kontrol bekliyor', c.neden); ozet.hata.push(`${b.ad}: ${c.neden}. "Kontrol bekliyor" listesine alındı`); continue }
            const k = kurIsle(db, c.veri, b.modifiedTime); dokunulan.add('kur_gecmisi')
            const not = [k.atlanan ? `${k.atlanan} satır öğrenci listesinde olmadığı için atlandı` : '', k.daYeni ? `${k.daYeni} öğrencide daha yeni bir kur kaydı olduğu için dokunulmadı` : '', c.veri.atlananSatir ? `${c.veri.atlananSatir} satır okunamadı` : ''].filter(Boolean)
            kaydet(b, 'İşlendi', not.join('; '))
            ozet.satirlar.push(`Kur listesi: ${k.yeni} kur güncellendi, ${k.ayni} değişmedi${not.length ? ` (${not.join('; ')})` : ''}`)
            continue
          }
          const c = icerik.c
          if (!c.ok) { kaydet(b, 'Kontrol bekliyor', c.neden); ozet.hata.push(`${b.ad}: ${c.neden}. "Kontrol bekliyor" listesine alındı`); continue }
          if (c.veri.dogrulanamayan > 0) {
            const m = `${c.veri.dogrulanamayan} hücrede net doğrulanamadı, önizlemeyle kontrol edin`
            kaydet(b, 'Kontrol bekliyor', m); ozet.hata.push(`${b.ad}: ${m}`); continue
          }
          const n = netIsle(db, c.veri, b.id, b.modifiedTime)
          ;(['sinavlar', 'ders_sonuclari', 'lgs_puanlari'] as TabAdi[]).forEach(t => dokunulan.add(t))
          const uyar = [n.atlanan ? `${n.atlanan} satır öğrenci listesinde olmadığı için atlandı` : '', ...c.veri.uyarilar].filter(Boolean)
          kaydet(b, 'İşlendi', uyar.join('; '), n.sinavId)
          ozet.satirlar.push(`${c.veri.sinavAd}: ${n.eslesen} öğrenci için net işlendi${uyar.length ? ` (${uyar.join('; ')})` : ''}`)
          continue
        }
        const wb = okuBuffer(veri, b.ad)
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
      if (mod === 'google') await dbKaydet(get().dbId!, get().db, [...dokunulan])
    } catch (e) {
      if (e instanceof SurumCakismasi) { ozet.hata.push(CAKISMA + ' (Analiz Et’e yeniden basın.)'); set({ ilerleme: null, ozet }); await get().yenidenYukle(CAKISMA); return }
      ozet.hata.push('Veritabanına yazılamadı: ' + (e as Error).message)
      set({ hata: 'Sonuçlar Google Drive’a yazılamadı, kapatıp açınca kaybolur: ' + (e as Error).message })
    }
    set({ ilerleme: null, ozet })
    await get().tara()
  },

  async kaydet(tablar) {
    set({ ...yenile(get().db) })
    if (get().mod !== 'google') return
    try { await dbKaydet(get().dbId!, get().db, tablar) } catch (e) {
      if (e instanceof SurumCakismasi) await get().yenidenYukle(CAKISMA)
      else { set({ hata: 'Kaydedilemedi: ' + (e as Error).message }); throw e }
    }
  },
  /** İşlenen dosya kayıtlarını siler; sonraki taramada tüm dosyalar yeniden işlenir */
  async tumunuYenidenIsle() {
    get().db.islenenDosyalar = []
    await get().kaydet(['islenen_dosyalar'])
    await get().tara()
  },
  /** Veritabanını Drive'dan yeniden okur (başka cihazda değişiklik yapılmışsa) */
  async yenidenYukle(mesaj) {
    const { dbId } = get(); if (!dbId) return
    try {
      const db = await dbYukle(dbId)
      set({ ...yenile(db), hata: mesaj ?? null, sonKontrol: Date.now() })
      void get().tara()
    } catch (e) { set({ hata: 'Veriler yenilenemedi: ' + (e as Error).message }) }
  },
  /** Uygulamaya dönüldüğünde: başka cihaz yazdıysa sessizce güncelle */
  async yenileGerekirse() {
    const { mod, dbId, ilerleme, db, sonKontrol } = get()
    if (mod !== 'google' || !dbId || ilerleme || Date.now() - sonKontrol < 20_000) return
    set({ sonKontrol: Date.now() })
    try { if ((await uzakSurum(dbId)) !== db.surum) await get().yenidenYukle() } catch { /* çevrimdışı olabilir */ }
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
  /** Önizlemede düzeltilen PDF sonucunu işler */
  async pdfOnayla(dosyaId, veri) {
    const db = get().db
    const d = db.islenenDosyalar.find(x => x.dosyaId === dosyaId)
    const n = netIsle(db, veri, dosyaId, d?.sonDegisiklik ?? new Date().toISOString())
    if (d) Object.assign(d, { durum: 'İşlendi', ayrinti: 'Önizlemede onaylandı' + (n.atlanan ? `; ${n.atlanan} satır atlandı` : ''), sinavId: n.sinavId, islenmeTarihi: new Date().toISOString() })
    await get().kaydet(['sinavlar', 'ders_sonuclari', 'lgs_puanlari', 'islenen_dosyalar'])
  },
  async dosyaAtla(dosyaId) {
    const d = get().db.islenenDosyalar.find(x => x.dosyaId === dosyaId)
    if (d) Object.assign(d, { durum: 'İşlendi', ayrinti: 'Elle atlandı', islenmeTarihi: new Date().toISOString() })
    await get().kaydet(['islenen_dosyalar'])
  },
}))
export { klasorAra, parmakIzi }
export type { Cozum }
oturumDinle(() => useStore.setState({ oturumGerekli: true }))
