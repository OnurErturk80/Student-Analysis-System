import type { DB, TabAdi } from '../types'
import { bosDB } from '../types'
import { SEKMELER, tabloSatirlari, tabloyuYukle } from '../data/schema'
import { gapi } from './api'
import { listele, GSHEET, tasi } from './drive'

const S = 'https://sheets.googleapis.com/v4/spreadsheets'
export const DB_ADI = 'SAS Veritabanı'
export const ARSIV_ONEKI = 'SAS Veritabanı – Arşiv'
const TABLAR = Object.keys(SEKMELER) as TabAdi[]
const sutunHarf = (n: number) => { let s = ''; for (n++; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s; return s }

/** Klasördeki arşivlenmiş yıllar (en yeni önce) */
export async function arsivleriBul(klasorId: string) {
  const l = await listele(`'${klasorId}' in parents and mimeType='${GSHEET}' and name contains 'Arşiv'`)
  return l.filter(f => f.name.normalize('NFC').startsWith(ARSIV_ONEKI)).sort((a, b) => b.name.localeCompare(a.name, 'tr'))
}
/** Klasördeki tüm "SAS Veritabanı" dosyaları, en eski önce (ilk oluşturulan asıl veritabanıdır; sonradan çıkan kopyalar yanlışlıkla oluşmuştur) */
export async function dbBulHepsi(klasorId: string) {
  const l = await listele(`'${klasorId}' in parents and mimeType='${GSHEET}' and name='${DB_ADI}'`)
  return l.sort((a, b) => (a.createdTime ?? '').localeCompare(b.createdTime ?? ''))
}
export async function dbOlustur(klasorId: string): Promise<string> {
  const r = await gapi<{ spreadsheetId: string }>(S, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ properties: { title: DB_ADI, locale: 'tr_TR' }, sheets: TABLAR.map(t => ({ properties: { title: t, gridProperties: { frozenRowCount: 1 } } })) }),
  })
  await gapi(`${S}/${r.spreadsheetId}/values:batchUpdate`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ valueInputOption: 'RAW', data: TABLAR.map(t => ({ range: `${t}!A1`, values: [SEKMELER[t]] })) }),
  })
  await tasi(r.spreadsheetId, klasorId)
  return r.spreadsheetId
}
/** Eski veritabanlarında sonradan eklenen sekmeleri tamamlar */
async function sekmeleriTamamla(id: string) {
  const m = await gapi<{ sheets: { properties: { title: string } }[] }>(`${S}/${id}?fields=sheets.properties.title`)
  const var_ = new Set(m.sheets.map(s => s.properties.title))
  const eksik = TABLAR.filter(t => !var_.has(t))
  if (!eksik.length) return
  await gapi(`${S}/${id}:batchUpdate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requests: eksik.map(t => ({ addSheet: { properties: { title: t, gridProperties: { frozenRowCount: 1 } } } })) }) })
  await gapi(`${S}/${id}/values:batchUpdate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ valueInputOption: 'RAW', data: eksik.map(t => ({ range: `${t}!A1`, values: [SEKMELER[t]] })) }) })
}
export async function dbYukle(id: string): Promise<DB> {
  await sekmeleriTamamla(id)
  const db = bosDB()
  const ranges = TABLAR.map(t => `ranges=${encodeURIComponent(`${t}!A2:${sutunHarf(SEKMELER[t].length - 1)}`)}`).join('&')
  const r = await gapi<{ valueRanges: { values?: unknown[][] }[] }>(`${S}/${id}/values:batchGet?${ranges}&valueRenderOption=UNFORMATTED_VALUE`)
  TABLAR.forEach((t, i) => tabloyuYukle(db, t, r.valueRanges[i].values ?? []))
  return db
}
/** Başka bir cihaz veritabanını bizden sonra değiştirdiyse yazma reddedilir (üzerine yazıp veri kaybetmemek için) */
export class SurumCakismasi extends Error { constructor() { super('Veriler başka bir cihazda değişmiş.') } }
export async function uzakSurum(id: string): Promise<string> {
  const r = await gapi<{ values?: unknown[][] }>(`${S}/${id}/values/${encodeURIComponent('kurallar!A2:B30')}?valueRenderOption=UNFORMATTED_VALUE`)
  const x = (r.values ?? []).find(v => v[0] === 'surum')
  return x && x[1] !== undefined && x[1] !== null ? String(x[1]) : ''
}
const PARCA = 2000
export async function dbKaydet(id: string, db: DB, istenen: TabAdi[] = TABLAR) {
  if ((await uzakSurum(id)) !== (db.surum ?? '')) throw new SurumCakismasi()
  const eskiSurum = db.surum
  db.surum = Math.random().toString(36).slice(2) + Date.now().toString(36)
  // Sıra önemli: sonuç tabloları → işlenen dosyalar → kurallar (sürüm satırı). Yazma yarıda kalırsa dosyalar "işlendi" görünmesin.
  // Öğrenciler ve özet tablolar önce, en büyük tablo (kazanım sonuçları) en son: o yazılamasa bile asıl veri kaybolmaz.
  const SIRA: TabAdi[] = ['ogrenciler', 'sinavlar', 'ders_sonuclari', 'lgs_puanlari', 'kur_gecmisi', 'veli_gorusmeleri', 'kazanim_sonuclari', 'islenen_dosyalar', 'kurallar']
  const tablar = SIRA.filter(t => t === 'kurallar' || istenen.includes(t))
  try { await yaz(id, db, tablar) } catch (e) { db.surum = eskiSurum; throw e }
}
/** Yeni E-Tablo sekmeleri 1000 satırla başlar; values.update bu sınırı aşan yazmayı reddeder. Gerekirse sekmeyi büyütür. */
async function gridiBuyut(id: string, gerekli: { tab: TabAdi; satir: number; sutun: number }[]) {
  const m = await gapi<{ sheets?: { properties: { sheetId: number; title: string; gridProperties?: { rowCount?: number; columnCount?: number } } }[] }>(
    `${S}/${id}?fields=sheets.properties(sheetId,title,gridProperties(rowCount,columnCount))`)
  const istekler: object[] = []
  for (const g of gerekli) {
    const p = m.sheets?.find(x => x.properties.title === g.tab)?.properties
    if (!p) continue
    const satir = p.gridProperties?.rowCount ?? 1000, sutun = p.gridProperties?.columnCount ?? 26
    if (satir < g.satir || sutun < g.sutun)
      istekler.push({ updateSheetProperties: { properties: { sheetId: p.sheetId, gridProperties: { rowCount: Math.max(satir, g.satir + 500), columnCount: Math.max(sutun, g.sutun) } }, fields: 'gridProperties.rowCount,gridProperties.columnCount' } })
  }
  if (istekler.length) await gapi(`${S}/${id}:batchUpdate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requests: istekler }) })
}
async function yaz(id: string, db: DB, tablar: TabAdi[]) {
  const satirlar = new Map(tablar.map(t => [t, tabloSatirlari(db, t)] as const))
  await gridiBuyut(id, tablar.map(t => ({ tab: t, satir: satirlar.get(t)!.length + 2, sutun: SEKMELER[t].length })))
  for (const t of tablar) {
    const son = sutunHarf(SEKMELER[t].length - 1), s = satirlar.get(t)!
    // önce yeni veri yazılır, sonra artakalan eski satırlar silinir: yazma yarıda kalırsa tablo boşalmaz
    for (let i = 0; i < s.length; i += PARCA) {
      await gapi(`${S}/${id}/values/${encodeURIComponent(`${t}!A${i + 2}`)}?valueInputOption=RAW`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ values: s.slice(i, i + PARCA) }),
      })
    }
    await gapi(`${S}/${id}/values/${encodeURIComponent(`${t}!A${s.length + 2}:${son}`)}:clear`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
  }
}
