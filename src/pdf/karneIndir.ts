import type { DB } from '../types'
import type { Analiz } from '../analysis/engine'

/** Yazı tipleri ilk kullanımda indirilir (PWA önbelleği sonra çevrimdışı sağlar) */
async function fontlar() {
  const b = import.meta.env.BASE_URL + 'fonts/'
  const [n, k] = await Promise.all([fetch(b + 'LiberationSans-Regular.ttf'), fetch(b + 'LiberationSans-Bold.ttf')])
  if (!n.ok || !k.ok) throw new Error('Yazı tipi yüklenemedi')
  return { normal: await n.arrayBuffer(), kalin: await k.arrayBuffer() }
}
export async function karneIndir(db: DB, a: Analiz, no: string) {
  const { karneOlustur } = await import('./karne')
  const blob = await karneOlustur(db, a, no, await fontlar())
  const o = db.ogrenciler.find(x => x.no === no)!
  const url = URL.createObjectURL(blob)
  const el = document.createElement('a')
  const ad = o.adSoyad.replace(/[çÇğĞıİöÖşŞüÜ]/g, c => ({ ç: 'c', Ç: 'C', ğ: 'g', Ğ: 'G', ı: 'i', İ: 'I', ö: 'o', Ö: 'O', ş: 's', Ş: 'S', ü: 'u', Ü: 'U' })[c]!).replace(/[^A-Za-z0-9]+/g, '_')
  el.href = url; el.download = `Karne_${ad}_${new Date().toISOString().slice(0, 10)}.pdf` // ASCII: bazı tarayıcılar Türkçe karakterli adı yok sayıyor
  el.style.display = 'none'; document.body.appendChild(el); el.click()
  setTimeout(() => { el.remove(); URL.revokeObjectURL(url) }, 60_000)
}
