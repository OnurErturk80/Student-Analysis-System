/** macOS/iOS dosya adları ve bazı Excel metinleri "ayrışık" Unicode (Ö = O + ¨) gelebilir; her karşılaştırmadan önce birleşik biçime (NFC) çevrilir */
export const nfc = (s: string) => s.normalize('NFC')
export const trUpper = (s: string) => nfc(s).toLocaleUpperCase('tr')
/** Karşılaştırma anahtarı: büyük harf, noktalama/boşluk yok */
export const anahtar = (s: string) => trUpper(s).replace(/[^A-Z0-9ÇĞİÖŞÜ]/g, '')
export const sayi = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  const n = Number(String(v).trim().replace('%', '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}
export const yuzdeYaz = (n: number, ondalik = 0) => '%' + n.toFixed(ondalik).replace('.', ',')
export const sayiYaz = (n: number, ondalik = 1) => n.toFixed(ondalik).replace('.', ',')
export const bas = (ad: string) => ad.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(p => trUpper(p[0])).join('')
/** Başlık durumuna çevir: "AHMET EREN" → "Ahmet Eren" */
export const adGuzel = (s: string) =>
  nfc(s).toLocaleLowerCase('tr').split(/\s+/).map(p => p.charAt(0).toLocaleUpperCase('tr') + p.slice(1)).join(' ')
export const telTemizle = (t: string) => {
  let d = t.replace(/\D/g, '')
  if (d.startsWith('00')) d = d.slice(2)
  if (d.startsWith('0')) d = '90' + d.slice(1)
  if (d.length === 10) d = '90' + d
  return d
}
