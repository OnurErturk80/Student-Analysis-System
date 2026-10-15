import { gapi } from './api'

export interface DriveDosya { id: string; name: string; mimeType: string; modifiedTime: string; parents?: string[] }
const D = 'https://www.googleapis.com/drive/v3/files'
export const KLASOR = 'application/vnd.google-apps.folder'
export const GSHEET = 'application/vnd.google-apps.spreadsheet'
const alan = 'files(id,name,mimeType,modifiedTime,parents),nextPageToken'

export async function listele(q: string): Promise<DriveDosya[]> {
  const out: DriveDosya[] = []
  let sayfa = ''
  do {
    const r = await gapi<{ files: DriveDosya[]; nextPageToken?: string }>(
      `${D}?q=${encodeURIComponent(q + ' and trashed=false')}&fields=${encodeURIComponent(alan)}&pageSize=200&orderBy=name${sayfa ? '&pageToken=' + sayfa : ''}&supportsAllDrives=true&includeItemsFromAllDrives=true`)
    out.push(...r.files); sayfa = r.nextPageToken ?? ''
  } while (sayfa)
  return out
}
export const klasorAra = (ad: string) => listele(`mimeType='${KLASOR}' and name='${ad.replace(/'/g, "\\'")}'`)
export const altKlasorler = (ust: string) => listele(`'${ust}' in parents and mimeType='${KLASOR}'`)
export async function klasorBilgi(id: string) {
  return gapi<DriveDosya>(`${D}/${id}?fields=id,name,mimeType,modifiedTime,parents&supportsAllDrives=true`)
}
/** Klasörün tamamı (alt klasörler dahil) */
export async function agacDosyalari(kok: string): Promise<(DriveDosya & { yol: string })[]> {
  const out: (DriveDosya & { yol: string })[] = []
  const kuyruk: { id: string; yol: string }[] = [{ id: kok, yol: '' }]
  while (kuyruk.length) {
    const { id, yol } = kuyruk.shift()!
    for (const f of await listele(`'${id}' in parents`)) {
      if (f.mimeType === KLASOR) kuyruk.push({ id: f.id, yol: yol + f.name + '/' })
      else out.push({ ...f, yol })
    }
  }
  return out
}
export async function indir(f: DriveDosya): Promise<ArrayBuffer> {
  const url = f.mimeType === GSHEET
    ? `${D}/${f.id}/export?mimeType=${encodeURIComponent('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}`
    : `${D}/${f.id}?alt=media&supportsAllDrives=true`
  return gapi<ArrayBuffer>(url)
}
export async function tasi(dosyaId: string, klasorId: string) {
  await gapi(`${D}/${dosyaId}?addParents=${klasorId}&supportsAllDrives=true`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: '{}' })
}
