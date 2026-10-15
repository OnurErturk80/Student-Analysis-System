import * as XLSX from 'xlsx'
import type { Ogrenci, Veli } from '../types'
import { anahtar, adGuzel, telTemizle } from '../lib/tr'

const h = (v: unknown) => (v === null || v === undefined ? '' : String(v).trim())

/** Her sekme bir şube: "8_A". Başlık: Öğrenci Numara, Öğrenci Tam Adı, Veli (k) ... */
export function ogrenciListesiCoz(wb: XLSX.WorkBook): { ogrenciler: Ogrenci[]; uyarilar: string[] } {
  const ogrenciler: Ogrenci[] = []
  const uyarilar: string[] = []
  for (const adi of wb.SheetNames) {
    const m = adi.match(/(\d+)\s*[_\-/ ]\s*([A-ZÇĞİÖŞÜ])/i)
    if (!m) { uyarilar.push(`"${adi}" sekmesi şube adı gibi görünmüyor, atlandı`); continue }
    const sinif = Number(m[1]); const sube = m[2].toLocaleUpperCase('tr')
    const t = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[adi], { header: 1, raw: true, defval: '' }) as unknown[][]
    const bi = t.findIndex(r => r.some(c => anahtar(h(c)) === 'ÖĞRENCİNUMARA'))
    if (bi < 0) { uyarilar.push(`"${adi}" sekmesinde "Öğrenci Numara" başlığı yok`); continue }
    const bas = t[bi].map(h)
    const kol = (ad: string) => bas.findIndex(c => anahtar(c) === anahtar(ad))
    const no = kol('Öğrenci Numara'); const ad = kol('Öğrenci Tam Adı')
    const veliKol = [1, 2, 3].map(k => ({
      ad: kol(`Veli (${k}) Tam Adı`), yak: kol(`Veli (${k}) Velinin Yakınlığı`),
      tel: [kol(`Veli (${k}) Mesaj Gönderi (Cep Tel)`), kol(`Veli (${k}) Mesaj Gönderi (Cep Tel) 1`),
        kol(`Veli (${k}) Telefon Numarası`), kol(`Veli (${k}) Telefon Numarası 1`)].filter(i => i >= 0),
    }))
    for (const r of t.slice(bi + 1)) {
      const numara = h(r[no]); const isim = h(r[ad])
      if (!numara || !isim) continue
      const veliler: Veli[] = veliKol.map(v => ({
        ad: v.ad >= 0 && h(r[v.ad]) ? adGuzel(h(r[v.ad])) : '',
        yakinlik: v.yak >= 0 ? h(r[v.yak]) : '',
        tel: telTemizle(v.tel.map(i => h(r[i])).find(Boolean) ?? ''),
      }))
      ogrenciler.push({ no: String(Number(numara) || numara), adSoyad: adGuzel(isim), sinif, sube, veliler, birincilVeli: Math.max(0, veliler.findIndex(v => v.ad)), aktif: true })
    }
  }
  return { ogrenciler, uyarilar }
}
