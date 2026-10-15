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
const PARCA = 4000
export async function dbKaydet(id: string, db: DB, tablar: TabAdi[] = TABLAR) {
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
