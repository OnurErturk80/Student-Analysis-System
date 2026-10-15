/** ISO hafta anahtarı: 2026-W41 */
export function haftaAnahtari(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z')
  const gun = (d.getUTCDay() + 6) % 7
  d.setUTCDate(d.getUTCDate() - gun + 3)
  const ilk = new Date(Date.UTC(d.getUTCFullYear(), 0, 4))
  const hafta = 1 + Math.round(((d.getTime() - ilk.getTime()) / 86400000 - 3 + ((ilk.getUTCDay() + 6) % 7)) / 7)
  return `${d.getUTCFullYear()}-W${String(hafta).padStart(2, '0')}`
}
export const tarihGuzel = (iso: string) => {
  const [y, m, g] = iso.split('-').map(Number)
  const aylar = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']
  return `${g} ${aylar[m - 1]}${y !== new Date().getFullYear() ? ' ' + y : ''}`
}
export const bugun = () => new Date().toISOString().slice(0, 10)
