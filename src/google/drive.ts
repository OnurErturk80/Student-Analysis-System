import { gapi } from './api'

export interface DriveDosya { id: string; name: string; mimeType: string; modifiedTime: string; parents?: string[]; shortcutDetails?: { targetId: string; targetMimeType: string } }
const D = 'https://www.googleapis.com/drive/v3/files'
export const KLASOR = 'application/vnd.google-apps.folder'
export const GSHEET = 'application/vnd.google-apps.spreadsheet'
export const KISAYOL = 'application/vnd.google-apps.shortcut'
const alan = 'files(id,name,mimeType,modifiedTime,parents,shortcutDetails),nextPageToken'

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
/** Klasörün tamamı (alt klasörler dahil). Drive kısayolları hedef dosya/klasöre çözülür. */
export async function agacDosyalari(kok: string): Promise<{ dosyalar: (DriveDosya & { yol: string })[]; klasorSayisi: number }> {
  const out: (DriveDosya & { yol: string })[] = []
  const kuyruk: { id: string; yol: string }[] = [{ id: kok, yol: '' }]
  const gorulen = new Set<string>([kok])
  let klasorSayisi = 1
  while (kuyruk.length) {
    const { id, yol } = kuyruk.shift()!
    for (let f of await listele(`'${id}' in parents`)) {
      if (f.mimeType === KISAYOL && f.shortcutDetails) {
        // kısayolun adı kalır, kimlik/tür/tarih hedeften alınır
        try { const h = await klasorBilgi(f.shortcutDetails.targetId); f = { ...h, name: f.name } } catch { out.push({ ...f, yol }); continue }
      }
      if (f.mimeType === KLASOR) {
        if (gorulen.has(f.id)) continue
        gorulen.add(f.id); klasorSayisi++; kuyruk.push({ id: f.id, yol: yol + f.name + '/' })
      } else out.push({ ...f, yol })
    }
  }
  return { dosyalar: out, klasorSayisi }
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
