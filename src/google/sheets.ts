import type { DB, TabAdi } from '../types'
import { bosDB } from '../types'
import { SEKMELER, tabloSatirlari, tabloyuYukle } from '../data/schema'
import { gapi } from './api'
import { listele, GSHEET, tasi } from './drive'

const S = 'https://sheets.googleapis.com/v4/spreadsheets'
export const DB_ADI = 'SAS Veritabanı'
const TABLAR = Object.keys(SEKMELER) as TabAdi[]
const sutunHarf = (n: number) => { let s = ''; for (n++; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s; return s }

export async function dbBul(klasorId: string): Promise<string | null> {
  const l = await listele(`'${klasorId}' in parents and mimeType='${GSHEET}' and name='${DB_ADI}'`)
  return l[0]?.id ?? null
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
const PARCA = 4000
export async function dbKaydet(id: string, db: DB, istenen: TabAdi[] = TABLAR) {
  if ((await uzakSurum(id)) !== (db.surum ?? '')) throw new SurumCakismasi()
  const eskiSurum = db.surum
  db.surum = Math.random().toString(36).slice(2) + Date.now().toString(36)
  // 'kurallar' (sürüm satırı burada) en sona yazılır
  const tablar = [...istenen.filter(t => t !== 'kurallar'), 'kurallar' as TabAdi]
  try { await yaz(id, db, tablar) } catch (e) { db.surum = eskiSurum; throw e }
}
async function yaz(id: string, db: DB, tablar: TabAdi[]) {
  for (const t of tablar) {
    const son = sutunHarf(SEKMELER[t].length - 1)
    await gapi(`${S}/${id}/values/${encodeURIComponent(`${t}!A2:${son}`)}:clear`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
    const satirlar = tabloSatirlari(db, t)
    for (let i = 0; i < satirlar.length; i += PARCA) {
      await gapi(`${S}/${id}/values/${encodeURIComponent(`${t}!A${i + 2}`)}?valueInputOption=RAW`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ values: satirlar.slice(i, i + PARCA) }),
      })
    }
  }
}
